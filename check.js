

    // ===== 配置（从 localStorage 读取，与 login.html 一致）=====
    function loadConfig() {
      return {
        baseUrl: localStorage.getItem('baseUrl') || 'http://localhost:8080/v1',
        apiKey: localStorage.getItem('apiKey') || '',
        modelName: localStorage.getItem('modelName') || 'default-model'
      };
    }

    let config = loadConfig();
    let chatHistory = [];

    // 更新 header 显示的模型信息
    function updateModelInfo() {
      const el = document.getElementById('modelInfo');
      if (config.apiKey) {
        el.textContent = config.modelName;
      } else {
        el.textContent = '未配置';
      }
    }

        const DEFAULT_STATS = { name: '无名剑客', hp: { current: 100, max: 100 }, mp: { current: 0, max: 0 }, xp: { current: 0, max: 100 } };
    let charStats = { ...DEFAULT_STATS };

    async function loadStats() {
      try {
        const res = await fetch('ztk/self/stats.json');
        if (res.ok) {
          charStats = await res.json();
        }
      } catch(e) { /* 使用默认值 */ }
      updateStatsUI();
    }
    const roles = [];
    let roleCounter = 1;

    async function loadRole(roleId) {
      try {
        const res = await fetch(`ztk/others/role${roleId}.json`);
        if (res.ok) {
          return await res.json();
        }
      } catch(e) {}
      return null;
    }

    function renderRoleCard(roleData, index) {
      const card = document.createElement('div');
      card.className = 'role-card';
      card.id = `role-card-${index}`;

      const hp = roleData.hp || { current: '', max: '' };
      const mp = roleData.mp || { current: '', max: '' };
      const life = roleData.life || { current: '', max: '' };
      const stats = roleData.stats || {};
      const favor = roleData.favor || 0;

      card.innerHTML = `
        <div class="char-header">
          <div class="char-name">${roleData.name || '角色' + (index + 1)}</div>
          <div class="char-meta">${roleData.gender || ''} · ${roleData.appearance || ''}</div>
        </div>

        <div class="section">
          <div class="stat-row">
            <div class="stat-label"><span class="name">境界</span><span class="value">❰ ${roleData.realm || '--'} ❱</span></div>
          </div>
          <div class="stat-row">
            <div class="stat-label"><span class="name">突破</span><span class="value">${roleData.breakthrough || '--'}%</span></div>
            <div class="progress-bg"><div class="progress-bar xp-bar" style="width:${roleData.breakthrough || 0}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-label"><span class="name">寿元</span><span class="value">❰ ${life.current}/${life.max} 年 ❱</span></div>
            <div class="progress-bg"><div class="progress-bar xp-bar" style="width:${life.max > 0 ? Math.round(life.current/life.max*100) : 0}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-label"><span class="name">好感度</span><span class="value">❰ ${favor} ❱</span></div>
            <div class="progress-bg">
              <div class="progress-bar" id="favorBar${index}" style="width:${Math.abs(favor)}%;background:${favor >= 0 ? "linear-gradient(90deg,#7b1fa2,#c2185b)" : "linear-gradient(90deg,#8b0000,#a52a2a)"}"></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="stat-row">
            <div class="stat-label"><span class="name">气血</span><span class="value">❰ ${hp.current}/${hp.max} ❱</span></div>
            <div class="progress-bg"><div class="progress-bar hp-bar" style="width:${hp.max > 0 ? Math.round(hp.current/hp.max*100) : 0}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-label"><span class="name">灵气</span><span class="value">❰ ${mp.current}/${mp.max} ❱</span></div>
            <div class="progress-bg"><div class="progress-bar mp-bar" style="width:${mp.max > 0 ? Math.round(mp.current/mp.max*100) : 0}%"></div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">▎六维根基</div>
          <div class="stats-grid">
            <div class="stat-item"><span class="name">根骨</span><span class="value">❰ ${stats.root || '--'} ❱</span></div>
            <div class="stat-item"><span class="name">神识</span><span class="value">❰ ${stats.spirit || '--'} ❱</span></div>
            <div class="stat-item"><span class="name">身法</span><span class="value">❰ ${stats.agility || '--'} ❱</span></div>
            <div class="stat-item"><span class="name">悟性</span><span class="value">❰ ${stats.insight || '--'} ❱</span></div>
            <div class="stat-item"><span class="name">气运</span><span class="value">❰ ${stats.luck || '--'} ❱</span></div>
            <div class="stat-item"><span class="name">魅力</span><span class="value">❰ ${stats.charm || '--'} ❱</span></div>
          </div>
        </div>

        <div class="section">
          <div class="stat-row">
            <div class="stat-label"><span class="name">状态</span><span class="value">❰ ${roleData.status || '--'} ❱</span></div>
          </div>
        </div>

        <div class="section">
          <div class="stat-row">
            <div class="stat-label"><span class="name">灵石</span><span class="value">❰ ${roleData.stones || '--'} ❱</span></div>
          </div>
        </div>
      `;
      return card;
    }


    async function loadAllRoles() {
      const container = document.getElementById('rolesContainer');
      container.innerHTML = '';
      
      // 加载所有角色
      let i = 1;
      while (true) {
        const roleData = await loadRole(i);
        if (!roleData) break;
        const card = renderRoleCard(roleData, i - 1);
        container.appendChild(card);
        i++;
      }
      roleCounter = i + 1;

    }

    function addNewRole() {
      const roleId = roleCounter;
      roleCounter++;
      
      // 创建默认角色数据
      const defaultRole = {
        name: `角色${roleId}`,
        gender: "",
        appearance: "",
        realm: "",
        hp: { current: "", max: "" },
        mp: { current: "", max: "" },
        life: { current: "", max: "" },
        breakthrough: "",
        stats: { root: "", spirit: "", agility: "", insight: "", luck: "", charm: "" },
        status: "",
        stones: "",
        favor: 0,
      };
      
      // 保存到 localStorage
      const allRoles = JSON.parse(localStorage.getItem('roles') || '[]');
      allRoles.push({ id: roleId, data: defaultRole });
      localStorage.setItem('roles', JSON.stringify(allRoles));
      
      // 渲染新角色卡片
      const card = renderRoleCard(defaultRole, allRoles.length - 1);
      card.id = `role-card-${allRoles.length - 1}`;
      document.getElementById('rolesContainer').appendChild(card);
    }

    // 页面切换时加载角色
    function switchPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      document.querySelector('.nav-item[data-page="' + page + '"]').classList.add('active');
      
      if (page === 'roles') {
        loadAllRoles();
      }
    }

    function updateStatsUI() {
        document.getElementById('charName').textContent = charStats.name || '无名剑客';
        document.getElementById('charMeta').textContent = charStats.appearance || charStats.gender || '';
        document.getElementById('realmValue').textContent = '❰ ' + (charStats.realm || '--') + ' ❱';
        document.getElementById('linggenValue').textContent = '❰ ' + (charStats.linggen || '--') + ' ❱';
        document.getElementById('statusValue').textContent = '❰ ' + (charStats.status || '--') + ' ❱';
        document.getElementById('stoneValue').textContent = '❰ ' + (charStats.stones || '--') + ' ❱';
        
        const hp = charStats.hp || { current: 100, max: 100 };
        const mp = charStats.mp || { current: 0, max: 0 };
        const xp = charStats.xp || { current: 0, max: 100 };
        const life = charStats.life || { current: 0, max: 80 };
        document.getElementById('hpValue').textContent = hp.current !== '' ? hp.current + '/' + hp.max : '--/--';
        document.getElementById('mpValue').textContent = mp.current !== '' ? mp.current + '/' + mp.max : '--/--';
        document.getElementById('xpValue').textContent = (charStats.breakthrough || '--') + '%';
        document.getElementById('lifeValue').textContent = life.current !== '' ? life.current + '/' + life.max + ' 年' : '--/-- 年';
        const hpPct = hp.max > 0 && hp.current !== '' ? Math.round(hp.current / hp.max * 100) : 0;
        const mpPct = mp.max > 0 && mp.current !== '' ? Math.round(mp.current / mp.max * 100) : 0;
        const xpPct = charStats.breakthrough ? parseInt(charStats.breakthrough) : 0;
        const lifePct = life.max > 0 && life.current !== '' ? Math.round(life.current / life.max * 100) : 0;
        document.getElementById('hpBar').style.width = hpPct + '%';
        document.getElementById('mpBar').style.width = mpPct + '%';
        document.getElementById('xpBar').style.width = xpPct + '%';
        document.getElementById('lifeBar').style.width = lifePct + '%';
      }

    // ===== 输入框自适应 =====
    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
    function handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    // ===== 添加消息 =====
    function addMessage(text, type) {
      const chatContainer = document.getElementById('chatContainer');
      const typingIndicator = document.getElementById('typingIndicator');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + type;
      messageDiv.textContent = text;
      chatContainer.insertBefore(messageDiv, typingIndicator);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showTyping(show) {
      document.getElementById('typingIndicator').style.display = show ? 'block' : 'none';
      document.getElementById('chatContainer').scrollTop = document.getElementById('chatContainer').scrollHeight;
    }

    function getMessagesWithSystem() {
      const activeSettingId = localStorage.getItem('activeSettingId');
      const settings = JSON.parse(localStorage.getItem('settingsList') || '[]');
      const activeSetting = settings.find(s => s.id === activeSettingId);
      if (activeSetting && activeSetting.content && activeSetting.content.trim()) {
        return [{ role: 'system', content: activeSetting.content }, ...chatHistory];
      }
      return chatHistory;
    }

    // ===== 发送消息 =====
    async function sendMessage() {
      const input = document.getElementById('messageInput');
      const sendBtn = document.getElementById('sendBtn');
      const text = input.value.trim();
      if (!text) return;

      input.disabled = true;
      sendBtn.disabled = true;
      showTyping(true);
      addMessage(text, 'user');
      chatHistory.push({ role: 'user', content: text });
      input.value = '';
      input.style.height = 'auto';

      try {
        const apiUrl = config.baseUrl.endsWith('/v1')
          ? config.baseUrl + '/chat/completions'
          : config.baseUrl + '/v1/chat/completions';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + config.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: config.modelName,
            messages: getMessagesWithSystem(),
            max_tokens: 1000,
            stream: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || '请求失败: ' + response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessage = '';
        const chatContainer = document.getElementById('chatContainer');
        const typingIndicator = document.getElementById('typingIndicator');
        const streamMsgDiv = document.createElement('div');
        streamMsgDiv.className = 'message ai';
        chatContainer.insertBefore(streamMsgDiv, typingIndicator);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                const delta = json.choices[0].delta.content;
                if (delta) {
                  aiMessage += delta;
                  streamMsgDiv.textContent = aiMessage;
                  chatContainer.scrollTop = chatContainer.scrollHeight;
                }
              } catch (e) {}
            }
          }
        }

        chatHistory.push({ role: 'assistant', content: aiMessage });

      } catch (error) {
        addMessage('错误: ' + error.message, 'error');
        console.error('发送失败:', error);
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        showTyping(false);
        input.focus();
      }
    }

    // ===== 悟道系统 =====
    let daoCircles = [];
    let selectedCircleId = null;
    let daoConfigs = {};

    async function loadDaoCircles() {
      try {
        const res = await fetch('ztk/wd/dao_config.json');
        if (res.ok) {
          daoCircles = await res.json();
        }
      } catch(e) {
        daoCircles = getDefaultDaoCircles();
      }
      for (const c of daoCircles) {
        try {
          const r = await fetch('ztk/wd/' + c.path + '.json');
          if (r.ok) daoConfigs[c.path] = await r.json();
        } catch(e) {}
      }
      renderDaoCircles();
    }

      function getDefaultDaoCircles() {
      return [
        { id:1, name:"circle_1", label:"第一重天", desc:"先天一炁，混元归一", comment:"起始悟道节点", cost:"1/1", costRatio:0, unlocked:false, prereq:null, path:"circle_1" },
        { id:2, name:"circle_2", label:"第二重天", desc:"阴阳交感，万物化生", comment:"需第一重天完成后解锁", cost:"3/5", costRatio:0, unlocked:false, prereq:"circle_1", path:"circle_2" },
        { id:3, name:"circle_3", label:"第三重天", desc:"三才具足，大道可期", comment:"需前两层完成后解锁", cost:"5/8", costRatio:0, unlocked:false, prereq:"circle_2", path:"circle_3" }
      ];
    }

    function createCircleSVG(circle) {
      const isGolden = circle.costRatio === 1.0;
      const color = isGolden ? '#ffd700' : '#222';
      const strokeColor = isGolden ? '#ffd700' : '#222';
      const dotColor = isGolden ? '#ffd700' : '#666';
      const goldenCls = isGolden ? 'golden' : '';
      return `<svg class="dao-circle-svg${goldenCls}" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="70" fill="rgba(20,20,20,0.8)" stroke="${color}" stroke-width="2" opacity="0.6"/>
        <g class="dao-twist-group-cw">
          <ellipse cx="80" cy="80" rx="60" ry="25" fill="none" stroke="${strokeColor}" stroke-width="5" class="dao-twist-line" opacity="0.9"/>
        </g>
        <g class="dao-twist-group-ccw">
          <ellipse cx="80" cy="80" rx="25" ry="60" fill="none" stroke="${strokeColor}" stroke-width="5" class="dao-twist-line" opacity="0.9"/>
        </g>
        <circle cx="80" cy="80" r="6" fill="${isGolden ? '#ffd700' : '#888'}" opacity="0.8"/>
        <circle cx="80" cy="10" r="3" fill="${dotColor}" opacity="0.5"/>
        <circle cx="80" cy="150" r="3" fill="${dotColor}" opacity="0.5"/>
        <circle cx="10" cy="80" r="3" fill="${dotColor}" opacity="0.5"/>
        <circle cx="150" cy="80" r="3" fill="${dotColor}" opacity="0.5"/>
      </svg>`;
    }

    function renderDaoCircles() {
      const wrap = document.getElementById('daoCirclesWrap');
      wrap.innerHTML = '';
      for (const c of daoCircles) {
        const wrapper = document.createElement('div');
        wrapper.className = 'dao-circle-wrapper' + (c.unlocked ? ' unlocked' : ' locked');
        wrapper.dataset.id = c.id;
        wrapper.innerHTML = createCircleSVG(c) + `<div class="dao-circle-label ${c.unlocked ? 'unlocked' : 'locked-label'}">${c.unlocked ? c.label : '???'}</div>`;
        wrapper.onclick = () => onCircleClick(c);
        wrap.appendChild(wrapper);
      }
    }

    function onCircleClick(circle) {
      if (!circle.unlocked) return;
      selectedCircleId = circle.id;
      const panel = document.getElementById('daoConfigPanel');
      const cfg = daoConfigs[circle.path] || {};
      document.getElementById('daoPanelTitle').textContent = circle.label + ' - 配置详情';
      document.getElementById('daoFieldName').textContent = cfg.name || '()';
      document.getElementById('daoFieldDesc').textContent = cfg.desc || '()';
      document.getElementById('daoFieldComment').textContent = cfg.comment || '()';
      document.getElementById('daoFieldCost').textContent = circle.cost + (circle.costRatio === 1.0 ? ' (已激活)' : '');
      panel.classList.add('show');
    }

    loadDaoCircles();

    // ===== 初始化 =====
    loadStats();
    loadAllRoles();
    updateModelInfo();
    loadOptions();
  

  
    // ===== 个性化背景 =====
    function openCustom() {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
      const modal = document.createElement('div');
      modal.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:30px;max-width:400px;width:90%;color:white;';
      var html = '<h2 style="text-align:center;margin-bottom:20px;color:#00ff88;">个性化背景</h2>';
      html += '<div style="margin-bottom:15px;padding:15px;background:rgba(255,255,255,0.05);border-radius:10px;">';
      html += '<div style="font-size:16px;margin-bottom:10px;">选择预设背景：</div>';
      html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
      html += '<img src="a.jpg" onclick="setBg(`a.jpg`)" style="width:80px;height:60px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;" onmouseover="this.style.borderColor=`#00ff88`" onmouseout="this.style.borderColor=`transparent`;">';
      html += '</div></div>';
      html += '<div style="margin-bottom:15px;padding:15px;background:rgba(255,255,255,0.05);border-radius:10px;">';
      html += '<div style="font-size:16px;margin-bottom:10px;">上传自定义背景：</div>';
      html += '<input type="file" id="bgUpload" accept="image/*" onchange="uploadBg(event)" style="color:white;font-size:14px;"></div>';
      html += '<button onclick="this.closest(`div[style]`).parentElement.remove()" style="width:100%;padding:12px;background:linear-gradient(135deg,#00d4ff,#0099cc);border:none;border-radius:10px;color:white;font-size:16px;cursor:pointer;">关闭</button>';
      modal.innerHTML = html;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    }
    function setBg(url) {
      document.body.style.backgroundImage = "url('" + url + "')";
      localStorage.setItem("customBg", url);
      if (url === "b.png" || !url.startsWith("http")) {
        localStorage.removeItem("customBgData");
      }
    }
    function uploadBg(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        document.body.style.backgroundImage = "url('" + dataUrl + "')";
        localStorage.setItem("customBg", dataUrl);
        localStorage.setItem("customBgData", dataUrl);
      };
      reader.readAsDataURL(file);
    }
    // 恢复背景
    (function() {
      const savedBg = localStorage.getItem("customBg");
      const savedBgData = localStorage.getItem("customBgData");
      if (savedBgData) {
        document.body.style.backgroundImage = "url('" + savedBgData + "')";
      } else if (savedBg) {
        document.body.style.backgroundImage = "url('" + savedBg + "')";
      }
    })();

    // ===== 选项按钮 =====
    async function loadOptions() {
      try {
        const res = await fetch('xx/options.json');
        if (res.ok) {
          const opts = await res.json();
          const row = document.getElementById('optionsRow');
          row.innerHTML = '';
          for (const opt of opts) {
            const btn = document.createElement('button');
            btn.className = 'opt-btn';
            btn.textContent = opt.text || '';
            btn.onclick = () => sendOption(opt.msg || opt.text || '');
            row.appendChild(btn);
          }
        }
      } catch(e) {}
    }
    function sendOption(msg) {
      if (!msg) return;
      document.getElementById('messageInput').value = msg;
      sendMessage();
    }


    // ===== 存档/读档系统 =====
    const SAVE_SLOTS = ["c1","c2","c3","c4","c5"];
    var saveListCache = [];

    async function showSaveLoadUI() {
      var overlay = document.createElement("div");
      overlay.id = "saveLoadOverlay";
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:2000;";
      var html = "<div style=\"background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:30px;max-width:520px;width:90%;color:white;\">";
      html += "<h2 style=\"text-align:center;margin-bottom:20px;color:#00d4ff;\">存档 / 读档</h2>";
      html += "<div style=\"display:flex;gap:10px;margin-bottom:15px;justify-content:center;\">";
      html += "<button id=\"tabSave\" onclick=\"switchSaveTab('save')\" style=\"padding:8px 20px;background:rgba(0,212,255,0.2);border:1px solid rgba(0,212,255,0.5);border-radius:8px;color:white;cursor:pointer;\">存档</button>";
      html += "<button id=\"tabLoad\" onclick=\"switchSaveTab('load')\" style=\"padding:8px 20px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:white;cursor:pointer;\">读档</button>";
      html += "</div>";
      html += "<div id=\"saveContent\" style=\"display:block;\"></div>";
      html += "<div id=\"loadContent\" style=\"display:none;\"></div>";
      html += "<div style=\"text-align:center;margin-top:20px;\">";
      html += "<button onclick=\"closeSaveLoadUI()\" style=\"padding:10px 30px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:white;cursor:pointer;\">关闭</button>";
      html += "</div></div>";
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      overlay.onclick = function(e) { if (e.target === overlay) closeSaveLoadUI(); };
      await refreshSaveList();
      switchSaveTab("save");
    }

    function closeSaveLoadUI() {
      var overlay = document.getElementById("saveLoadOverlay");
      if (overlay) overlay.remove();
    }

    function switchSaveTab(tab) {
      var t1 = document.getElementById("tabSave");
      var t2 = document.getElementById("tabLoad");
      if (!t1 || !t2) return;
      t1.style.background = tab === "save" ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.1)";
      t1.style.borderColor = tab === "save" ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.2)";
      t2.style.background = tab === "load" ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.1)";
      t2.style.borderColor = tab === "load" ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.2)";
      if (tab === "save") renderSaveSlots();
      else renderLoadSlots();
    }

    async function refreshSaveList() {
      try {
        var res = await fetch("http://localhost:3000/api/saves");
        saveListCache = res.ok ? await res.json() : [];
      } catch(e) { saveListCache = []; }
    }

    function getSlotInfo(slot) {
      for (var i = 0; i < saveListCache.length; i++) {
        if (saveListCache[i].slot === slot) return saveListCache[i];
      }
      return null;
    }

    function renderSaveSlots() {
      var container = document.getElementById("saveContent");
      container.style.display = "block";
      var lc = document.getElementById("loadContent");
      if (lc) lc.style.display = "none";
      var html = "<div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px;\">";
      for (var i = 0; i < SAVE_SLOTS.length; i++) {
        var slot = SAVE_SLOTS[i];
        var info = getSlotInfo(slot);
        var hasSave = info !== null;
        var timeStr = hasSave ? (info.timestamp || "").slice(0, 16).replace("T", " ") : "空";
        html += "<div style=\"text-align:center;\">";
        html += "<div style=\"font-size:14px;font-weight:bold;margin-bottom:4px;\">存档" + slot + "</div>";
        html += "<div style=\"font-size:11px;opacity:0.6;margin-bottom:8px;\" title=\"" + timeStr + "\">" + timeStr + "</div>";
        html += "<button onclick=\"saveGame('" + slot + "')\" style=\"width:100%;padding:10px 4px;background:" + (hasSave ? "rgba(255,100,100,0.15)" : "rgba(0,255,136,0.1)") + ";border:1px solid " + (hasSave ? "rgba(255,100,100,0.4)" : "rgba(0,255,136,0.3)") + ";border-radius:10px;color:" + (hasSave ? "#ff6b6b" : "#00ff88") + ";cursor:pointer;font-size:12px;\">" + (hasSave ? "覆盖存档" : "点击存档") + "</button>";
        html += "</div>";
      }
      html += "</div>";
      html += "<p style=\"text-align:center;font-size:11px;opacity:0.4;margin-top:12px;\">存档保存在 server/saves/ 目录下</p>";
      container.innerHTML = html;
    }

    function renderLoadSlots() {
      var container = document.getElementById("loadContent");
      container.style.display = "block";
      var sc = document.getElementById("saveContent");
      if (sc) sc.style.display = "none";
      var html = "<div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:10px;\">";
      for (var i = 0; i < SAVE_SLOTS.length; i++) {
        var slot = SAVE_SLOTS[i];
        var info = getSlotInfo(slot);
        var hasSave = info !== null;
        var timeStr = hasSave ? (info.timestamp || "").slice(0, 16).replace("T", " ") : "空";
        var msgCount = hasSave ? (info.chatCount || 0) : 0;
        html += "<div style=\"text-align:center;\">";
        html += "<div style=\"font-size:14px;font-weight:bold;margin-bottom:4px;\">读档" + slot + "</div>";
        html += "<div style=\"font-size:11px;opacity:0.6;margin-bottom:8px;\" title=\"" + timeStr + "\">" + timeStr + (hasSave ? " · " + msgCount + "条消息" : "") + "</div>";
        html += "<button onclick=\"loadGame('" + slot + "')\" style=\"width:100%;padding:10px 4px;background:" + (hasSave ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)") + ";border:1px solid " + (hasSave ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.15)") + ";border-radius:10px;color:" + (hasSave ? "#00d4ff" : "rgba(255,255,255,0.3)") + ";cursor:" + (hasSave ? "pointer" : "not-allowed") + ";opacity:" + (hasSave ? "1" : "0.5") + ";font-size:12px;\"}" + (hasSave ? "读取存档" : "无存档") + "</button>";
        html += "</div>";
      }
      html += "</div>";
      html += "<p style=\"text-align:center;font-size:11px;opacity:0.4;margin-top:12px;\">读取后将替换当前所有数据</p>";
      container.innerHTML = html;
    }

    const API_BASE = "http://localhost:3000/api";

    async function saveGame(slot) {
      try {
        var statsJson = JSON.stringify(charStats, null, 2);
        var daoConfigJson = JSON.stringify(daoCircles, null, 2);
        var rolesJson = JSON.stringify(roles, null, 2);
        var chatLog = "";
        if (chatHistory && chatHistory.length > 0) {
          for (var i = 0; i < chatHistory.length; i++) {
            var msg = chatHistory[i];
            var role = msg.role === "user" ? "玩家" : "AI";
            chatLog += role + ": " + msg.content + "\n\n";
          }
        }
        var data = {
          version: "1.0",
          slot: slot,
          timestamp: new Date().toISOString(),
          stats: statsJson,
          daoConfig: daoConfigJson,
          daoCircles: JSON.stringify(daoConfigs, null, 2),
          roles: rolesJson,
          chatLog: chatLog
        };
        var res = await fetch(API_BASE + "/save/" + slot, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          await refreshSaveList();
          renderSaveSlots();
          updateStatsUI();
          loadAllRoles();
          renderDaoCircles();
          alert("存档 " + slot + " 成功！");
        } else {
          alert("存档失败，请确认后端服务已启动");
        }
      } catch(e) {
        alert("存档失败: " + e.message);
      }
    }

    async function loadGame(slot) {
      try {
        var res = await fetch(API_BASE + "/load/" + slot);
        if (!res.ok) {
          alert("存档 " + slot + " 不存在");
          return;
        }
        var data = await res.json();
        if (data.stats) charStats = JSON.parse(data.stats);
        if (data.daoConfig) daoCircles = JSON.parse(data.daoConfig);
        if (data.daoCircles) daoConfigs = JSON.parse(data.daoCircles);
        if (data.roles) {
          roles.length = 0;
          var loadedRoles = JSON.parse(data.roles);
          for (var i = 0; i < loadedRoles.length; i++) roles.push(loadedRoles[i]);
        }
        if (data.chatLog) {
          chatHistory = [];
          var lines = data.chatLog.split("\n\n");
          for (var j = 0; j < lines.length; j++) {
            var line = lines[j].trim();
            if (!line) continue;
            if (line.startsWith("玩家:")) chatHistory.push({role:"user", content:line.substring(3).trim()});
            else if (line.startsWith("AI:")) chatHistory.push({role:"assistant", content:line.substring(3).trim()});
          }
          var chatContainer = document.getElementById("chatContainer");
          var typingIndicator = document.getElementById("typingIndicator");
          chatContainer.innerHTML = "";
          chatContainer.appendChild(typingIndicator);
          for (var k = 0; k < chatHistory.length; k++) {
            var msg = chatHistory[k];
            var div = document.createElement("div");
            div.className = "message " + (msg.role === "user" ? "user" : "ai");
            div.textContent = msg.content;
            chatContainer.insertBefore(div, typingIndicator);
          }
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        updateStatsUI();
        loadAllRoles();
        renderDaoCircles();
        alert("读档 " + slot + " 成功！");
      } catch(e) {
        alert("读档失败: " + e.message);
      }
    }

    function searchMessages(e) {
      if (e) e.preventDefault();
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      const chatContainer = document.getElementById('chatContainer');
      const messages = document.querySelectorAll('#chatContainer .message');
      messages.forEach(function(m) {
        if (!query) {
          if (m.dataset.origHtml) { m.innerHTML = m.dataset.origHtml; delete m.dataset.origHtml; }
          m.style.display = '';
          return;
        }
        const text = m.textContent;
        const lowerText = text.toLowerCase();
        const idx = lowerText.indexOf(query);
        if (idx === -1) { m.style.display = 'none'; return; }
        m.style.display = '';
        if (!m.dataset.origHtml) m.dataset.origHtml = m.innerHTML;
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + query.length);
        const after = text.slice(idx + query.length);
        m.innerHTML = escHtml(before) + '<mark style="background:#ff4444;color:white;border-radius:2px;padding:0 2px;">' + escHtml(match) + '</mark>' + escHtml(after);
      });
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    function escHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }


    // ===== 页面初始化 =====
    updateModelInfo();
    loadStats();
