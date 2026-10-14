/* ==========================================================
   后台管理
   ========================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var SS_KEY = 'rqdw_admin_ok';

  var state = {
    pool: [],       // 当前密码池 [{code, used, note}]
    generated: []   // 本次生成
  };

  /* ---------- 登录 ---------- */
  function bindLogin() {
    if (sessionStorage.getItem(SS_KEY) === '1') return enter(true);

    $('loginBtn').addEventListener('click', function () {
      var v = $('keyInput').value.trim();
      if (v && v === APP_CONFIG.adminKey) {
        sessionStorage.setItem(SS_KEY, '1');
        enter(false);
      } else {
        $('loginErr').hidden = false;
        $('loginErr').textContent = '密钥不正确';
      }
    });
    $('keyInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('loginBtn').click();
    });
  }

  function enter(silent) {
    $('loginCard').hidden = true;
    $('panel').hidden = false;
    refreshData();
    if (APP_CONFIG.supabaseReady()) {
      $('dataNotice').innerHTML = '已接入 <b>Supabase</b>，下面展示的是云端真实数据。';
    } else {
      $('dataNotice').innerHTML = '当前为 <b>纯静态模式</b>，下面的统计只包含<b>本机浏览器</b>产生的记录。' +
        '想要看全部用户的真实数据，请按「部署说明」接入 Supabase。';
    }
  }

  function bindLogout() {
    $('logoutBtn').addEventListener('click', function () {
      sessionStorage.removeItem(SS_KEY);
      location.reload();
    });
  }

  /* ---------- Tab ---------- */
  function bindTabs() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        var name = this.getAttribute('data-tab');
        var all = document.querySelectorAll('.tab');
        for (var k = 0; k < all.length; k++) all[k].classList.toggle('on', all[k] === this);
        ['pass', 'data', 'help'].forEach(function (t) {
          $('tab-' + t).hidden = (t !== name);
        });
      });
    }
  }

  /* ---------- 生成密码 ---------- */
  var CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function randCode(prefix, len) {
    var s = '';
    var buf = new Uint8Array(len);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < len; i++) s += CHARS[buf[i] % CHARS.length];
    return prefix + s;
  }

  function genCodes(n, prefix, len) {
    var set = {}, out = [], guard = 0;
    while (out.length < n && guard++ < n * 300) {
      var c = randCode(prefix, len);
      if (!set[c]) { set[c] = 1; out.push(c); }
    }
    return out;
  }

  function bindGen() {
    $('genBtn').addEventListener('click', function () {
      var n = Math.max(1, Math.min(2000, parseInt($('genCount').value, 10) || 50));
      var prefix = $('genPrefix').value.trim() || 'RQ-';
      var len = Math.max(4, Math.min(12, parseInt($('genLen').value, 10) || 6));
      state.generated = genCodes(n, prefix, len);
      renderCodes(state.generated);
      updateKpi();
      toast('已生成 ' + state.generated.length + ' 个密码');
    });

    $('mergeBtn').addEventListener('click', function () {
      if (!state.generated.length) return toast('请先生成一批密码');
      var exist = {};
      state.pool.forEach(function (p) { exist[p.code] = 1; });
      var added = 0;
      state.generated.forEach(function (c) {
        if (!exist[c]) { state.pool.push({ code: c, note: '' }); exist[c] = 1; added++; }
      });
      renderCodes(state.pool.map(function (p) { return p.code; }));
      updateKpi();
      toast('已追加 ' + added + ' 个，当前池内 ' + state.pool.length + ' 个');
    });
  }

  function renderCodes(arr) {
    var box = $('codeBox');
    if (!arr || !arr.length) { box.textContent = '尚未生成或读取密码'; return; }
    box.textContent = arr.join('\n');
  }

  /* ---------- 读取线上密码池 ---------- */
  function bindLoadPool() {
    $('loadPoolBtn').addEventListener('click', function () {
      fetch('../data/passwords.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.codes) { toast('读取失败，路径可能不对'); return; }
          state.pool = d.codes.map(function (x) {
            return typeof x === 'string' ? { code: x, note: '' } : { code: x.code, used: !!x.used, note: x.note || '' };
          });
          renderCodes(state.pool.map(function (p) { return p.code; }));
          updateKpi();
          toast('已读取 ' + state.pool.length + ' 个密码');
        })
        .catch(function () { toast('读取失败：本地需用 http 服务打开'); });
    });
  }

  /* ---------- 导出 ---------- */
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function buildPoolJson() {
    var codes = state.pool.length
      ? state.pool.map(function (p) { return { code: p.code, note: p.note || '' }; })
      : state.generated.map(function (c) { return { code: c, note: '' }; });
    return JSON.stringify({
      generated: new Date().toISOString().slice(0, 10),
      prefix: (codes[0] && codes[0].code.slice(0, 3)) || 'RQ-',
      count: codes.length,
      codes: codes
    }, null, 2);
  }

  function currentList() {
    return state.pool.length ? state.pool.map(function (p) { return p.code; }) : state.generated;
  }

  function bindExport() {
    $('copyJsonBtn').addEventListener('click', function () {
      var txt = buildPoolJson();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('JSON 已复制'); })
          .catch(function () { toast('复制失败，请用下载'); });
      } else toast('浏览器不支持复制，请用下载');
    });

    $('dlJsonBtn').addEventListener('click', function () {
      if (!currentList().length) return toast('还没有密码可导出');
      download('passwords.json', buildPoolJson(), 'application/json');
      toast('已下载，覆盖项目里的 data/passwords.json 即可');
    });

    $('dlCsvBtn').addEventListener('click', function () {
      var list = currentList();
      if (!list.length) return toast('还没有密码可导出');
      var usedMap = {};
      try {
        (JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.usedPass) || '[]') || [])
          .forEach(function (u) { usedMap[u.code] = u.ts; });
      } catch (e) { /* ignore */ }
      var rows = [['密码', '状态', '使用时间']];
      list.forEach(function (c) {
        rows.push([c, usedMap[c] ? '已用' : '未用',
          usedMap[c] ? new Date(usedMap[c]).toLocaleString('zh-CN') : '']);
      });
      var csv = '\ufeff' + rows.map(function (r) { return r.join(','); }).join('\n');
      download('passwords.csv', csv, 'text/csv;charset=utf-8');
      toast('已导出 CSV');
    });
  }

  /* ---------- KPI ---------- */
  function updateKpi() {
    var total = state.pool.length || state.generated.length;
    var used = 0;
    try {
      used = (JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.usedPass) || '[]') || []).length;
    } catch (e) { used = 0; }
    $('kpiTotal').textContent = total;
    $('kpiUsed').textContent = used;
    $('kpiLeft').textContent = Math.max(0, total - used);
  }

  /* ---------- 数据统计 ---------- */
  function localRecords() {
    try {
      return JSON.parse(localStorage.getItem(APP_CONFIG.storageKey.records) || '[]') || [];
    } catch (e) { return []; }
  }

  function supabaseRecords() {
    var s = APP_CONFIG.supabase;
    var url = s.url.replace(/\/$/, '') + '/rest/v1/' + s.resultTable + '?select=*&order=ts.desc&limit=2000';
    return fetch(url, { headers: { apikey: s.anonKey, Authorization: 'Bearer ' + s.anonKey } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        return (rows || []).map(function (r) {
          return {
            ts: Date.parse(r.ts) || Date.now(),
            total: r.total,
            rank: r.rank,
            dims: r.dims || {},
            code: r.code || ''
          };
        });
      })
      .catch(function () { return []; });
  }

  function refreshData() {
    updateKpi();
    var p = APP_CONFIG.supabaseReady() ? supabaseRecords() : Promise.resolve(localRecords());
    p.then(renderData);
  }

  function renderData(recs) {
    if (!recs.length) {
      $('dTotal').textContent = '0';
      $('dAvg').textContent = '—';
      $('dTop').textContent = '—';
      $('distBody').innerHTML = '<tr><td colspan="4" style="color:var(--muted)">暂无数据</td></tr>';
      $('recentBody').innerHTML = '<tr><td colspan="8" style="color:var(--muted)">暂无数据</td></tr>';
      return;
    }

    var total = recs.length;
    var sum = 0, dist = {}, top = '', topN = 0;
    recs.forEach(function (r) {
      sum += r.total;
      dist[r.rank] = (dist[r.rank] || 0) + 1;
    });
    for (var k in dist) if (dist[k] > topN) { topN = dist[k]; top = k; }

    $('dTotal').textContent = total.toLocaleString('zh-CN');
    $('dAvg').textContent = (sum / total).toFixed(1);
    $('dTop').textContent = top;

    var dkeys = ['sense', 'tact', 'bond', 'talk', 'calm'];
    var body = '';
    Object.keys(dist).sort(function (a, b) { return dist[b] - dist[a]; }).forEach(function (name) {
      var n = dist[name];
      var dim = { sense: 0, tact: 0, bond: 0, talk: 0, calm: 0 }, cnt = 0;
      recs.forEach(function (r) {
        if (r.rank === name && r.dims) {
          dkeys.forEach(function (d) { dim[d] += (r.dims[d] || 0); });
          cnt++;
        }
      });
      var trend = cnt ? dkeys.map(function (d) { return (dim[d] / cnt).toFixed(1); }).join(' / ') : '—';
      body += '<tr><td>' + name + '</td><td>' + n + '</td><td>' +
              (n / total * 100).toFixed(1) + '%</td><td style="font-size:12px">' + trend + '</td></tr>';
    });
    $('distBody').innerHTML = body;

    var rows = recs.slice(0, 30).map(function (r) {
      var d = r.dims || {};
      return '<tr><td>' + new Date(r.ts).toLocaleString('zh-CN') + '</td><td><b>' + r.total + '</b></td><td>' +
        (r.rank || '') + '</td><td>' + (d.sense || '-') + '</td><td>' + (d.tact || '-') + '</td><td>' +
        (d.bond || '-') + '</td><td>' + (d.talk || '-') + '</td><td>' + (d.calm || '-') + '</td></tr>';
    }).join('');
    $('recentBody').innerHTML = rows;
  }

  function bindDataActions() {
    $('exportDataBtn').addEventListener('click', function () {
      var p = APP_CONFIG.supabaseReady() ? supabaseRecords() : Promise.resolve(localRecords());
      p.then(function (recs) {
        if (!recs.length) return toast('暂无数据');
        var rows = [['时间', '总分', '段位', '察言观色', '分寸拿捏', '人情经营', '话术功力', '情绪自控', '密码']];
        recs.forEach(function (r) {
          var d = r.dims || {};
          rows.push([new Date(r.ts).toLocaleString('zh-CN'), r.total, r.rank || '',
            d.sense || '', d.tact || '', d.bond || '', d.talk || '', d.calm || '', r.code || '']);
        });
        var csv = '\ufeff' + rows.map(function (x) { return x.join(','); }).join('\n');
        download('测评记录.csv', csv, 'text/csv;charset=utf-8');
        toast('已导出 ' + recs.length + ' 条');
      });
    });

    $('clearDataBtn').addEventListener('click', function () {
      if (!confirm('确定清空本机记录吗？云端数据不受影响。')) return;
      localStorage.removeItem(APP_CONFIG.storageKey.records);
      localStorage.removeItem(APP_CONFIG.storageKey.usedPass);
      refreshData();
      updateKpi();
      toast('已清空');
    });
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    bindLogin();
    bindLogout();
    bindTabs();
    bindGen();
    bindLoadPool();
    bindExport();
    bindDataActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
