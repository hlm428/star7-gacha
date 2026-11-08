/* ================= 卡册 / 兑换 / 收集奖励 / 星光集市 ================= */
let albumMember = 'sy';
let pendingImport = null;   // v4 P-09：已通过校验、等待覆盖确认的导入存档

function openAlbum() {
  if (guardPackBusy()) return;
  closeModal();
  $('#screenMarket').classList.remove('show');
  $('#screenAlbum').classList.add('show');
  buildMemberTabs();
  renderAlbum();
  sfx('click');
  startBGM('album');
  setTimeout(checkCollectRewards, 220);
}
function closeAlbum() {
  $('#screenAlbum').classList.remove('show');
  state.fresh = {};
  save();
  render();
  refreshBGM();
}

function buildMemberTabs() {
  $('#memberTabs').innerHTML = MEMBERS.map(m => `
    <button class="mtab ${m.key === albumMember ? 'on' : ''}" data-act="tab" data-member="${m.key}">
      <span class="av">${avatarSVG(m)}</span>
      <i class="pbtn" data-act="profile" data-member="${m.key}" title="查看 ${m.name} 的档案">档案</i>
      <b>${m.name}</b>
      <span>${memberOwned(m.key)}/8</span>
    </button>`).join('');
}

/* 成员档案：生日 / 定位 / 自我介绍 + 8 句台词（按解锁顺序回看） */
function openProfile(key) {
  const m = MEMBER_BY_KEY[key];
  if (!m) return;
  const cards = CARDS_BY_MEMBER[key].slice().sort((a, b) => a.idx - b.idx);
  const got = (state.lines && Array.isArray(state.lines[key])) ? state.lines[key] : [];
  const unlocked = got.filter(i => cards.some(c => c.idx === i));
  /* 已点亮的卡必定计入台词收藏，避免成员页与卡册计数脱节 */
  cards.filter(c => owned(c.id)).forEach(c => { if (!unlocked.includes(c.idx)) unlocked.push(c.idx); });
  const locked = cards.filter(c => !unlocked.includes(c.idx));
  const lineHTML = (c, on) => `<div class="pline${on ? ' on' : ''}">
      <b>${on ? '0' + (c.idx + 1) : '??'}</b><span>${on ? '“' + c.quote + '”' : '？？？'}</span></div>`;
  openModal(`<div class="modal-wrap profile-wrap">
    <button class="x" data-act="close-modal">×</button>
    <div class="profile-head">
      <div class="profile-av"><img src="${ART_AV[key]}" alt="${m.name}"></div>
      <div class="profile-id">
        <small>${m.en}</small>
        <h3>${m.name}</h3>
        <p>${m.role}</p>
        ${(state.titles[key] || (state.best && state.best.titles && state.best.titles[key])) ? `<div class="profile-title" style="border-color:${m.color};color:${m.color}">称号 · ${COLLECT_TITLE(key)}</div>` : ''}
      </div>
    </div>
    <div class="profile-meta">
      <span><i>生日</i>${m.birthday}</span>
      <span><i>队内定位</i>${m.role}</span>
    </div>
    <p class="profile-intro">“${m.selfIntro}”</p>
    <div class="profile-lines-h">台词收藏 <i>${unlocked.length}/8</i><small>抽到他的新卡即可解锁一句</small></div>
    <div class="profile-lines">${unlocked.map(i => { const c = cards.find(x => x.idx === i); return c ? lineHTML(c, true) : ''; }).join('')}${locked.map(c => lineHTML(c, false)).join('')}</div>
    <div class="actions">
      <button class="btn ghost voice-btn" data-act="voice-play" data-member="${key}"><span>语音</span><i class="vw"><b></b><b></b><b></b></i><span class="vbar"><i></i></span></button>
      <button class="btn ghost" data-act="close-modal">收起档案</button>
    </div>
  </div>`);
}

/* 成员页计数：任何渲染路径都统一从这里刷新，保证成员之和 = 总进度 */
function syncMemberTabs() {
  const tabs = $$('#memberTabs .mtab');
  if (!tabs.length) return 0;
  let sum = 0;
  tabs.forEach(el => {
    const key = el.dataset.member;
    el.classList.toggle('on', key === albumMember);
    const n = memberOwned(key);
    sum += n;
    const sp = el.querySelector('span:last-child');
    if (sp) sp.textContent = n + '/8';
  });
  const cur = MEMBER_BY_KEY[albumMember];
  if (cur && $('#memberProgressText')) $('#memberProgressText').textContent = cur.name + ' · ' + memberOwned(cur.key) + '/8';
  return sum;
}

function renderAlbum() {
  if (!state) return;
  const m = MEMBER_BY_KEY[albumMember] || MEMBERS[0];
  syncMemberTabs();
  /* 集齐成员后，该成员页背景永久替换为专属星轨 */
  const done = memberOwned(m.key) === 8;
  const sc = $('#screenAlbum');
  if (sc) {
    sc.classList.toggle('member-done', done);
    sc.style.setProperty('--mc', m.color);
    sc.style.setProperty('--mc2', m.color2);
  }
  const list = CARDS_BY_MEMBER[m.key].slice().sort((a, b) => a.idx - b.idx);
  $('#albumGrid').innerHTML = list.map(c => cardHTML(c, {
    act: 'detail',
    badge: owned(c.id) && state.fresh[c.id] ? 'new' : ''
  })).join('');
  const on = $('.mtab.on');
  if (on) { try { on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
  const u = uniqueCount();
  $('#albumCount').textContent = u + '/' + GAME.TOTAL_CARDS;
  $('#albumBar').style.width = (u / GAME.TOTAL_CARDS * 100).toFixed(1) + '%';
  $('#shardVal2').textContent = fmt(state.shards);
}

function showCardDetail(id) {
  const c = CARD_BY_ID[id];
  if (!c) return;
  const m = MEMBER_BY_KEY[c.member];
  const have = owned(id);
  const cost = RARITY_INFO[c.rarity].exchange;
  openModal(`<div class="modal-wrap detail-wrap">
    <button class="x" data-act="close-modal">×</button>
    <div class="detail-head">
      <div class="detail-card">${cardHTML(c, { force: true, act: 'noop' })}</div>
      <div class="detail-title">
        <h3>${have ? c.name : '尚未获得的卡'}</h3>
        <div class="detail-meta"><span>${m.name}</span><span>${c.rarity}</span><span>${m.role}</span></div>
        <p class="detail-meta" style="margin-top:6px;font-size:10px">${have ? '已收集 · 可反复欣赏' : '卡册剪影 · 可用碎片兑换'}</p>
      </div>
    </div>
    <p class="detail-text">${have ? '“' + c.quote + '”' : '这张卡还没有被你拆到。收集重复卡获得的碎片，可以在这里兑换指定卡。'}</p>
    <div class="detail-actions">
      ${have
        ? `<button class="btn ghost voice-btn" data-act="voice-play" data-member="${c.member}"><span>语音</span><i class="vw"><b></b><b></b><b></b></i><span class="vbar"><i></i></span></button><button class="btn ghost" data-act="close-modal">关闭</button><div class="hint">已收入星轨卡册 · 共 ${state.dupes[id] || 0} 次重复记录</div>`
        : `<button class="btn gold" data-act="exchange-buy" data-id="${id}" ${state.shards < cost ? 'disabled' : ''}>${state.shards < cost ? '还差 ' + (cost - state.shards) + ' 碎片' : '用 ' + cost + ' 碎片兑换'}</button>
           <div class="hint">当前碎片 ${state.shards} 枚 · 重复卡自动折算碎片</div>`}
    </div>
  </div>`, true);
}

function buyCardWithShards(id) {
  /* v4 P-09：本局已结算时禁止任何碎片支出 */
  if (guardPackBusy()) return;
  const c = CARD_BY_ID[id];
  if (!c || owned(id)) return;
  const cost = RARITY_INFO[c.rarity].exchange;
  if (state.shards < cost) { toast('碎片不够，还差 ' + (cost - state.shards) + ' 枚', true); sfx('error'); return; }
  state.shards -= cost;
  state.cards[id] = 1;
  state.fresh[id] = true;
  unlockLine(c);
  save();
  closeModal();
  toast('兑换成功：' + c.name);
  sfx('reward');
  render();
  renderAlbum();
  setTimeout(checkCollectRewards, 240);
}

/* ---------- 集齐成员：正式庆祝序列 ---------- */
let collectTypeTimer = null;
function stopCollectType() {
  if (collectTypeTimer) { clearInterval(collectTypeTimer); collectTypeTimer = null; }
}
function typeCollect(text) {
  const el = $('#ccType');
  if (!el) return;
  stopCollectType();
  el.textContent = '';
  let i = 0;
  collectTypeTimer = setInterval(() => {
    if (i >= text.length) { stopCollectType(); return; }
    el.textContent += text[i++];
  }, 30);
}
function pendingReward() {
  return MEMBERS.find(m => memberOwned(m.key) === 8 && !state.claimed[m.key]);
}
function checkCollectRewards() {
  const m = pendingReward();
  if (!m) return;
  if ($('#modalBack').classList.contains('celebrate')) return;
  const done = MEMBERS.filter(x => memberOwned(x.key) === 8).length;
  const stat = memberOwned(m.key);
  openModal(`<div class="modal-wrap cc-wrap" style="--mc:${m.color};--mc2:${m.color2};--mink:${m.ink}">
    <button class="x" data-act="close-modal">×</button>
    <div class="cc-stage">
      <div class="cc-glow"></div>
      <span class="cc-star s1"></span><span class="cc-star s2"></span><span class="cc-star s3"></span>
      <div class="cc-portrait"><img src="${ART_SSR[m.key]}" alt="${m.name}"></div>
      <div class="cc-kicker">STARTRACK COMPLETE · ${done}/7 · ${stat}/8</div>
      <h3 class="cc-title">${m.name}的星轨，已全部点亮</h3>
      <div class="cc-quote">“${m.selfIntro}”</div>
      <p class="cc-type" id="ccType"></p>
      <div class="cc-reward">
        <b>¥${GAME.COLLECT_REWARD_MONEY}</b> 生活费 · <b>+${GAME.COLLECT_REWARD_SHARD}</b> 碎片<br>
        称号「${COLLECT_TITLE(m.key)}」 · 成员页星轨背景永久点亮
      </div>
      <div class="actions">
        <button class="btn gold" data-act="claim-reward" data-member="${m.key}">领取奖励</button>
        <button class="btn ghost" data-act="close-modal">稍后再领</button>
      </div>
      <div class="cc-share"><button class="btn ghost sm" data-act="save-collect" data-member="${m.key}">保存纪念海报</button></div>
    </div>
  </div>`, true);
  $('#modalBack').classList.add('celebrate');
  $('#modalBox').classList.add('celebrate-box');
  typeCollect(COLLECT_LINES[m.key] || '');
  startBGM('collect');
  sfx('complete');
  playVoice(m.key, 'collect');
}
function claimReward(key) {
  const m = MEMBER_BY_KEY[key];
  if (!m || state.claimed[key] || memberOwned(key) !== 8) { closeModal(); return; }
  state.claimed[key] = true;
  state.titles[key] = 1;
  const got = addMoney(GAME.COLLECT_REWARD_MONEY, 'reward');
  gainShards(GAME.COLLECT_REWARD_SHARD);
  save();
  closeModal();
  render();
  if ($('#screenAlbum').classList.contains('show')) renderAlbum();
  sfx('reward');
  refreshBGM();
  toast(m.name + ' 收集奖励已到账：¥' + got.gained + (got.spilled ? '（存款上限溢出 ¥' + got.spilled + ' 未入账）' : '')
    + ' + ' + GAME.COLLECT_REWARD_SHARD + ' 碎片 · 称号已点亮', got.spilled > 0);
  setTimeout(checkCollectRewards, 300);
}

/* ---------- 星光集市 ---------- */
/* v4 P-08：集市 SSR 980→650，对齐抽卡期望成本 */
const MARKET_PRICE = { N: 18, R: 48, SR: 190, SSR: 650 };

function ensureMarket() {
  if (state.market && state.marketDay === state.day) return;
  const want = ['N', 'R', 'R', 'SR'];
  if (Math.random() < .22) want[3] = 'SSR';
  const picks = [];
  want.forEach(r => {
    const pool = CARDS.filter(c => c.rarity === r && !owned(c.id));
    if (pool.length) picks.push(pool[rand(pool.length)]);
  });
  const extra = CARDS.filter(c => !owned(c.id) && !picks.some(p => p.id === c.id));
  if (extra.length && picks.length < 5) picks.push(extra[rand(extra.length)]);
  state.market = picks.map(c => ({ id: c.id, price: MARKET_PRICE[c.rarity] + rand(5) * 3 }));
  state.marketDay = state.day;
  save();
}

function openMarket() {
  if (guardPackBusy()) return;
  closeModal();
  $('#screenAlbum').classList.remove('show');
  ensureMarket();
  $('#screenMarket').classList.add('show');
  renderMarket();
  sfx('click');
}
function closeMarket() {
  $('#screenMarket').classList.remove('show');
}

function renderMarket() {
  ensureMarket();
  const offers = (state.market || []).filter(o => !owned(o.id));
  const shardRow = `<div class="mrow">
    <div class="thumb" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#5c3a63,#2a1533)">
      <svg viewBox="0 0 24 24" fill="none" style="width:26px;height:26px"><path d="M12 2.6l2.3 6.1 6.1 2.3-6.1 2.3L12 19.4l-2.3-6.1L3.6 11l6.1-2.3z" fill="#ffd9a0"/></svg>
    </div>
    <div class="minfo"><b>碎片寄卖</b><span>重复卡折算的碎片 · 1 枚 = ¥${GAME.SHARD_SELL_RATE}</span><div class="mp">持有 ${state.shards} 枚 · 可换 ¥${state.shards * GAME.SHARD_SELL_RATE}</div></div>
    <button class="buy" data-act="sell-shards" ${state.shards <= 0 ? 'disabled' : ''}>卖出</button>
  </div>`;
  const list = offers.length ? offers.map(o => {
    const c = CARD_BY_ID[o.id];
    if (!c) return '';
    const m = MEMBER_BY_KEY[c.member];
    return `<div class="mrow">
      <div class="thumb">${cardArtHTML(c)}</div>
      <div class="minfo">
        <b>${c.name}</b>
        <span>${m.name} · ${c.rarity} · ${owned(c.id) ? '已拥有（重复折算碎片）' : '未拥有'}</span>
        <div class="mp">¥${o.price}</div>
      </div>
      <button class="buy${state.money < o.price ? ' poor' : ''}" data-act="market-buy" data-id="${c.id}">${state.money < o.price ? '生活费不足' : '收下'}</button>
    </div>`;
  }).join('') : `<div class="market-empty">今天的集市已经空了<br>明天再来看看吧</div>`;
  $('#marketList').innerHTML = shardRow + list;
  $('#moneyVal2').textContent = fmt(state.money);
}

let marketBusy = false;
function buyMarketCard(id) {
  /* v4 P-09：本局已结算时禁止集市消费 */
  if (guardPackBusy()) return;
  if (marketBusy) return;
  ensureMarket();
  const offer = (state.market || []).find(o => o.id === id);
  if (!offer) return;
  if (state.money < offer.price) { toast('生活费不够啦，明天再来', true); sfx('error'); return; }
  marketBusy = true;
  state.money -= offer.price;
  state.stats.spent += offer.price;
  const c = CARD_BY_ID[id];
  let msg = '';
  if (owned(id)) {
    const sh = RARITY_INFO[c.rarity].shard;
    state.dupes[id] = (state.dupes[id] || 0) + 1;
    gainShards(sh);
    state.stats.dupShards += sh;
    msg = '已拥有，自动折算 ' + sh + ' 碎片';
  } else {
    state.cards[id] = 1;
    state.fresh[id] = true;
    unlockLine(c);
    msg = '新卡入册：' + c.name;
  }
  state.market = state.market.filter(o => o.id !== id);
  save();
  render();
  renderMarket();
  sfx('reward');
  toast(msg);
  setTimeout(checkCollectRewards, 240);
  setTimeout(() => { marketBusy = false; }, 350);
}

function sellShards() {
  /* v4 P-09：本局已结算时禁止碎片寄卖 */
  if (guardPackBusy()) return;
  if (state.shards <= 0) { toast('还没有碎片可以寄卖', true); return; }
  const keep = RARITY_INFO.SR.exchange;
  const max = state.shards;
  const def = Math.max(0, max - keep);
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>碎片寄卖</h3>
    <p class="msub">1 枚碎片 = ¥${GAME.SHARD_SELL_RATE}。默认保留 ${keep} 枚，够在卡册兑换一张 SR。</p>
    <div class="sell-box">
      <div class="sell-line">卖出 <b id="sellQty">${def}</b> 枚 <em id="sellGain">→ ¥${def * GAME.SHARD_SELL_RATE}</em></div>
      <input class="sell-range" type="range" id="sellRange" min="0" max="${max}" step="1" value="${def}" aria-label="卖出碎片数量">
      <div class="sell-scale"><span>0</span><span id="sellKeep">保留 ${max - def} 枚</span><span>${max}</span></div>
    </div>
    <div class="actions">
      <button class="btn gold" id="sellConfirm" data-act="confirm-sell-shards" ${def <= 0 ? 'disabled' : ''}>确认卖出</button>
      <button class="btn ghost" data-act="close-modal">再想想</button>
    </div>
  </div>`);
  const r = $('#sellRange');
  if (r) r.addEventListener('input', () => {
    const n = Math.max(0, Math.min(state.shards, Math.round(+r.value || 0)));
    $('#sellQty').textContent = n;
    $('#sellGain').textContent = '→ ¥' + n * GAME.SHARD_SELL_RATE;
    $('#sellKeep').textContent = '保留 ' + (state.shards - n) + ' 枚';
    $('#sellConfirm').disabled = n <= 0;
  });
}

function confirmSellShards() {
  /* v4 P-09：本局已结算时禁止碎片寄卖入账 */
  if (guardPackBusy()) return;
  const r = $('#sellRange');
  const n = r ? Math.max(0, Math.min(state.shards, Math.round(+r.value || 0))) : 0;
  if (n <= 0) { toast('请先选择要卖出的数量', true); return; }
  const gain = n * GAME.SHARD_SELL_RATE;
  state.shards -= n;
  const got = addMoney(gain, 'sell');
  save();
  render();
  renderMarket();
  closeModal();
  sfx('reward');
  toast('已卖出 ' + n + ' 枚碎片，生活费 +¥' + got.gained
    + (got.spilled ? '（存款上限溢出 ¥' + got.spilled + ' 未入账）' : ''), got.spilled > 0);
}

/* ---------- 更多玩法 ---------- */
function openMore() {
  const done = MEMBERS.filter(m => state.claimed[m.key]).length;
  openModal(`<div class="modal-wrap">
    <button class="x sticky" data-act="close-modal" aria-label="关闭更多玩法">×</button>
    <h3>更多玩法</h3>
    <p class="msub">主线是拆卡，这些是旅程里的小小支线。</p>
    <div class="rule-list">
      <div class="rule-item"><div class="ri">市</div><div><b>星光集市</b><p>用生活费收别人的重复卡，也可把碎片寄卖换钱。</p></div></div>
      <div class="rule-item"><div class="ri">兑</div><div><b>碎片兑换</b><p>卡册里点未获得的剪影，可用碎片直接兑换指定卡。</p></div></div>
      <div class="rule-item"><div class="ri">奖</div><div><b>全员收集</b><p>集齐某位成员的 8 张卡，触发完整星轨庆祝，领取 ¥188 + 30 碎片与专属称号。已完成 ${done}/7。</p></div></div>
      <div class="rule-item"><div class="ri">事</div><div><b>旅程事件</b><p>第 5/10/15/20/25/30 天触发固定剧情；每天进入下一天另有 30% 概率遇到小事件。路人缘 ${state.tags.passerby || 0}。</p></div></div>
      <div class="rule-item"><div class="ri">音</div><div><b>声音分层</b><p>BGM、音效、语音三条独立滑条；成员语音为预录配音，无对应音频时静默。进度在状态变化时立即写入本机。</p></div></div>
      <div class="rule-item"><div class="ri">版</div><div><b>版本 ${GAME.VERSION}</b><p>v3.2 → v5.0 的完整修订记录在「概率说明 / 规则」页底部可展开查看。</p></div></div>
    </div>
    <div class="vol-set">
      <div class="vol-h">音量分层</div>
      <label><span>BGM</span><input type="range" min="0" max="100" value="${Math.round(state.vol.bgm * 100)}" data-vol="bgm" aria-label="BGM 音量"><i>${Math.round(state.vol.bgm * 100)}%</i></label>
      <label><span>音效</span><input type="range" min="0" max="100" value="${Math.round(state.vol.sfx * 100)}" data-vol="sfx" aria-label="音效音量"><i>${Math.round(state.vol.sfx * 100)}%</i></label>
      <label><span>语音</span><input type="range" min="0" max="100" value="${Math.round(state.vol.voice * 100)}" data-vol="voice" aria-label="语音音量"><i>${Math.round(state.vol.voice * 100)}%</i></label>
    </div>
    <div class="actions">
      <button class="btn gold" data-act="go-market">去星光集市</button>
      <button class="btn ghost" data-act="close-modal">返回</button>
    </div>
    <div class="save-actions">
      <button class="btn ghost" data-act="export-save">导出存档码</button>
      <button class="btn ghost" data-act="import-save">导入存档码</button>
    </div>
  </div>`);
}

/* 存档菜单：首页直达的导出/导入入口（本机自动存档 + 存档码手动备份） */
function openSaveMenu() {
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>存档</h3>
    <p class="msub">进度已自动保存在本机浏览器，清缓存前建议先导出存档码备份；换手机或换浏览器时粘贴存档码即可恢复。</p>
    <div class="actions">
      <button class="btn gold" data-act="export-save">导出存档码</button>
      <button class="btn ghost" data-act="import-save">导入存档码</button>
    </div>
    <div class="actions">
      <button class="btn ghost" data-act="close-modal">返回</button>
    </div>
  </div>`);
}

/* 存档码：本机存储不可用（隐私模式 / 配额满）时的兜底备份与迁移 */
/* v5 · P-05：轻量签名（FNV-1a + 固定盐），拦住手改 JSON 的随手改档；老码无签名仍可导入 */
/* P6-一：签名是可逆的公开算法，只能防「随手改档」，防不住有意伪造；
   真正的防作弊需要服务端校验。这里不提供虚假的安全承诺。 */
const SAVE_SIG_SALT = 'star7:track:v5';
function saveDigest(json) {
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let k = 0x2545f491;
  for (let i = 0; i < SAVE_SIG_SALT.length; i++) { k ^= SAVE_SIG_SALT.charCodeAt(i); k = Math.imul(k, 0x01000193) >>> 0; }
  return (h >>> 0).toString(36) + '-' + ((h ^ k) >>> 0).toString(36);
}
function encodeSaveCode(s) {
  const json = JSON.stringify(s);
  return btoa(unescape(encodeURIComponent(json))) + '.' + saveDigest(json);
}
function decodeSaveCode(txt) {
  const clean = String(txt || '').replace(/\s+/g, '');
  const dot = clean.lastIndexOf('.');
  const body = dot >= 0 ? clean.slice(0, dot) : clean;
  const sig = dot >= 0 ? clean.slice(dot + 1) : '';
  try {
    const json = decodeURIComponent(escape(atob(body)));
    const save = JSON.parse(json);
    const ver = Number(save && save.v);
    /* P6-一：v5 起存档码必须带签名；缺签名直接拒绝，避免剥离后缀绕过。
       v4 及更早的老码没有签名，保持兼容（产品边界见规则页）。 */
    if (Number.isFinite(ver) && ver >= 5 && !sig) {
      return { save: null, err: '存档码缺少签名（v5 起必须使用完整导出的存档码）' };
    }
    if (sig && sig !== saveDigest(json)) return { save: null, err: '存档码校验失败（内容可能被修改）' };
    return { save, err: null };
  } catch (e) {
    return { save: null, err: '存档码格式无法识别' };
  }
}
function exportSaveCode() {
  let code = '';
  try { code = encodeSaveCode(state); } catch (e) { code = ''; }
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>导出存档码</h3>
    <p class="msub">复制保存这段文字。换设备、清缓存或隐私模式下，可用「导入存档码」恢复卡册与进度。</p>
    <textarea class="save-code" id="saveCodeBox" readonly>${code}</textarea>
    <div class="save-actions">
      <button class="btn gold" data-act="copy-save-code">复制存档码</button>
      <button class="btn ghost" data-act="close-modal">关闭</button>
    </div>
  </div>`);
}
function copySaveCode() {
  const box = $('#saveCodeBox');
  if (!box) return;
  let ok = false;
  try { box.focus(); box.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
  if (ok) { toast('存档码已复制'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(box.value).then(() => toast('存档码已复制'), () => toast('复制失败，请长按文本手动复制', true));
  } else {
    toast('复制失败，请长按文本手动复制', true);
  }
}
function importSaveCode() {
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>导入存档码</h3>
    <p class="msub">粘贴之前导出的整段存档码，导入后会覆盖当前进度与卡册。</p>
    <textarea class="save-code" id="saveCodeInput" placeholder="在此粘贴存档码"></textarea>
    <div class="save-actions">
      <button class="btn gold" data-act="apply-save-code">确认导入</button>
      <button class="btn ghost" data-act="close-modal">取消</button>
    </div>
  </div>`);
}
/* v4 P-09：存档码导入前的严格校验，结构 / 版本 / 字段范围全部拦截 */
function validateSavePayload(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return '内容不是合法的存档对象';
  const ver = Number(p.v);
  if (!Number.isFinite(ver)) return '缺少版本号';
  if (ver < 1 || ver > GAME.SAVE_VER) return '版本 v' + ver + ' 不受支持（当前上限 v' + GAME.SAVE_VER + '）';
  if (!p.cards || typeof p.cards !== 'object' || Array.isArray(p.cards)) return '缺少卡册数据';
  if (!p.dupes || typeof p.dupes !== 'object' || Array.isArray(p.dupes)) return '缺少重复卡数据';
  if (!p.stats || typeof p.stats !== 'object' || Array.isArray(p.stats)) return '缺少统计数据';
  const cardIds = Object.keys(p.cards);
  if (cardIds.some(id => !CARD_BY_ID[id])) return '卡册中存在无效卡 ID';
  if (Object.keys(p.dupes).some(id => !CARD_BY_ID[id])) return '重复卡记录中存在无效卡 ID';
  const day = Number(p.day);
  if (!Number.isFinite(day) || day < 1 || day > GAME.TOTAL_DAYS) return '天数超出范围（1–' + GAME.TOTAL_DAYS + '）';
  const money = Number(p.money);
  if (!Number.isFinite(money) || money < 0 || money > 1e7) return '生活费数值非法';
  const shards = Number(p.shards);
  if (!Number.isFinite(shards) || shards < 0 || shards > (GAME.MAX_SHARDS || 5000)) return '碎片数值非法';
  if (p.pityLeft !== undefined && p.pityLeft !== null) {
    const pl = Number(p.pityLeft);
    if (!Number.isFinite(pl) || pl < 1 || pl > GAME.PITY_MAX) return '保底计数非法';
  }
  const badStat = Object.keys(p.stats).find(k => {
    const n = Number(p.stats[k]);
    return !Number.isFinite(n) || n < 0;
  });
  if (badStat) return '统计字段「' + badStat + '」数值非法';
  /* 拒绝空壳存档：必须至少有天数推进 / 卡牌 / 抽卡或收入记录 */
  const hasProgress = cardIds.length > 0 || day > 1
    || Number(p.stats.pulls) > 0 || Number(p.stats.income) > 0 || shards > 0;
  if (!hasProgress) return '没有任何可导入的进度';
  return null;
}
function hasLocalProgress() {
  return (state.day > 1) || uniqueCount() > 0 || (state.stats.pulls || 0) > 0;
}
function importedUnique(s) {
  return CARDS.filter(c => s.cards && s.cards[c.id]).length;
}
/* 导入前把当前存档写入独立备份键，供「撤销导入」使用 */
function backupCurrentSave() {
  try {
    localStorage.setItem(GAME.SAVE_BACKUP_KEY, JSON.stringify(state));
    return true;
  } catch (e) { return false; }
}
function resetTransientUI() {
  pendingPull = null;
  ssrQueue = [];
  ssrActive = false;
  if (ssrTimer) { clearTimeout(ssrTimer); ssrTimer = null; }
  albumMember = 'sy';
  closeModal();
  $('#settleOverlay').classList.remove('show');
  $('#packOverlay').classList.remove('show');
  $('#ssrOverlay').classList.remove('show');
  buildMemberTabs();
}
function applySaveCode() {
  const box = $('#saveCodeInput');
  const txt = box ? box.value.replace(/\s+/g, '') : '';
  if (!txt) { toast('请先粘贴存档码', true); return; }
  const decoded = decodeSaveCode(txt);
  if (decoded.err) {
    toast('存档码无效：' + decoded.err, true);
    sfx('error');
    return;
  }
  const reason = validateSavePayload(decoded.save);
  if (reason) {
    toast('存档码无效：' + reason, true);
    sfx('error');
    return;
  }
  pendingImport = normalizeSave(decoded.save);
  /* 越界值收敛：生活费不得超过存款上限，避免导入档破坏经济边界 */
  pendingImport.money = Math.min(pendingImport.money, GAME.SAVE_CAP);
  if (hasLocalProgress()) {
    /* 覆盖当前进度前二次确认，避免误触丢档 */
    const incU = importedUnique(pendingImport);
    openModal(`<div class="modal-wrap">
      <button class="x" data-act="close-modal">×</button>
      <h3 style="text-align:center">覆盖当前进度？</h3>
      <p class="event-desc" style="text-align:center">
        当前：第 ${state.day} 天 · 图鉴 ${uniqueCount()}/${GAME.TOTAL_CARDS} · ¥${fmt(state.money)} · 碎片 ${state.shards}<br>
        导入：第 ${pendingImport.day} 天 · 图鉴 ${incU}/${GAME.TOTAL_CARDS} · ¥${fmt(pendingImport.money)} · 碎片 ${pendingImport.shards}
      </p>
      <p class="event-desc" style="text-align:center">确认后当前进度会被覆盖；导入前会自动备份旧档，可在导入成功后撤销。</p>
      <div class="actions">
        <button class="btn danger" data-act="confirm-import-save">确认覆盖导入</button>
        <button class="btn ghost" data-act="close-modal">取消</button>
      </div>
    </div>`, true);
    return;
  }
  commitImportSave();
}
function commitImportSave() {
  const incoming = pendingImport;
  if (!incoming) return;
  pendingImport = null;
  const backedUp = backupCurrentSave();
  state = incoming;
  syncLineUnlocks();
  resetTransientUI();
  save();
  render();
  if ($('#screenAlbum').classList.contains('show')) renderAlbum();
  initPoster();
  sfx('reward');
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3 style="text-align:center">存档已导入</h3>
    <p class="event-desc" style="text-align:center">第 ${state.day} 天 · 图鉴 ${uniqueCount()}/${GAME.TOTAL_CARDS} · ¥${fmt(state.money)} · 碎片 ${state.shards}</p>
    <p class="event-desc" style="text-align:center">${backedUp
      ? '导入前的旧档已自动备份，如需反悔可撤销本次导入。'
      : '本机存储不可用，未能备份旧档，本次导入无法撤销。'}</p>
    <div class="actions">
      ${backedUp ? '<button class="btn ghost" data-act="undo-import-save">撤销导入</button>' : ''}
      <button class="btn gold" data-act="close-modal">完成</button>
    </div>
  </div>`, true);
}
function undoImportSave() {
  let raw = null;
  try { raw = localStorage.getItem(GAME.SAVE_BACKUP_KEY); } catch (e) { raw = null; }
  let p = null;
  if (raw) { try { p = JSON.parse(raw); } catch (e) { p = null; } }
  if (!p || typeof p !== 'object') {
    toast('没有可用的备份，无法撤销', true);
    sfx('error');
    return;
  }
  state = normalizeSave(p);
  syncLineUnlocks();
  resetTransientUI();
  try { localStorage.removeItem(GAME.SAVE_BACKUP_KEY); } catch (e) {}
  save();
  render();
  if ($('#screenAlbum').classList.contains('show')) renderAlbum();
  initPoster();
  sfx('reward');
  toast('已撤销导入，恢复到导入前的存档：第 ' + state.day + ' 天 · 图鉴 ' + uniqueCount() + '/' + GAME.TOTAL_CARDS);
}
