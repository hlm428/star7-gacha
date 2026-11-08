/* ================= 结算卡 Canvas 重绘 / PNG 导出 ================= */
function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  else {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
function wrapText(ctx, text, x, y, maxW, lineH) {
  const chars = Array.from(text);
  let line = '', n = 0;
  chars.forEach(ch => {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + n * lineH);
      n++; line = ch;
    } else line = test;
  });
  if (line) { ctx.fillText(line, x, y + n * lineH); n++; }
  return n;
}

function drawSettlementCanvas() {
  const W = 720, H = 1040;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const t = TITLES[state.ending || 'normal'] || TITLES.normal;
  const u = uniqueCount();
  const rate = (u / GAME.TOTAL_CARDS * 100).toFixed(1);

  const bg = ctx.createLinearGradient(0, 0, W * .4, H);
  bg.addColorStop(0, '#fff9f1'); bg.addColorStop(.5, '#fff3f6'); bg.addColorStop(1, '#ffeaf3');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 620);
  glow.addColorStop(0, 'rgba(255,210,236,.9)'); glow.addColorStop(1, 'rgba(255,210,236,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 560);
  const glow2 = ctx.createRadialGradient(W, H, 10, W, H, 460);
  glow2.addColorStop(0, 'rgba(255,236,196,.85)'); glow2.addColorStop(1, 'rgba(255,236,196,0)');
  ctx.fillStyle = glow2; ctx.fillRect(0, H - 500, W, 500);

  ctx.strokeStyle = '#efce9b'; ctx.lineWidth = 3;
  rr(ctx, 16, 16, W - 32, H - 32, 34); ctx.stroke();
  ctx.setLineDash([7, 7]); ctx.strokeStyle = 'rgba(209,157,110,.5)'; ctx.lineWidth = 1.4;
  rr(ctx, 30, 30, W - 60, H - 60, 26); ctx.stroke(); ctx.setLineDash([]);

  // 品牌
  ctx.save();
  const pill = ctx.createLinearGradient(250, 0, 470, 0);
  pill.addColorStop(0, '#ffa9cb'); pill.addColorStop(1, '#ff6aa9');
  ctx.fillStyle = pill;
  rr(ctx, 250, 58, 220, 46, 23); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 24px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✦ STAR7', W / 2, 82);
  ctx.font = '600 14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#a87c94';
  ctx.fillText('30 DAYS RECORD', W / 2, 124);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#b489a0';
  ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('第 30 天 · 追 星 记 录', W / 2, 166);

  ctx.fillStyle = '#6c2f50';
  ctx.font = '900 64px "Songti SC","Noto Serif SC","Microsoft YaHei",serif';
  ctx.fillText(t.name, W / 2, 246);

  ctx.fillStyle = '#966c86';
  ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif';
  wrapText(ctx, t.desc, W / 2, 292, 580, 32);

  // 头像
  const avY = 386, r = 26, gap = 12;
  const totalW = MEMBERS.length * r * 2 + (MEMBERS.length - 1) * gap;
  let ax = (W - totalW) / 2 + r;
  MEMBERS.forEach(m => {
    ctx.beginPath(); ctx.arc(ax, avY, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    const im = AV_IMGS[m.key];
    /* file:// 下外链图片会污染 canvas 导致无法导出，本地直接走渐变头像 */
    if (im && im.complete && im.naturalWidth && location.protocol !== 'file:') {
      ctx.save();
      ctx.beginPath(); ctx.arc(ax, avY, r, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(im, ax - r, avY - r, r * 2, r * 2);
      ctx.restore();
    } else {
      const ag = ctx.createLinearGradient(ax - r, avY - r, ax + r, avY + r);
      ag.addColorStop(0, light(m.color, .2)); ag.addColorStop(1, m.color);
      ctx.beginPath(); ctx.arc(ax, avY, r, 0, Math.PI * 2);
      ctx.fillStyle = ag; ctx.fill();
    }
    ax += r * 2 + gap;
  });

  // 数据
  const stats = [
    ['拆包总数', state.stats.pulls + ' 包'],
    ['本局花费', '¥' + fmt(state.stats.spent)],
    ['收集进度', u + ' / 56'],
    ['抽到 SSR', state.stats.ssr + ' 张'],
    ['剩余生活费', '¥' + fmt(state.money)],
    ['收集率', rate + '%']
  ];
  const bx = 52, by = 442, bw = 300, bh = 90, bgg = 16;
  stats.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = bx + col * (bw + bgg), y = by + row * (bh + 14);
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    rr(ctx, x, y, bw, bh, 18); ctx.fill();
    ctx.strokeStyle = '#f0d6e2'; ctx.lineWidth = 1.4; rr(ctx, x, y, bw, bh, 18); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a17c92'; ctx.font = '500 17px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(s[0], x + 20, y + 30);
    ctx.fillStyle = '#a53d6b'; ctx.font = '900 30px "Songti SC","Microsoft YaHei",serif';
    ctx.fillText(s[1], x + 20, y + 68);
  });

  // 语录
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a6b84'; ctx.font = '400 23px "Songti SC","Microsoft YaHei",serif';
  ctx.fillText(t.quote, W / 2, 800);

  ctx.strokeStyle = '#ebcad9'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(64, 858); ctx.lineTo(W - 64, 858); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = '#b08ba0'; ctx.font = '500 15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('拆小卡模拟器 · 星轨回响 · 虚构企划', W / 2, 900);
  ctx.font = '500 13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#c2a1b2';
  ctx.fillText('本游戏纯属虚构，不涉及真实充值', W / 2, 928);

  // 水印装饰
  ctx.save();
  ctx.globalAlpha = .12;
  ctx.fillStyle = '#d8a85f';
  ctx.font = '900 76px "Songti SC","Microsoft YaHei",serif';
  ctx.textAlign = 'right';
  ctx.fillText('STAR7', W - 44, H - 40);
  ctx.restore();
  return cv;
}

function showImagePreview(dataUrl, name, title) {
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3 style="text-align:center">${title || '结算卡已生成'}</h3>
    <p class="msub" style="text-align:center">若浏览器未自动下载，可长按下方图片保存到相册</p>
    <img src="${dataUrl}" alt="STAR7 纪念海报" style="display:block;width:100%;max-width:300px;margin:0 auto 12px;border-radius:16px;border:1px solid #efce9b;box-shadow:0 12px 30px rgba(90,42,62,.18)">
    <div class="actions">
      <a class="btn gold" href="${dataUrl}" download="${name}" style="text-decoration:none">再存一次</a>
      <button class="btn ghost" data-act="close-modal">关闭</button>
    </div>
  </div>`, true);
}

/* 集齐成员：星轨纪念海报 */
function drawCollectCanvas(key) {
  const m = MEMBER_BY_KEY[key];
  if (!m) return null;
  const W = 720, H = 1040;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1026'); bg.addColorStop(.55, m.color); bg.addColorStop(1, '#120b1d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 300, 10, W / 2, 300, 500);
  glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 700);

  /* 星轨装饰 */
  for (let i = 0; i < 46; i++) {
    const x = (i * 137) % W, y = (i * 251) % H;
    ctx.globalAlpha = .25 + (i % 5) * .1;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, 310, 128, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, 310, 152, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.arc(W / 2, 310, 118, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 52px "Songti SC","Microsoft YaHei",serif';
  ctx.fillText(m.name, W / 2, 300);
  ctx.font = '600 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('STARTRACK COMPLETE · 8/8', W / 2, 352);

  ctx.fillStyle = '#fff';
  ctx.font = '900 46px "Songti SC","Microsoft YaHei",serif';
  ctx.fillText(m.name + '的星轨', W / 2, 520);
  ctx.fillText('已全部点亮', W / 2, 580);

  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = '400 24px "Songti SC","Microsoft YaHei",serif';
  const lines = (COLLECT_LINES[key] || '').split('\n').slice(0, 6);
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, 660 + i * 38));

  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = '500 18px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('¥' + GAME.COLLECT_REWARD_MONEY + ' 生活费 · +' + GAME.COLLECT_REWARD_SHARD + ' 碎片 · 称号「' + COLLECT_TITLE(key) + '」', W / 2, 930);

  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '500 15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('拆小卡模拟器 · 星轨回响 · 虚构企划', W / 2, 976);
  ctx.fillText('本游戏纯属虚构，不涉及真实充值', W / 2, 1002);
  return cv;
}

function saveCollectImage(key) {
  let cv;
  try { cv = drawCollectCanvas(key); }
  catch (e) { toast('生成失败，请直接截图保存', true); return; }
  if (!cv) return;
  const m = MEMBER_BY_KEY[key];
  const name = 'STAR7-集齐-' + (m ? m.name : key) + '.png';
  try {
    cv.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 600);
      showImagePreview(cv.toDataURL('image/png'), name, '星轨纪念海报已生成');
    }, 'image/png');
  } catch (e) {
    try { showImagePreview(cv.toDataURL('image/png'), name, '星轨纪念海报已生成'); }
    catch (e2) { toast('生成失败，请长按截图保存', true); }
  }
  sfx('reward');
}

function saveSettlementImage() {
  let cv;
  try { cv = drawSettlementCanvas(); }
  catch (e) { toast('生成失败，请直接截图保存', true); return; }
  const t = TITLES[state.ending || 'normal'] || TITLES.normal;
  const name = 'STAR7-结算-' + t.name + '.png';
  try {
    cv.toBlob(blob => {
      if (!blob) { showImagePreview(cv.toDataURL('image/png'), name); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 600);
      showImagePreview(cv.toDataURL('image/png'), name);
    }, 'image/png');
  } catch (e) {
    try { showImagePreview(cv.toDataURL('image/png'), name); }
    catch (e2) { toast('生成失败，请长按截图保存', true); }
  }
  toast('正在生成高清结算图…');
  sfx('reward');
}
