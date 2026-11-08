/* ================= 抽卡 / 拆包 / 翻卡 / SSR 演出 ================= */
const RAR_TAG = {
  N: ['linear-gradient(135deg,#f2eef2,#cfc5d6)', '#54455e'],
  R: ['linear-gradient(135deg,#b8dcff,#6aa8ff)', '#14345f'],
  SR: ['linear-gradient(135deg,#e2c4ff,#a86cff)', '#37145d'],
  SSR: ['linear-gradient(135deg,#fff0bf,#e8b45e)', '#5e3813']
};

/* v5 · P-09：抽卡核心 = 可注入 RNG 的纯函数（不读写 state），rollOne / rollBatch 仅做状态接线 */
function pickCardPure(rarity, rng, pool) {
  pool = pool || CARDS;
  const arr = pool.filter(c => c.rarity === rarity);
  return arr[Math.floor(rng() * arr.length)];
}
function pickSSRPure(upId, upPity, rng, pool) {
  pool = pool || CARDS;
  /* 大保底：上次 SSR 歪了（非 UP），这次必出 UP；抽出 UP 后重置 */
  if (upPity || rng() < GAME.UP_CHANCE) return { card: CARD_BY_ID[upId], upPity: false };
  const ssr = pool.filter(c => c.rarity === 'SSR' && c.id !== upId);
  return { card: ssr[Math.floor(rng() * ssr.length)], upPity: true };
}
/* 单抽：硬保底优先，命中 SSR 后重置；ctx = {pityLeft,todayPulls,boostDay,day,upPity,upId} */
function rollOnePure(ctx, rng, pool) {
  pool = pool || CARDS;
  let card, upPity = ctx.upPity;
  if (ctx.pityLeft <= 1) {
    const s = pickSSRPure(ctx.upId, upPity, rng, pool);
    card = s.card; upPity = s.upPity;
  } else {
    /* 第 25 天彩排：仅当天前 20 抽 SSR 基础概率 2% → 3.5%，之后回落 2%；其余档位顺延，SR 仍为 8% */
    const boostDay = ctx.boostDay === ctx.day;
    const boostLeft = (ctx.todayPulls || 0) < (GAME.BOOST_25_FREE_PULLS || 20);
    const ssrRate = boostDay && boostLeft ? .035 : .02;
    const r = rng();
    let rar = 'N';
    if (r < ssrRate) rar = 'SSR';
    else if (r < ssrRate + .08) rar = 'SR';
    else if (r < ssrRate + .38) rar = 'R';
    else rar = 'N';
    if (rar === 'SSR') {
      const s = pickSSRPure(ctx.upId, upPity, rng, pool);
      card = s.card; upPity = s.upPity;
    } else {
      card = pickCardPure(rar, rng, pool);
    }
  }
  const pityLeft = card.rarity === 'SSR' ? GAME.PITY_MAX : Math.max(1, ctx.pityLeft - 1);
  return { card, pityLeft, upPity };
}
/* 十连：逐抽推进保底 / 大保底；若整包无 SR/SSR，末位补 SR（与旧实现一致） */
function rollBatchPure(ctx, n, rng, pool) {
  pool = pool || CARDS;
  const out = [];
  let cur = ctx;
  for (let i = 0; i < n; i++) {
    const r = rollOnePure(cur, rng, pool);
    out.push(r.card);
    cur = Object.assign({}, cur, { pityLeft: r.pityLeft, upPity: r.upPity });
  }
  if (n >= 10 && GAME.TEN_MIN_SR && !out.some(c => c.rarity === 'SR' || c.rarity === 'SSR')) {
    out[out.length - 1] = pickCardPure('SR', rng, pool);
  }
  return { cards: out, pityLeft: cur.pityLeft, upPity: cur.upPity };
}

/* 从 state 取快照，接线到纯函数 */
function gachaCtx() {
  return { pityLeft: state.pityLeft, todayPulls: state.todayPulls, boostDay: state.boostDay,
           day: state.day, upPity: state.upPity, upId: upKeyNow() + '-7' };
}
function rollOne() {
  const r = rollOnePure(gachaCtx(), Math.random);
  state.pityLeft = r.pityLeft;
  state.upPity = r.upPity;
  return r.card;
}
function rollBatch(n) {
  const r = rollBatchPure(gachaCtx(), n, Math.random);
  state.pityLeft = r.pityLeft;
  state.upPity = r.upPity;
  return r.cards;
}

function applyResults(results) {
  let newCount = 0, dupCount = 0, shardsGained = 0;
  const entries = results.map(c => {
    state.stats.pulls++;
    state.stats[c.rarity.toLowerCase()]++;
    if (owned(c.id)) {
      dupCount++;
      state.dupes[c.id] = (state.dupes[c.id] || 0) + 1;
      const sh = RARITY_INFO[c.rarity].shard;
      gainShards(sh);
      state.stats.dupShards += sh;
      shardsGained += sh;
      return { card: c, dup: true, shards: sh };
    }
    state.cards[c.id] = 1;
    state.fresh[c.id] = true;
    unlockLine(c);
    newCount++;
    return { card: c, dup: false };
  });
  state.todayPulls += results.length;
  return { entries, newCount, dupCount, shardsGained };
}

function doPull(n) {
  /* v4 P-07：拆包未收下时禁止再次抽卡，避免翻牌中扣费覆盖结果 */
  if (pendingPull) { guardPackBusy(); return; }
  if (state.ended) { toast('本局已结算，点「再来一局」重新开始', true); return; }
  const freeOne = n === 1 && state.freeSingles > 0;
  const freeTen = n === 10 && state.freeTen > 0 && state.freeTenDay === state.day;
  const free = freeOne || freeTen;
  /* v4 P-08：每日首次单抽半价 ¥9（免费单抽优先于半价） */
  const halfOne = n === 1 && !free && !state.dailyHalfUsed;
  const price = free ? 0 : (halfOne ? GAME.PRICE1_FIRST : (n === 1 ? GAME.PRICE1 : GAME.PRICE10));
  if (!free && !canPay(price)) {
    sfx('error');
    const btn = n === 1 ? $('#pull1Btn') : $('#pull10Btn');
    btn.style.transform = 'scale(.94)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
    toast('生活费不够啦，明天再来', true);
    return;
  }
  hideCoach();
  if (freeOne) state.freeSingles--;
  else if (freeTen) state.freeTen--;
  if (!free) {
    state.money -= price;
    state.stats.spent += price;
    if (halfOne) state.dailyHalfUsed = true;
  } else {
    toast(n === 1 ? '已使用免费单抽券' : '已使用免费十连券（仅今天有效）');
  }
  /* 保底快照：本次开包期间，顶栏保底仍显示抽前数字，收下后再更新为逐张结算结果 */
  const pityBefore = state.pityLeft;
  const results = rollBatch(n);
  const applied = applyResults(results);
  pendingPull = { n: n, results: results, applied: applied, pityBefore: pityBefore, flipped: new Array(n).fill(false), flipCount: 0 };
  save();
  render();
  openPack(n);
}

/* ---------- 拆包 ---------- */
function openPack(n) {
  /* 浮层互斥：拆包开启前关掉同级卡册/集市与残留弹窗 */
  closeModal();
  $('#screenAlbum').classList.remove('show');
  $('#screenMarket').classList.remove('show');
  const ov = $('#packOverlay');
  ov.classList.add('show');
  $('#packTitle').textContent = n === 1 ? '拆 1 包' : '拆 10 包';
  /* 生日池：卡包换成对应成员的生日卡包 */
  const bkey = birthdayKeyForDay(state.day);
  $('#packSub').textContent = bkey ? (MEMBER_BY_KEY[bkey].name + ' · 生日限定卡包') : '星轨回响 · 限定卡包';
  const pmini = $('#packMini');
  if (pmini) pmini.textContent = bkey
    ? ('HAPPY BIRTHDAY · ' + gameDate(state.day).m + '/' + gameDate(state.day).d)
    : 'TRACK OF STARS · 3RD ANNIV.';
  const wrap = $('#packWrap');
  wrap.classList.remove('open', 'dragging');
  tearProgress = 0;
  packLocked = false;
  $('#ripBar').style.height = '0';
  $('#tearLine').style.opacity = '';
  $('#tearStage').classList.remove('hidden');
  $('#cardsStage').classList.add('hidden');
  $('#packGrid').innerHTML = '';
  $('#packGrid').className = 'pack-grid';
  $('#packTally').innerHTML = '';
  $('#resultSummary').textContent = '';
  $('#collectBtn').textContent = '收下卡牌';
  $('#cardsHint').innerHTML = n === 1 ? '点击卡背翻开' : '点击卡背翻开 · 也可 <b>全部翻开</b>';
  $('#tearHint').innerHTML = n === 1
    ? '<b>横向滑动撕开卡包</b>手指在撕口处左右拖动，或点击下方按钮'
    : '<b>横向滑动撕开卡包</b>十连共 10 张，撕开后逐张翻开';
  ssrQueue = [];
  ssrActive = false;
  sfx('click');
  startBGM(state.pityLeft <= 10 ? 'tension' : 'home');
}

function tearStep() {
  if (packLocked) return;
  tearProgress = Math.min(100, tearProgress + 30);
  $('#ripBar').style.height = tearProgress + '%';
  $('#tearLine').style.opacity = '1';
  sfx('tear');
  if (tearProgress >= 100) openPackAnim();
}
function openPackAnim(instant) {
  if (packLocked) return;
  packLocked = true;
  tearProgress = 100;
  $('#ripBar').style.height = '100%';
  $('#packWrap').classList.add('open');
  sfx('tear');
  setTimeout(() => { showCards(instant); }, instant ? 0 : 680);
}

/* ---------- 卡牌列表 ---------- */
function frontHTML(r) {
  const c = r.card, m = MEMBER_BY_KEY[c.member];
  const tag = RAR_TAG[c.rarity];
  return `<div class="face front r-${c.rarity}" style="--rc:${RARITY_INFO[c.rarity].glow};--tag-bg:${tag[0]};--tag-ink:${tag[1]}">
    <div class="art">${cardArtHTML(c)}</div>
    <span class="fc-r">${c.rarity}</span>
    ${r.dup ? '<span class="fc-dup">重复</span>' : '<span class="fc-new">NEW</span>'}
    <div class="fc-meta">
      <div class="fc-mem">${m.name}</div>
      <div class="fc-nm">${c.name}</div>
    </div>
    ${c.rarity === 'SSR' ? '<span class="fc-spark" style="left:12%;top:18%"></span><span class="fc-spark" style="right:14%;top:40%;animation-delay:1.1s"></span>' : ''}
  </div>`;
}

function backHTML() {
  return `<div class="face back">
    <svg class="logo" viewBox="0 0 24 24" fill="none"><path d="M12 2.2l2.9 6.2 6.7 1.2-4.7 4.3 1.3 6.5L12 17.2 5.8 20.4l1.3-6.5L2.4 9.6l6.7-1.2z" fill="#ffe8c8" opacity=".92"/></svg>
    <span class="bn">STAR7</span>
  </div>`;
}

/* 翻开时才写入卡面 DOM：翻牌前页面上只有卡背，不看源码也剧透不了 */
function revealCard(el, i) {
  const flipper = el.querySelector('.flipper');
  if (flipper && !flipper.querySelector('.front')) {
    flipper.insertAdjacentHTML('beforeend', frontHTML(pendingPull.applied.entries[i]));
  }
}

function showCards(instant) {
  $('#tearStage').classList.add('hidden');
  $('#cardsStage').classList.remove('hidden');
  $('#cardsStage').classList.toggle('ten-mode', pendingPull.n !== 1);
  const grid = $('#packGrid');
  const n = pendingPull.n;
  grid.className = 'pack-grid ' + (n === 1 ? 'n1' : 'n10');
  grid.innerHTML = pendingPull.applied.entries.map((r, i) => `
    <div class="flip" data-flip="${i}" role="button" tabindex="0" aria-label="翻开第 ${i + 1} 张卡" aria-pressed="false" style="animation-delay:${instant ? 0 : (i * .045)}s">
      <div class="flipper">${backHTML()}</div>
    </div>`).join('');
  $('#packTally').innerHTML = '';
  $('#resultSummary').textContent = '';
  grid.onscroll = updatePackScrollHint;
  syncPackGridPad();
  setTimeout(updatePackScrollHint, 60);
  $('#flipAllBtn').style.display = n === 1 ? 'none' : '';
  $('#collectBtn').disabled = true;
  $('#collectBtn').textContent = n === 1 ? '先翻开卡牌' : '先翻开全部卡牌';
  $('#cardsHint').innerHTML = n === 1 ? '点击卡背翻开这张卡' : '点击卡背逐张翻开 · <b>全部翻开</b> 可一次揭晓';
  if (instant) {
    $$('.flip', grid).forEach((el, i) => { revealCard(el, i); el.classList.add('flipped'); el.setAttribute('aria-pressed', 'true'); pendingPull.flipped[i] = true; });
    pendingPull.flipCount = n;
    finishReveal(true);
  }
}

/* 十连网格底部留出与按钮栏等高的 padding，并提示还差几张没滑到 */
function syncPackGridPad() {
  const grid = $('#packGrid'), bar = $('#packBottomBar');
  if (!grid || !bar) return;
  const h = Math.round(bar.getBoundingClientRect().height);
  grid.style.paddingBottom = (h > 0 ? h : 76) + 'px';
}
function updatePackScrollHint() {
  const grid = $('#packGrid'), hint = $('#packScrollHint');
  if (!grid || !hint) return;
  const gb = grid.getBoundingClientRect();
  let n = 0;
  $$('.flip', grid).forEach(el => {
    if (el.getBoundingClientRect().bottom > gb.bottom - 1) n++;
  });
  const overflow = grid.scrollHeight > grid.clientHeight + 2;
  if (n > 0 && overflow) {
    hint.textContent = '下滑还有 ' + n + ' 张';
    hint.classList.add('on');
  } else {
    hint.classList.remove('on');
  }
}

/* 全部翻开后再公布统计，避免提前剧透稀有度 */
function fillPackSummary() {
  if (!pendingPull) return;
  const s = pendingPull.applied;
  const counts = { N: 0, R: 0, SR: 0, SSR: 0 };
  s.entries.forEach(r => { counts[r.card.rarity]++; });
  $('#packTally').innerHTML = pendingPull.n === 10
    ? RARITY_ORDER.filter(r => counts[r] > 0).map(r => `<span class="tchip ${r}">${r} × ${counts[r]}</span>`).join('')
      + `<span class="tchip new">新卡 ${s.newCount}</span>`
      + (s.dupCount ? `<span class="tchip dup">重复 ${s.dupCount} → 碎片 +${s.shardsGained}</span>` : '')
    : '';
  $('#resultSummary').textContent = `新卡 ${s.newCount} 张 · 重复 ${s.dupCount} 张 → 碎片 +${s.shardsGained}`;
}

function flipOne(el) {
  const i = +el.dataset.flip;
  if (pendingPull.flipped[i]) return;
  pendingPull.flipped[i] = true;
  pendingPull.flipCount++;
  revealCard(el, i);
  el.classList.add('flipped');
  el.setAttribute('aria-pressed', 'true');
  const r = pendingPull.applied.entries[i];
  sfx('flip');
  if (r.card.rarity === 'SSR') {
    setTimeout(() => queueSSR(r.card), 500);
  } else if (r.card.rarity === 'SR') {
    sfx('sr');
  }
  if (pendingPull.flipCount === pendingPull.n) finishReveal(false);
}

function flipAll(instant, noSSR) {
  $$('.flip').forEach((el, i) => {
    if (!pendingPull.flipped[i]) {
      pendingPull.flipped[i] = true;
      pendingPull.flipCount++;
      revealCard(el, i);
      el.classList.add('flipped');
      el.setAttribute('aria-pressed', 'true');
    }
  });
  sfx('flip');
  if (!noSSR) {
    const ssr = pendingPull.applied.entries.find(r => r.card.rarity === 'SSR');
    if (ssr) setTimeout(() => queueSSR(ssr.card), 420);
  }
  finishReveal(!!instant);
}

function finishReveal(instant) {
  $('#cardsHint').innerHTML = '已全部揭晓 · 点下方 <b>收下卡牌</b> 入册';
  $('#collectBtn').disabled = false;
  $('#collectBtn').textContent = pendingPull.n === 1 ? '收下这张卡' : '收下全部 10 张';
  $('#flipAllBtn').style.display = 'none';
  fillPackSummary();
  if (!instant) sfx('collect');
}

/* ---------- SSR 放大 ---------- */
function queueSSR(card) {
  ssrQueue.push(card);
  if (!ssrActive) nextSSR();
}
function nextSSR() {
  if (!ssrQueue.length) { ssrActive = false; return; }
  ssrActive = true;
  const c = ssrQueue.shift();
  currentSSR = c;
  const m = MEMBER_BY_KEY[c.member];
  $('#ssrPortrait').innerHTML = artHTML(c);
  $('#ssrMember').textContent = m.name;
  $('#ssrCardName').textContent = c.name;
  $('#ssrQuote').textContent = '“' + c.quote + '”';
  $('#ssrOverlay').classList.remove('deep');
  $('#ssrOverlay').classList.add('show');
  startBGM('ssr');
  sfx('ssr');
  try { if (navigator.vibrate) navigator.vibrate([18, 40, 26]); } catch (e) {}
  if (ssrTimer) { clearTimeout(ssrTimer); ssrTimer = null; }
  /* 不再 1.6s 自动关闭：点击任意处关闭，或语音播完后延迟 1 秒自动关闭 */
  playVoice(c.member, 'ssr', () => {
    if (currentSSR !== c) return;
    if ($('#ssrOverlay').classList.contains('deep')) return;
    if (ssrTimer) clearTimeout(ssrTimer);
    ssrTimer = setTimeout(() => { ssrTimer = null; if (currentSSR === c) closeSSR(); }, 1000);
  });
}

/* 深读：背景变暗，长独白逐行打字机，同步语音 */
function showSSRDeep() {
  if (!currentSSR) return;
  if (ssrTimer) { clearTimeout(ssrTimer); ssrTimer = null; }
  const c = currentSSR, m = MEMBER_BY_KEY[c.member];
  const text = SSR_LONG[c.member] || c.quote;
  const ov = $('#ssrOverlay');
  ov.classList.add('deep');
  $('#ssrDeepName').textContent = m.name + ' · ' + c.name;
  $('#ssrDeepText').textContent = '';
  startBGM('ssr');
  const audio = playVoice(c.member, 'long');
  sfx('star');
  clearInterval(deepTypeTimer);
  deepTypeTimer = null;
  const typeAt = ms => {
    clearInterval(deepTypeTimer);
    let i = 0;
    deepTypeTimer = setInterval(() => {
      if (currentSSR !== c || i >= text.length) { clearInterval(deepTypeTimer); deepTypeTimer = null; return; }
      $('#ssrDeepText').textContent += text[i++];
    }, ms);
  };
  /* 打字速度 = 语音总时长 ÷ 字数；读不到时长时 38ms/字 */
  const perChar = a => {
    const d = a && Number.isFinite(a.duration) ? a.duration : 0;
    return d > 0 ? clamp(Math.round(d * 1000 / Math.max(1, text.length)), 12, 260) : 38;
  };
  if (audio && !(Number.isFinite(audio.duration) && audio.duration > 0)) {
    let started = false;
    const go = () => {
      if (started || currentSSR !== c) return;
      started = true;
      typeAt(perChar(audio));
    };
    audio.addEventListener('loadedmetadata', go, { once: true });
    setTimeout(go, 700);
  } else {
    typeAt(perChar(audio));
  }
}

function closeSSR() {
  if (ssrTimer) { clearTimeout(ssrTimer); ssrTimer = null; }
  if (deepTypeTimer) { clearInterval(deepTypeTimer); deepTypeTimer = null; }
  stopVoice();
  $('#ssrOverlay').classList.remove('show', 'deep');
  if ($('#ssrDeepText')) $('#ssrDeepText').textContent = '';
  currentSSR = null;
  ssrActive = false;
  refreshBGM();
  setTimeout(() => { if (ssrQueue.length) nextSSR(); }, 140);
}

/* ---------- 收下卡牌 ---------- */
function collectPack() {
  if (!pendingPull) { closePack(); return; }
  const s = pendingPull.applied;
  closeSSR();
  ssrQueue = [];
  $('#packOverlay').classList.remove('show');
  $('#cardsStage').classList.add('hidden');
  $('#tearStage').classList.remove('hidden');
  const tip = `新卡 ${s.newCount} 张` + (s.dupCount ? `，重复 ${s.dupCount} 张折算碎片 +${s.shardsGained}` : '');
  toast(tip);
  pendingPull = null;
  save();
  render();
  hideCoach();
  refreshBGM();
  setTimeout(checkCollectRewards, 260);
}
function closePack() {
  $('#packOverlay').classList.remove('show');
  pendingPull = null;
  refreshBGM();
}

/* ---------- 撕包手势 ---------- */
function initTearDrag() {
  const wrap = $('#packWrap');
  if (!wrap) return;
  let dragging = false, startX = 0, baseProgress = 0;
  const active = () => $('#packOverlay').classList.contains('show') && !packLocked;
  wrap.addEventListener('pointerdown', e => {
    if (!active()) return;
    dragging = true;
    startX = e.clientX;
    baseProgress = tearProgress;
    wrap.classList.add('dragging');
    try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
  });
  wrap.addEventListener('pointermove', e => {
    if (!dragging || !active()) return;
    const dx = Math.abs(e.clientX - startX);
    tearProgress = Math.min(100, baseProgress + dx / Math.max(1, wrap.clientWidth) * 105);
    $('#ripBar').style.height = tearProgress + '%';
    $('#tearLine').style.opacity = '1';
    if (tearProgress >= 100) { dragging = false; wrap.classList.remove('dragging'); openPackAnim(); }
  });
  const end = () => { dragging = false; wrap.classList.remove('dragging'); };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('click', e => {
    if (!active()) return;
    e.preventDefault();
    tearStep();
  });
}
