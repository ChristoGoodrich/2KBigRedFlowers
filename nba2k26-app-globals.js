// NBA 2K26 global app state and classic-script compatibility proxies.
// Keeps inline HTML handlers working while feature logic lives in sidecar modules.

// ====================== STATE ======================
let state = {
  builds: [],       // [{id, name, position, height, weight, wingspan, ovr, badges, notes, createdAt}]
  games: [],        // [{id, buildId, mode, date, result, pts, reb, ...}]
  players: [],      // [{id, primaryName, aliases, notes, createdAt}]
  currentBuildId: null,
  currentPlayerId: null,
  currentMode: 'All',
  playersView: 'directory',
  editingBuildId: null,
  editingGameId: null,
  lastSavedGameId: null,
  gameFilter: { result: 'All', dateFrom: '', dateTo: '', search: '', sortKey: 'date', sortDir: 'desc' },
  allGamesFilter: { result: 'All', mode: 'All', build: 'All', search: '', sortKey: 'date', sortDir: 'desc' },
  playerPageUi: { tab: 'overview', logSide: 'all', logResult: 'all', logSeason: 'all' },
  detailTab: 'overview',
  compareIds: [null, null],
};

// Storage helpers live in nba2k26-storage.js.

// ====================== NBA 2K26 OFFICIAL SEASON DATES ======================
// Source: https://nba.2k.com/2k26/seasons/ — each season runs exactly 6 weeks.
const NBA2K26_SEASONS = [
  { n: 1, label: 'S1', name: 'Season 1', zh: '第1赛季', from: '2025-09-05', to: '2025-10-16' },
  { n: 2, label: 'S2', name: 'Season 2', zh: '第2赛季', from: '2025-10-17', to: '2025-11-27' },
  { n: 3, label: 'S3', name: 'Season 3', zh: '第3赛季', from: '2025-11-28', to: '2026-01-08' },
  { n: 4, label: 'S4', name: 'Season 4', zh: '第4赛季', from: '2026-01-09', to: '2026-02-19' },
  { n: 5, label: 'S5', name: 'Season 5', zh: '第5赛季', from: '2026-02-20', to: '2026-04-02' },
  { n: 6, label: 'S6', name: 'Season 6', zh: '第6赛季', from: '2026-04-03', to: '2026-05-14' },
  { n: 7, label: 'S7', name: 'Season 7', zh: '第7赛季', from: '2026-05-15', to: '2026-06-25' },
  { n: 8, label: 'S8', name: 'Season 8', zh: '第8赛季', from: '2026-06-26', to: '2026-08-06' },
];

/** Return the season number (1-8) for a 'YYYY-MM-DD' string, or null if out of range. */
function dateToSeason(dateStr) {
  if (!dateStr) return null;
  const s = NBA2K26_SEASONS.find(s => dateStr >= s.from && dateStr <= s.to);
  return s ? s.n : null;
}

/** Return the season object whose date range includes today, or the last defined season. */
function currentSeason() {
  const today = new Date().toISOString().slice(0, 10);
  return NBA2K26_SEASONS.find(s => today >= s.from && today <= s.to)
      || NBA2K26_SEASONS[NBA2K26_SEASONS.length - 1];
}

// ====================== SCROLL LOCK ======================
let _modalOpenCount = 0;
function lockPageScroll() {
  _modalOpenCount++;
  if (_modalOpenCount === 1) {
    document.documentElement.style.overflowY = 'hidden';
    document.body.style.overflowY = 'hidden';
  }
}
function unlockPageScroll() {
  _modalOpenCount = Math.max(0, _modalOpenCount - 1);
  if (_modalOpenCount === 0) {
    document.documentElement.style.overflowY = '';
    document.body.style.overflowY = '';
  }
}

// ====================== UI HELPERS ======================
function toast(msg, err=false) {
  return window.NBA2K26_UI_CORE.toast(msg, err);
}

function renderAccountBar(page = 'builds') {
  const wrap = document.getElementById('account-bar-wrap');
  if (!wrap) return;
  if (!window.NBA2K26_RENDER || !window.NBA2K26_RENDER.accountBarHtml) {
    wrap.innerHTML = `<div class="account-bar-empty">${t('// account panel unavailable')}</div>`;
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
    return;
  }
  wrap.innerHTML = window.NBA2K26_RENDER.accountBarHtml({ state, aggregate, escapeHtml, page });
  if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
}

function renderBuildCompare() {
  if (!window.NBA2K26_BUILD_COMPARE) return;
  return window.NBA2K26_BUILD_COMPARE.renderCompare({ state, aggregate, t, escapeHtml });
}

function renderDataQuality() {
  renderAccountBar('quality');
  const container = document.getElementById('quality-container');
  if (!container) return;
  if (!window.NBA2K26_DATA_QUALITY || !window.NBA2K26_DATA_QUALITY.renderDataQualityCenter) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('// data quality module unavailable')}</div></div>`;
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
    return;
  }
  container.innerHTML = window.NBA2K26_DATA_QUALITY.renderDataQualityCenter({
    state,
    t,
    escapeHtml,
    escapeAttr,
  });
  if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
}

function renderOpponentIntel() {
  if (!window.NBA2K26_OPPONENT_INTEL) return;
  return window.NBA2K26_OPPONENT_INTEL.renderOpponentIntel({ state, t, escapeHtml, escapeAttr });
}

function normalizePlayersView(view) {
  return view === 'intel' ? 'intel' : 'directory';
}

function compareIdsForRoute() {
  return (state.compareIds || [])
    .map(id => String(id || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeCompareIds(compareIds) {
  const validIds = new Set((state.builds || []).map(build => build.id));
  const clean = [];
  (Array.isArray(compareIds) ? compareIds : []).forEach(id => {
    const value = String(id || '').trim();
    if (!value || clean.includes(value)) return;
    if (validIds.size && !validIds.has(value)) return;
    clean.push(value);
  });
  while (clean.length < 2) clean.push(null);
  return clean.slice(0, 4);
}

function syncCompareRoute() {
  if (state.currentPage !== 'compare' || window._historyNavInProgress || !window.NBA2K26_PAGE_SHELL) return;
  const route = { page: 'compare', compareIds: compareIdsForRoute() };
  const hash = window.NBA2K26_PAGE_SHELL.routeHash(route);
  if (location.hash !== hash) history.pushState(route, '', hash);
}

function showPage(page, options = {}) {
  const route = typeof page === 'object' && page !== null ? page : { page, ...options };
  const targetPage = route.page || 'overview';
  if (targetPage === 'players') {
    state.playersView = normalizePlayersView(route.playersView);
  }
  if (targetPage === 'compare' && Object.prototype.hasOwnProperty.call(route, 'compareIds')) {
    state.compareIds = normalizeCompareIds(route.compareIds);
  }
  state.currentPage = targetPage;
  const result = window.NBA2K26_PAGE_SHELL.showPage(targetPage, {
    renderAccountBar,
    renderBuilds,
    renderOverview,
    renderPlayers,
    renderGames,
    renderPlayerPage,
    renderBuildCompare,
    renderDataQuality,
  });
  if (!window._historyNavInProgress) {
    const buildId = targetPage === 'detail' ? state.currentBuildId : null;
    const playerId = targetPage === 'player' ? state.currentPlayerId : null;
    const historyRoute = {
      page: targetPage,
      buildId: buildId || undefined,
      playerId: playerId || undefined,
      playersView: targetPage === 'players' ? state.playersView : undefined,
      compareIds: targetPage === 'compare' ? compareIdsForRoute() : undefined,
    };
    const hash = window.NBA2K26_PAGE_SHELL.routeHash(historyRoute);
    if (location.hash !== hash) history.pushState(historyRoute, '', hash);
  }
  return result;
}

function compareSelectBuild(slotIdx, buildId) {
  if (!state.compareIds) state.compareIds = [null, null];
  state.compareIds[slotIdx] = buildId || null;
  renderBuildCompare();
  syncCompareRoute();
}

function compareRemoveBuild(slotIdx) {
  if (!state.compareIds) return;
  state.compareIds[slotIdx] = null;
  renderBuildCompare();
  syncCompareRoute();
}

function addToCompare(buildId) {
  if (!state.compareIds) state.compareIds = [null, null];
  // Already in compare — just navigate there
  if (state.compareIds.includes(buildId)) { showPage('compare'); return; }
  // Find first empty slot
  const emptyIdx = state.compareIds.findIndex(id => !id);
  if (emptyIdx !== -1) {
    state.compareIds[emptyIdx] = buildId;
  } else if (state.compareIds.length < 4) {
    state.compareIds.push(buildId);
  } else {
    state.compareIds[state.compareIds.length - 1] = buildId;
  }
  showPage('compare');
}

function setupPageShell() {
  return window.NBA2K26_PAGE_SHELL.setupNavigation({
    showPage,
  });
}

// ====================== BUILDS ======================
function renderBuilds() {
  return window.NBA2K26_PAGE_SHELL.renderBuilds({
    state,
    aggregate,
    groupAvg,
    attrGroups: ATTR_GROUPS,
    t,
    escapeHtml,
    renderAccountBar,
  });
}

// Build analysis constants and helpers live in nba2k26-build-engine.js.

// Badge catalog, thresholds, and auto-unlock helpers live in nba2k26-badges.js.

// I18N language dictionaries and helpers live in nba2k26-i18n.js.

function renderBadgeList() {
  return window.NBA2K26_BADGE_EDITOR.renderBadgeList({
    BADGE_CATEGORIES,
    TIERS,
    TIER_ORDER,
    t,
    escapeHtml,
  });
}

function renderBadgeSummary() {
  return window.NBA2K26_BADGE_EDITOR.renderBadgeSummary({
    BADGE_CATEGORIES,
    TIER_ORDER,
    t,
    escapeHtml,
  });
}

function setBadgeTier(badgeId, tier) {
  return window.NBA2K26_BADGE_EDITOR.setBadgeTier(badgeId, tier, {
    BADGE_CATEGORIES,
    TIERS,
    TIER_ORDER,
    t,
    escapeHtml,
  });
}

function searchBadgeList(value) {
  return window.NBA2K26_BADGE_EDITOR.setBadgeSearch(value);
}

function toggleEquippedBadgesOnly() {
  return window.NBA2K26_BADGE_EDITOR.toggleEquippedOnly();
}

function getCurrentBadges() {
  return window.NBA2K26_BADGE_EDITOR.getCurrentBadges();
}

function setCurrentBadges(value) {
  return window.NBA2K26_BADGE_EDITOR.setCurrentBadges(value);
}

// Tab switching for build modal
function setupBuildTabs() {
  return window.NBA2K26_BUILD_FORM.setupBuildTabs({
    updateGroupAvg,
  });
}

function updateGroupAvg(group) {
  const inputs = document.querySelectorAll(`.attr-input[data-group="${group}"]`);
  const vals = [...inputs].map(i => parseInt(i.value)).filter(v => !isNaN(v) && v > 0);
  const avg = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length) : null;
  const el = document.getElementById('attr-avg-' + group);
  if (el) el.textContent = avg != null ? avg : '-';
}

function openBuildModal(id) {
  lockPageScroll();
  return window.NBA2K26_BUILD_FORM.openBuildModal(id, {
    state,
    getCurrentBadges,
    setCurrentBadges,
    renderBadgeList,
    TIER_ORDER,
    BADGE_CATEGORIES,
    ATTR_GROUPS,
    updateGroupAvg,
  });
}

function closeBuildModal() {
  unlockPageScroll();
  return window.NBA2K26_BUILD_FORM.closeBuildModal(state);
}

async function saveBuild() {
  return window.NBA2K26_BUILD_FORM.saveBuild({
    state,
    getCurrentBadges,
    saveToStorage,
    toast,
    closeBuildModal,
    renderBuilds,
    renderBuildDetail,
  });
}

async function deleteBuild() {
  return window.NBA2K26_BUILD_FORM.deleteBuild({
    state,
    customConfirm,
    deleteFromStorage,
    toast,
    closeBuildModal,
    showPage,
    escapeHtml,
  });
}

// Helpers to compute group average for display
function groupAvg(attrs, group) {
  const keys = ATTR_GROUPS[group].keys;
  const vals = keys.map(k => attrs?.[k]).filter(v => typeof v === 'number' && v > 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
}

// ====================== BUILD DETAIL ======================
function openBuildDetail(id) {
  return window.NBA2K26_BUILD_DETAIL.openBuildDetail(id, {
    state,
    showPage,
    renderBuildDetail,
  });
}

function renderBuildDetail() {
  return window.NBA2K26_BUILD_DETAIL.renderBuildDetail({
    state,
    renderAccountBar,
    showPage,
    applyGameFilters,
    aggregate,
    ATTR_GROUPS,
    groupAvg,
    escapeHtml,
    escapeAttr,
    TIER_ORDER,
    renderAggregate,
    renderAttrsPanel,
    mergeBadges,
    getBadgeRecommendations,
    renderBadgesPanel,
    renderTrendPanel,
    renderSeasonInsights,
    renderFirstGameRecap,
    renderPostgameReview,
    renderSeasonSummary,
    renderRosterSummary,
    renderRosterChemistry,
    renderHighlightsGallery,
    renderGameFilterBar,
    renderGamesTable,
    renderPlayersPanel,
    players: state.players,
  });
}

function renderPlayersPanel(games) {
  if (!window.NBA2K26_PLAYER_PROFILES) return '';
  return window.NBA2K26_PLAYER_PROFILES.renderPlayersPanel(state.players, games, { escapeHtml, t });
}

function renderTrendPanel(games) {
  return window.NBA2K26_GAME_PANELS.renderTrendPanel(games, {
    compareRecentVsOverall,
    trendArrow,
  });
}

function renderSeasonInsights(games) {
  return window.NBA2K26_GAME_PANELS.renderSeasonInsights(games, {
    aggregate,
    compareRecentVsOverall,
    aggregateByPosition: window.NBA2K26_GAME_ANALYSIS.aggregateByPosition,
    escapeHtml,
  });
}

function renderFirstGameRecap(games) {
  return window.NBA2K26_GAME_PANELS.renderFirstGameRecap(games, {
    escapeHtml,
  });
}

function renderPostgameReview(game, games) {
  return window.NBA2K26_GAME_PANELS.renderPostgameReview(game, games, {
    aggregate,
    escapeHtml,
  });
}

function renderHighlightsGallery(games) {
  return window.NBA2K26_GAME_PANELS.renderHighlightsGallery(games, {
    escapeHtml,
  });
}

function removeMediaItem(id) {
  return window.NBA2K26_GAME_FORM.removeMediaItem(id);
}

function renderAttrsPanel(attrs) {
  return window.NBA2K26_BUILD_DETAIL_PANELS.renderAttrsPanel(attrs, {
    ATTR_GROUPS,
    ATTR_LABELS,
    groupAvg,
    t,
    escapeHtml,
  });
}

function buildRadarSVG(labels, values) {
  return window.NBA2K26_BUILD_DETAIL_PANELS.buildRadarSVG(labels, values, {
    escapeHtml,
  });
}

function renderBadgesPanel(badges, autoOnly = {}, attrs = {}) {
  return window.NBA2K26_BUILD_DETAIL_PANELS.renderBadgesPanel(badges, autoOnly, attrs, {
    BADGE_CATEGORIES,
    TIER_ORDER,
    BADGE_THRESHOLDS,
    getBadgeTierScoreGap,
    t,
    escapeHtml,
  });
}

function getBadgeRecommendations(attrs, badges = {}) {
  return window.NBA2K26_BUILD_DETAIL_PANELS.getBadgeRecommendations(attrs, badges, {
    BADGE_CATEGORIES,
    TIER_ORDER,
    BADGE_THRESHOLDS,
    getBadgeTierScoreGap,
  });
}

function setMode(m) {
  return window.NBA2K26_BUILD_DETAIL.setMode(m, {
    state,
    renderBuildDetail,
  });
}

function setDetailTab(tab) {
  return window.NBA2K26_BUILD_DETAIL.setDetailTab(tab, {
    state,
    renderBuildDetail,
  });
}

function dismissGameSaveFeedback() {
  state.lastSavedGameId = null;
  renderBuildDetail();
}

function renderSeasonSummary(games) {
  return window.NBA2K26_GAME_PANELS.renderSeasonSummary(games, {
    aggregate,
    escapeHtml,
  });
}

function renderRosterChemistry(games) {
  return window.NBA2K26_GAME_PANELS.renderRosterChemistry(games, {
    aggregateRoster,
    escapeHtml,
  });
}

function renderRosterSummary(games) {
  return window.NBA2K26_GAME_PANELS.renderRosterSummary(games, {
    aggregateRoster,
    escapeHtml,
  });
}

function renderAggregate(agg, n) {
  return window.NBA2K26_GAME_TABLE.renderAggregate(agg, n);
}

function applyGameFilters(games) {
  return window.NBA2K26_GAME_TABLE.applyGameFilters(games, state);
}

function setGameFilter(key, val) {
  return window.NBA2K26_GAME_TABLE.setGameFilter(state, key, val, renderBuildDetail);
}

function resetGameFilters() {
  return window.NBA2K26_GAME_TABLE.resetGameFilters(state, renderBuildDetail);
}

function sortGameTable(key) {
  return window.NBA2K26_GAME_TABLE.sortGameTable(state, key, renderBuildDetail);
}

function renderGameFilterBar() {
  return window.NBA2K26_GAME_TABLE.renderGameFilterBar(state, {
    escapeAttr,
  });
}

function renderGamesTable(games) {
  return window.NBA2K26_GAME_TABLE.renderGamesTable(games, state, {
    escapeHtml,
  });
}

// ====================== GAME MODAL ======================
function openGameModal(id) {
  lockPageScroll();
  return window.NBA2K26_GAME_FORM.openGameModal(id, {
    state,
  });
}

function closeGameModal() {
  unlockPageScroll();
  return window.NBA2K26_GAME_FORM.closeGameModal(state);
}

// ====================== GAME DETAIL (read-only view) ======================
function openGameDetail(id) {
  lockPageScroll();
  return window.NBA2K26_GAME_DETAIL.openGameDetail(id, { state });
}

function closeGameDetail() {
  unlockPageScroll();
  return window.NBA2K26_GAME_DETAIL.closeGameDetail();
}

// Hand off from the detail view to the editable game form.
function editGameFromDetail() {
  const id = window.NBA2K26_GAME_DETAIL.currentGameId();
  closeGameDetail();
  if (!id) return;
  const game = state.games.find(g => g.id === id);
  if (game) state.currentBuildId = game.buildId;
  openGameModal(id);
}

function shareGameFromDetail() {
  const id = window.NBA2K26_GAME_DETAIL.currentGameId();
  if (id) shareGame(id);
}

async function saveGame() {
  return window.NBA2K26_GAME_FORM.saveGame({
    state,
    saveToStorage,
    toast,
    closeGameModal,
    renderBuildDetail,
  });
}

async function deleteGame() {
  return window.NBA2K26_GAME_FORM.deleteGame({
    state,
    customConfirm,
    deleteFromStorage,
    toast,
    closeGameModal,
    renderBuildDetail,
    escapeHtml,
  });
}

function n(id) {
  return window.NBA2K26_GAME_FORM.numberValue(id);
}

function addRosterRow(side) {
  return window.NBA2K26_GAME_FORM.addRosterRow(side);
}

function copyPreviousRoster(side) {
  return window.NBA2K26_GAME_FORM.copyPreviousRoster(side, {
    state,
    toast,
  });
}

function clearGameDraft() {
  return window.NBA2K26_GAME_FORM.clearGameDraft(state.currentBuildId);
}

function removeRosterRow(button) {
  return window.NBA2K26_GAME_FORM.removeRosterRow(button);
}

function moveRosterRow(button) {
  return window.NBA2K26_GAME_FORM.moveRosterRow(button, { toast });
}

function swapRosterSides() {
  return window.NBA2K26_GAME_FORM.swapRosterSides({ toast });
}

function showGameTab(tab) {
  return window.NBA2K26_GAME_FORM.showGameTab(tab);
}

function nextGameStep() {
  return window.NBA2K26_GAME_FORM.nextGameStep();
}

function prevGameStep() {
  return window.NBA2K26_GAME_FORM.prevGameStep();
}

function toggleRosterDetail(side) {
  return window.NBA2K26_GAME_FORM.toggleRosterDetail(side);
}

function toggleRosterFlag(btn) {
  return window.NBA2K26_GAME_FORM.toggleRosterFlag(btn);
}

// ====================== PLAYER PROFILES ======================
function openPlayerCard(playerId) {
  const existing = document.getElementById('player-card-overlay');
  if (existing) existing.remove();
  if (!window.NBA2K26_PLAYER_PROFILES) return;
  // Reset filter states for fresh card
  _ppFilterSide   = 'all';
  _logFilterSide   = 'all';
  _logFilterResult = 'all';
  _logFilterSeason = 'all';
  window.NBA2K26_PLAYER_PROFILES.renderPlayerCard(playerId, state.players, state.games, { escapeHtml, t });
  // Trap ESC key
  document.addEventListener('keydown', _playerPageEscHandler);
}

function _playerPageEscHandler(e) {
  if (e.key === 'Escape') { closePlayerCard(); document.removeEventListener('keydown', _playerPageEscHandler); }
}

function closePlayerCard() {
  document.removeEventListener('keydown', _playerPageEscHandler);
  const el = document.getElementById('player-card-overlay');
  if (el) el.remove();
}

async function addPlayerAlias(profileId) {
  const PP = window.NBA2K26_PLAYER_PROFILES;
  if (!PP) return;
  const input = document.getElementById('new-alias-input');
  const alias = input ? input.value.trim() : '';
  if (!alias) { toast(t('Enter an alias name'), true); return; }

  const profile = state.players.find(p => p.id === profileId);
  if (!profile) return;

  const collision = PP.findByName(state.players, alias);
  if (collision && collision.id !== profileId) {
    toast(`"${escapeHtml(alias)}" ${t('already belongs to another player profile')}`, true);
    return;
  }
  if (!profile.aliases.some(a => PP.norm(a) === PP.norm(alias))) {
    profile.aliases.push(alias);
    await saveToStorage('player:' + profileId, profile);
    PP.updateDatalist(state.players);
  }
  _refreshPlayerView(profileId);
}

async function removePlayerAlias(profileId, alias) {
  const PP = window.NBA2K26_PLAYER_PROFILES;
  if (!PP) return;
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) return;
  profile.aliases = profile.aliases.filter(a => PP.norm(a) !== PP.norm(alias));
  if (!profile.aliases.length) profile.aliases.push(profile.primaryName);
  await saveToStorage('player:' + profileId, profile);
  _refreshPlayerView(profileId);
}

async function setPlayerPrimary(profileId, name) {
  const PP = window.NBA2K26_PLAYER_PROFILES;
  if (!PP) return;
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) return;
  profile.primaryName = name.trim();
  if (!profile.aliases.some(a => PP.norm(a) === PP.norm(name))) profile.aliases.unshift(name.trim());
  await saveToStorage('player:' + profileId, profile);
  _refreshPlayerView(profileId);
}

async function savePlayerNotes(profileId) {
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) return;
  const el = document.getElementById('player-notes-input');
  if (el) profile.notes = el.value;
  const ok = await saveToStorage('player:' + profileId, profile);
  if (ok) toast(t('Saved'));
}

async function mergePlayerByName(targetId) {
  const PP = window.NBA2K26_PLAYER_PROFILES;
  if (!PP) return;
  const input = document.getElementById('merge-player-input');
  const name = input ? input.value.trim() : '';
  if (!name) { toast(t('Enter a player name to merge'), true); return; }

  const target = state.players.find(p => p.id === targetId);
  if (!target) return;
  const source = PP.findByName(state.players, name);
  if (!source) { toast(`"${escapeHtml(name)}" ${t('not found in player directory')}`, true); return; }
  if (source.id === targetId) { toast(t('Cannot merge a player with themselves'), true); return; }

  const ok = await customConfirm(
    `${t('Merge')} <strong>${escapeHtml(source.primaryName)}</strong> ${t('into')} <strong>${escapeHtml(target.primaryName)}</strong>?<br>
    <small style="color:var(--text-dim);">${t('All aliases will be combined. The source player profile will be deleted.')}</small>`,
    t('Merge Players')
  );
  if (!ok) return;

  const merged = PP.mergePlayers(target, source);
  const idx = state.players.findIndex(p => p.id === targetId);
  if (idx >= 0) state.players[idx] = merged;
  state.players = state.players.filter(p => p.id !== source.id);
  await saveToStorage('player:' + targetId, merged);
  await deleteFromStorage('player:' + source.id);
  PP.updateDatalist(state.players);
  toast(t('Players merged'));
  _refreshPlayerView(targetId);
  renderBuildDetail();
}

async function deletePlayerProfile(profileId) {
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) return;
  const ok = await customConfirm(
    `${t('Delete player profile for')} <strong>${escapeHtml(profile.primaryName)}</strong>?<br>
    <small style="color:var(--text-dim);">${t('Game records are not affected.')}</small>`,
    t('Delete Player Profile')
  );
  if (!ok) return;
  state.players = state.players.filter(p => p.id !== profileId);
  await deleteFromStorage('player:' + profileId);
  if (window.NBA2K26_PLAYER_PROFILES) window.NBA2K26_PLAYER_PROFILES.updateDatalist(state.players);
  toast(t('Deleted'));
  if (document.getElementById('player-card-overlay')) {
    closePlayerCard();
    renderBuildDetail();
  } else {
    state.currentPlayerId = null;
    showPage('players');
  }
}

// Refresh whichever player view is currently open (overlay or full page)
function _refreshPlayerView(profileId) {
  if (document.getElementById('player-card-overlay')) {
    closePlayerCard();
    openPlayerCard(profileId);
  } else {
    state.currentPlayerId = profileId;
    renderPlayerPage();
  }
}

// ====================== PLAYER PAGE UI CONTROLS ======================

function defaultPlayerPageUi() {
  return { tab: 'overview', logSide: 'all', logResult: 'all', logSeason: 'all' };
}

function normalizePlayerTab(tabId) {
  return ['overview', 'log', 'identity'].includes(tabId) ? tabId : 'overview';
}

function getPlayerPageUiState() {
  if (!state.playerPageUi || typeof state.playerPageUi !== 'object') state.playerPageUi = defaultPlayerPageUi();
  state.playerPageUi = { ...defaultPlayerPageUi(), ...state.playerPageUi };
  state.playerPageUi.tab = normalizePlayerTab(state.playerPageUi.tab);
  return state.playerPageUi;
}

function shouldPersistPlayerPageUi() {
  return state.currentPage === 'player' && !document.getElementById('player-card-overlay');
}

function syncPlayerLogFilterControls() {
  [
    ['side', _logFilterSide],
    ['result', _logFilterResult],
    ['season', _logFilterSeason],
  ].forEach(([filterType, value]) => {
    document.querySelectorAll(`[data-log-filter="${filterType}"]`).forEach(btn => {
      btn.classList.toggle('active', String(btn.dataset.logValue || '') === String(value));
    });
  });
}

function applyPlayerPageUiState(options = {}) {
  const ui = getPlayerPageUiState();
  _logFilterSide = ui.logSide || 'all';
  _logFilterResult = ui.logResult || 'all';
  _logFilterSeason = ui.logSeason || 'all';
  switchPlayerTab(ui.tab, { persist: false, scroll: false, drawTrends: options.drawTrends });
  syncPlayerLogFilterControls();
  filterGameLog(null, null, null, { persist: false });
}

// Switch tab panels inside the player page
function switchPlayerTab(tabId, options = {}) {
  const nextTab = normalizePlayerTab(tabId);
  if (shouldPersistPlayerPageUi() && options.persist !== false) {
    getPlayerPageUiState().tab = nextTab;
  }
  document.querySelectorAll('.pp-panel').forEach(el => { el.style.display = 'none'; });
  const target = document.getElementById('pp-panel-' + nextTab);
  if (target) target.style.display = '';
  document.querySelectorAll('.pp-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === nextTab);
  });
  // Draw canvas charts when switching to trends tab
  if (nextTab === 'trends' && options.drawTrends !== false && typeof requestAnimationFrame === 'function') requestAnimationFrame(drawPlayerTrends);
  // Scroll back to top so tab content is immediately visible
  if (options.scroll !== false) {
    const overlay = document.querySelector('#player-card-overlay .pp-page');
    if (overlay) overlay.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Player directory: filter state
let _ppFilterSide = 'all';

function setPlayersFilter(btn, filterType) {
  _ppFilterSide = filterType;
  document.querySelectorAll('.players-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterPlayersPanel();
}

function filterPlayersPanel() {
  const searchEl = document.getElementById('players-search-input');
  const query = searchEl ? norm(searchEl.value) : '';
  const side  = _ppFilterSide || 'all';
  let visible = 0;
  document.querySelectorAll('.player-card').forEach(card => {
    const nameMatch  = !query || (card.dataset.name || '').includes(query) || (card.dataset.aliases || '').includes(query);
    const sideMatch  = side === 'all'
      || (side === 'tm'  && card.dataset.tm  === '1')
      || (side === 'opp' && card.dataset.opp === '1')
      || (side === 'dc'  && card.dataset.dc  === '1')
      || (side === 'ai'  && card.dataset.ai  === '1');
    const show = nameMatch && sideMatch;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const emptyMsg = document.getElementById('players-empty-msg');
  if (emptyMsg) emptyMsg.style.display = visible === 0 ? '' : 'none';
}

// Game log tab: filter state
let _logFilterSide   = 'all';
let _logFilterResult = 'all';
let _logFilterSeason = 'all';   // 'all' | '1'..'8'

function filterGameLog(btn, filterType, value, options = {}) {
  if (filterType === 'side')   _logFilterSide   = value;
  if (filterType === 'result') _logFilterResult = value;
  if (filterType === 'season') _logFilterSeason = value;
  if (shouldPersistPlayerPageUi() && options.persist !== false) {
    const ui = getPlayerPageUiState();
    ui.logSide = _logFilterSide;
    ui.logResult = _logFilterResult;
    ui.logSeason = _logFilterSeason;
  }
  // Update button active state within the same group
  if (btn) {
    document.querySelectorAll(`[data-log-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    syncPlayerLogFilterControls();
  }
  const tbody = document.getElementById('pp-log-tbody');
  if (!tbody) return;
  let count = 0;
  tbody.querySelectorAll('tr').forEach(row => {
    const matchSide   = _logFilterSide   === 'all' || row.dataset.side   === _logFilterSide;
    const matchResult = _logFilterResult === 'all' || row.dataset.result === _logFilterResult;
    const matchSeason = _logFilterSeason === 'all' || row.dataset.season === _logFilterSeason;
    const show = matchSide && matchResult && matchSeason;
    row.style.display = show ? '' : 'none';
    if (show) count++;
  });
  const countEl = document.getElementById('pp-log-count');
  if (countEl) countEl.textContent = `${count} ${t('appearances')} ${t('total')}`;
}

/** Quick-select a 2K26 season in the main build detail game filter bar. */
function setSeasonPreset(n) {
  if (n === 'all') {
    setGameFilter('dateFrom', '');
    setGameFilter('dateTo', '');
  } else {
    const s = NBA2K26_SEASONS.find(s => s.n === n);
    if (!s) return;
    setGameFilter('dateFrom', s.from);
    setGameFilter('dateTo',   s.to);
  }
  // Highlight the active preset button
  document.querySelectorAll('[data-season-preset]').forEach(b => {
    b.classList.toggle('active', String(b.dataset.seasonPreset) === String(n));
  });
}

// tiny norm helper (must match the one inside player-profiles.js)
function norm(s) { return String(s || '').trim().toLowerCase(); }

// ====================== PLAYER TRENDS CANVAS ======================
function drawPlayerTrends() {
  const dataEl = document.getElementById('pp-trends-json');
  if (!dataEl) return;
  let data;
  try { data = JSON.parse(dataEl.textContent); } catch(e) { return; }

  _drawPtsChart(document.getElementById('pp-canvas-pts'),    data);
  _drawWinRateChart(document.getElementById('pp-canvas-wr'), data);
  _drawGradeChart(document.getElementById('pp-canvas-grade'), data);
}

function _chartSetup(canvas) {
  if (!canvas) return null;
  // Retina-scale
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.height;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // Polyfill roundRect for older browsers
  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
      r = Math.min(r, w/2, h/2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x+w, y,   x+w, y+h, r);
      this.arcTo(x+w, y+h, x,   y+h, r);
      this.arcTo(x,   y+h, x,   y,   r);
      this.arcTo(x,   y,   x+w, y,   r);
      this.closePath();
    };
  }
  return { ctx, W, H };
}

function _drawPtsChart(canvas, data) {
  const s = _chartSetup(canvas);
  if (!s) return;
  const { ctx, W, H } = s;
  const pts = data.points;
  if (!pts || pts.length < 2) return;
  const pad = { top: 22, right: 14, bottom: 28, left: 38 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;
  const n  = pts.length;
  const maxV = Math.max(...pts.map(p => p.pts), 10);

  ctx.clearRect(0, 0, W, H);

  // Grid lines + y-labels
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i / 4) * cH;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxV * i / 4), pad.left - 5, y + 3);
  }

  const xFor = i => pad.left + (i / (n - 1)) * cW;
  const yFor = v => pad.top + cH - (v / maxV) * cH;

  // Gradient area fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  grad.addColorStop(0, 'rgba(77,166,255,0.28)');
  grad.addColorStop(1, 'rgba(77,166,255,0)');
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(pts[0].pts));
  for (let i = 1; i < n; i++) {
    const cpx = (xFor(i-1) + xFor(i)) / 2;
    ctx.bezierCurveTo(cpx, yFor(pts[i-1].pts), cpx, yFor(pts[i].pts), xFor(i), yFor(pts[i].pts));
  }
  ctx.lineTo(xFor(n-1), pad.top + cH); ctx.lineTo(xFor(0), pad.top + cH); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(pts[0].pts));
  for (let i = 1; i < n; i++) {
    const cpx = (xFor(i-1) + xFor(i)) / 2;
    ctx.bezierCurveTo(cpx, yFor(pts[i-1].pts), cpx, yFor(pts[i].pts), xFor(i), yFor(pts[i].pts));
  }
  ctx.strokeStyle = '#4da6ff'; ctx.lineWidth = 2; ctx.stroke();

  // Dots (W=green, L=red) + PTS labels on hover approach: just show dots
  pts.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(xFor(i), yFor(pt.pts), 4, 0, Math.PI * 2);
    ctx.fillStyle = pt.result === 'W' ? '#43d968' : '#e21a2f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  });

  // X-axis: game labels every ~5
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  pts.forEach((pt, i) => {
    if (i === 0 || i === n-1 || i % 5 === 0) {
      ctx.fillText(pt.date ? pt.date.slice(5) : `G${i+1}`, xFor(i), pad.top + cH + 16);
    }
  });
}

function _drawWinRateChart(canvas, data) {
  const s = _chartSetup(canvas);
  if (!s) return;
  const { ctx, W, H } = s;
  const pts = data.points;
  if (!pts || pts.length < 5) return;
  const pad = { top: 22, right: 14, bottom: 28, left: 38 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  // Build rolling 5-game win%
  const rolling = [];
  for (let i = 4; i < pts.length; i++) {
    const window5 = pts.slice(i - 4, i + 1);
    const wins = window5.filter(p => p.result === 'W').length;
    rolling.push({ pct: (wins / 5) * 100, date: pts[i].date });
  }
  const n = rolling.length;
  if (n < 2) return;

  ctx.clearRect(0, 0, W, H);

  // Grid + labels
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + cH - (i / 4) * cH;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText((25 * i) + '%', pad.left - 5, y + 3);
  }

  const xFor = i => pad.left + (i / (n - 1)) * cW;
  const yFor = v => pad.top + cH - (v / 100) * cH;
  const y50  = yFor(50);

  // 50% baseline dashed
  ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.left, y50); ctx.lineTo(pad.left + cW, y50); ctx.stroke();
  ctx.setLineDash([]);

  // Fill: green above 50%, red below
  const gradG = ctx.createLinearGradient(0, pad.top, 0, y50);
  gradG.addColorStop(0, 'rgba(67,217,104,0.3)'); gradG.addColorStop(1, 'rgba(67,217,104,0)');
  const gradR = ctx.createLinearGradient(0, y50, 0, pad.top + cH);
  gradR.addColorStop(0, 'rgba(226,26,47,0)'); gradR.addColorStop(1, 'rgba(226,26,47,0.25)');

  [
    { grad: gradG, clip: [pad.left, pad.top, cW, y50 - pad.top] },
    { grad: gradR, clip: [pad.left, y50,     cW, cH - (y50 - pad.top)] },
  ].forEach(({ grad, clip }) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(...clip);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(xFor(0), yFor(rolling[0].pct));
    for (let i = 1; i < n; i++) {
      const cpx = (xFor(i-1) + xFor(i)) / 2;
      ctx.bezierCurveTo(cpx, yFor(rolling[i-1].pct), cpx, yFor(rolling[i].pct), xFor(i), yFor(rolling[i].pct));
    }
    ctx.lineTo(xFor(n-1), pad.top + cH); ctx.lineTo(xFor(0), pad.top + cH); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
  });

  // Line
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(rolling[0].pct));
  for (let i = 1; i < n; i++) {
    const cpx = (xFor(i-1) + xFor(i)) / 2;
    ctx.bezierCurveTo(cpx, yFor(rolling[i-1].pct), cpx, yFor(rolling[i].pct), xFor(i), yFor(rolling[i].pct));
  }
  const lineGrad = ctx.createLinearGradient(pad.left, 0, pad.left + cW, 0);
  lineGrad.addColorStop(0, '#4da6ff'); lineGrad.addColorStop(1, '#43d968');
  ctx.strokeStyle = lineGrad; ctx.lineWidth = 2.5; ctx.stroke();

  // Dots
  rolling.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(xFor(i), yFor(r.pct), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = r.pct >= 50 ? '#43d968' : '#e21a2f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  });

  // X labels
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  rolling.forEach((r, i) => {
    if (i === 0 || i === n-1 || i % 5 === 0)
      ctx.fillText(r.date ? r.date.slice(5) : `G${i+5}`, xFor(i), pad.top + cH + 16);
  });
}

function _drawGradeChart(canvas, data) {
  const s = _chartSetup(canvas);
  if (!s) return;
  const { ctx, W, H } = s;
  const gradeOrder = data.gradeOrder; // ['F','D-',...,'A+']
  const gradeColor = data.gradeColor;
  const pts = data.points;
  if (!pts || !gradeOrder) return;

  // Count grades
  const dist = {};
  gradeOrder.forEach(g => { dist[g] = 0; });
  pts.forEach(p => { if (p.gradeI !== null && p.gradeI !== undefined) dist[gradeOrder[p.gradeI]] = (dist[gradeOrder[p.gradeI]] || 0) + 1; });

  const grades = [...gradeOrder].reverse().filter(g => dist[g] > 0);
  if (!grades.length) return;

  const maxCount = Math.max(...grades.map(g => dist[g]));
  const padL = 36, padR = 44, padT = 12, padB = 12;
  const rowH = (H - padT - padB) / grades.length;

  ctx.clearRect(0, 0, W, H);

  grades.forEach((g, i) => {
    const y = padT + i * rowH;
    const barW = maxCount > 0 ? ((dist[g] / maxCount) * (W - padL - padR)) : 0;
    const color = gradeColor[g] || '#888';

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.roundRect(padL, y + 3, W - padL - padR, rowH - 6, 4);
    ctx.fill();

    // Bar fill
    if (barW > 0) {
      const grad = ctx.createLinearGradient(padL, 0, padL + barW, 0);
      grad.addColorStop(0, color + 'cc');
      grad.addColorStop(1, color + '55');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(padL, y + 3, barW, rowH - 6, 4);
      ctx.fill();
    }

    // Grade label
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(g, padL - 5, y + rowH / 2);

    // Count label
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(dist[g], padL + barW + 6, y + rowH / 2);
  });
}

// ====================== PLAYER DATA EXPORT ======================
function exportPlayerData(profileId) {
  if (!window.NBA2K26_PLAYER_PROFILES || !state.players || !state.games) return;
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) { toast('Player not found', true); return; }

  const pp = window.NBA2K26_PLAYER_PROFILES;
  const { asTeammate, asOpponent } = pp.getStats(profile, state.games);
  const allEntries = [
    ...asTeammate.map(e => ({ ...e, side: 'tm' })),
    ...asOpponent.map(e => ({ ...e, side: 'opp' })),
  ];
  const ppRes = e => {
    if (e.side !== 'opp') return e.game.result;
    if (e.game.result === 'W') return 'L';
    if (e.game.result === 'L') return 'W';
    return e.game.result;
  };
  const allAgg = pp.aggEntries(allEntries, { resultForEntry: ppRes });
  const highs  = pp.getCareerHighs(allEntries);
  const badges = pp.getPlayerBadges(asTeammate, asOpponent);

  const seasonBreakdown = (typeof NBA2K26_SEASONS !== 'undefined' ? NBA2K26_SEASONS : []).reduce((acc, s) => {
    const sEntries = allEntries.filter(e => { const d = e.game.date || ''; return d >= s.from && d <= s.to; });
    if (!sEntries.length) return acc;
    const sAgg = pp.aggEntries(sEntries, { resultForEntry: ppRes });
    acc.push({ season: s.label, from: s.from, to: s.to, games: sEntries.length, ...sAgg });
    return acc;
  }, []);

  const gameLog = [...allEntries]
    .sort((a, b) => (b.game.date || '') < (a.game.date || '') ? -1 : 1)
    .map(e => ({
      date: e.game.date, mode: e.game.mode, role: e.side,
      result: ppRes(e),
      pts: Number(e.player.pts)||0, reb: Number(e.player.reb)||0,
      ast: Number(e.player.ast)||0, stl: Number(e.player.stl)||0,
      blk: Number(e.player.blk)||0, to: Number(e.player.to)||0,
      fg: `${e.player.fgm||0}/${e.player.fga||0}`,
      fg3: `${e.player.fg3m||0}/${e.player.fg3a||0}`,
      grade: e.player.grade || '',
    }));

  const exportObj = {
    exportedAt: new Date().toISOString(),
    profile: { id: profile.id, primaryName: profile.primaryName, aliases: profile.aliases, notes: profile.notes, createdAt: profile.createdAt },
    careerStats: allAgg,
    careerHighs: highs,
    badges: badges.map(b => ({ label: b.label, zh: b.zh, icon: b.icon })),
    seasonBreakdown,
    gameLog,
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${profile.primaryName.replace(/[^a-z0-9一-鿿]/gi, '_')}_2K26.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`✅ ${profile.primaryName} 数据已导出`);
}

// ====================== PLAYER CARD IMAGE ======================
function downloadPlayerCard(profileId) { // eslint-disable-line no-unused-vars
  if (!window.NBA2K26_PLAYER_PROFILES || !state.players || !state.games) return;
  const profile = state.players.find(p => p.id === profileId);
  if (!profile) { toast('Player not found', true); return; }
  _renderPlayerCard(profile);
}

function _renderPlayerCard(profile) {
  const pp = window.NBA2K26_PLAYER_PROFILES;
  const { asTeammate, asOpponent } = pp.getStats(profile, state.games);
  const allEntries = [
    ...asTeammate.map(e => ({ ...e, side: 'tm' })),
    ...asOpponent.map(e => ({ ...e, side: 'opp' })),
  ];
  const ppRes = e => {
    if (e.side !== 'opp') return e.game.result;
    return e.game.result === 'W' ? 'L' : e.game.result === 'L' ? 'W' : e.game.result;
  };

  const allAgg     = pp.aggEntries(allEntries, { resultForEntry: ppRes });
  const tmAgg      = pp.aggEntries(asTeammate);
  const oppAgg     = pp.aggEntries(asOpponent);
  const highs      = pp.getCareerHighs(allEntries);
  const badges     = pp.getPlayerBadges(asTeammate, asOpponent);
  const modeStats  = pp.getModeStats(profile, state.games).slice(0, 4);
  const recentForm = pp.getRecentForm(profile, state.games, 15);
  const gradeDist  = pp.getGradeDistribution(allEntries);
  const posStats   = pp.getPositionStats(profile, state.games).slice(0, 5);

  const posFreq = {};
  allEntries.forEach(e => { const p = e.player.position; if (p) posFreq[p] = (posFreq[p] || 0) + 1; });
  const allPos  = Object.keys(posFreq).sort((a, b) => posFreq[b] - posFreq[a]).slice(0, 3);
  const aliases = (profile.aliases || []).filter(a => a.toLowerCase() !== profile.primaryName.toLowerCase()).slice(0, 4);
  const GRADE_ORDER = ['F','D-','D','D+','C-','C','C+','B-','B','B+','A-','A','A+'];

  // ── Extended computed metrics ─────────────────────────────────────
  // Efficiency = PTS+REB+AST+STL+BLK - TO - missed FG/game - missed FT/game
  let effRating = null;
  if (allAgg && allAgg.n > 0) {
    const mFG = allAgg.fga > 0 ? (allAgg.fga - allAgg.fgm) / allAgg.n : 0;
    const mFT = allAgg.fta > 0 ? (allAgg.fta - allAgg.ftm) / allAgg.n : 0;
    const raw = parseFloat(allAgg.ppg) + parseFloat(allAgg.rpg) + parseFloat(allAgg.apg)
              + parseFloat(allAgg.spg) + parseFloat(allAgg.bpg) - parseFloat(allAgg.topg) - mFG - mFT;
    effRating = raw.toFixed(1);
  }

  // Plus/minus
  const hasPM = allEntries.some(e => e.player.pm !== undefined && e.player.pm !== null && String(e.player.pm).trim() !== '');
  const avgPMVal = (hasPM && allAgg && allAgg.n > 0)
    ? allEntries.reduce((s, e) => s + (Number(e.player.pm) || 0), 0) / allAgg.n
    : null;
  const avgPM = avgPMVal !== null ? ((avgPMVal > 0 ? '+' : '') + avgPMVal.toFixed(1)) : null;
  const pmRaw = avgPMVal !== null ? avgPMVal : null;

  // Double-doubles / triple-doubles
  let ddCount = 0, tdCount = 0;
  allEntries.forEach(e => {
    const p = e.player;
    const cats = [Number(p.pts)>=10, Number(p.reb)>=10, Number(p.ast)>=10,
                  Number(p.stl)>=10, Number(p.blk)>=10].filter(Boolean).length;
    if (cats >= 2) ddCount++;
    if (cats >= 3) tdCount++;
  });

  // Current streak from recentForm
  let streak = 0, streakType = null;
  const rfWithResult = recentForm.map(e => ({
    ...e,
    isW: e.side === 'opp' ? e.game.result === 'L' : e.game.result === 'W',
  }));
  for (const e of [...rfWithResult].reverse()) {
    const t = e.isW ? 'W' : 'L';
    if (streakType === null) { streakType = t; streak = 1; }
    else if (t === streakType) streak++;
    else break;
  }

  // ── Canvas setup ─────────────────────────────────────────────────
  const W = 920;
  const BADGE_ROWS = badges.length ? Math.ceil(badges.length / 6) : 0;
  const HAS_SPARKLINE = rfWithResult.some(e => Number(e.player?.pts) > 0);
  const H_EST = 60 + 175 + 16      // header + hero
    + 20 + 100                      // record split
    + 20 + 60                       // season averages
    + 20 + 62                       // shooting efficiency
    + (highs ? 20 + 60 : 0)        // career highs
    + 20 + 60                       // grade distribution
    + (rfWithResult.length ? 20 + (HAS_SPARKLINE ? 38 : 0) + 54 : 0) // recent form
    + (posStats.length > 1 ? 20 + 62 : 0)  // position breakdown
    + (modeStats.length ? 20 + 62 : 0)     // top modes
    + (BADGE_ROWS ? 20 + BADGE_ROWS * 34 + 10 : 0) // badges
    + 50;
  const H = Math.max(H_EST, 920);

  const canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }

  const PAD = 28;
  const RED = '#e21a2f', GOLD = '#f6c638', BLUE = '#4da6ff', GREEN = '#43d968', PURPLE = '#c084fc';
  const ORANGE = '#ff8a65', TEAL = '#22d3ee';
  const DIM    = 'rgba(255,255,255,0.42)';
  const DIMMER = 'rgba(255,255,255,0.22)';
  const FAINT  = 'rgba(255,255,255,0.055)';
  const FAINT2 = 'rgba(255,255,255,0.09)';

  const wpColor  = pct => pct >= 60 ? GREEN : pct >= 50 ? GOLD : '#ff5a36';
  const pmColor  = v => { const n = parseFloat(v); return isNaN(n) ? DIMMER : n > 0 ? GREEN : n < 0 ? '#ff5a36' : DIMMER; };
  const gradeColor = g => {
    const idx = GRADE_ORDER.indexOf(g);
    if (idx < 0) return DIMMER;
    if (idx >= 12) return GOLD;
    if (idx >= 11) return '#e8d200';
    if (idx >= 10) return GREEN;
    if (idx >= 8)  return BLUE;
    if (idx >= 6)  return PURPLE;
    if (idx >= 3)  return ORANGE;
    return '#ff4444';
  };

  // ── Background ──────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W * 0.7, H);
  bg.addColorStop(0, '#0f0f14'); bg.addColorStop(0.5, '#110810'); bg.addColorStop(1, '#080b10');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Spotlight glow top-left
  const gl1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 540);
  gl1.addColorStop(0, 'rgba(226,26,47,0.14)'); gl1.addColorStop(1, 'transparent');
  ctx.fillStyle = gl1; ctx.fillRect(0, 0, W, H);

  // Subtle right edge glow
  const gl2 = ctx.createRadialGradient(W, H * 0.38, 0, W, H * 0.38, 420);
  gl2.addColorStop(0, 'rgba(77,166,255,0.07)'); gl2.addColorStop(1, 'transparent');
  ctx.fillStyle = gl2; ctx.fillRect(0, 0, W, H);

  // Dot grid texture
  ctx.save(); ctx.globalAlpha = 0.02;
  for (let gx = 0; gx < W; gx += 20) {
    for (let gy = 0; gy < H; gy += 20) {
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.arc(gx, gy, 0.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Diagonal stripe right side
  ctx.save(); ctx.globalAlpha = 0.04; ctx.fillStyle = RED;
  ctx.beginPath(); ctx.moveTo(W - 200, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W - 280, H);
  ctx.closePath(); ctx.fill(); ctx.restore();

  // Card outer edge gradient border
  const edgeGrad = ctx.createLinearGradient(0, 0, W, H);
  edgeGrad.addColorStop(0, RED + '66'); edgeGrad.addColorStop(0.5, RED + '18'); edgeGrad.addColorStop(1, BLUE + '44');
  ctx.strokeStyle = edgeGrad; ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);

  // ── Helpers ────────────────────────────────────────────────────
  const rr  = (x, y, w, h, r) => { ctx.roundRect(x, y, w, h, r); };
  const fillRR = (x, y, w, h, r, fill) => { ctx.fillStyle = fill; rr(x, y, w, h, r); ctx.fill(); };
  const strokeRR = (x, y, w, h, r, stroke, lw = 1) => {
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; rr(x, y, w, h, r); ctx.stroke();
  };

  const gradBar = (x, y, bw, bh, pct, col, r = 4) => {
    fillRR(x, y, bw, bh, r, 'rgba(255,255,255,0.06)');
    if (pct <= 0) return;
    const filled = Math.max(r * 2, (pct / 100) * bw);
    const grad = ctx.createLinearGradient(x, 0, x + filled, 0);
    grad.addColorStop(0, col + '66'); grad.addColorStop(1, col);
    ctx.fillStyle = grad; rr(x, y, filled, bh, r); ctx.fill();
  };

  const sectionHeader = (label, dy) => {
    ctx.fillStyle = RED; ctx.fillRect(PAD, dy - 10, 3, 14);
    ctx.fillStyle = DIM; ctx.font = '700 9px "Inter",Arial,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label.toUpperCase(), PAD + 9, dy);
  };
  const divider = (dy) => {
    const dg = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    dg.addColorStop(0, 'transparent'); dg.addColorStop(0.12, RED + '44');
    dg.addColorStop(0.88, RED + '44'); dg.addColorStop(1, 'transparent');
    ctx.strokeStyle = dg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, dy); ctx.lineTo(W - PAD, dy); ctx.stroke();
  };

  // ── HEADER ─────────────────────────────────────────────────────
  const HDR = 60;
  // Two-tone header gradient
  const hGrad = ctx.createLinearGradient(0, 0, W, 0);
  hGrad.addColorStop(0, RED); hGrad.addColorStop(0.62, '#8a0f1c'); hGrad.addColorStop(1, '#120406');
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, HDR);
  // Header shine
  const hShine = ctx.createLinearGradient(0, 0, 0, HDR);
  hShine.addColorStop(0, 'rgba(255,255,255,0.13)'); hShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hShine; ctx.fillRect(0, 0, W, HDR);
  // Gold bottom accent line (left 60%)
  ctx.fillStyle = GOLD + 'aa'; ctx.fillRect(0, HDR - 2, W * 0.62, 2);

  ctx.font = '900 23px "Bebas Neue","Arial Black",sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  ctx.fillText('BIG', PAD, HDR / 2);
  const bigW = ctx.measureText('BIG').width;
  ctx.fillStyle = GOLD;
  ctx.fillText('REDFLOWERS', PAD + bigW + 6, HDR / 2);
  const rfW2 = ctx.measureText('REDFLOWERS').width;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '700 10px "Inter",Arial,sans-serif';
  ctx.fillText('·', PAD + bigW + rfW2 + 16, HDR / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '700 9px "Inter",Arial,sans-serif';
  ctx.fillText('NBA 2K26', PAD + bigW + rfW2 + 26, HDR / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '700 8px "JetBrains Mono","Courier New",monospace';
  ctx.textAlign = 'right';
  ctx.fillText('PLAYER PROFILE CARD', W - PAD, HDR / 2 - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '7px "JetBrains Mono","Courier New",monospace';
  ctx.fillText(new Date().toLocaleDateString(), W - PAD, HDR / 2 + 8);

  // ── HERO ──────────────────────────────────────────────────────
  let y = HDR + 22;
  const AV_R = 60, AV_X = PAD + AV_R + 4, AV_Y = y + AV_R + 4;
  const AV_COLORS = [
    ['#c0001a','#e21a2f'],['#1d4ed8','#3b82f6'],['#047857','#10b981'],
    ['#6d28d9','#8b5cf6'],['#b45309','#d97706'],['#0e7490','#06b6d4'],
    ['#be185d','#f472b6'],['#065f46','#34d399'],
  ];
  let hh = 0;
  for (let i = 0; i < profile.primaryName.length; i++) hh = (hh * 31 + profile.primaryName.charCodeAt(i)) | 0;
  const [ac1, ac2] = AV_COLORS[Math.abs(hh) % AV_COLORS.length];

  // Outer glow halos
  ctx.save(); ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.arc(AV_X, AV_Y, AV_R + 18, 0, Math.PI * 2);
  ctx.strokeStyle = ac1; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.28;
  ctx.beginPath(); ctx.arc(AV_X, AV_Y, AV_R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = ac1; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
  // Inner ring
  ctx.beginPath(); ctx.arc(AV_X, AV_Y, AV_R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
  // Avatar fill
  const avGrad = ctx.createLinearGradient(AV_X - AV_R, AV_Y - AV_R, AV_X + AV_R, AV_Y + AV_R);
  avGrad.addColorStop(0, ac1); avGrad.addColorStop(1, ac2);
  ctx.beginPath(); ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2);
  ctx.fillStyle = avGrad; ctx.fill();
  // Avatar shine
  const avShine = ctx.createLinearGradient(AV_X - AV_R, AV_Y - AV_R, AV_X, AV_Y);
  avShine.addColorStop(0, 'rgba(255,255,255,0.32)'); avShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = avShine;
  ctx.beginPath(); ctx.arc(AV_X, AV_Y, AV_R, 0, Math.PI * 2); ctx.fill();
  // Initial letter
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(AV_R * 0.9)}px "Bebas Neue","Arial Black",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(profile.primaryName.charAt(0).toUpperCase(), AV_X, AV_Y + 3);
  ctx.shadowBlur = 0;

  // Name + positions block (between avatar and grade badge)
  const NX = AV_X + AV_R + 26;
  const GRADE_BADGE_W = allAgg && allAgg.avgGrade && allAgg.avgGrade !== '--' ? 110 : 0;
  const displayName = profile.primaryName.toUpperCase();
  const nameMaxW = W - NX - PAD - GRADE_BADGE_W - 16;
  let nfs = 60;
  ctx.font = `${nfs}px "Bebas Neue","Arial Black",sans-serif`;
  while (ctx.measureText(displayName).width > nameMaxW && nfs > 22) {
    nfs -= 2; ctx.font = `${nfs}px "Bebas Neue","Arial Black",sans-serif`;
  }
  ctx.shadowColor = ac1 + '30'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(displayName, NX, y + 62);
  ctx.shadowBlur = 0;

  // Position badges
  let posX2 = NX;
  allPos.forEach((pos, i) => {
    const pw = 52, ph = 22;
    fillRR(posX2, y + 68, pw, ph, 4, i === 0 ? ac1 + 'cc' : ac1 + '44');
    ctx.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${i === 0 ? 12 : 10}px "Inter",Arial,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pos, posX2 + pw / 2, y + 68 + ph / 2);
    posX2 += pw + 6;
  });

  // Aliases
  if (aliases.length) {
    ctx.fillStyle = DIMMER; ctx.font = '700 9px "JetBrains Mono","Courier New",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('aka  ' + aliases.join('  ·  '), NX, y + 108);
  }

  // Avg Grade badge – large circle on right
  if (allAgg && allAgg.avgGrade && allAgg.avgGrade !== '--') {
    const gc = gradeColor(allAgg.avgGrade);
    const GCX = W - PAD - 48, GCY = y + 58;
    const GR = 48;
    // Outer ring glows
    ctx.save(); ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.arc(GCX, GCY, GR + 12, 0, Math.PI * 2);
    ctx.strokeStyle = gc; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(GCX, GCY, GR + 5, 0, Math.PI * 2);
    ctx.strokeStyle = gc; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // Disc fill
    const discG = ctx.createRadialGradient(GCX, GCY - 12, 0, GCX, GCY, GR);
    discG.addColorStop(0, gc + '38'); discG.addColorStop(1, gc + '0a');
    ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI * 2);
    ctx.fillStyle = discG; ctx.fill();
    ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI * 2);
    ctx.strokeStyle = gc + '55'; ctx.lineWidth = 1; ctx.stroke();
    // Grade text
    ctx.shadowColor = gc + '99'; ctx.shadowBlur = 18;
    ctx.fillStyle = gc;
    ctx.font = `700 ${allAgg.avgGrade.length > 2 ? 26 : 32}px "Bebas Neue","Arial Black",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(allAgg.avgGrade, GCX, GCY + 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = DIMMER; ctx.font = '700 7px "Inter",Arial,sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('AVG GRADE', GCX, GCY + 24);
  }

  // KPI strip — full-width row with all computed metrics
  const stripY = HDR + 22 + AV_R * 2 + 20;
  const stripW = W - PAD * 2;
  const kpis = [
    allAgg ? { l:'GP',     v: allAgg.n,          c: DIM    } : null,
    allAgg ? { l:'WIN%',   v: allAgg.winPct + '%',c: wpColor(allAgg.winPct) } : null,
    allAgg ? { l:'PTS',    v: allAgg.ppg,         c: GOLD   } : null,
    allAgg ? { l:'REB',    v: allAgg.rpg,         c: BLUE   } : null,
    allAgg ? { l:'AST',    v: allAgg.apg,         c: GREEN  } : null,
    allAgg ? { l:'STL',    v: allAgg.spg,         c: TEAL   } : null,
    allAgg ? { l:'BLK',    v: allAgg.bpg,         c: BLUE   } : null,
    allAgg ? { l:'TO',     v: allAgg.topg,        c: ORANGE } : null,
    effRating   ? { l:'EFF',   v: effRating,          c: PURPLE } : null,
    avgPM       ? { l:'+/-',   v: avgPM,              c: pmColor(pmRaw) } : null,
    ddCount > 0 ? { l:'DD',    v: ddCount,             c: GOLD   } : null,
    tdCount > 0 ? { l:'TD',    v: tdCount,             c: PURPLE } : null,
  ].filter(Boolean);

  const kpiCellW = Math.floor(stripW / kpis.length);
  fillRR(PAD, stripY, stripW, 46, 6, 'rgba(255,255,255,0.034)');
  strokeRR(PAD, stripY, stripW, 46, 6, 'rgba(255,255,255,0.07)');
  kpis.forEach(({ l, v, c }, i) => {
    const kx = PAD + i * kpiCellW + kpiCellW / 2;
    ctx.fillStyle = c; ctx.font = `700 15px "Bebas Neue","Arial Black",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(v), kx, stripY + 27);
    ctx.fillStyle = DIMMER; ctx.font = '700 7px "Inter",Arial,sans-serif';
    ctx.fillText(l, kx, stripY + 39);
    if (i < kpis.length - 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(PAD + (i + 1) * kpiCellW - 1, stripY + 6, 1, 34);
    }
  });

  y = stripY + 46 + 16;

  // ── RECORD SPLIT ──────────────────────────────────────────────
  divider(y); y += 20;
  sectionHeader('RECORD SPLIT', y); y += 14;
  const colW = (W - PAD * 2 - 16) / 2;

  const drawRecord = (agg, gamesCount, label, accent, cx) => {
    const CH = 88;
    fillRR(cx, y, colW, CH, 8, accent + '0c');
    strokeRR(cx, y, colW, CH, 8, accent + '33');
    ctx.fillStyle = accent; ctx.fillRect(cx, y + 6, 3, CH - 12);

    ctx.fillStyle = accent; ctx.font = '700 8px "Inter",Arial,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, cx + 12, y + 17);

    if (!agg || !gamesCount) {
      ctx.fillStyle = DIMMER; ctx.font = '11px "Inter",Arial,sans-serif';
      ctx.fillText('—  NO DATA', cx + 12, y + 48); return;
    }
    const wp = agg.winPct, wpc = wpColor(wp);
    ctx.fillStyle = '#fff'; ctx.font = `700 28px "Bebas Neue","Arial Black",sans-serif`;
    ctx.fillText(`${agg.wins}W–${agg.losses}L`, cx + 12, y + 44);
    const recTW = ctx.measureText(`${agg.wins}W–${agg.losses}L`).width;
    fillRR(cx + 16 + recTW, y + 28, 28, 14, 3, FAINT2);
    ctx.fillStyle = DIMMER; ctx.font = '700 8px "Inter",Arial,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${gamesCount}G`, cx + 16 + recTW + 14, y + 35);
    ctx.fillStyle = wpc; ctx.font = '700 16px "Bebas Neue","Arial Black",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${wp}%`, cx + 12, y + 62);
    gradBar(cx + 58, y + 52, colW - 74, 8, wp, wpc);
    if (agg.ppg !== undefined) {
      ctx.fillStyle = DIMMER; ctx.font = '8px "JetBrains Mono","Courier New",monospace';
      const grStr = agg.avgGrade && agg.avgGrade !== '--' ? `  avg:${agg.avgGrade}` : '';
      ctx.fillText(`${agg.ppg}pts  ${agg.rpg}reb  ${agg.apg}ast  ${agg.spg}stl  ${agg.bpg}blk${grStr}`, cx + 12, y + 80);
    }
  };

  drawRecord(tmAgg,  asTeammate.length, 'AS TEAMMATE', GREEN,  PAD);
  drawRecord(oppAgg, asOpponent.length, 'VS OPPONENT', ORANGE, PAD + colW + 16);
  y += 100;

  // ── SEASON AVERAGES ────────────────────────────────────────────
  divider(y); y += 20;
  sectionHeader('SEASON AVERAGES', y); y += 14;
  if (allAgg) {
    const statItems = [
      { l:'PTS', v:allAgg.ppg,  c:GOLD,   big:true  },
      { l:'REB', v:allAgg.rpg,  c:BLUE,   big:true  },
      { l:'AST', v:allAgg.apg,  c:GREEN,  big:true  },
      { l:'STL', v:allAgg.spg,  c:TEAL,   big:false },
      { l:'BLK', v:allAgg.bpg,  c:BLUE,   big:false },
      { l:'TO',  v:allAgg.topg, c:ORANGE, big:false },
      ...(effRating   ? [{ l:'EFF', v:effRating, c:PURPLE, big:false }] : []),
      ...(avgPM ? [{ l:'+/-', v:avgPM, c:pmColor(pmRaw), big:false }] : []),
    ];
    const siw = (W - PAD * 2) / statItems.length, sih = 52;
    statItems.forEach(({ l, v, c, big }, i) => {
      const cx = PAD + i * siw + siw / 2;
      fillRR(PAD + i * siw + 2, y, siw - 4, sih, 7, big ? c + '14' : FAINT);
      if (big) { ctx.shadowColor = c + '55'; ctx.shadowBlur = 14; }
      ctx.fillStyle = c;
      ctx.font = `700 ${big ? 22 : 18}px "Bebas Neue","Arial Black",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(v ?? '--'), cx, y + (big ? 33 : 30));
      ctx.shadowBlur = 0;
      ctx.fillStyle = DIMMER; ctx.font = '700 7px "Inter",Arial,sans-serif';
      ctx.fillText(l, cx, y + 45);
    });
    y += sih + 6;
  }

  // ── SHOOTING EFFICIENCY ────────────────────────────────────────
  divider(y); y += 20;
  sectionHeader('SHOOTING EFFICIENCY', y); y += 14;
  if (allAgg) {
    const shootItems = [
      { l:'FIELD GOALS', v:allAgg.fgPct,  made:allAgg.fgm,  att:allAgg.fga,  c:GOLD   },
      { l:'THREE-POINT', v:allAgg.fg3Pct, made:allAgg.fg3m, att:allAgg.fg3a, c:PURPLE },
      { l:'FREE THROWS', v:allAgg.ftPct,  made:allAgg.ftm,  att:allAgg.fta,  c:BLUE   },
    ];
    const sw = (W - PAD * 2 - 20) / 3, sh = 56;
    shootItems.forEach(({ l, v, made, att, c }, i) => {
      const sx = PAD + i * (sw + 10);
      fillRR(sx, y, sw, sh, 8, c + '10');
      strokeRR(sx, y, sw, sh, 8, c + '30');
      ctx.fillStyle = DIMMER; ctx.font = '700 8px "Inter",Arial,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(l, sx + 12, y + 16);
      const pctNum = parseInt(v) || 0;
      ctx.shadowColor = c + '55'; ctx.shadowBlur = 8;
      ctx.fillStyle = c; ctx.font = '700 22px "Bebas Neue","Arial Black",sans-serif';
      ctx.fillText(String(v ?? '--'), sx + 12, y + 40);
      ctx.shadowBlur = 0;
      if (att > 0) {
        ctx.fillStyle = DIMMER; ctx.font = '8px "JetBrains Mono","Courier New",monospace';
        ctx.fillText(`${made}/${att}`, sx + 12, y + 52);
      }
      gradBar(sx + sw - 74, y + 16, 64, 6, pctNum, c, 3);
    });
    y += sh + 8;
  }

  // ── CAREER HIGHS ──────────────────────────────────────────────
  if (highs) {
    divider(y); y += 20;
    sectionHeader('CAREER HIGHS', y); y += 14;
    const highItems = [
      { l:'PTS',  v:highs.pts,  c:GOLD   },
      { l:'REB',  v:highs.reb,  c:BLUE   },
      { l:'AST',  v:highs.ast,  c:GREEN  },
      { l:'STL',  v:highs.stl,  c:TEAL   },
      { l:'BLK',  v:highs.blk,  c:BLUE   },
      { l:'3PM',  v:highs.fg3m, c:PURPLE },
      { l:'TO',   v:highs.to,   c:ORANGE },
      ...(highs.bestGrade ? [{ l:'BEST', v:highs.bestGrade, c:gradeColor(highs.bestGrade) }] : []),
    ];
    const hcw = (W - PAD * 2) / highItems.length, hch = 52;
    highItems.forEach(({ l, v, c }, i) => {
      const cx = PAD + i * hcw + hcw / 2;
      fillRR(PAD + i * hcw + 2, y, hcw - 4, hch, 7, c + '10');
      ctx.fillStyle = c + 'aa'; ctx.fillRect(PAD + i * hcw + 2, y, hcw - 4, 2);
      ctx.shadowColor = c + '55'; ctx.shadowBlur = 10;
      ctx.fillStyle = c;
      ctx.font = `700 ${typeof v === 'string' ? 16 : 22}px "Bebas Neue","Arial Black",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(v ?? '0'), cx, y + 32);
      ctx.shadowBlur = 0;
      ctx.fillStyle = DIMMER; ctx.font = '700 7px "Inter",Arial,sans-serif';
      ctx.fillText(l, cx, y + 45);
    });
    y += hch + 8;
  }

  // ── GRADE DISTRIBUTION ────────────────────────────────────────
  const gradeTotal = Object.values(gradeDist).reduce((s, v) => s + v, 0);
  if (gradeTotal > 0) {
    divider(y); y += 20;
    sectionHeader('GRADE DISTRIBUTION', y); y += 14;
    const gdW = W - PAD * 2, gdH = 22, gdR = 5;
    fillRR(PAD, y, gdW, gdH, gdR, 'rgba(255,255,255,0.04)');
    let gx2 = PAD;
    GRADE_ORDER.forEach(g => {
      const cnt = gradeDist[g] || 0;
      if (!cnt) return;
      const segW = (cnt / gradeTotal) * gdW;
      const col = gradeColor(g);
      const seg = ctx.createLinearGradient(gx2, 0, gx2 + segW, 0);
      seg.addColorStop(0, col + 'aa'); seg.addColorStop(1, col);
      ctx.fillStyle = seg;
      ctx.beginPath(); ctx.rect(gx2, y, segW, gdH); ctx.fill();
      gx2 += segW;
    });
    strokeRR(PAD, y, gdW, gdH, gdR, 'rgba(255,255,255,0.1)');
    if (allAgg && allAgg.avgGrade && allAgg.avgGrade !== '--') {
      const avgIdx = GRADE_ORDER.indexOf(allAgg.avgGrade);
      const cumSum = GRADE_ORDER.slice(0, avgIdx + 1).reduce((s, g) => s + (gradeDist[g] || 0), 0);
      const markerX = PAD + (cumSum / gradeTotal) * gdW;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(markerX, y - 3); ctx.lineTo(markerX, y + gdH + 3); ctx.stroke();
      fillRR(markerX - 20, y + gdH + 5, 40, 16, 4, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = gradeColor(allAgg.avgGrade);
      ctx.font = '700 9px "Inter",Arial,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`avg ${allAgg.avgGrade}`, markerX, y + gdH + 13);
    }
    y += gdH + 22;
    let labelX2 = PAD;
    GRADE_ORDER.filter(g => (gradeDist[g] || 0) > 0).forEach(g => {
      const cnt = gradeDist[g];
      const col = gradeColor(g);
      fillRR(labelX2, y, 38, 18, 4, col + '22');
      strokeRR(labelX2, y, 38, 18, 4, col + '55');
      ctx.fillStyle = col; ctx.font = '700 8px "Inter",Arial,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${g}×${cnt}`, labelX2 + 19, y + 9);
      labelX2 += 44;
    });
    y += 26;
  }

  // ── RECENT FORM ───────────────────────────────────────────────
  if (rfWithResult.length) {
    divider(y); y += 20;
    const rfWins = rfWithResult.filter(e => e.isW).length;
    const rfLoss = rfWithResult.length - rfWins;
    const rfWp   = Math.round(rfWins / rfWithResult.length * 100);
    sectionHeader(`RECENT FORM  (LAST ${rfWithResult.length})`, y);
    // Stats right side
    ctx.fillStyle = wpColor(rfWp); ctx.font = `700 9px "JetBrains Mono","Courier New",monospace`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${rfWins}W–${rfLoss}L  ·  ${rfWp}%`, W - PAD, y);
    // Streak badge
    if (streak >= 2) {
      const sCol  = streakType === 'W' ? GREEN : RED;
      const sTxt  = `${streak}${streakType} STREAK`;
      ctx.font = '700 8px "Inter",Arial,sans-serif';
      const sBadgeW = ctx.measureText(sTxt).width + 14;
      const sBadgeX = W - PAD - 96 - sBadgeW;
      fillRR(sBadgeX, y - 10, sBadgeW, 14, 3, sCol + '22');
      strokeRR(sBadgeX, y - 10, sBadgeW, 14, 3, sCol + '66');
      ctx.fillStyle = sCol; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sTxt, sBadgeX + sBadgeW / 2, y - 3);
    }
    y += 14;

    const hasPts = rfWithResult.some(e => Number(e.player?.pts) > 0);
    const DOT = 31, GAP = 4;

    // Sparkline (pts over time)
    if (hasPts) {
      const ptVals = rfWithResult.map(e => Number(e.player?.pts) || 0);
      const maxPt  = Math.max(...ptVals, 1);
      const spW    = rfWithResult.length * (DOT + GAP) - GAP;
      const spH    = 30;
      // Area fill
      const spPts  = ptVals.map((v, i) => ({
        x: PAD + i * (DOT + GAP) + DOT / 2,
        y: y + spH - 4 - (v / maxPt) * (spH - 8),
      }));
      const areaG = ctx.createLinearGradient(0, y, 0, y + spH);
      areaG.addColorStop(0, GOLD + '44'); areaG.addColorStop(1, GOLD + '00');
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(spPts[0].x, y + spH);
      spPts.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(spPts[spPts.length - 1].x, y + spH);
      ctx.closePath(); ctx.fillStyle = areaG; ctx.fill();
      // Line
      ctx.beginPath();
      spPts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.strokeStyle = GOLD + 'bb'; ctx.lineWidth = 1.5; ctx.stroke();
      // Dots
      spPts.forEach((pt, i) => {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = rfWithResult[i].isW ? GREEN : RED; ctx.fill();
      });
      ctx.restore();
      y += spH + 6;
    }

    // W/L boxes
    rfWithResult.forEach((e, i) => {
      const col = e.isW ? GREEN : RED;
      const dx  = PAD + i * (DOT + GAP);
      fillRR(dx, y, DOT, DOT, 6, e.isW ? GREEN + '14' : RED + '14');
      strokeRR(dx, y, DOT, DOT, 6, col + 'aa', 1);
      ctx.fillStyle = col; ctx.font = '700 13px "Bebas Neue","Arial Black",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.isW ? 'W' : 'L', dx + DOT / 2, y + DOT / 2);
      if (hasPts) {
        const pts = Number(e.player?.pts) || 0;
        ctx.fillStyle = pts > 0 ? DIMMER : 'rgba(255,255,255,0.1)';
        ctx.font = '7px "JetBrains Mono","Courier New",monospace';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(pts > 0 ? pts : '–', dx + DOT / 2, y + DOT + 11);
      }
    });
    y += DOT + (hasPts ? 18 : 4) + 8;
  }

  // ── POSITION BREAKDOWN ───────────────────────────────────────
  if (posStats.length > 1) {
    divider(y); y += 20;
    sectionHeader('BY POSITION', y); y += 14;
    const pcw = (W - PAD * 2 - (posStats.length - 1) * 10) / posStats.length;
    posStats.forEach((ps, i) => {
      const px  = PAD + i * (pcw + 10);
      const wpc = wpColor(ps.winPct);
      fillRR(px, y, pcw, 52, 8, FAINT);
      strokeRR(px, y, pcw, 52, 8, wpc + '22');
      ctx.fillStyle = wpc; ctx.fillRect(px, y + 6, 3, 40);
      ctx.fillStyle = wpc; ctx.font = '700 18px "Bebas Neue","Arial Black",sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ps.pos, px + 12, y + 22);
      ctx.fillStyle = DIMMER; ctx.font = '8px "JetBrains Mono","Courier New",monospace';
      ctx.fillText(`${ps.n}G  ${ps.wins}W–${ps.losses}L  ${ps.ppg}pts`, px + 12, y + 36);
      gradBar(px + 12, y + 42, pcw - 70, 5, ps.winPct, wpc, 2);
      ctx.fillStyle = wpc; ctx.font = '700 12px "Bebas Neue","Arial Black",sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${ps.winPct}%`, px + pcw - 10, y + 36);
    });
    y += 62;
  }

  // ── TOP MODES ────────────────────────────────────────────────
  if (modeStats.length) {
    divider(y); y += 20;
    sectionHeader('TOP MODES', y); y += 14;
    const mcw = (W - PAD * 2 - (modeStats.length - 1) * 10) / modeStats.length;
    modeStats.forEach((ms, i) => {
      const mx  = PAD + i * (mcw + 10);
      const wpc = wpColor(ms.winPct);
      fillRR(mx, y, mcw, 52, 8, wpc + '0d');
      strokeRR(mx, y, mcw, 52, 8, wpc + '28');
      ctx.fillStyle = wpc; ctx.fillRect(mx, y + 6, 3, 40);
      ctx.fillStyle = '#fff'; ctx.font = '700 11px "Inter",Arial,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText((ms.mode || 'Unknown').slice(0, 22), mx + 12, y + 20);
      ctx.fillStyle = DIMMER; ctx.font = '8px "JetBrains Mono","Courier New",monospace';
      ctx.fillText(`${ms.n}G  ·  ${ms.wins}W–${ms.losses}L  ·  ${ms.ppg}pts`, mx + 12, y + 34);
      gradBar(mx + 12, y + 41, mcw - 68, 6, ms.winPct, wpc, 3);
      ctx.fillStyle = wpc; ctx.font = '700 15px "Bebas Neue","Arial Black",sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${ms.winPct}%`, mx + mcw - 10, y + 34);
    });
    y += 62;
  }

  // ── PLAYER BADGES ────────────────────────────────────────────
  if (badges.length) {
    divider(y); y += 20;
    sectionHeader('PLAYER BADGES', y); y += 14;
    const PILL_H = 26;
    ctx.font = '700 9px "Inter",Arial,sans-serif';
    let bx = PAD, by = y;
    const bdgColor = cls => ({
      'bdg-gold':'#f6c638','bdg-green':'#43d968','bdg-blue':'#4da6ff',
      'bdg-red':'#ff5a36','bdg-purple':'#c084fc','bdg-orange':'#ff8a65',
      'bdg-teal':'#22d3ee','bdg-yellow':'#fbbf24','bdg-gray':'rgba(255,255,255,0.3)',
    }[cls] || 'rgba(255,255,255,0.3)');
    badges.forEach(b => {
      const text = (b.icon ? b.icon + ' ' : '') + (b.zh || b.label || '').slice(0, 20);
      const tw = ctx.measureText(text).width;
      const bw = tw + 22;
      if (bx + bw > W - PAD) { bx = PAD; by += PILL_H + 7; }
      const bc = bdgColor(b.cls);
      fillRR(bx, by, bw, PILL_H, 13, bc + '1a');
      strokeRR(bx, by, bw, PILL_H, 13, bc + '55');
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 11, by + PILL_H / 2);
      bx += bw + 8;
    });
    y = by + PILL_H + 16;
  }

  // ── FOOTER ──────────────────────────────────────────────────
  const footY = y + 8;
  const fGrad = ctx.createLinearGradient(0, footY, W, footY);
  fGrad.addColorStop(0, RED + 'aa'); fGrad.addColorStop(0.5, '#0c0c10dd'); fGrad.addColorStop(1, BLUE + '55');
  ctx.fillStyle = fGrad; ctx.fillRect(0, footY, W, 40);
  // Footer shine
  const fShine = ctx.createLinearGradient(0, footY, 0, footY + 40);
  fShine.addColorStop(0, 'rgba(255,255,255,0.06)'); fShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fShine; ctx.fillRect(0, footY, W, 40);
  ctx.fillStyle = '#fff'; ctx.font = '700 12px "Bebas Neue","Arial Black",sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('2KBIGREDFLOWERS', PAD, footY + 20);
  ctx.fillStyle = DIMMER; ctx.font = '700 8px "JetBrains Mono","Courier New",monospace';
  ctx.textAlign = 'right';
  const totalGames = allAgg ? allAgg.n : 0;
  ctx.fillText(`NBA 2K26  ·  ${totalGames} games  ·  ${new Date().toLocaleDateString()}`, W - PAD, footY + 20);

  // ── Crop & export ─────────────────────────────────────────────
  const finalH = footY + 40;
  const out = document.createElement('canvas');
  out.width = W * 2; out.height = finalH * 2;
  out.getContext('2d').drawImage(canvas, 0, 0);

  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `${profile.primaryName.replace(/[^a-z0-9一-鿿]/gi, '_')}_card.png`;
  a.click();
  toast(`🖼️ ${profile.primaryName} 名片已生成`);
}

// ====================== AGGREGATE ======================
function aggregate(games) {
  return window.NBA2K26_GAME_ANALYSIS.aggregate(games);
}

function aggregateRoster(games, side) {
  return window.NBA2K26_GAME_ANALYSIS.aggregateRoster(games, side);
}

// ====================== OVERVIEW ======================
function renderOverview() {
  if (!window.NBA2K26_PERFORMANCE_LAB || !window.NBA2K26_PERFORMANCE_LAB.renderOverviewLab) {
    renderAccountBar('overview');
    const c = document.getElementById('overview-container');
    if (c) c.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('// performance lab module unavailable')}</div></div>`;
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
    return;
  }
  const result = window.NBA2K26_PERFORMANCE_LAB.renderOverviewLab({
    state,
    aggregate,
    renderAccountBar,
    compareRecentVsOverall,
    renderTrendPanel,
    escapeHtml,
    escapeAttr,
  });
  if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  return result;
}

// ====================== GLOBAL PLAYERS PAGE ======================
function renderPlayers() {
  renderAccountBar('players');
  const container = document.getElementById('players-container');
  if (!container) return;
  if (!window.NBA2K26_PLAYER_PROFILES) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('// player profiles module unavailable')}</div></div>`;
    return;
  }
  container.innerHTML = window.NBA2K26_PLAYER_PROFILES.renderPlayersPanel(
    state.players, state.games, { escapeHtml, t, onCardClick: 'openPlayerPage' }
  );
  switchPlayersView(state.playersView || 'directory', { updateRoute: false });
  if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
}

function switchPlayersView(view, options = {}) {
  const nextView = normalizePlayersView(view);
  state.playersView = nextView;
  const pc = document.getElementById('players-container');
  const ic = document.getElementById('intel-container');
  document.querySelectorAll('.pv-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pv === nextView);
  });
  if (nextView === 'intel') {
    if (pc) pc.style.display = 'none';
    if (ic) { ic.style.display = ''; renderOpponentIntel(); }
  } else {
    if (ic) ic.style.display = 'none';
    if (pc) pc.style.display = '';
  }
  if (options.updateRoute !== false && state.currentPage === 'players' && !window._historyNavInProgress && window.NBA2K26_PAGE_SHELL) {
    const route = { page: 'players', playersView: nextView };
    const hash = window.NBA2K26_PAGE_SHELL.routeHash(route);
    if (location.hash !== hash) history.pushState(route, '', hash);
  }
}
window.switchPlayersView = switchPlayersView;

function openPlayerPage(playerId) {
  // Clean up any previous scroll listener
  const prev = document.getElementById('player-page-container');
  if (prev && prev._ppScrollCleanup) { prev._ppScrollCleanup(); prev._ppScrollCleanup = null; }
  if (state.currentPlayerId !== playerId) {
    state.playerPageUi = { tab: 'overview', logSide: 'all', logResult: 'all', logSeason: 'all' };
  }
  state.currentPlayerId = playerId;
  showPage('player');
}

function renderPlayerPage() {
  renderAccountBar('player');
  const PP = window.NBA2K26_PLAYER_PROFILES;
  if (!PP || !state.currentPlayerId) return;
  const ui = getPlayerPageUiState();
  _logFilterSide = ui.logSide || 'all';
  _logFilterResult = ui.logResult || 'all';
  _logFilterSeason = ui.logSeason || 'all';
  PP.renderPlayerCard(state.currentPlayerId, state.players, state.games, { escapeHtml, t, mode: 'page' });
  applyPlayerPageUiState({ drawTrends: false });
  // Trends now live inside the Overview, so draw them once on render.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(drawPlayerTrends);
  if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
}

// ====================== GLOBAL GAMES PAGE ======================
function renderGames() {
  renderAccountBar('games');
  if (!window.NBA2K26_GLOBAL_GAMES) return;
  window.NBA2K26_GLOBAL_GAMES.renderAllGamesPage({ state, aggregate, t });
}

function filterAllGames() {
  if (window.NBA2K26_GLOBAL_GAMES) window.NBA2K26_GLOBAL_GAMES.filterAllGames();
}

function clearAllGamesFilters() {
  if (window.NBA2K26_GLOBAL_GAMES) window.NBA2K26_GLOBAL_GAMES.clearAllGamesFilters();
}

// Open a game for editing from the All Games page without navigating away
function openGameFromGlobalList(gameId, buildId) {
  state.currentBuildId = buildId;
  openGameDetail(gameId);
}

// Navigate to build detail and immediately open a new game record
function quickLogGame(buildId) {
  openBuildDetail(buildId);
  openGameModal(null);
}

// ====================== UTIL ======================
function escapeHtml(s) {
  return window.NBA2K26_UI_CORE.escapeHtml(s);
}
function escapeAttr(s) {
  return window.NBA2K26_UI_CORE.escapeAttr(s);
}

// ====================== CUSTOM CONFIRM ======================
function customConfirm(message, title = t('Confirm')) {
  return window.NBA2K26_UI_CORE.customConfirm(message, title);
}

// ====================== AUTO OVR ======================
function autoCalcOVR() {
  return window.NBA2K26_OVR_ESTIMATOR.autoCalcOVR({
    toast,
  });
}

// ====================== DATA EXPORT / IMPORT ======================
async function exportData() {
  return window.NBA2K26_DATA_PORTABILITY.exportData({
    state,
    toast,
    closeDataModal,
  });
}

async function exportGamesCsv() {
  return window.NBA2K26_DATA_PORTABILITY.exportGamesCsv({
    state,
    toast,
    closeDataModal,
    dateToSeason,
    currentSeason,
    seasons: NBA2K26_SEASONS,
  });
}

async function importData(file) {
  return window.NBA2K26_DATA_PORTABILITY.importData(file, {
    state,
    customConfirm,
    saveToStorage,
    loadData,
    renderBuilds,
    renderOverview,
    toast,
    closeDataModal,
  });
}

async function clearAllData() {
  return window.NBA2K26_DATA_PORTABILITY.clearAllData({
    state,
    customConfirm,
    deleteFromStorage,
    toast,
    closeDataModal,
    showPage,
  });
}

async function shareBuild(id) {
  return window.NBA2K26_DATA_PORTABILITY.shareBuild(id, {
    state,
    aggregate,
    toast,
  });
}

async function exportBuildCard(id) {
  if (!window.NBA2K26_SHARE_CARD) return toast(t('Share card module not loaded'), 'error');
  const build = state.builds.find(item => item.id === id);
  if (!build) return;
  const games = state.games.filter(g => g.buildId === id);
  const agg = aggregate(games);
  return window.NBA2K26_SHARE_CARD.downloadBuildCard(build, agg, games.length);
}

async function exportBuildReport(id) {
  return window.NBA2K26_DATA_PORTABILITY.exportBuildReport(id, {
    state,
    aggregate,
    aggregateRoster,
    compareRecentVsOverall,
    dateToSeason,
    currentSeason,
    seasons: NBA2K26_SEASONS,
    toast,
  });
}

async function exportSeasonReport() {
  return window.NBA2K26_DATA_PORTABILITY.exportSeasonReport({
    state,
    aggregate,
    aggregateRoster,
    compareRecentVsOverall,
    dateToSeason,
    currentSeason,
    seasons: NBA2K26_SEASONS,
    toast,
  });
}

async function shareGame(id) {
  return window.NBA2K26_DATA_PORTABILITY.shareGame(id, {
    state,
    toast,
  });
}

function openDataModal() {
  lockPageScroll();
  if (window.NBA2K26_DATA_PORTABILITY && window.NBA2K26_DATA_PORTABILITY.openDataModal) {
    return window.NBA2K26_DATA_PORTABILITY.openDataModal(state);
  }
  const stats = document.getElementById('data-stats');
  if (stats) {
    const bytes = JSON.stringify({ builds: state.builds, games: state.games }).length;
    stats.innerHTML = `
      Current database:<br>
      - ${state.builds.length} builds<br>
      - ${state.games.length} games<br>
      - Estimated size: ${Math.round(bytes / 1024)} KB
    `;
  }
  document.getElementById('data-modal')?.classList.add('active');
}

function closeDataModal() {
  unlockPageScroll();
  return window.NBA2K26_DATA_PORTABILITY.closeDataModal();
}

// ====================== DUPLICATE BUILD ======================
async function duplicateBuild(id) {
  return window.NBA2K26_BUILD_FORM.duplicateBuild(id, {
    state,
    saveToStorage,
    toast,
    renderBuilds,
  });
}

// ====================== CLOUD SYNC ======================
function openAccountModal() {
  lockPageScroll();
  document.getElementById('account-modal')?.classList.add('active');
  if (window.NBA2K26_CLOUD_SYNC && window.NBA2K26_CLOUD_SYNC.hydrateCloudPanel) {
    window.NBA2K26_CLOUD_SYNC.hydrateCloudPanel();
  }
}

function closeAccountModal() {
  unlockPageScroll();
  document.getElementById('account-modal')?.classList.remove('active');
}

function saveCloudConfig() {
  return window.NBA2K26_CLOUD_SYNC.configureFromInputs();
}

function cloudSignUp() {
  return window.NBA2K26_CLOUD_SYNC.signUp();
}

function cloudSignIn() {
  return window.NBA2K26_CLOUD_SYNC.signIn();
}

function cloudSignOut() {
  return window.NBA2K26_CLOUD_SYNC.signOut();
}

function pushLocalToCloud() {
  return window.NBA2K26_CLOUD_SYNC.pushLocal();
}

function pullCloudToLocal() {
  return window.NBA2K26_CLOUD_SYNC.pullCloud({ reload: true });
}

function cloudSyncNow() {
  return window.NBA2K26_CLOUD_SYNC.syncNow();
}

Object.assign(window, {
  openAccountModal,
  closeAccountModal,
  saveCloudConfig,
  cloudSignUp,
  cloudSignIn,
  cloudSignOut,
  pushLocalToCloud,
  pullCloudToLocal,
  cloudSyncNow,
});

// ====================== TREND COMPARISON ======================
function compareRecentVsOverall(games, recentN = 5) {
  return window.NBA2K26_GAME_ANALYSIS.compareRecentVsOverall(games, recentN);
}

function trendArrow(curr, prev) {
  return window.NBA2K26_GAME_ANALYSIS.trendArrow(curr, prev);
}

async function bootstrapApp() {
  await window.NBA2K26_APP_BOOTSTRAP.bootstrapApp({
    setupGlobalUi,
    setupPageShell,
    setupBuildTabs,
    loadData,
    openDataModal,
    importData,
  });
  restorePageFromHash();
}

function replaceRouteState(page, buildId, playerId) {
  const route = typeof page === 'object' && page !== null
    ? { ...page }
    : { page, buildId: buildId || undefined, playerId: playerId || undefined };
  const hash = window.NBA2K26_PAGE_SHELL.routeHash(route);
  history.replaceState(route, '', hash);
}

function restorePageFromHash() {
  const route = window.NBA2K26_PAGE_SHELL.routeFromHash(location.hash);
  if (route.page === 'builds' || route.page === 'players' || route.page === 'games' || route.page === 'overview' || route.page === 'quality' || route.page === 'compare') {
    replaceRouteState(route);
    showPage(route);
    return;
  }
  if (route.page === 'detail') {
    const id = route.buildId;
    if (id && state.builds.find(b => b.id === id)) {
      replaceRouteState('detail', id);
      openBuildDetail(id);
      return;
    }
  } else if (route.page === 'player') {
    const id = route.playerId;
    if (id && state.players.find(p => p.id === id)) {
      replaceRouteState('player', null, id);
      openPlayerPage(id);
      return;
    }
  }
  replaceRouteState('overview');
  showPage('overview');
}

function setupGlobalUi() {
  return window.NBA2K26_UI_CORE.setupGlobalUi({
    closeBuildModal: () => closeBuildModal(),
    closeGameModal: () => closeGameModal(),
    closeOCRModal: () => closeOCRModal(),
    closeAccountModal: () => closeAccountModal(),
    closeDataModal: () => closeDataModal(),
    saveBuild: () => saveBuild(),
    saveGame: () => saveGame(),
    openDataModal: () => openDataModal(),
    openAccountModal: () => openAccountModal(),
    openBuildModal: () => openBuildModal(),
    openGameModal: () => openGameModal(),
    saveCloudConfig: () => saveCloudConfig(),
    cloudSignUp: () => cloudSignUp(),
    cloudSignIn: () => cloudSignIn(),
    cloudSignOut: () => cloudSignOut(),
    pushLocalToCloud: () => pushLocalToCloud(),
    pullCloudToLocal: () => pullCloudToLocal(),
    cloudSyncNow: () => cloudSyncNow(),
  });
}

// === Theme Toggle ===
function initTheme() {
  return window.NBA2K26_UI_CORE.initTheme();
}
function toggleTheme() {
  return window.NBA2K26_UI_CORE.toggleTheme();
}
function updateThemeIcon(theme) {
  return window.NBA2K26_UI_CORE.updateThemeIcon(theme);
}

// OCR parser and image processing helpers live in sidecar modules.
// Scout report rendering and player comparison helpers live in nba2k26-scout-report.js.
