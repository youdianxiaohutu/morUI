// ============================================================================
// memory.js  —  四层记忆模块（借鉴 TencentDB-Agent-Memory 的 L0→L1→L2→L3，大幅简化）
// ----------------------------------------------------------------------------
// 纯 JS、零外部依赖。CommonJS（Node）与浏览器 window.Memory 双兼容。
// 持久化：默认 localStorage；另可通过 exportMemory()/importMemory() 挂到存档。
// 不调用任何 LLM；L1 抽取全部为规则（关键词 + 启发式）。
// ============================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();            // Node / CommonJS
  } else {
    root.Memory = factory();               // 浏览器全局
  }
})(typeof self !== 'undefined' ? self : this, function () {

  'use strict';

  // ===== 可配置项（都可在 createMemory(opts) 里覆盖） =====
  var DEFAULTS = {
    storageKey: 'agent_memory_v1',   // localStorage 键
    l0Keep: 10,                      // L0 保留最近 N 轮（超出滚动丢弃）
    compressThreshold: 20,           // L0 达到该轮数触发压缩
    compressBatch: 10,               // 每次压缩最旧的多少轮
    l1Max: 200,                      // L1 事实池上限（超出按 importance 裁尾）
    l1Recall: 6,                     // recall() 最多注入的 L1 条数
    l1MinRelevance: 2,               // 一条 L1 至少命中 2 个关键词才召回
    useLocalStorage: true,           // false 则只留在内存（刷新即失）
  };

  // 游戏词汇表：L1 抽取时按这些词识别“关键事实”（NPC名、好感、功法、物品、突破…）
  // 内置默认词汇表（修仙）。createMemory({vocab}) 可覆盖；types/*.js 提供各类型表
  var DEFAULT_VOCAB = {
    npc:       ['青云宗', '后山', '守卫', '长老', '师傅', '掌门'],
    favor:     ['好感'],
    realm:     ['境界', '突破', '修为', '第一重天', '第二重天', '第三重天', '悟道'],
    item:      ['灵剑', '灵药', '灵石', '法宝', '丹药'],
    skill:     ['功法', '法术', '术法', '神通'],
    choice:    ['选择', '决定', '加入', '拜师', '拜入', '立誓', '承诺'],
    quest:     ['任务', '目标', '委托', '追寻', '寻找'],
    status:    ['伤势', '中毒', '痊愈', '死亡', '阵亡', '昏迷'],
  };

  // 每类词命中的“重要性”权重（1-5）
  var IMP = { favor: 4, realm: 5, item: 4, skill: 4, choice: 4, quest: 3, npc: 3, status: 5 };

  // ---------------------------------------------------------------------------
  // createMemory(opts) → 一个记忆实例（持有状态 + 全部 API）
  // ---------------------------------------------------------------------------
  function createMemory(opts) {
    var cfg = Object.assign({}, DEFAULTS, opts || {});
    var l1Seq = 0;
    var VOCAB = (opts && opts.vocab && Object.keys(opts.vocab).length) ? opts.vocab : DEFAULT_VOCAB;

    // ===== 内存中的四层结构 =====
    // l0: 最近 N 轮原始对话  [{ role, content, turn, ts }]
    // l1: 原子事实池        [{ id, content, source, timestamp, importance, tags }]
    // l2: 按场景/地点存储   { "青云宗后山": { summary, updatedAt, keyEvents } }
    // l3: 玩家长期画像      { name, personality, goals, affiliation, notes, updatedAt }
    var mem = {
      l0: [],
      l1: [],
      l2: {},
      l3: { name: '', personality: '', goals: '', affiliation: '', notes: '', updatedAt: 0 },
      pending: [],                 // 滚动出的旧 L0 轮次，等待 compress() 沉淀
    };

    // ===== 持久化（localStorage） =====
    function save() {
      if (!cfg.useLocalStorage || !typeof localStorage !== 'undefined') return;
      try { localStorage.setItem(cfg.storageKey, JSON.stringify(mem)); } catch (e) {}
    }
    function load() {
      if (!cfg.useLocalStorage) return;
      try {
        var raw = localStorage.getItem(cfg.storageKey);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        mem = Object.assign(mem, parsed);
      } catch (e) {}
    }

    // ===== 工具函数 =====
    function nowTs() { return Date.now(); }
    function pushL1(content, sourceTurn, tags) {
      var imp = 1;
      tags.forEach(function (t) { if (IMP[t]) imp = Math.max(imp, IMP[t]); });
      var fact = {
        id: 'f' + (++l1Seq),
        content: content,
        source: sourceTurn,           // 来自哪轮对话（L0 的 turn）
        timestamp: nowTs(),
        importance: imp,
        tags: tags,
      };
      if (mem.l1.some(function (x) { return x.content === fact.content; })) return;
      mem.l1.push(fact);
      // 池上限：超出按 importance 升序裁掉最弱的（同 importance 按时间旧的先删）
      if (mem.l1.length > cfg.l1Max) {
        mem.l1.sort(function (a, b) {
          if (a.importance !== b.importance) return a.importance - b.importance;
          return a.timestamp - b.timestamp;
        });
        mem.l1 = mem.l1.slice(mem.l1.length - cfg.l1Max);
      }
    }

    // 从一段文本里按 VOCAB 命中的类别抽取原子事实（规则，无 LLM）
    function extractL1(text, sourceTurn) {
      if (!text) return;
      var t = String(text);
      Object.keys(VOCAB).forEach(function (cat) {
        var kw = VOCAB[cat];
        var hit = kw.some(function (w) { return t.indexOf(w) !== -1; });
        if (hit) {
          // 事实句：取包含命中词的那一句，避免把整段塞进去
          var sentence = t.split(/[。；;!\n]/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s && kw.some(function (w) { return s.indexOf(w) !== -1; }) })
            .slice(0, 2)
            .join('；');
          pushL1(sentence || t.slice(0, 60), sourceTurn, [cat]);
        }
      });
    }

    // ---------------------------------------------------------------------------
    // remember(response, roundMeta)
    //   response: 本轮 AI 工具调用返回的 JSON 对象（可能含 scene_update /
    //             player_profile_update / 叙事文本字段）
    //   roundMeta: { turn, user, ai, scene }  本轮对话元信息（可选）
    //   返回: 本轮被写入的 L1 数量
    // ---------------------------------------------------------------------------
    function remember(response, roundMeta) {
      var rm = roundMeta || {};
      var turn = (typeof rm.turn === 'number') ? rm.turn : (mem.l0.length + 1);

      // 1) L0：push 本轮，滚动保留最近 N 轮
      var entry = {
        role: 'round',
        user: rm.user || '',
        ai: rm.ai || '',
        turn: turn,
        ts: nowTs(),
      };
      mem.l0.push(entry);
      while (mem.l0.length > cfg.l0Keep) mem.pending.push(mem.l0.shift());

      // 2) L1：规则抽取（从 AI 文本 + response 里可见的字段）
      var textToScan = [];
      if (rm.ai) textToScan.push(rm.ai);
      if (response && typeof response === 'object') {
        // 把 response 里可读的文本字段也扫一遍（含叙事、对话）
        Object.keys(response).forEach(function (k) {
          var v = response[k];
          if (typeof v === 'string') textToScan.push(v);
        });
      }
      textToScan.forEach(function (txt) { extractL1(txt, turn); });

      // 3) L2：若 AI 显式给出 scene_update → 更新对应场景摘要
      if (response && typeof response === 'object') {
        var su = response.scene_update;
        if (su && (su.scene || su.summary)) {
          var key = su.scene || rm.scene || '当前场景';
          var scene = mem.l2[key] || { summary: '', updatedAt: 0, keyEvents: [] };
          if (su.summary) scene.summary = su.summary;
          if (su.event) { scene.keyEvents.push(su.event); if (scene.keyEvents.length > 20) scene.keyEvents.shift(); }
          scene.updatedAt = nowTs();
          mem.l2[key] = scene;
        }
        // 4) L3：若 AI 显式给出 player_profile_update → 合并进画像
        var pp = response.player_profile_update;
        if (pp && typeof pp === 'object') {
          ['name', 'personality', 'goals', 'affiliation', 'notes'].forEach(function (f) {
            if (pp[f] != null) mem.l3[f] = pp[f];
          });
          mem.l3.updatedAt = nowTs();
        }
      }

      save();
      return textToScan.length ? mem.l1.length : 0; // 粗略返回池大小作为“是否写入”信号
    }

    // ---------------------------------------------------------------------------
    // recall(context) → 可注入 system prompt 的纯文本
    //   context: { scene, lastUser, keywords? }
    //   规则：始终注入 L3 + 当前场景 L2；按当前对话关键词召回 5-8 条 L1。
    // ---------------------------------------------------------------------------
    function recall(context) {
      var ctx = context || {};
      var curScene = ctx.scene || guessScene(ctx.lastUser);
      var lines = [];
      lines.push('【玩家长期画像 L3】');
      lines.push('姓名: ' + (mem.l3.name || '未知') + ' | 性格: ' + (mem.l3.personality || '未知') +
                 ' | 目标: ' + (mem.l3.goals || '未明') + ' | 所属: ' + (mem.l3.affiliation || '无'));
      if (mem.l3.notes) lines.push('备注: ' + mem.l3.notes);

      var scene = mem.l2[curScene];
      if (scene && (scene.summary || scene.keyEvents.length)) {
        lines.push('【当前场景 ' + curScene + ' · L2】');
        lines.push('摘要: ' + (scene.summary || '（无）'));
        if (scene.keyEvents.length) lines.push('关键事件: ' + scene.keyEvents.slice(-5).join('；'));
      }

      // L1：按当前关键词打分，召回最相关 5-8 条
      var kws = collectKeywords(ctx.lastUser);
      var scored = mem.l1.map(function (f) {
        var score = 0;
        (f.tags || []).forEach(function (tg) { if (kws[tg]) score += 2; });
        // 内容里命中关键词再加分
        var text = f.content || '';
        Object.keys(kws).forEach(function (k) { if (kws[k] && text.indexOf(k) !== -1) score += 1; });
        return { f: f, score: score };
      }).filter(function (x) { return x.score >= cfg.l1MinRelevance; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, cfg.l1Recall);

      if (scored.length) {
        lines.push('【相关事实 L1】');
        scored.forEach(function (x, i) { lines.push((i + 1) + '. ' + x.f.content + '  [' + x.f.tags.join(',') + ' · 重要' + x.f.importance + ']'); });
      }

      return lines.join('\n');
    }

    // ---------------------------------------------------------------------------
    // compress() → 把最旧的 L0 轮次沉淀为 L1/L2，再从 L0 移除
    //   规则压缩（无 LLM）；仅当 L0 >= compressThreshold 才执行。
    // ---------------------------------------------------------------------------
    function compress() {
      if (mem.pending.length < cfg.compressThreshold) return 0;
      var batch = mem.pending.splice(0, Math.min(cfg.compressBatch, mem.pending.length));
      var droppedText = batch.map(function (e) { return (e.user ? '玩家:' + e.user + ' ' : '') + (e.ai ? 'AI:' + e.ai : ''); }).join('\n');

      // 从这批旧对话里再抽一次 L1（补抓此前未捕获的事实）
      extractL1(droppedText, batch[batch.length - 1].turn);

      // 若文本里出现场景词，更新/建立该 L2 场景摘要（保留 NPC 名/选择/任务）
      var sceneKw = ['青云宗', '后山', '守卫', '境界', '突破', '任务', '灵药'];
      var hitScene = sceneKw.find(function (w) { return droppedText.indexOf(w) !== -1; });
      if (hitScene) {
        var key = hitScene;
        var s = mem.l2[key] || { summary: '', updatedAt: 0, keyEvents: [] };
        // 摘要=这批旧对话里含关键词的前两句，保证“NPC 名/玩家选择/当前任务不丢”
        s.summary = droppedText.split(/[。；;!\n]/).map(function (x) { return x.trim(); })
          .filter(function (x) { return x && x.length >= 4; }).slice(0, 2).join('；') || s.summary;
        s.updatedAt = nowTs();
        mem.l2[key] = s;
      }

      save();
      return batch.length;
    }

    // ---------------------------------------------------------------------------
    // exportMemory() / importMemory(json) —— 供存档/读档（JSON 序列化）
    // ---------------------------------------------------------------------------
    function exportMemory() {
      // 把当前层结构与 schema 版本一起导出，方便日后兼容
      return JSON.stringify({ schema: 'mem1', l0: mem.l0, l1: mem.l1, l2: mem.l2, l3: mem.l3 }, null, 2);
    }
    function importMemory(json) {
      var parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (!parsed || (parsed.l0 == null && parsed.l1 == null && parsed.l2 == null && parsed.l3 == null)) {
        throw new Error('importMemory: 无效的记忆 JSON');
      }
      if (parsed.l0) mem.l0 = parsed.l0;
      if (parsed.l1) mem.l1 = parsed.l1;
      if (parsed.l2) mem.l2 = parsed.l2;
      if (parsed.l3) mem.l3 = Object.assign(mem.l3, parsed.l3);
      save();
      return true;
    }

    // ===== 内部小工具 =====
    function guessScene(text) {
      var t = String(text || '');
      var list = ['青云宗', '后山', '守卫', '长老', '掌门'];
      for (var i = 0; i < list.length; i++) if (t.indexOf(list[i]) !== -1) return list[i];
      return '当前场景';
    }
    function collectKeywords(text) {
      var t = String(text || '');
      var k = {};
      Object.keys(VOCAB).forEach(function (cat) {
        var hit = VOCAB[cat].some(function (w) { return t.indexOf(w) !== -1; });
        if (hit) k[cat] = true;
      });
      return k;
    }

    load();   // 启动时从 localStorage 恢复

    // ===== 暴露 API =====
    return {
      remember: remember,
      recall: recall,
      compress: compress,
      exportMemory: exportMemory,
      importMemory: importMemory,
      // 额外：读当前结构（调试用）
      peek: function () { return JSON.parse(JSON.stringify(mem)); },
      reset: function () { mem = { l0: [], l1: [], l2: {}, l3: { name:'', personality:'', goals:'', affiliation:'', notes:'', updatedAt:0 } }; save(); },
    };
  }

  // 工厂：返回一个带 createMemory 的对象
  return {
    createMemory: createMemory,
    DEFAULTS: DEFAULTS,
    DEFAULT_VOCAB: DEFAULT_VOCAB,   // 内置修仙词汇表；各类型表见 types/*.js
  };
});

