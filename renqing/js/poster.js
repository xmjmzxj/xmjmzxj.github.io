/* ==========================================================
   海报生成 + 保存到相册
   竞品痛点：结果图只能下载到「文件/下载」目录，用户还要自己找。
   本实现：优先调用系统分享面板（Web Share Level 2），
           在 iOS/Android 上可直接「存储图像 / 保存到相册」。
   ========================================================== */

var POSTER_W = 1080;
var POSTER_H = 1920;

var F_SANS  = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",-apple-system,sans-serif';
var F_SERIF = '"Songti SC","STSong","SimSun",Georgia,serif';

/* 二维码服务（返回带 CORS 头的 PNG）。加载失败会自动跳过二维码。 */
var QR_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=';

/* ---------- 工具 ---------- */
function _rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y,     x + w, y + h, r);
  g.arcTo(x + w, y + h, x,     y + h, r);
  g.arcTo(x,     y + h, x,     y,     r);
  g.arcTo(x,     y,     x + w, y,     r);
  g.closePath();
}

/* 中文逐字换行，返回占用高度 */
function _wrapText(g, text, x, y, maxW, lh, align) {
  var line = '', lines = [];
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    var test = line + ch;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = ch; }
    else line = test;
  }
  if (line) lines.push(line);
  g.textAlign = align || 'left';
  for (var k = 0; k < lines.length; k++) g.fillText(lines[k], x, y + k * lh);
  return lines.length * lh;
}

function _loadImage(src, timeout) {
  return new Promise(function (resolve) {
    var img = new Image();
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, timeout || 3200);
    img.crossOrigin = 'anonymous';
    img.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve(img); } };
    img.onerror = function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
    img.src = src;
  });
}

/* ---------- 主绘制 ---------- */
function buildPoster(result, opts) {
  opts = opts || {};
  var W = POSTER_W, H = POSTER_H;
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var g = canvas.getContext('2d');
  var siteUrl = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.siteUrl) || '';
  var rk = result.rank;

  /* --- 背景 --- */
  var bg = g.createLinearGradient(0, 0, W * .3, H);
  bg.addColorStop(0, '#1b1611');
  bg.addColorStop(.45, '#131009');
  bg.addColorStop(1, '#0b0906');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  var glow = g.createRadialGradient(W * .5, 300, 30, W * .5, 300, 760);
  glow.addColorStop(0, 'rgba(217,164,65,.26)');
  glow.addColorStop(1, 'rgba(217,164,65,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, 1100);

  var glow2 = g.createRadialGradient(W * .95, H * .93, 20, W * .95, H * .93, 620);
  glow2.addColorStop(0, 'rgba(192,68,47,.2)');
  glow2.addColorStop(1, 'rgba(192,68,47,0)');
  g.fillStyle = glow2;
  g.fillRect(0, H - 900, W, 900);

  /* 外描边框 */
  g.strokeStyle = 'rgba(217,164,65,.28)';
  g.lineWidth = 2;
  _rr(g, 34, 34, W - 68, H - 68, 36);
  g.stroke();

  /* --- 顶部品牌 --- */
  g.textAlign = 'center';
  g.fillStyle = '#d9a441';
  g.beginPath(); g.arc(W / 2, 118, 7, 0, Math.PI * 2); g.fill();
  g.font = '600 30px ' + F_SANS;
  g.letterSpacing = '10px';
  g.fillText('人情世故段位', W / 2, 182);
  g.font = '400 24px ' + F_SANS;
  g.fillStyle = 'rgba(243,236,223,.42)';
  g.fillText('REN QING SHI GU · 段位测评', W / 2, 224);
  g.letterSpacing = '0px';

  /* --- 徽章区 --- */
  g.font = '400 150px ' + F_SANS;
  g.textAlign = 'center';
  g.fillText(rk.emoji, W / 2, 400);

  g.font = '600 28px ' + F_SANS;
  g.fillStyle = '#d9a441';
  g.letterSpacing = '12px';
  g.fillText(rk.code, W / 2, 462);
  g.letterSpacing = '0px';

  /* 段位名称（带渐变） */
  var nameGrad = g.createLinearGradient(W * .18, 0, W * .82, 0);
  nameGrad.addColorStop(0, '#f2cf82');
  nameGrad.addColorStop(.55, '#d9a441');
  nameGrad.addColorStop(1, '#e06a52');
  g.fillStyle = nameGrad;
  g.font = '700 104px ' + F_SERIF;
  g.fillText(rk.name, W / 2, 585);

  /* 一句话标签 */
  g.fillStyle = 'rgba(243,236,223,.72)';
  g.font = '400 32px ' + F_SANS;
  g.fillText('「' + rk.tag + '」', W / 2, 650);

  /* 击败百分比胶囊 */
  var badgeTxt = '击败了 ' + result.beat + '% 的测试者';
  g.font = '600 32px ' + F_SANS;
  var bw = g.measureText(badgeTxt).width + 76;
  var bx = (W - bw) / 2, by = 700, bh = 68;
  g.fillStyle = 'rgba(217,164,65,.13)';
  _rr(g, bx, by, bw, bh, bh / 2); g.fill();
  g.strokeStyle = 'rgba(217,164,65,.55)'; g.lineWidth = 2;
  _rr(g, bx, by, bw, bh, bh / 2); g.stroke();
  g.fillStyle = '#f2cf82';
  g.textAlign = 'center';
  g.fillText(badgeTxt, W / 2, by + 45);

  /* --- 分隔线 --- */
  g.strokeStyle = 'rgba(243,236,223,.1)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(120, 830); g.lineTo(W - 120, 830); g.stroke();

  /* --- 五维条 --- */
  var dimTop = 892, dimGap = 88;
  var barX = 268, barW = W - barX - 150, barH = 20;
  g.textAlign = 'left';
  result.dims.forEach(function (d, i) {
    var y = dimTop + i * dimGap;

    g.font = '600 30px ' + F_SANS;
    g.fillStyle = 'rgba(243,236,223,.92)';
    g.fillText(d.name, 120, y + 22);

    /* 轨道 */
    g.fillStyle = 'rgba(243,236,223,.08)';
    _rr(g, barX, y + 3, barW, barH, barH / 2); g.fill();

    /* 填充 */
    var fw = Math.max(barH, barW * (d.score / d.max));
    var fg = g.createLinearGradient(barX, 0, barX + barW, 0);
    if (d.level === 'low') { fg.addColorStop(0, '#5f5344'); fg.addColorStop(1, '#8d7d68'); }
    else if (d.level === 'high') { fg.addColorStop(0, '#d9a441'); fg.addColorStop(1, '#e06a52'); }
    else { fg.addColorStop(0, '#8b6d2f'); fg.addColorStop(1, '#f2cf82'); }
    g.fillStyle = fg;
    _rr(g, barX, y + 3, fw, barH, barH / 2); g.fill();

    /* 分数 */
    g.font = '600 27px ' + F_SERIF;
    g.fillStyle = '#d9a441';
    g.textAlign = 'right';
    g.fillText(d.score + '', barX + barW + 88, y + 25);
    g.textAlign = 'left';
  });

  /* --- 画像摘要 --- */
  var descY = dimTop + 5 * dimGap + 46;
  g.strokeStyle = 'rgba(243,236,223,.1)';
  g.beginPath(); g.moveTo(120, descY - 34); g.lineTo(W - 120, descY - 34); g.stroke();

  g.font = '400 32px ' + F_SANS;
  g.fillStyle = 'rgba(205,194,174,.86)';
  g.textAlign = 'left';
  var shortDesc = rk.desc.length > 128 ? rk.desc.slice(0, 126) + '…' : rk.desc;
  _wrapText(g, shortDesc, 120, descY + 22, W - 240, 56, 'left');

  /* --- 金句 --- */
  var quoteY = 1520;
  g.fillStyle = '#d9a441';
  g.font = '700 46px ' + F_SERIF;
  g.fillText('“', 120, quoteY + 10);
  g.fillStyle = '#f2cf82';
  g.font = '500 34px ' + F_SERIF;
  _wrapText(g, rk.quote, 172, quoteY, W - 292, 52, 'left');

  /* --- 底部 --- */
  g.strokeStyle = 'rgba(243,236,223,.1)';
  g.beginPath(); g.moveTo(120, 1700); g.lineTo(W - 120, 1700); g.stroke();

  var qrSize = 168;
  var qrX = W - 120 - qrSize;
  var qrY = 1730;

  if (opts.qrImg) {
    g.fillStyle = '#f3ecdf';
    _rr(g, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14); g.fill();
    g.drawImage(opts.qrImg, qrX, qrY, qrSize, qrSize);
  }

  g.textAlign = 'left';
  g.fillStyle = '#f3ecdf';
  g.font = '700 40px ' + F_SANS;
  g.fillText('你在人情场上是几段？', 120, 1778);

  g.fillStyle = 'rgba(243,236,223,.55)';
  g.font = '400 26px ' + F_SANS;
  g.fillText(opts.qrImg ? '长按识别二维码 · 3 分钟出结果' : '把网址复制到浏览器 · 3 分钟出结果', 120, 1824);

  if (siteUrl) {
    g.fillStyle = 'rgba(217,164,65,.85)';
    g.font = '500 25px ' + F_SANS;
    var cleanUrl = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    g.fillText(cleanUrl, 120, 1864);
  }

  return canvas;
}

/* ---------- 对外：生成海报（异步，含二维码） ---------- */
function makePoster(result) {
  var siteUrl = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.siteUrl) || '';
  var qrSrc = QR_ENDPOINT + encodeURIComponent(siteUrl);
  return _loadImage(qrSrc, 3200).then(function (img) {
    var canvas;
    try {
      canvas = buildPoster(result, { qrImg: img });
    } catch (e) {
      canvas = buildPoster(result, { qrImg: null });
    }
    return canvas;
  });
}

/* ---------- 对外：保存到相册（优先系统分享） ---------- */
function canvasToBlob(canvas) {
  return new Promise(function (resolve) {
    if (canvas.toBlob) canvas.toBlob(function (b) { resolve(b); }, 'image/png', 0.95);
    else {
      var d = canvas.toDataURL('image/png');
      var bin = atob(d.split(',')[1]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type: 'image/png' }));
    }
  });
}

function savePosterToAlbum(canvas) {
  return canvasToBlob(canvas).then(function (blob) {
    if (!blob) throw new Error('生成图片失败');

    var file = null;
    try {
      file = new File([blob], '人情世故段位.png', { type: 'image/png' });
    } catch (e) { file = null; }

    /* 1) Web Share API Level 2 —— iOS/Android 会弹出菜单，可直接「存储图像」 */
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      return navigator.share({
        files: [file],
        title: '人情世故段位',
        text: '我测出来是「' + (window.__lastResult ? window.__lastResult.rank.name : '') + '」，你呢？'
      }).then(function () {
        return { mode: 'share' };
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return { mode: 'cancel' };
        return _fallbackDownload(blob);
      });
    }

    /* 2) 回退：<a download> 直接下载 */
    return _fallbackDownload(blob);
  });
}

function _fallbackDownload(blob) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '人情世故段位.png';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  return { mode: 'download' };
}

/* 保存 dataURL（长按保存兜底） */
function posterDataURL(canvas) {
  try { return canvas.toDataURL('image/png'); }
  catch (e) { return null; }
}
