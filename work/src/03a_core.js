/* ================= 核心：状态 / 存档 / 音效 / 基础渲染 ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = n => Math.floor(Math.random() * n);
const randRange = (a, b) => a + rand(b - a + 1);

function defaultState() {
  return {
    v: GAME.SAVE_VER, day: 1, money: GAME.START_MONEY, shards: 0,
    cards: {}, dupes: {}, fresh: {},
    pityLeft: GAME.PITY_MAX, upPity: false,
    /* v4 P-08：每日首次单抽半价标记，跨天重置 */
    dailyHalfUsed: false,
    /* v5 · P-07：income 保留总收入口径，另拆四项收入来源便于结算页展示 */
    stats: { spent: 0, pulls: 0, n: 0, r: 0, sr: 0, ssr: 0, dupShards: 0, income: 0,
             incomeDaily: 0, incomeSell: 0, incomeReward: 0, incomeEvent: 0, shards: 0 },
    claimed: {}, mute: false, guideDone: false,
    lines: {},   // 每个成员已解锁的台词序号（按解锁顺序）
    todayPulls: 0, dayIncome: 0, market: null, marketDay: 0,
    events: [], ended: false, ending: null, lastEvent: null,
    freeSingles: 0, freeTen: 0, freeTenDay: 0,   // 免费券：单抽 / 当天有效的十连
    boostDay: 0,                               // 第 25 天 SSR 概率提升标记
    smallEvents: [], tags: {}, titles: {}, fixedDone: {}, midtermPending: 0,
    best: { unique: 0, titles: {} },            // 历史最高图鉴数 / 已得称号（跨局保留）
    vol: { bgm: .6, sfx: .8, voice: 1 }         // 音量分层
  };
}

let state = defaultState();
let pendingPull = null;   // 当前拆包结果
let tearProgress = 0;
let packLocked = false;
let ssrQueue = [];
let ssrTimer = null;
let ssrActive = false;
let currentSSR = null;
let deepTypeTimer = null;

let saveWarned = false;
/* 状态变更即写；写失败（隐私模式 / 配额满）给一次可见提示，并用存档码兜底 */
function save() {
  try {
    localStorage.setItem(GAME.SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    if (!saveWarned) {
      saveWarned = true;
      try { toast('本机存储不可用（隐私模式或空间不足），进度仅在本次页面有效；请到「更多玩法」导出存档码备份', true); } catch (e2) {}
    }
    return false;
  }
}
/* 存档校验 / 迁移：本地存档与存档码导入共用，杜绝脏字段 */
/* v4 · P-01 存档修复：老存档缺 stats.shards 时按历史重复卡返还回填，杜绝 0/NaN */
function normalizeSave(p) {
  const base = defaultState();
  if (!p || typeof p !== 'object') return base;

  // ① 合并到新对象：不污染 base，也不会丢默认字段
  const s = Object.assign({}, base, p);

  // ② stats 必须先拷默认值再叠加存档，否则会自己合并自己
  const ps = (p.stats && typeof p.stats === 'object') ? p.stats : {};
  const st = Object.assign({}, base.stats, ps);
  const nonNegInt = v => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  Object.keys(st).forEach(k => { st[k] = nonNegInt(st[k]); });
  /* v5 · P-07：老存档没有收入分项时，把未归类余额回填到「每日生活费」，保证四项之和 = 总收入 */
  const knownIncome = st.incomeSell + st.incomeReward + st.incomeEvent;
  if (st.incomeDaily + knownIncome < st.income) st.incomeDaily = st.income - knownIncome;
  s.stats = st;

  // ③ 容器类字段
  s.cards = (p.cards && typeof p.cards === 'object') ? p.cards : {};
  s.dupes = (p.dupes && typeof p.dupes === 'object') ? p.dupes : {};
  s.fresh = (p.fresh && typeof p.fresh === 'object') ? p.fresh : {};
  s.claimed = (p.claimed && typeof p.claimed === 'object') ? p.claimed : {};
  s.events = Array.isArray(p.events) ? p.events : [];
  s.lines = (p.lines && typeof p.lines === 'object') ? p.lines : {};
  s.smallEvents = Array.isArray(p.smallEvents)
    ? p.smallEvents.filter(e => e && Number.isInteger(e.day) && typeof e.key === 'string')
    : [];
  s.tags = (p.tags && typeof p.tags === 'object') ? p.tags : {};
  s.titles = (p.titles && typeof p.titles === 'object') ? p.titles : {};

  const bp = (p.best && typeof p.best === 'object') ? p.best : {};
  s.best = {
    unique: nonNegInt(bp.unique),
    titles: (bp.titles && typeof bp.titles === 'object') ? bp.titles : {}
  };
  s.fixedDone = (p.fixedDone && typeof p.fixedDone === 'object') ? p.fixedDone : {};

  // ④ 计数类字段统一归一化，老版本缺失的按 0 处理
  s.midtermPending = nonNegInt(s.midtermPending);
  s.freeSingles = nonNegInt(s.freeSingles);
  s.freeTen = nonNegInt(s.freeTen);
  s.freeTenDay = nonNegInt(s.freeTenDay);
  s.boostDay = nonNegInt(s.boostDay);
  s.upPity = !!s.upPity;
  s.dailyHalfUsed = !!s.dailyHalfUsed;

  // ⑤ 音量
  const vol = (p.vol && typeof p.vol === 'object') ? p.vol : {};
  const vnum = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, 0, 1) : d;
  };
  s.vol = { bgm: vnum(vol.bgm, .6), sfx: vnum(vol.sfx, .8), voice: vnum(vol.voice, 1) };

  // ⑥ 基础数值
  s.day = clamp(Math.round(Number(s.day) || 1), 1, GAME.TOTAL_DAYS);
  s.money = nonNegInt(s.money);
  /* v4 P-07：碎片上限，防止篡改存档让历史最高失真 */
  s.shards = clamp(nonNegInt(s.shards), 0, GAME.MAX_SHARDS || 5000);
  s.pityLeft = clamp(Math.round(Number(s.pityLeft) || GAME.PITY_MAX), 1, GAME.PITY_MAX);
  s.todayPulls = nonNegInt(s.todayPulls);

  // ⑦ 清理无效卡，并按重复卡记录精确重建历史碎片
  Object.keys(s.cards).forEach(id => { if (!CARD_BY_ID[id]) delete s.cards[id]; });
  Object.keys(s.fresh).forEach(id => { if (!CARD_BY_ID[id]) delete s.fresh[id]; });

  let dupShardHistory = 0;
  Object.keys(s.dupes).forEach(id => {
    const card = CARD_BY_ID[id];
    if (!card) { delete s.dupes[id]; return; }
    const cnt = Math.round(Number(s.dupes[id]));
    if (!Number.isFinite(cnt) || cnt <= 0) { delete s.dupes[id]; return; }
    s.dupes[id] = cnt;
    const info = RARITY_INFO[card.rarity];
    if (info && info.shard) dupShardHistory += cnt * info.shard;
  });

  // ⑧ 关键修复：老存档没有 stats.shards 时回填精确下限
  const rawShards = ps.shards;
  const shardsUsable =
    rawShards !== undefined && rawShards !== null && Number.isFinite(Number(rawShards));
  if (!shardsUsable) {
    s.stats.shards = dupShardHistory;
  }
  s.stats.dupShards = Math.max(nonNegInt(s.stats.dupShards), dupShardHistory);

  /* v4 P-09：归一化后统一写入当前版本号 */
  s.v = GAME.SAVE_VER;

  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(GAME.SAVE_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return false;
    state = normalizeSave(p);
    syncLineUnlocks();
    save();   // 迁移/补齐台词后立即落盘，避免刷新回退
    return true;
  } catch (e) { return false; }
}

function owned(id) { return !!(state.cards && state.cards[id]); }
function uniqueCount() { return CARDS.filter(c => owned(c.id)).length; }
function memberOwned(key) { return CARDS_BY_MEMBER[key].filter(c => owned(c.id)).length; }

/* ---------- 生日限定池 ---------- */
function gameDate(day) {
  const d = new Date(2026, GAME.START_MONTH - 1, GAME.START_DAY);
  d.setDate(d.getDate() + Math.max(1, Math.round(day)) - 1);
  const m = d.getMonth() + 1, dd = d.getDate();
  return { m, d: dd, md: (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd };
}
function birthdayKeyForDay(day) {
  const md = gameDate(day).md;
  const hit = MEMBERS.find(m => m.birthMD === md);
  return hit ? hit.key : null;
}
function upKeyNow() { return birthdayKeyForDay(state.day) || GAME.UP_KEY; }

/* ---------- 台词解锁（随存档保存，按解锁顺序） ---------- */
function unlockLine(card) {
  if (!state.lines || typeof state.lines !== 'object') state.lines = {};
  const arr = Array.isArray(state.lines[card.member]) ? state.lines[card.member] : (state.lines[card.member] = []);
  if (!arr.includes(card.idx)) arr.push(card.idx);
}
function syncLineUnlocks() {
  if (!state.lines || typeof state.lines !== 'object') state.lines = {};
  MEMBERS.forEach(m => {
    const arr = Array.isArray(state.lines[m.key])
      ? state.lines[m.key].filter(i => Number.isInteger(i) && i >= 0 && i < 8) : [];
    CARDS_BY_MEMBER[m.key].slice().sort((a, b) => a.idx - b.idx).forEach(c => {
      if (owned(c.id) && !arr.includes(c.idx)) arr.push(c.idx);
    });
    state.lines[m.key] = arr;
  });
}

/* ---------- 音效 / BGM（WebAudio 合成）/ 语音（assets/voice 预录 mp3） 分层 ---------- */
let actx = null, bgmGain = null, sfxGain = null;
const AUDIO = { bgmKind: '', bgmTimer: null };
const VOL_DEFAULT = { bgm: .6, sfx: .8, voice: 1 };

function audioVol(k) {
  const v = state && state.vol ? state.vol[k] : null;
  return Number.isFinite(+v) ? clamp(+v, 0, 1) : (VOL_DEFAULT[k] ?? 1);
}
function ensureAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      bgmGain = actx.createGain(); bgmGain.connect(actx.destination);
      sfxGain = actx.createGain(); sfxGain.connect(actx.destination);
    }
    applyVol();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
  return actx;
}
function applyVol() {
  if (bgmGain) bgmGain.gain.value = audioVol('bgm');
  if (sfxGain) sfxGain.gain.value = audioVol('sfx');
}
function note(freq, t0, dur, vol, type, bus) {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || .1, t0 + .012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus || sfxGain || actx.destination);
  o.start(t0); o.stop(t0 + dur + .02);
}
function sfx(name) {
  if (!state || state.mute) return;
  if (!ensureAudio()) return;
  const t = actx.currentTime;
  switch (name) {
    case 'click': note(760, t, .06, .05, 'sine'); note(1120, t + .04, .05, .03, 'sine'); break;
    case 'tear': note(260, t, .18, .05, 'sawtooth'); note(420, t + .08, .2, .04, 'sawtooth'); break;
    case 'flip': note(520, t, .07, .05, 'triangle'); note(880, t + .05, .09, .045, 'triangle'); break;
    case 'sr': [660, 880, 1100].forEach((f, i) => note(f, t + i * .07, .18, .07, 'triangle')); break;
    case 'ssr': [523, 659, 784, 1046, 1318].forEach((f, i) => note(f, t + i * .1, .5, .09, 'triangle')); note(1568, t + .52, .8, .07, 'sine'); break;
    case 'reward': [784, 988, 1175].forEach((f, i) => note(f, t + i * .09, .3, .08, 'sine')); break;
    case 'error': note(190, t, .12, .06, 'square'); note(150, t + .1, .16, .05, 'square'); break;
    case 'day': note(440, t, .12, .05, 'sine'); note(660, t + .1, .16, .05, 'sine'); break;
    case 'collect': note(990, t, .2, .07, 'sine'); break;
    case 'complete': [784, 988, 1175, 1568].forEach((f, i) => note(f, t + i * .12, .6, .08, 'triangle')); break;
    case 'star': note(1318, t, .5, .05, 'sine'); note(1760, t + .2, .7, .04, 'sine'); break;
  }
}

/* ---------- 语音（预录配音 assets/voice/<成员>_<类型>.mp3；文件不存在时静默，不回退机器朗读） ---------- */
let curVoice = null, curVoiceMember = '';
function playVoice(memberKey, type, onDone) {
  if (!state || state.mute) return null;
  const v = audioVol('voice');
  if (v <= 0) return null;
  try {
    stopVoice();
    const a = new Audio('assets/voice/' + memberKey + '_' + type + '.mp3');
    a.volume = v;
    curVoice = a;
    curVoiceMember = memberKey;
    const btn = document.querySelector('[data-act="voice-play"][data-member="' + memberKey + '"]');
    const prog = btn ? btn.querySelector('.vbar i') : null;
    const paint = () => {
      if (!prog || curVoice !== a) return;
      const d = a.duration;
      prog.style.width = (Number.isFinite(d) && d > 0 ? Math.min(100, a.currentTime / d * 100) : 0) + '%';
    };
    const done = () => {
      if (curVoice === a) { curVoice = null; curVoiceMember = ''; }
      if (btn) btn.classList.remove('vplaying');
      if (prog) prog.style.width = '0%';
      if (typeof onDone === 'function') { try { onDone(a); } catch (e) {} }
    };
    a.addEventListener('ended', done);
    a.addEventListener('error', done);   /* 无对应音频文件：静默 */
    a.addEventListener('timeupdate', paint);
    a.addEventListener('loadedmetadata', paint);
    const p = a.play();
    if (p && p.catch) p.catch(done);
    if (btn) btn.classList.add('vplaying');
    if (prog) prog.style.width = '0%';
    return a;
  } catch (e) { return null; }
}
function stopVoice() {
  try { if (curVoice) { curVoice.pause(); curVoice.currentTime = 0; curVoice = null; } } catch (e) {}
  curVoiceMember = '';
  $$('.vplaying').forEach(b => b.classList.remove('vplaying'));
  $$('.vbar i').forEach(p => { p.style.width = '0%'; });
}

/* ---------- BGM（分层循环，音量走 bgmGain） ---------- */
const BGM_PATTERNS = {
  home: { loop: 3.2, vol: .045, type: 'triangle', notes: [[0, 392, .9], [.45, 523, .9], [.9, 659, 1.1], [1.7, 523, .9], [2.35, 392, 1.0]] },
  tension: { loop: 2.6, vol: .05, type: 'sawtooth', notes: [[0, 262, 1.2], [.6, 330, 1.0], [1.25, 392, 1.2], [2.0, 330, 1.0]] },
  ssr: { loop: 2.2, vol: .055, type: 'triangle', notes: [[0, 523, .5], [.15, 659, .5], [.3, 784, .6], [.45, 1046, .9], [1.2, 880, .6], [1.65, 1318, 1.0]] },
  album: { loop: 4.2, vol: .028, type: 'sine', notes: [[0, 330, .8], [.8, 415, .8], [1.6, 349, .8], [2.6, 262, 1.0]] },
  collect: { loop: 2.8, vol: .05, type: 'triangle', notes: [[0, 440, .7], [.5, 554, .7], [1.0, 659, .9], [1.8, 880, 1.1]] }
};
function startBGM(kind) {
  if (!state || state.mute) return;
  if (!ensureAudio()) return;
  if (AUDIO.bgmKind === kind && AUDIO.bgmTimer) return;
  stopBGM(true);
  AUDIO.bgmKind = kind;
  const p = BGM_PATTERNS[kind] || BGM_PATTERNS.home;
  const tick = () => {
    if (!actx || AUDIO.bgmKind !== kind) return;
    const t = actx.currentTime;
    p.notes.forEach(n => note(n[1], t + n[0], n[2], p.vol, p.type, bgmGain));
  };
  tick();
  AUDIO.bgmTimer = setInterval(tick, p.loop * 1000);
}
function stopBGM(keepKind) {
  if (AUDIO.bgmTimer) { clearInterval(AUDIO.bgmTimer); AUDIO.bgmTimer = null; }
  if (!keepKind) AUDIO.bgmKind = '';
}
function refreshBGM() {
  if (!state) return;
  if (state.mute) { stopBGM(); return; }
  if ($('#ssrOverlay') && $('#ssrOverlay').classList.contains('show')) { startBGM('ssr'); return; }
  if ($('#modalBack') && $('#modalBack').classList.contains('celebrate')) { startBGM('collect'); return; }
  if ($('#packOverlay') && $('#packOverlay').classList.contains('show')) { startBGM('tension'); return; }
  if ($('#screenAlbum') && $('#screenAlbum').classList.contains('show')) { startBGM('album'); return; }
  startBGM('home');
}

/* ---------- toast ---------- */
let toastTimer = null;
/* v5 · P-03：最新消息优先；当前提示最多再占 700–1000ms 就切换，
   警告类（券过期 / 溢出 / 余额不足）优先展示，避免关键提示被普通提示挤掉 */
let toastQueue = [], toastBusy = false, toastWarnLast = false, toastShownAt = 0;
function toast(msg, warn) {
  if (!msg) return;
  const item = { msg: msg, warn: !!warn };
  toastQueue.push(item);
  if (toastQueue.length > 8) toastQueue.splice(0, toastQueue.length - 8);
  if (!toastBusy) { showNextToast(); return; }
  /* 新来的普通提示把更早的普通提示挤掉，警告类保留 */
  if (!item.warn) toastQueue = toastQueue.filter(q => q.warn || q === item);
  const elapsed = Date.now() - toastShownAt;
  const minShow = toastWarnLast ? 1000 : 700;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(showNextToast, Math.max(0, minShow - elapsed));
}
function pickToast() {
  /* 警告类优先（同类取最新），否则取最新一条 */
  for (let i = toastQueue.length - 1; i >= 0; i--) {
    if (toastQueue[i].warn) return toastQueue.splice(i, 1)[0];
  }
  return toastQueue.pop() || null;
}
function showNextToast() {
  const el = $('#toast');
  const item = pickToast();
  if (!item) {
    toastBusy = false;
    el.className = 'toast' + (toastWarnLast ? ' warn' : '');
    return;
  }
  toastBusy = true;
  toastWarnLast = item.warn;
  toastShownAt = Date.now();
  el.textContent = item.msg;
  el.className = 'toast show' + (item.warn ? ' warn' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(showNextToast, item.warn ? 2400 : 2000);
}

/* ---------- 弹窗 ---------- */
function openModal(html, center) {
  const back = $('#modalBack'), box = $('#modalBox');
  box.innerHTML = html;
  box.className = 'modal' + (center ? ' center' : '');
  back.className = 'modal-back show' + (center ? ' center-mode' : '');
  back.dataset.center = center ? '1' : '0';
  sfx('click');
}
function closeModal() {
  if (typeof stopCollectType === 'function') stopCollectType();
  /* P8 · O-15：关闭弹层即清理待导入状态，避免取消后残留（撤销导入走独立备份键，不受影响） */
  if (typeof clearPendingImport === 'function') clearPendingImport();
  $('#modalBack').className = 'modal-back';
  $('#modalBox').innerHTML = '';
  if (typeof refreshBGM === 'function') refreshBGM();
}

/* 拆包未收下时拦截其他浮层，避免多层叠加；同时在结算后锁集市与兑换，防止后续操作篡改本局记录 */
function guardPackBusy() {
  if ($('#packOverlay').classList.contains('show')) {
    toast('先收下这次拆到的卡牌吧', true);
    sfx('error');
    return true;
  }
  if (state && state.ended) {
    toast('本局已结算，点「再来一局」重新开始', true);
    sfx('error');
    return true;
  }
  return false;
}

/* ---------- 静音 ---------- */
function muteIcon() {
  const on = state && !state.mute;
  $('#muteIcon').innerHTML = on
    ? `<path d="M4 9.5h3.2l4.3-3.4v11.8l-4.3-3.4H4z" fill="#ffe6f2"/><path d="M15.5 8.5c1.6 1.8 1.6 5.2 0 7M18 6.2c2.6 2.9 2.6 8.7 0 11.6" stroke="#ffd39b" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
    : `<path d="M4 9.5h3.2l4.3-3.4v11.8l-4.3-3.4H4z" fill="#ffe6f2" opacity=".6"/><path d="M15 9l5 6M20 9l-5 6" stroke="#ff9da9" stroke-width="1.6" stroke-linecap="round"/>`;
}

/* ---------- 金额展示 ---------- */
function fmt(n) { return Math.max(0, Math.round(n)); }

/* v5 · P-01：唯一加钱入口。按实际到账记账（封顶 SAVE_CAP），返回 { gained, spilled }。
   reason: daily 每日生活费 / sell 碎片寄卖 / reward 收集考核 / event 事件剧情 */
const INCOME_FIELD = { daily: 'incomeDaily', sell: 'incomeSell', reward: 'incomeReward', event: 'incomeEvent' };
function addMoney(n, reason) {
  const delta = Math.round(Number(n));
  if (!Number.isFinite(delta) || delta === 0) return { gained: 0, spilled: 0 };
  const cap = GAME.SAVE_CAP || 600;
  const before = Math.max(0, Math.round(Number(state.money) || 0));
  let after = before + delta;
  if (delta > 0) {
    /* 已达上限时只增不减：余额不变，本次全额算溢出 */
    after = before >= cap ? before : Math.min(after, cap);
  } else {
    after = Math.max(0, after);
  }
  const gained = after - before;
  const spilled = delta - gained;
  state.money = after;
  if (delta > 0 && reason && INCOME_FIELD[reason]) {
    state.stats.income += gained;
    state.stats[INCOME_FIELD[reason]] += gained;
  }
  save();
  return { gained: gained, spilled: spilled };
}
function gainShards(n) {
  const delta = Math.round(Number(n));
  if (!Number.isFinite(delta)) return;

  const cur = Math.max(0, Math.round(Number(state.shards) || 0));
  state.shards = Math.max(0, cur + delta);

  if (delta > 0) {
    if (!state.stats || typeof state.stats !== 'object') state.stats = {};
    const total = Math.round(Number(state.stats.shards));
    state.stats.shards = Math.max(0, Number.isFinite(total) ? total : 0) + delta;
  }
  save();
}
function canPay(n) { return state.money >= n; }

/* ---------- 主界面渲染 ---------- */
function render() {
  if (!state) return;
  $('#dayNum').textContent = state.day;
  $('#dayHint').textContent = state.day >= GAME.TOTAL_DAYS
    ? '结束旅程 · 去结算'
    : (state.dayIncome > 0
        ? '今日生活费已领 ¥' + state.dayIncome
        : '进入下一天领取 ¥' + GAME.DAILY_MIN + '-' + GAME.DAILY_MAX);
  if ($('#moneyLabel')) $('#moneyLabel').textContent = state.ended ? '结余 ¥' : '生活费 ¥';
  $('#moneyVal').textContent = fmt(state.money);
  $('#moneyVal2').textContent = fmt(state.money);
  $('#shardVal').textContent = fmt(state.shards);
  $('#shardVal2').textContent = fmt(state.shards);
  $('#pullCountToday').textContent = state.todayPulls;
  $('#spentVal').textContent = fmt(state.stats.spent);
  $('#albumBadge').textContent = uniqueCount();
  /* 开包期间显示抽前保底快照，收下后才更新为逐张结算后的数字，保证「看到的数 = 实际生效的数」 */
  const pShow = (pendingPull && pendingPull.pityBefore) || state.pityLeft;
  $('#pityText').textContent = '再抽 ' + pShow + ' 包必出 SSR';
  $('#pityBar').style.width = ((GAME.PITY_MAX - pShow) / GAME.PITY_MAX * 100).toFixed(1) + '%';
  const u = uniqueCount();
  $('#collectNum').textContent = u;
  $('#collectBar').style.width = (u / GAME.TOTAL_CARDS * 100).toFixed(1) + '%';
  $('#albumCount').textContent = u + '/' + GAME.TOTAL_CARDS;
  $('#albumBar').style.width = (u / GAME.TOTAL_CARDS * 100).toFixed(1) + '%';
  if (typeof syncMemberTabs === 'function') syncMemberTabs();
  const freeTenOK = state.freeTen > 0 && state.freeTenDay === state.day;
  const freeOne = state.freeSingles > 0;
  if ($('#couponRow')) {
    const chips = [];
    if (state.midtermPending > 0) chips.push('<button class="coupon-chip claim" data-act="midterm-claim">中期奖励待领 +¥' + state.midtermPending + '</button>');
    if (freeOne) chips.push('<span class="coupon-chip">免费单抽 ×' + state.freeSingles + '</span>');
    if (freeTenOK) chips.push('<span class="coupon-chip">免费十连 ×' + state.freeTen + ' · 今日有效</span>');
    $('#couponRow').innerHTML = chips.join('');
    $('#couponRow').classList.toggle('show', chips.length > 0);
  }
  const p1Price = $('#pull1Btn .price');
  /* v4 P-08：每日首次单抽半价时显示 ¥9 并按半价判定可用 */
  const p1Half = !freeOne && !state.dailyHalfUsed;
  if (p1Price) p1Price.innerHTML = freeOne ? ('免费 ×' + state.freeSingles) : (p1Half ? ('<small>¥</small>' + GAME.PRICE1_FIRST + ' <s>' + GAME.PRICE1 + '</s>') : ('<small>¥</small>' + GAME.PRICE1));
  /* v5 · P-02：结算后抽卡 / 下一天按钮置灰并标 aria-disabled，点击给明确提示 */
  const ended = !!state.ended;
  $('#pull1Btn').classList.toggle('dim', ended || !(freeOne || canPay(p1Half ? GAME.PRICE1_FIRST : GAME.PRICE1)));
  $('#pull10Btn').classList.toggle('dim', ended || !(freeTenOK || canPay(GAME.PRICE10)));
  $('#pull1Btn').setAttribute('aria-disabled', ended ? 'true' : 'false');
  $('#pull10Btn').setAttribute('aria-disabled', ended ? 'true' : 'false');
  const dayBtn = $('.day-btn');
  if (dayBtn) {
    dayBtn.classList.toggle('dim', ended);
    dayBtn.setAttribute('aria-disabled', ended ? 'true' : 'false');
  }
  applyVol();
  $('#muteBtn').setAttribute('aria-pressed', state.mute ? 'true' : 'false');
  muteIcon();
  if ($('#screenAlbum').classList.contains('show')) renderAlbum();
}

const AV_IMGS = {};
/* v5 · P-06：首屏只预载海报关键图，卡面 / 立绘 / 头像全部按需懒加载 */
function preloadArt() {
  const key = upKeyNow();
  const src = (birthdayKeyForDay(state.day) === key ? ART_SSR[key] : ART[key]) || ART[key];
  if (!src) return;
  const im = new Image();
  im.decoding = 'async';
  im.src = src;
}
/* 结算卡需要头像，打开结算页时再预热这 7 张小图；未加载完成时 canvas 回退渐变 */
function preloadAvatars() {
  MEMBERS.forEach(m => {
    if (!ART_AV[m.key] || AV_IMGS[m.key]) return;
    const im = new Image();
    im.decoding = 'async';
    im.src = ART_AV[m.key];
    AV_IMGS[m.key] = im;
  });
}

function initPoster() {
  const key = upKeyNow();
  const up = MEMBER_BY_KEY[key];
  const isBirthday = birthdayKeyForDay(state.day) === key;
  const pa = $('#posterArt');
  pa.innerHTML = artHTML({ member: key, artKind: isBirthday ? 'ssr' : 'main' }, { eager: true });
  pa.classList.toggle('bday', isBirthday);
  const pt = $('.pool-tag');
  if (pt) pt.classList.toggle('bday', isBirthday);
  if ($('#upName')) $('#upName').textContent = up.name + (isBirthday ? ' · 生日限定' : ' · 星轨回响');
  if ($('#poolTagText')) $('#poolTagText').textContent = isBirthday ? '生日限定' : '三周年限定';
  if ($('#posterSub')) $('#posterSub').textContent = isBirthday
    ? ('HAPPY BIRTHDAY · ' + gameDate(state.day).m + '/' + gameDate(state.day).d)
    : 'SEVEN STARS · ONE STAGE';
}

/* ---------- 稀有度 / 卡片渲染 ---------- */
function artHTML(card, opts) {
  const m = MEMBER_BY_KEY[card.member];
  const sc = ((card.scene || 0) % 4 + 4) % 4;
  let src = ART[m.key] || '';
  let kind = '';
  if (card.artKind === 'ssr' || card.rarity === 'SSR') {
    src = ART_SSR[m.key] || src;
    kind = ' art-ssr';
  } else if (card.rarity === 'SR') {
    src = ART_SR[m.key] || src;
    /* 同一张 SR 图两种构图：一张偏上半身、一张偏中景，色调也拉开 */
    kind = (card.idx === 6) ? ' sr-split' : ' sr-scene';
  }
  /* v5 · P-06：首屏海报 eager，其余卡面 / 立绘按需懒加载；容器已有底色，避免白块 */
  const load = (opts && opts.eager) ? 'eager' : 'lazy';
  return `<div class="pf scene-${sc}${kind}">
    <img src="${src}" alt="${m.name}" draggable="false" loading="${load}" decoding="async">
    <span class="pf-tone"></span>
    <span class="pf-fx"></span>
    <span class="pf-edge"></span>
  </div>`;
}
function cardArtHTML(card) { return artHTML(card); }
function rarityTag(r) { return `<span class="rb">${r}</span>`; }

function cardHTML(c, opts) {
  const o = opts || {};
  const m = MEMBER_BY_KEY[c.member];
  const lock = !owned(c.id) && !o.force;
  return `<div class="gcard ${c.rarity}${lock ? ' locked' : ''}" data-act="${o.act || 'card'}" data-card="${c.id}">
    <div class="art" style="--mc:${m.color}">${cardArtHTML(c)}
      ${o.badge === 'new' ? '<span class="badge-new">NEW</span>' : ''}
      ${o.badge === 'dup' ? '<span class="badge-dup">重复</span>' : ''}
      ${lock ? '<div class="lock-mark"><div class="lc"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="10" width="12" height="9" rx="3" stroke="#e7d2dc" stroke-width="1.6"/><path d="M9 10V7.6a3 3 0 016 0V10" stroke="#e7d2dc" stroke-width="1.6" fill="none"/></svg></div><span>未获得</span></div>' : ''}
    </div>
    ${rarityTag(c.rarity)}
    <div class="shine"></div>
    ${c.rarity === 'SSR' ? '<span class="spark"></span><span class="spark"></span><span class="spark"></span>' : ''}
    <div class="meta">
      <div class="mem" style="--mc:${m.color}"><i></i>${m.name}</div>
      <p class="nm">${lock ? '？？？' : c.name}</p>
    </div>
  </div>`;
}

/* ---------- 首屏引导 / 教练气泡 ---------- */
function showGuide() {
  $('#guide').classList.add('show');
}
function hideGuide() {
  $('#guide').classList.remove('show');
}
let coachTimer = null;
function showCoach(text, ms) {
  const el = $('#coach');
  el.textContent = text || '先拆一包试试运气吧～';
  el.classList.add('show');
  clearTimeout(coachTimer);
  coachTimer = setTimeout(() => el.classList.remove('show'), ms || 6000);
}
function hideCoach() {
  clearTimeout(coachTimer);
  $('#coach').classList.remove('show');
}
