/* ================= 交互绑定 / 初始化 ================= */
function bindEvents() {
  document.addEventListener('click', e => {
    const flip = e.target.closest('.flip');
    if (flip && pendingPull && $('#packOverlay').classList.contains('show')) {
      flipOne(flip);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'noop') { e.preventDefault(); return; }
    switch (act) {
      case 'start-game': ensureAudio(); startGame(); break;
      case 'day': ensureAudio(); nextDay(); break;
      case 'mute': {
        state.mute = !state.mute;
        save(); render();
        if (!state.mute) { ensureAudio(); refreshBGM(); sfx('click'); toast('声音已开启'); }
        else { stopVoice(); stopBGM(); toast('已静音，点击右上角可恢复'); }
        break;
      }
      case 'album': ensureAudio(); openAlbum(); break;
      case 'close-album': closeAlbum(); break;
      case 'rules': openRules(); break;
      case 'more': openMore(); break;
      case 'save-menu': openSaveMenu(); break;
      case 'export-save': exportSaveCode(); break;
      case 'import-save': importSaveCode(); break;
      case 'copy-save-code': copySaveCode(); break;
      case 'apply-save-code': applySaveCode(); break;
      case 'confirm-import-save': commitImportSave(); break;
      case 'undo-import-save': undoImportSave(); break;
      case 'pull1': ensureAudio(); doPull(1); break;
      case 'pull10': ensureAudio(); doPull(10); break;
      case 'skip-pack': {
        if (!$('#tearStage').classList.contains('hidden')) openPackAnim(true);
        else flipAll(true, true);
        break;
      }
      case 'tear-open': openPackAnim(); break;
      case 'flip-all': ensureAudio(); flipAll(false, false); break;
      case 'collect': collectPack(); break;
      case 'close-ssr': closeSSR(); break;
      case 'ssr-deep': ensureAudio(); showSSRDeep(); break;
      case 'story-choice': chooseStory(el.dataset.member, el.dataset.choice); break;
      case 'midterm-claim': claimMidterm(); break;
      case 'light-stick': {
        el.classList.toggle('on');
        sfx('star');
        playVoice(el.dataset.member, 'birthday');
        break;
      }
      case 'voice-play': {
        ensureAudio();
        const key = el.dataset.member;
        if (curVoice && curVoiceMember === key && !curVoice.paused) stopVoice();
        else playVoice(key, 'idle');
        break;
      }
      case 'save-collect': ensureAudio(); saveCollectImage(el.dataset.member); break;
      case 'profile': ensureAudio(); openProfile(el.dataset.member); sfx('click'); break;
      case 'tab': {
        albumMember = el.dataset.member;
        buildMemberTabs(); renderAlbum(); sfx('click');
        break;
      }
      case 'detail': showCardDetail(el.dataset.card); break;
      case 'exchange': openExchange(); break;
      case 'exchange-buy': ensureAudio(); buyCardWithShards(el.dataset.id); break;
      case 'claim-reward': claimReward(el.dataset.member); break;
      case 'close-modal': closeModal(); break;
      case 'go-market': closeModal(); setTimeout(openMarket, 60); break;
      case 'market': openMarket(); break;
      case 'close-market': closeMarket(); break;
      case 'market-buy': ensureAudio(); buyMarketCard(el.dataset.id); break;
      case 'sell-shards': ensureAudio(); sellShards(); break;
      case 'confirm-sell-shards': ensureAudio(); confirmSellShards(); break;
      case 'save-img': ensureAudio(); saveSettlementImage(); break;
      case 'close-settle': closeSettlement(); break;
      case 'restart': {
        openModal(`<div class="modal-wrap">
          <button class="x" data-act="close-modal">×</button>
          <div class="event-art"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2.6l2.3 6.1 6.1 2.3-6.1 2.3L12 19.4l-2.3-6.1L3.6 11l6.1-2.3z" fill="#e8a45e"/></svg></div>
          <h3 style="text-align:center">确定要再来一局吗？</h3>
          <p class="event-desc" style="text-align:center">本局天数、生活费、碎片、卡册图鉴与台词都会重置，从 0/56 重新点亮；<b>历史最高图鉴数与已得称号会保留</b>。</p>
          <div class="actions">
            <button class="btn danger" data-act="confirm-restart">确认开启新一局</button>
            <button class="btn ghost" data-act="close-modal">再想想</button>
          </div>
        </div>`, true);
        break;
      }
      case 'confirm-restart': restartGame(); break;
      case 'confirm-end': closeModal(); openSettlement(); break;
    }
    if (state) save();
  });

  $('#modalBack').addEventListener('click', e => {
    if (e.target === $('#modalBack')) closeModal();
  });
  $('#ssrOverlay').addEventListener('click', e => {
    if (e.target.closest('[data-act="ssr-deep"]')) return;
    closeSSR();
  });
  /* 音量分层滑条 */
  document.addEventListener('input', e => {
    const r = e.target.closest('[data-vol]');
    if (!r || !state) return;
    const k = r.dataset.vol;
    state.vol[k] = clamp(+r.value / 100, 0, 1);
    const i = r.parentElement.querySelector('i');
    if (i) i.textContent = Math.round(state.vol[k] * 100) + '%';
    applyVol();
    if (k === 'bgm') refreshBGM();
    save();
  });
  $('#settleOverlay').addEventListener('click', e => {
    if (e.target === $('#settleOverlay')) closeSettlement();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      $('#screenAlbum').classList.remove('show');
      $('#screenMarket').classList.remove('show');
      /* v4 P-09：ESC 关闭结算与「返回继续」保持同一语义，撤销 ended 锁定 */
      if ($('#settleOverlay').classList.contains('show')) closeSettlement();
    }
  });

  /* 键盘可达：role="button" 控件支持 Enter/Space 触发（原生 button 由浏览器处理） */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (!t || !(t instanceof Element)) return;
    if (t.closest('button,a,input,select,textarea,[contenteditable="true"]')) return;
    const rb = t.closest('[role="button"]');
    if (!rb) return;
    e.preventDefault();
    rb.click();
  });
  /* 切后台 / 离开页面时兜底落盘，避免最后一帧状态丢失 */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state) save();
  });
  window.addEventListener('pagehide', () => { if (state) save(); });
}

function init() {
  const loaded = load();
  if (!loaded) state = defaultState();
  preloadArt();
  ensureMarket();
  buildMemberTabs();
  render();
  initPoster();
  initTearDrag();
  bindEvents();
  window.addEventListener('resize', () => { syncPackGridPad(); updatePackScrollHint(); });
  const unlock = () => { ensureAudio(); refreshBGM(); };
  document.addEventListener('pointerdown', unlock, { once: true });
  if (state.guideDone) $('#guide').classList.remove('show');
  else $('#guide').classList.add('show');
  if (state.guideDone && state.stats.pulls === 0 && !state.ended) {
    showCoach('先拆一包试试运气吧～', 7000);
  }
  if (state.ended) setTimeout(openSettlement, 500);
  save();

  /* P6-二：版本号从 GAME.VERSION 单一常量输出，避免 meta 与钩子再次漂移 */
  const vm = document.querySelector('meta[name="version"]');
  if (vm) vm.setAttribute('content', GAME.VERSION);
  window.__game = {
    version: GAME.VERSION,
    get state() { return state; },
    get lastPull() { return pendingPull; },
    data: { MEMBERS, CARDS, GAME, RARITY_INFO, TITLES, CARD_BY_ID },
    /* v5 · P-09：可注入 RNG 的抽卡纯函数，供单测使用 */
    gacha: { pickCardPure, pickSSRPure, rollOnePure, rollBatchPure },
    save, render, pull: doPull, nextDay, openSettlement, computeEnding, gainShards,
    uniqueCount, memberOwned, openAlbum, closeAlbum, openMarket, closeMarket,
    openRules, restart: restartGame, checkCollectRewards,
    collectedSet: () => CARDS.filter(c => owned(c.id)).map(c => c.id),
    fillMember(key) {
      (CARDS_BY_MEMBER[key] || []).forEach(c => { if (!owned(c.id)) { state.cards[c.id] = 1; state.fresh[c.id] = true; } });
      syncLineUnlocks(); save(); render();
    },
    grantCard(id) {
      if (!CARD_BY_ID[id]) return false;
      if (!owned(id)) { state.cards[id] = 1; state.fresh[id] = true; unlockLine(CARD_BY_ID[id]); save(); render(); }
      return true;
    },
    /* v5 · P-01：测试钩子同样不得突破存款上限 */
    setMoney(n) {
      state.money = Math.min(GAME.SAVE_CAP, Math.max(0, Math.round(Number(n) || 0)));
      save(); render();
    },
    addMoney,
    saveCode: { encode: encodeSaveCode, decode: decodeSaveCode },
    finishAll() {
      CARDS.forEach(c => { if (!owned(c.id)) { state.cards[c.id] = 1; state.fresh[c.id] = true; } });
      syncLineUnlocks(); save(); render();
    },
    openProfile, upKeyNow, gameDate, birthdayKeyForDay,
    showSSRDeep, triggerFixedEvent, maybeSmallEvent, playVoice,
    dataExtra: { FIXED_EVENTS, SMALL_EVENTS, SSR_LONG, COLLECT_LINES, VOICE_LINES }
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
