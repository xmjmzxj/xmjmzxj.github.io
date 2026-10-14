/* ==========================================================
   全局配置 —— 部署前请按注释修改
   ========================================================== */

var APP_CONFIG = {

  /* 站点名称，出现在标题与海报上 */
  siteName: '人情世故段位',

  /* 站点公开地址（海报上的网址、分享链接） */
  siteUrl: 'https://xmjmzxj.github.io/renqing/',

  /* 是否要求输入测试密码才能开始答题
     true  = 开店模式，买家需输入密码
     false = 免费推广模式，谁都能测 */
  requirePassword: true,

  /* 自己验收用：网址后面加 ?free=1 可临时跳过密码（不写死进代码） */
  freeParam: 'free',

  /* 进入后台管理页所需的密钥（部署前务必改掉） */
  adminKey: 'rqdw@2026',

  /* 社交证明展示的数字（可写死，也可以留空自动用本地计数） */
  baseUserCount: 128460,

  /* ---------- 可选：接入 Supabase 做云端密码校验 + 数据统计 ----------
     纯静态模式下密码池放在 data/passwords.json，所有人共用。
     若想「一码一用 + 后台看真实数据」，填下面三项即可自动启用。
     建表 SQL 见项目 README.md */
  supabase: {
    url: '',          // 例：https://abcdefgh.supabase.co
    anonKey: '',      // Supabase 的 anon public key
    resultTable: 'rqdw_results',
    passTable: 'rqdw_passwords'
  },

  /* 本地存储 key（未接 Supabase 时的数据落地位置） */
  storageKey: {
    records: 'rqdw_records',
    usedPass: 'rqdw_used_pass',
    localPass: 'rqdw_local_pass'
  },

  /* 免责声明 */
  disclaimer: '本测评结果基于情境选项生成，仅供自我觉察与娱乐参考，不构成任何专业心理诊断。'
};

/* 是否处于「免费直通」状态 */
APP_CONFIG.isFreeMode = function () {
  if (!APP_CONFIG.requirePassword) return true;
  try {
    var q = new URLSearchParams(location.search);
    return q.get(APP_CONFIG.freeParam) === '1';
  } catch (e) {
    return false;
  }
};

/* Supabase 是否已配置 */
APP_CONFIG.supabaseReady = function () {
  var s = APP_CONFIG.supabase;
  return !!(s && s.url && s.anonKey);
};
