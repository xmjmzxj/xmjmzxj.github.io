/* ==========================================================
   人情世故段位 · 主流程
   封面 → 密码 → 答题 → 计算 → 结果 → 海报
   ========================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    index: 0,          // 当前题号（0 基）
    answers: [],       // [{ qid, dim, s }]
    passCode: '',      // 使用的密码
    result: null,
    posterCanvas: null,
    verified: false
  };

  /* ============ 工具 ============ */
  function showView(id) {
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) views[i].classList.remove('is-active');
    var el = $(id);
    if (el) el.classList.add('is-active');
    window.scrollTo(0, 0);
  }

  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, ms || 2200);
  }

  function hexA(hex, a) {
    hex = (hex || '#d9a441').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function dimName(key) {
    for (var i = 0; i < DIMENSIONS.length; i++) if (DIMENSIONS[i].key === key) return DIMENSIONS[i].name;
    return '';
  }

  /* ============ 封面初始化 ============ */
  function initCover() {
    $('brandName').textContent = APP_CONFIG.siteName;
    $('coverDisclaimer').textContent = APP_CONFIG.disclaimer;
    document.title = APP_CONFIG.siteName + '测试 · 3 分钟测出你在人际场上的段位';

    /* 人数：基础数 + 本机累计 */
    var base = APP_CONFIG.baseUserCount || 0;
    var local = 0;
    try {
      local = (JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.records) || '[]') || []).length;
    } catch (e) { local = 0; }
    $('statUsers').textContent = (base + local).toLocaleString('zh-CN');

    /* 密码区 */
    if (APP_CONFIG.isFreeMode()) {
      $('passBox').hidden = true;
      $('coverNoteText').textContent = '无需密码 · 结果本地生成 · 秒出海报';
      state.verified = true;
    } else {
      $('passBox').hidden = false;
    }
  }

  /* ============ 密码校验 ============ */
  function loadLocalPasswords() {
    return fetch('data/passwords.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { codes: [] }; })
      .then(function (d) { return (d && d.codes) || []; })
      .catch(function () { return []; });
  }

  function normCode(s) {
    return String(s || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function verifyAgainstLocal(code) {
    return loadLocalPasswords().then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var item = typeof list[i] === 'string' ? { code: list[i] } : list[i];
        if (normCode(item.code) === code) {
          var disabled = item.disabled === true || item.used === true;
          if (disabled && !APP_CONFIG.isFreeMode()) {
            return { ok: false, msg: '这个密码已被使用过了' };
          }
          return { ok: true, code: code };
        }
      }
      return { ok: false, msg: '密码不正确，请核对后重试' };
    });
  }

  function verifyAgainstSupabase(code) {
    var s = APP_CONFIG.supabase;
    var url = s.url.replace(/\/$/, '') + '/rest/v1/' + s.passTable +
              '?code=eq.' + encodeURIComponent(code) + '&select=code,used&limit=1';
    return fetch(url, {
      headers: { apikey: s.anonKey, Authorization: 'Bearer ' + s.anonKey }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!rows || !rows.length) return { ok: false, msg: '密码不存在，请核对后重试' };
        if (rows[0].used) return { ok: false, msg: '这个密码已经被使用过了' };
        return { ok: true, code: code };
      })
      .catch(function () { return { ok: false, msg: '网络异常，请稍后重试' }; });
  }

  function verifyPassword(raw) {
    var code = normCode(raw);
    if (!code) return Promise.resolve({ ok: false, msg: '请先输入密码' });
    if (code.length < 4) return Promise.resolve({ ok: false, msg: '密码格式不对，请检查' });

    var chain = APP_CONFIG.supabaseReady()
      ? verifyAgainstSupabase(code)
      : verifyAgainstLocal(code);

    return chain.then(function (res) {
      if (!res.ok) return res;
      /* 记录到已用列表（仅本机标记，用于后台查看） */
      try {
        var used = JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.usedPass) || '[]');
        if (used.indexOf(code) === -1) {
          used.push({ code: code, ts: Date.now() });
          localStorage.setItem(APP_CONFIG.storageKey.usedPass, JSON.stringify(used));
        }
      } catch (e) { /* ignore */ }
      return res;
    });
  }

  function bindPass() {
    var input = $('passInput');
    var btn = $('passBtn');
    var hint = $('passHint');

    btn.addEventListener('click', function () {
      var raw = input.value;
      btn.disabled = true;
      btn.textContent = '验证中';
      verifyPassword(raw).then(function (res) {
        btn.disabled = false;
        btn.textContent = '验证';
        hint.classList.remove('err', 'ok');
        if (res.ok) {
          state.verified = true;
          state.passCode = res.code;
          hint.classList.add('ok');
          hint.textContent = '验证通过，可以开始了';
          input.disabled = true;
          btn.disabled = true;
          btn.textContent = '已通过';
          toast('密码验证通过');
        } else {
          hint.classList.add('err');
          hint.textContent = res.msg;
        }
      });
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btn.click();
    });
  }

  /* ============ 答题 ============ */
  function renderQuestion(i) {
    var q = QUESTIONS[i];
    $('quizDim').textContent = '场景 · ' + dimName(q.dim);
    $('quizText').textContent = q.text;
    $('curNo').textContent = (i + 1);
    $('progressFill').style.width = ((i) / QUESTIONS.length * 100 + (4 / QUESTIONS.length * 100)) + '%';

    /* 第一题时把进度条设到最小可见值 */
    if (i === 0) $('progressFill').style.width = (100 / QUESTIONS.length) + '%';

    var letters = ['A', 'B', 'C', 'D'];
    var box = $('optList');
    box.innerHTML = '';

    q.options.forEach(function (opt, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.style.animationDelay = (k * 55) + 'ms';
      b.innerHTML = '<span class="idx">' + letters[k] + '</span><span class="opt-txt"></span>';
      b.querySelector('.opt-txt').textContent = opt.t;

      var prev = state.answers[i];
      if (prev && prev.k === k) b.classList.add('picked');

      b.addEventListener('click', function () { pick(i, k, b); });
      box.appendChild(b);
    });

    /* 返回按钮：第一题禁用视觉 */
    var back = $('backBtn');
    back.style.opacity = i === 0 ? '.35' : '1';
    back.style.pointerEvents = i === 0 ? 'none' : 'auto';
  }

  var locking = false;

  function pick(i, k, btn) {
    if (locking) return;

    var q = QUESTIONS[i];
    state.answers[i] = { qid: q.id, dim: q.dim, s: q.options[k].s, k: k };

    var opts = document.querySelectorAll('#optList .opt');
    for (var n = 0; n < opts.length; n++) opts[n].classList.remove('picked');
    btn.classList.add('picked');

    locking = true;
    setTimeout(function () {
      locking = false;
      if (i + 1 < QUESTIONS.length) {
        state.index = i + 1;
        renderQuestion(state.index);
      } else {
        finish();
      }
    }, 260);
  }

  function bindBack() {
    $('backBtn').addEventListener('click', function () {
      if (state.index > 0 && !locking) {
        state.index -= 1;
        renderQuestion(state.index);
      }
    });
  }

  /* ============ 完成 → 计算 ============ */
  var LOADING_TEXTS = [
    '正在解析你的人情底色…',
    '比对常模数据，生成专属画像…',
    '计算你的五维能力分布…',
    '结果马上就好…'
  ];

  function finish() {
    showView('view-loading');
    var li = 0;
    $('loadingText').textContent = LOADING_TEXTS[0];
    var timer = setInterval(function () {
      li = (li + 1) % LOADING_TEXTS.length;
      $('loadingText').textContent = LOADING_TEXTS[li];
    }, 620);

    var verified = state.answers.filter(Boolean).map(function (a) {
      return { dim: a.dim, s: a.s };
    });

    var result = computeResult(verified);
    state.result = result;
    window.__lastResult = result;

    reportResult(result);

    setTimeout(function () {
      clearInterval(timer);
      renderResult(result);
      showView('view-result');
    }, 1750);
  }

  /* ============ 数据上报 ============ */
  function reportResult(result) {
    var rec = {
      ts: Date.now(),
      total: result.total,
      rank: result.rank.name,
      code: state.passCode || '',
      dims: {},
      ref: document.referrer ? document.referrer.slice(0, 80) : ''
    };
    result.dims.forEach(function (d) { rec.dims[d.key] = d.score; });

    /* 本地 */
    try {
      var arr = JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.records) || '[]');
      arr.push(rec);
      if (arr.length > 500) arr = arr.slice(-500);
      localStorage.setItem(APP_CONFIG.storageKey.records, JSON.stringify(arr));
    } catch (e) { /* ignore */ }

    /* Supabase */
    if (APP_CONFIG.supabaseReady()) {
      var s = APP_CONFIG.supabase;
      fetch(s.url.replace(/\/$/, '') + '/rest/v1/' + s.resultTable, {
        method: 'POST',
        headers: {
          apikey: s.anonKey,
          Authorization: 'Bearer ' + s.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify([{
          total: rec.total,
          rank: rec.rank,
          dims: rec.dims,
          code: rec.code
        }])
      }).catch(function () { /* 静默失败，不影响用户体验 */ });
    }
  }

  /* ============ 渲染结果 ============ */
  function renderResult(result) {
    var rk = result.rank;
    var head = $('resultHead');
    head.style.background = 'linear-gradient(180deg, ' + hexA(rk.color, .22) + ', rgba(20,17,15,0))';

    $('rankEmoji').textContent = rk.emoji;
    $('rankCode').textContent = rk.code;
    $('rankName').textContent = rk.name;
    $('rankTag').textContent = '「' + rk.tag + '」';
    $('rankDesc').textContent = rk.desc;
    $('resultFoot').textContent = APP_CONFIG.disclaimer;

    /* 数字滚动 */
    animateNumber($('beatPct'), result.beat, '%', 900);

    /* 维度 */
    var list = $('dimList');
    list.innerHTML = '';
    result.dims.forEach(function (d, i) {
      var row = document.createElement('div');
      row.className = 'dim-row lv-' + d.level;
      row.innerHTML =
        '<div class="dim-top">' +
          '<span class="dim-name">' + d.name + '<small>' + d.desc + '</small></span>' +
          '<span class="dim-score">' + d.score + '/20</span>' +
        '</div>' +
        '<div class="dim-track"><i class="dim-fill"></i></div>' +
        '<p class="dim-comment"></p>';
      row.querySelector('.dim-comment').textContent = d.comment;
      list.appendChild(row);

      setTimeout(function () {
        row.querySelector('.dim-fill').style.width = d.pct + '%';
      }, 120 + i * 110);
    });

    $('dimSummary').innerHTML =
      '你的最强项是 <b>' + result.strongest.name + '</b>（' + result.strongest.score + '/20），' +
      '最需要补的是 <b>' + result.weakest.name + '</b>（' + result.weakest.score + '/20）。' +
      '整体段位 <b>' + rk.code + '·' + rk.name + '</b>，总分 ' + result.total + '/100。';

    /* 优势 / 建议 */
    fillList($('strengthList'), result.strengths);
    fillList($('adviceList'), result.advices);

    $('quoteBlock').textContent = rk.quote;
  }

  function fillList(el, arr) {
    el.innerHTML = '';
    arr.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      el.appendChild(li);
    });
  }

  function animateNumber(el, target, suffix, dur) {
    var t0 = Date.now();
    var isInt = Math.abs(target - Math.round(target)) < 0.01;
    var timer = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = target * e;
      el.textContent = (isInt ? Math.round(v) : v.toFixed(1)) + suffix;
      if (p >= 1) clearInterval(timer);
    }, 40);
  }

  /* ============ 海报 ============ */
  function bindPoster() {
    $('posterBtn').addEventListener('click', function () {
      if (!state.result) return;
      var btn = $('posterBtn');
      btn.disabled = true;
      btn.textContent = '生成中…';

      makePoster(state.result).then(function (canvas) {
        state.posterCanvas = canvas;
        var url = posterDataURL(canvas);
        if (!url) {
          toast('海报生成失败，请重试');
          return;
        }
        $('posterImg').src = url;
        $('posterModal').hidden = false;

        var shareTip = (navigator.canShare && navigator.share)
          ? '点击下方按钮可直接存到手机相册'
          : '点击保存后，图片会存到「下载 / 文件」目录';
        $('modalTip').textContent = shareTip;
      }).catch(function () {
        toast('海报生成失败，请重试');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '生成段位海报';
      });
    });

    $('modalClose').addEventListener('click', closeModal);
    $('modalMask').addEventListener('click', closeModal);

    $('saveImgBtn').addEventListener('click', function () {
      if (!state.posterCanvas) return;
      var btn = $('saveImgBtn');
      btn.disabled = true;
      btn.textContent = '处理中…';
      savePosterToAlbum(state.posterCanvas).then(function (r) {
        if (r.mode === 'share') {
          toast('已调起保存，选择「存储图像」即可');
        } else if (r.mode === 'download') {
          toast('图片已保存，去相册或下载目录看看');
        } else if (r.mode === 'cancel') {
          /* 用户取消，不提示 */
        }
      }).catch(function () {
        toast('保存失败，可长按图片保存');
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '保存到相册';
      });
    });
  }

  function closeModal() {
    $('posterModal').hidden = true;
  }

  /* ============ 分享 ============ */
  function bindShare() {
    $('shareBtn').addEventListener('click', function () {
      var rk = state.result ? state.result.rank : null;
      var text = '我的人情世故段位是「' + (rk ? rk.code + '·' + rk.name : '') + '」，你呢？';
      var url = APP_CONFIG.siteUrl;

      if (navigator.share) {
        navigator.share({ title: APP_CONFIG.siteName + '测试', text: text, url: url })
          .catch(function () { /* 用户取消 */ });
        return;
      }
      /* 回退：复制链接 */
      var full = text + ' ' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(function () {
          toast('链接已复制，去粘贴给朋友吧');
        }).catch(function () { toast(url); });
      } else {
        toast(url, 4000);
      }
    });
  }

  /* ============ 重测 ============ */
  function bindAgain() {
    $('againBtn').addEventListener('click', function () {
      state.index = 0;
      state.answers = [];
      state.result = null;
      state.posterCanvas = null;
      window.__lastResult = null;
      renderQuestion(0);
      showView('view-quiz');
    });
  }

  /* ============ 开始 ============ */
  function bindStart() {
    $('startBtn').addEventListener('click', function () {
      if (APP_CONFIG.requirePassword && !state.verified) {
        var box = $('passBox');
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('passHint').classList.add('err');
        $('passHint').textContent = '请先输入密码并验证通过';
        $('passInput').focus();
        return;
      }
      state.index = 0;
      state.answers = [];
      renderQuestion(0);
      showView('view-quiz');
    });
  }

  /* ============ 启动 ============ */
  function boot() {
    initCover();
    bindPass();
    bindStart();
    bindBack();
    bindPoster();
    bindShare();
    bindAgain();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
