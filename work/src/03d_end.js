/* ================= 天数 / 事件 / 结算 / 重开 / 规则 ================= */
/* ---------- 固定事件日（写死在第 30 天日历里） ---------- */
const FIXED_EVENTS = {
  5:  { key:'practice', name:'练习室加练', member:'sy' },
  10: { key:'bday-sy',  name:'沈星野生日', member:'sy' },
  15: { key:'midterm',  name:'中期考核' },
  20: { key:'bday-ja',  name:'江予安生日', member:'ja' },
  25: { key:'rehearsal', name:'演唱会彩排' },
  30: { key:'finale',   name:'星轨终章' }
};

function triggerFixedEvent(day) {
  const ev = FIXED_EVENTS[day];
  if (!ev) return false;
  if (state.fixedDone[day]) return false;
  state.fixedDone[day] = 1;
  if (day === 5) state.freeSingles += 1;
  if (day === 10 || day === 20) {
    gainShards(30);
    playVoice(ev.member, 'birthday');
  }
  if (day === 15) {
    const u = uniqueCount();
    const gain = u < 20 ? 80 : (u <= 35 ? 120 : 180);
    /* 考核奖励不混入当天生活费，进入待领取，按钮领取后才入账 */
    state.midtermPending = gain;
  }
  if (day === 25) {
    state.boostDay = 25;
    state.freeTen = 1;
    state.freeTenDay = 25;
  }
  save();
  render();
  if (day !== 30) setTimeout(() => showFixedEvent(day), 460);
  return true;
}

function showFixedEvent(day) {
  const ev = FIXED_EVENTS[day];
  if (!ev) return;
  const m = ev.member ? MEMBER_BY_KEY[ev.member] : null;
  if (day === 5) {
    openModal(`<div class="modal-wrap story-wrap" style="--mc:${m.color}">
      <button class="x" data-act="close-modal">×</button>
      <div class="story-art"><img src="${ART.sy}" alt="沈星野"></div>
      <div class="story-kicker">DAY 05 · 练习室加练</div>
      <p class="story-text">练习室的灯还亮着。<br>沈星野把毛巾扔给你，声音有点哑：<br>“他们先走了。你……再陪我练最后一遍？”</p>
      <div class="story-choices">
        <button class="choice" data-act="story-choice" data-member="sy" data-choice="stay">好，再陪你练一遍<small>（碎片 +15）</small></button>
        <button class="choice" data-act="story-choice" data-member="sy" data-choice="rest">你先回去休息<small>（生活费 +¥40）</small></button>
      </div>
    </div>`, true);
    sfx('collect');
    return;
  }
  if (day === 10 || day === 20) {
    openModal(`<div class="modal-wrap bday-wrap" style="--mc:${m.color};--mc2:${m.color2}">
      <button class="x" data-act="close-modal">×</button>
      <div class="bday-glow"></div>
      <div class="story-art"><img src="${ART_SSR[m.key]}" alt="${m.name}"></div>
      <div class="story-kicker">DAY ${day} · BIRTHDAY UP</div>
      <h3 class="story-title">${m.name} · ${m.birthday}</h3>
      <p class="story-text">舞台下的灯牌一块块亮起。<br>他朝你的方向看了一眼，像是只看见了这一块。</p>
      <button class="light-stick" data-act="light-stick" data-member="${m.key}">点亮应援灯牌</button>
      <div class="event-effect">生日语音已播放 · 碎片 +30</div>
      <div class="actions"><button class="btn primary" data-act="close-modal">收下这份生日</button></div>
    </div>`, true);
    sfx('reward');
    return;
  }
  if (day === 15) {
    const u = uniqueCount();
    const gain = state.midtermPending || 0;
    const line = u < 20 ? '还早。但至少你没缺席。' : (u <= 35 ? '进度不错，星轨已经亮了一半。' : '……你比我想象中认真。');
    openModal(`<div class="modal-wrap story-wrap">
      <button class="x" data-act="close-modal">×</button>
      <div class="story-kicker">DAY 15 · 中期考核</div>
      <p class="story-text">教练翻完你的记录，停了几秒。</p>
      <p class="story-quote">“${line}”</p>
      <p class="story-text">当前图鉴 ${u}/${GAME.TOTAL_CARDS}。</p>
      <div class="event-effect">中期考核奖励：生活费 +¥${gain}（待领取）</div>
      <div class="actions">
        <button class="btn gold" data-act="midterm-claim" data-amount="${gain}">领取 +¥${gain}</button>
        <button class="btn ghost" data-act="close-modal">继续</button>
      </div>
    </div>`, true);
    sfx('reward');
    return;
  }
  if (day === 25) {
    openModal(`<div class="modal-wrap story-wrap">
      <button class="x" data-act="close-modal">×</button>
      <div class="story-kicker">DAY 25 · 演唱会彩排</div>
      <p class="story-text">舞台灯光全开，星轨投影在幕布上缓缓转动。<br>今天的抽卡手感，似乎比平时更亮一点。</p>
      <div class="event-effect">今日 SSR 基础概率 2% → 3.5%<br>免费十连券 ×1（仅今天有效）</div>
      <div class="actions"><button class="btn primary" data-act="close-modal">趁着灯光还在</button></div>
    </div>`, true);
    sfx('reward');
    return;
  }
}

function claimMidterm() {
  const gain = state.midtermPending;
  if (!gain) { closeModal(); return; }
  state.midtermPending = 0;
  const got = addMoney(gain, 'reward');
  save();
  render();
  closeModal();
  sfx('reward');
  toast('中期考核奖励到账：生活费 +¥' + got.gained
    + (got.spilled ? '（存款已达上限，溢出 ¥' + got.spilled + ' 未入账）' : ''), got.spilled > 0);
}

/* 第 5 天对话选项：留陪练 → 碎片 +15；放他休息 → 生活费 +¥40；两边都有免费单抽 */
function chooseStory(key, choice) {
  const stay = choice === 'stay';
  if (stay) gainShards(15);
  else addMoney(40, 'event');
  render();
  openModal(`<div class="modal-wrap story-wrap">
    <button class="x" data-act="close-modal">×</button>
    <div class="story-kicker">DAY 05 · 练习室加练</div>
    <p class="story-text">${stay ? '“那就最后一遍。”他把灯调暗了一点，音乐重新响起。' : '“行。路上小心。”他别过头，声音比刚才更哑。'}</p>
    <p class="story-quote">“${stay ? '……谢了。' : '……谢了。明天别迟到。'}”</p>
    <div class="event-effect">免费单抽 ×1 · ${stay ? '碎片 +15' : '生活费 +¥40'}</div>
    <div class="actions"><button class="btn primary" data-act="close-modal">离开练习室</button></div>
  </div>`, true);
  sfx('reward');
  playVoice(key, 'thanks');
}

/* ---------- 随机小事件：每天 30% 概率，一天最多 1 次 ---------- */
const SMALL_EVENTS = [
  { key:'lamp', name:'练习室留灯', desc:'夜深了，练习室还亮着一盏灯。桌上留了瓶没开封的水。', money:50 },
  { key:'dm', name:'成员私信', desc:'手机亮了，是他发来的消息：“今天也要记得吃饭。”', shard:6 },
  { key:'street', name:'公司楼下偶遇', desc:'刚出地铁口就撞见结束行程的他。他把墨镜往上推了推。', free:1 },
  { key:'fan', name:'被粉丝认出来', desc:'有人小声叫住你，递来一张手幅：“请问……你也是 STAR7 的粉丝吗？”', tag:'passerby' },
  { key:'rain', name:'雨天共伞', desc:'雨忽然变大。有人把伞移到了你这边，半边肩膀都淋湿了。', shard:10, rainOnly:true },
  { key:'coffee', name:'便利店的咖啡', desc:'你在货架前犹豫时，店员把最后一杯热咖啡推给了你。', money:-20, shard:12 },
  { key:'photo', name:'旧照片', desc:'相册翻到一张没发出去的合照，背面写着日期和他的名字。', shard:6 },
  { key:'store', name:'周边补货', desc:'官方店突然补了货，你顺手把多出来的一份挂上了二手平台。', money:30 },
  { key:'radio', name:'深夜电台', desc:'他在电台里点了一首没公开的 demo，说“给一个人听”。', shard:8 },
  { key:'lost', name:'捡到一张票根', desc:'地铁座位下压着一张旧票根，背面是熟悉的字迹。你把它收进卡册夹层。', money:25 },
  { key:'group', name:'群聊红包', desc:'粉丝群突然下起了红包雨，你抢到最小的一份，却最好运。', money:10, shard:5 },
  { key:'walk', name:'收工夜路', desc:'演出结束，你沿着江边走了一段。风把应援旗吹得很响。', money:40 }
];
const RAINY_DAYS = [3, 9, 14, 22, 28];
function isRainyDay(day) { return RAINY_DAYS.includes(day); }

function maybeSmallEvent() {
  if (Math.random() > .30) return null;
  const recent = state.smallEvents
    .filter(e => state.day - e.day >= 0 && state.day - e.day < 7)
    .map(e => e.key);
  let pool = SMALL_EVENTS.filter(e => !recent.includes(e.key) && (!e.rainOnly || isRainyDay(state.day)));
  if (!pool.length) pool = SMALL_EVENTS.filter(e => !e.rainOnly);
  return pool[rand(pool.length)];
}

function applySmallEvent(ev) {
  state.lastEvent = ev.key;
  state.events.push({ day: state.day, key: ev.key });
  if (state.events.length > 40) state.events.shift();
  state.smallEvents.push({ day: state.day, key: ev.key });
  if (state.smallEvents.length > 30) state.smallEvents.shift();
  const got = ev.money ? addMoney(ev.money, ev.money > 0 ? 'event' : null) : null;
  if (ev.shard) gainShards(ev.shard);
  if (ev.free) state.freeSingles += ev.free;
  if (ev.tag) state.tags[ev.tag] = (state.tags[ev.tag] || 0) + 1;
  let eff = '';
  if (ev.money > 0) eff = '生活费 +¥' + got.gained + (got.spilled ? '（存款上限溢出 ¥' + got.spilled + ' 未入账）' : '');
  else if (ev.money < 0) eff = '生活费 −¥' + Math.abs(ev.money);
  if (ev.shard) eff += (eff ? ' · ' : '') + '碎片 +' + ev.shard;
  if (ev.free) eff += (eff ? ' · ' : '') + '免费单抽 ×' + ev.free;
  if (ev.tag) eff += (eff ? ' · ' : '') + '称号进度「路人缘」+1';
  return eff || '心情值 +1';
}

function showSmallEvent(ev, eff) {
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <div class="event-art"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6l2.3 6.1 6.1 2.3-6.1 2.3L12 19.4l-2.3-6.1L3.6 11l6.1-2.3z" fill="#e8a45e"/></svg></div>
    <p class="event-name">${ev.name}</p>
    <p class="event-desc">${ev.desc}</p>
    <div class="event-effect">${eff}</div>
    <div class="actions"><button class="btn primary" data-act="close-modal">收下这份日常</button></div>
  </div>`, true);
  sfx('click');
}

function nextDay() {
  /* v4 P-09：已结算 → 直接回到结算页；第 30 天 → 先二次确认再结算 */
  if (state.ended) { toast('本局已结算，可在结算页点「再来一局」或「返回继续」'); openSettlement(); return; }
  if (state.day >= GAME.TOTAL_DAYS) { confirmEndJourney(); return; }
  state.day++;
  state.todayPulls = 0;
  state.dailyHalfUsed = false;
  const inc = randRange(GAME.DAILY_MIN, GAME.DAILY_MAX);
  /* v4 P-07：生活费设存款上限；v5 P-01：统一走 addMoney，只按实际到账记账且绝不让余额下降 */
  const cap = GAME.SAVE_CAP || 600;
  const got = addMoney(inc, 'daily');
  const gained = got.gained;
  const spilled = got.spilled;
  state.dayIncome = gained;
  state.marketDay = 0;
  state.market = null;
  /* v4 · P-04：免费十连券仅当天有效，跨天清理并提示，避免脏数据残留 */
  if (state.freeTen > 0 && state.freeTenDay !== state.day) {
    state.freeTen = 0;
    state.freeTenDay = 0;
    toast('免费十连券已过期（仅当天有效）', true);
  }
  save();
  render();
  initPoster();
  sfx('day');
  const bdKey = birthdayKeyForDay(state.day);
  if (bdKey) {
    showCoach('今天是 ' + MEMBER_BY_KEY[bdKey].name + ' 的生日，限定池只开一天！', 5000);
  } else {
    const nextBd = birthdayKeyForDay(state.day + 1);
    if (nextBd) showCoach('明天是 ' + MEMBER_BY_KEY[nextBd].name + ' 的生日，限定池只开一天，记得攒钱呀～', 6500);
  }
  if (state.day >= GAME.TOTAL_DAYS) {
    /* 第 30 天照常发生活费、触发终章事件；不自动结算，玩家可继续抽卡 */
    triggerFixedEvent(30);
    toast('第 30 天 · 星轨终章，今天还能继续抽卡；结束旅程后再去结算');
    return;
  }
  /* 固定事件日优先，当天不再掷随机小事件 */
  if (triggerFixedEvent(state.day)) {
    toast('第 ' + state.day + ' 天 · 固定剧情事件');
    return;
  }
  const ev = maybeSmallEvent();
  if (ev) {
    const eff = applySmallEvent(ev);
    save();
    render();
    setTimeout(() => showSmallEvent(ev, eff), 480);
  } else {
    /* v4 P-09：截断时提示真实入账数，并说明溢出部分未入账 */
    toast('第 ' + state.day + ' 天 · 今日生活费 +¥' + gained
      + (spilled > 0 ? '（存款已达上限 ¥' + cap + '，溢出 ¥' + spilled + ' 未入账）' : ''));
  }
}

/* ---------- 结算称号 ---------- */
function computeEnding() {
  const u = uniqueCount();
  const s = state.stats;
  const pulls = s.pulls || 0, ssr = s.ssr || 0, spent = s.spent || 0, money = state.money;
  const luck = ssr / Math.max(1, pulls * 0.029);
  if (luck >= 1.5 && ssr >= 4) return 'emperor';
  /* v4 P-07：把「吃土也要抽」提前到全能之前，放宽到 spent>=1500 且余钱很少 */
  if (state.stats.spent >= 1500 && state.money < 100 && u >= 28) return 'poor';
  /* v4 P-07：卡册收藏家门槛从 52 提到 54，必须在 unlucky 之前（否则 luck 低时会被截胡） */
  if (u >= 54) return 'collector';
  if (luck <= 0.5 && pulls >= 40) return 'unlucky';
  if (u >= 40) return 'allround';
  if (pulls <= 60 && u >= 20) return 'calm';
  return 'normal';
}

/* v4 P-09：结束旅程前的二次确认，避免误触直接锁定本局 */
function confirmEndJourney() {
  const u = uniqueCount();
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3 style="text-align:center">结束这趟旅程？</h3>
    <p class="event-desc" style="text-align:center">确认后进入结算页，并<b>暂时锁定抽卡、逛集市与碎片兑换</b>；在结算页点「返回继续」可撤销，回到第 ${GAME.TOTAL_DAYS} 天继续操作。历史最高图鉴与已得称号会保留。<br>当前：第 ${state.day} 天 · 图鉴 ${u}/${GAME.TOTAL_CARDS} · 剩余 ¥${fmt(state.money)}</p>
    <div class="actions">
      <button class="btn danger" data-act="confirm-end">确认结算</button>
      <button class="btn ghost" data-act="close-modal">再玩一天</button>
    </div>
  </div>`, true);
}

function openSettlement() {
  /* v5 · P-06：结算页才需要 7 张头像，这里再预热 */
  preloadAvatars();
  if (!state.ended) {
    state.ended = true;
    state.ending = computeEnding();
    save();
  }
  /* v5 · P-02：结算后立刻刷新主界面按钮为置灰态 */
  render();
  if (!state.ending) state.ending = computeEnding();
  const t = TITLES[state.ending] || TITLES.normal;
  const u = uniqueCount();
  /* 历史最高图鉴与已得称号跨局累计，重开也不会丢 */
  if (!state.best) state.best = { unique: 0, titles: {} };
  state.best.unique = Math.max(state.best.unique || 0, u);
  state.best.titles = Object.assign({}, state.best.titles || {}, state.titles || {});
  save();
  const bestU = state.best.unique;
  const rate = (u / GAME.TOTAL_CARDS * 100).toFixed(1);
  $('#scTitle').textContent = t.name;
  $('#scDesc').textContent = t.desc;
  $('#scQuote').textContent = t.quote;
  $('#scLabel').textContent = '第 ' + GAME.TOTAL_DAYS + ' 天 · 星轨记录';
  $('#scAvatars').innerHTML = MEMBERS.map(m => `<span class="aav">${avatarSVG(m)}</span>`).join('<span class="sep"></span>');
  const box = (label, value) => `<div class="sc-stat"><label>${label}</label><b>${value}</b></div>`;
  $('#scStats').innerHTML = [
    box('拆包总数', state.stats.pulls + ' <em>包</em>'),
    box('本局花费', '¥' + fmt(state.stats.spent)),
    box('本局图鉴', u + '<em>/' + GAME.TOTAL_CARDS + '</em>'),
    box('历史最高', bestU + '<em>/' + GAME.TOTAL_CARDS + '</em>'),
    box('抽到 SSR', state.stats.ssr + ' <em>张</em>'),
    box('累计收入', '¥' + fmt(state.stats.income)),
    /* v5 · P-07：收入构成四项，合计 = 上方总收入口径 */
    `<div class="sc-stat wide"><label>收入构成</label><b class="sc-income">${
      [['每日生活费', state.stats.incomeDaily], ['碎片寄卖', state.stats.incomeSell],
       ['收集/考核奖励', state.stats.incomeReward], ['事件/剧情', state.stats.incomeEvent]]
        .map(it => `<em>${it[0]} ¥${fmt(it[1])}</em>`).join('')
    }</b></div>`,
    box('获得碎片总数', (state.stats.shards || 0) + ' <em>枚</em>'),
    box('剩余生活费', '¥' + fmt(state.money)),
    box('收集率', rate + '<em>%</em>')
  ].join('');
  if ($('#scMsgs')) {
    $('#scMsgs').innerHTML = '<div class="sc-msg-h">全员寄语 · 星轨终章</div>' + MEMBERS.map(m =>
      `<div class="sc-msg" style="--mc:${m.color}"><b>${m.name}</b><span>${FINALE_MSGS[m.key] || '谢谢你陪我们走完这三十天。'}</span></div>`
    ).join('');
  }
  $('#settleTip').textContent = (u / GAME.TOTAL_CARDS >= .88)
    ? '收集率已过 88%，这张卡值得长按收藏'
    : '手机端可长按结算卡直接保存 / 截图分享';
  $('#settleOverlay').classList.add('show');
  $('#screenAlbum').classList.remove('show');
  $('#screenMarket').classList.remove('show');
  closeModal();
  sfx('reward');
  try { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); } catch (e) {}
}

function closeSettlement() {
  $('#settleOverlay').classList.remove('show');
  /* v4 P-09：「返回继续」撤销结束标记，第 30 天仍可继续抽卡与消费 */
  if (state.ended) {
    state.ended = false;
    state.ending = null;
    save();
    toast('已返回继续，第 ' + state.day + ' 天仍可抽卡');
  }
  render();
}

function restartGame() {
  /* 二周目：卡册 / 台词 / 集齐领取全部清零，只保留历史最高成绩与已得称号 */
  const keepMute = !!state.mute;
  const keepVol = state.vol;
  const bestU = Math.max(state.best ? (state.best.unique || 0) : 0, uniqueCount());
  const bestTitles = Object.assign({}, (state.best && state.best.titles) || {}, state.titles || {});
  state = defaultState();
  state.best = { unique: bestU, titles: bestTitles };
  state.mute = keepMute;
  if (keepVol) state.vol = keepVol;
  state.guideDone = true;
  /* v5 · P-04：首局与二周目完全一致：¥500 起始、income / dayIncome 均为 0，不记未到账生活费 */
  state.money = GAME.START_MONEY;
  state.dayIncome = 0;
  try { localStorage.removeItem(GAME.SAVE_KEY); } catch (e) {}
  albumMember = 'sy';
  pendingPull = null;
  ssrQueue = [];
  ssrActive = false;
  if (ssrTimer) { clearTimeout(ssrTimer); ssrTimer = null; }
  closeModal();
  $('#settleOverlay').classList.remove('show');
  $('#packOverlay').classList.remove('show');
  $('#ssrOverlay').classList.remove('show');
  buildMemberTabs();
  save();
  render();
  initPoster();
  sfx('reward');
  toast('新的一局开始：第 1 天 · 图鉴从 0/' + GAME.TOTAL_CARDS + ' 重新点亮');
  showCoach('新的三十天，从第一包开始～');
}

/* ---------- 首局开始 ---------- */
function startGame() {
  if (state.guideDone) { hideGuide(); return; }
  state.guideDone = true;
  /* v5 · P-04：首局不再额外叠加一天生活费，起始 ¥500 与二周目一致 */
  state.dayIncome = 0;
  save();
  hideGuide();
  render();
  sfx('reward');
  toast('初始资金 ¥' + GAME.START_MONEY + ' 已就位');
  showCoach('先拆一包试试运气吧～', 7000);
}

/* ---------- 规则 ---------- */
function openRules() {
  const rows = ['N', 'R', 'SR', 'SSR'].map(r => {
    const info = RARITY_INFO[r];
    return `<tr><td><span class="rar-badge rar-${r}">${r}</span></td><td>${(info.rate * 100).toFixed(0)}%</td><td>重复 +${info.shard} 碎片</td></tr>`;
  }).join('');
  openModal(`<div class="modal-wrap rules-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>卡池概率与规则</h3>
    <p class="msub">「STAR7 三周年 · 星轨回响限定池」· 以下数值均真实生效</p>
    <table class="rules-table">
      <thead><tr><th>稀有度</th><th>单抽概率</th><th>重复折算</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="rule-list" style="margin-top:12px">
      <div class="rule-item"><div class="ri">十</div><div><b>十连 SR 保底</b><p>十连中若没有 SR / SSR，系统会把最后一张升级为 SR，真实生效。</p></div></div>
      <div class="rule-item"><div class="ri">${GAME.PITY_MAX}</div><div><b>${GAME.PITY_MAX} 抽 SSR 硬保底</b><p>每抽累加计数，${GAME.PITY_MAX} 抽内必出 SSR；出 SSR 后计数重置为 ${GAME.PITY_MAX}。</p></div></div>
      <div class="rule-item"><div class="ri">UP</div><div><b>限定 UP</b><p>出 SSR 时，有 50% 概率为当天 UP 成员；平时是沈星野「星轨回响」，生日当天换成寿星，其余均分给另外 6 张 SSR。若抽到的 SSR 不是 UP，则下一个 SSR 必定为 UP（大保底，抽出 UP 后重置）。综合下来，连续抽卡时约 2/3 的 SSR 会是 UP 成员。</p></div></div>
      <div class="rule-item"><div class="ri">生</div><div><b>生日限定池</b><p>第 10 天（3/14）是沈星野生日，第 20 天（3/24）是江予安生日；当天海报与卡包换成寿星主题。寿星若不是默认 UP（沈星野），SSR UP 也随寿星切换，只开一天，概率与保底完全不变。</p></div></div>
      <div class="rule-item"><div class="ri">日</div><div><b>固定事件日</b><p>第 5 天练习室加练（免费单抽 ×1）、第 10/20 天生日（额外 30 碎片 + 生日语音）、第 15 天中期考核（按进度发 ¥80/120/180）、第 25 天彩排（当天前 20 抽 SSR 2%→3.5%，之后回落 2%，送免费十连券）、第 30 天星轨终章（当天仍可继续抽卡，结束旅程后再结算）。</p></div></div>
      <div class="rule-item"><div class="ri">随</div><div><b>随机小事件</b><p>每天进入下一天有 30% 概率触发 1 次小事件，事件池 ${SMALL_EVENTS.length} 个，最近 7 天不重复；雨天限定「雨天共伞」。</p></div></div>
      <div class="rule-item"><div class="ri">价</div><div><b>价格与生活费</b><p>单抽 ¥${GAME.PRICE1}（每日首次半价 ¥${GAME.PRICE1_FIRST}），十连 ¥${GAME.PRICE10}；每天点「进入下一天」发放 ¥${GAME.DAILY_MIN}–${GAME.DAILY_MAX} 生活费，存款上限 ¥${GAME.SAVE_CAP}，超过不再累计；第 ${GAME.TOTAL_DAYS} 天结束后点「结束旅程 · 去结算」手动结算，余额永不为负。免费十连券仅当天有效，跨天自动失效。</p></div></div>
      <div class="rule-item"><div class="ri">概</div><div><b>综合概率说明</b><p>长期来看，综合 SSR 约 2.85%，十连 SR 保底生效后整体 SR 概率约 11.1%（不含 25 天彩排加成）。</p></div></div>
      <div class="rule-item"><div class="ri">重</div><div><b>重复卡处理</b><p>抽到已拥有的卡会标记「重复」，并自动折算成碎片，不会凭空消失；碎片可在卡册兑换指定卡（N ${RARITY_INFO.N.exchange} / R ${RARITY_INFO.R.exchange} / SR ${RARITY_INFO.SR.exchange} / SSR ${RARITY_INFO.SSR.exchange} 枚）。</p></div></div>
      <div class="rule-item"><div class="ri">存</div><div><b>存档码与防改档边界</b><p>存档码自带轻量签名，能拦住手改 JSON 的随手改档；但签名算法在客户端公开，<b>无法防住有意伪造</b>。若需要真正防作弊，必须接服务端校验。导入前会校验结构 / 版本 / 数值范围，导入生活费最多收敛到 ¥${GAME.SAVE_CAP}。<br><b>旧版无签名兼容码不受签名保护，请仅用于升级自己的老存档</b>；导入前会明确提示未签名，导入成功后也会再次提示。</p></div></div>
      <div class="rule-item"><div class="ri">版</div><div><b>版本 ${GAME.VERSION} · 修订记录（v3.2 → v5.2）</b>
        <details style="margin-top:6px">
          <summary style="cursor:pointer;min-height:36px;display:flex;align-items:center">展开查看</summary>
          <p style="margin-top:8px"><b>v3.2</b>：首轮测试基准版本，含 10 项缺陷（BUG-01 存档强校验 / 二次确认 / 备份撤销、BUG-04 toast 队列防覆盖、BUG-06 首屏图片 28 张 1.9MB → 1 张 74–81KB 等）。</p>
          <p><b>v4</b>：第 15 天中期考核阈值 21→20（u=20 落 ¥120）；收入拆分为每日 / 寄卖 / 收集考核 / 事件四项；SR 兑换价 80、SSR 150；碎片卖出率 4；每日首次单抽 ¥9；图片懒加载；抽卡纯函数化。</p>
          <p><b>v5.0</b>：P-01 打通唯一 addMoney 入账并按实际到账记账；P-02 结算后按钮置灰 + 可撤销；P-03 toast 最新 / 警告优先；P-04 首局与二周目统一 ¥500；P-05 存档码签名；P-06 首屏轻量化；P-07 收入四分项与文案常量；存档码升级到 v5 并要求签名。</p>
          <p><b>v5.1</b>：写清存档码 v4 降级绕过签名的已知边界（BUG-13）；首局提示改为「初始资金 ¥500 已就位」（不计入收入统计）；门禁新增签名 / 版本矩阵与导入层校验（W / H 系列断言）。</p>
          <p><b>v5.2</b>：未签名警告前移到覆盖确认 / 导入决策点（BUG-14），规则页改为风险声明、不再给出改档操作步骤，弹层已警告时不再重复 toast；closeModal 清理待导入状态；部署后线上门禁接入 CI（Pages 部署成功自动触发）。构建期把版本号直接写入产物 meta，与 GAME.VERSION / __game.version 同源；CI 的 PASS/FAIL 摘要同步写回仓库公开文档 docs/gates/。</p>
        </details>
      </div></div>
    </div>
    <div class="actions"><button class="btn primary" data-act="close-modal">明白了</button></div>
  </div>`);
}

/* ---------- 碎片兑换清单 ---------- */
function openExchange() {
  /* v4 P-09：本局已结算时禁止打开碎片兑换 */
  if (guardPackBusy()) return;
  const list = CARDS_BY_MEMBER[albumMember].filter(c => !owned(c.id));
  const m = MEMBER_BY_KEY[albumMember];
  const rows = list.length ? list.map(c => {
    const cost = RARITY_INFO[c.rarity].exchange;
    return `<div class="rule-item" style="align-items:center">
      <div class="ri" style="background:${RARITY_INFO[c.rarity].glow};color:#3b2434">${c.rarity}</div>
      <div style="flex:1;min-width:0"><b>${c.name}</b><p>${m.name} · 需 ${cost} 碎片</p></div>
      <button class="link-btn gold-link" data-act="exchange-buy" data-id="${c.id}" ${state.shards < cost ? 'disabled' : ''} style="min-height:38px">${state.shards < cost ? '还差 ' + (cost - state.shards) : '兑换'}</button>
    </div>`;
  }).join('') : `<div class="market-empty">${m.name} 的卡已经全部收齐啦</div>`;
  openModal(`<div class="modal-wrap">
    <button class="x" data-act="close-modal">×</button>
    <h3>碎片兑换 · ${m.name}</h3>
    <p class="msub">当前碎片 <b style="color:#b23c72">${state.shards}</b> 枚 · 重复卡自动折算，不会过期</p>
    <div class="rule-list">${rows}</div>
    <div class="actions"><button class="btn ghost" data-act="close-modal">返回</button></div>
  </div>`);
}
