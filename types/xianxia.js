// ============================================================================
// types/xianxia.js  —  修仙类型记忆词汇表
// ----------------------------------------------------------------------------
// 供 memory.js 使用：Memory.createMemory({ vocab: XIANXIA_VOCAB })
// 纯数据文件，零依赖。新增类型=新增一份 types/<type>.js。
// ============================================================================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XIANXIA_VOCAB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    npc:    ['青云宗', '后山', '守卫', '长老', '师傅', '掌门'],
    favor:  ['好感'],
    realm:  ['境界', '突破', '修为', '第一重天', '第二重天', '第三重天', '悟道'],
    item:   ['灵剑', '灵药', '灵石', '法宝', '丹药'],
    skill:  ['功法', '法术', '术法', '神通'],
    choice: ['选择', '决定', '加入', '拜师', '拜入', '立誓', '承诺'],
    quest:  ['任务', '目标', '委托', '追寻', '寻找'],
    status: ['伤势', '中毒', '痊愈', '死亡', '阵亡', '昏迷'],
  };
});
