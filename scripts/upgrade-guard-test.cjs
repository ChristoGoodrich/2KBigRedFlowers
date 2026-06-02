const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'nba2k26-build-tracker.html');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function localFile(ref) {
  return ref.replace(/^\.\//, '');
}

function checkCssVariables() {
  const cssFiles = fs.readdirSync(root).filter(file => file.endsWith('.css'));
  const defined = new Set();
  const missing = [];

  for (const file of cssFiles) {
    const css = read(file);
    for (const match of css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) {
      defined.add(match[1]);
    }
  }

  for (const file of cssFiles) {
    const css = read(file);
    for (const match of css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
      const name = match[1];
      const hasFallback = match[2] === ',';
      if (!defined.has(name) && !hasFallback) missing.push(`${file}:${name}`);
    }
  }

  assert(missing.length === 0, `Missing CSS custom property definitions: ${missing.join(', ')}`);
  return { cssFiles: cssFiles.length, vars: defined.size };
}

function checkMobileLightTheme() {
  const css = read('nba2k26-premium.css').replace(/\r\n/g, '\n');
  const labSkinIndex = css.indexOf('/* 2KLab reference dashboard skin */');
  const lightGuardIndex = css.indexOf('/* Keep the late 2KLab skin readable when the resolved system theme is light. */');
  assert(labSkinIndex > -1, '2KLab dashboard skin marker is missing');
  assert(lightGuardIndex > labSkinIndex, 'Light-theme guard must load after the late 2KLab dashboard skin');

  const guard = css.slice(lightGuardIndex);
  const required = [
    '--premium-bg-0: #f6f3ed;',
    '--premium-text: #171512;',
    '--text: var(--premium-text);',
    '[data-theme="light"] body {',
    '[data-theme="light"] .header {',
    '[data-theme="light"] .account-bar-wrap {',
    '@media (max-width: 560px) {',
    'overflow: visible;',
    'gap: 2px;\n    overflow: visible;',
    'padding-inline: 8px;',
    '[data-theme="light"] .mobile-tab-bar {',
    '[data-theme="light"] .mobile-more-sheet,',
  ];
  required.forEach(rule => assert(guard.includes(rule), `Mobile light-theme guard is missing: ${rule}`));
  return { rules: required.length };
}

function checkMobileNativeTheme() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = read('nba2k26-mobile.css').replace(/\r\n/g, '\n');
  const pageShell = read('nba2k26-page-shell.js');
  const required = [
    '.mobile-app-head,',
    '.mobile-first-run-summary,',
    '.mobile-first-run-title {',
    '@media (max-width: 820px) {',
    '.page-header,',
    '.mobile-first-run-summary {',
    '.first-run-actions {',
    '#all-games-table .gp-row {',
    '[data-theme="light"] body {',
    'background: #f5f7fa;',
    '[data-theme="light"] .mobile-tab-btn.active {',
  ];
  assert(html.includes('href="./nba2k26-mobile.css"'), 'Mobile stylesheet must load after the premium desktop skin');
  assert(html.includes('id="mobile-app-title"'), 'Mobile page title is missing');
  assert(pageShell.includes('function updateMobileTitle(page)'), 'Mobile page title updater is missing');
  required.forEach(rule => assert(css.includes(rule), `Native mobile theme is missing: ${rule}`));
  return { rules: required.length };
}

function checkMobileBottomTabs() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = read('nba2k26-premium.css');
  const pageShell = read('nba2k26-page-shell.js');
  const uiCore = read('nba2k26-ui-core.js');
  const requiredIds = [
    'mobile-sheet-backdrop',
    'mobile-more-sheet',
    'mobile-more-close',
    'mobile-more-account',
    'mobile-more-settings',
    'mobile-tab-more',
    'settings-menu-close',
  ];
  requiredIds.forEach(id => assert(html.includes(`id="${id}"`), `Mobile navigation is missing #${id}`));

  const cssRules = [
    '.mobile-tab-bar {',
    'grid-template-columns: repeat(5, minmax(0, 1fr));',
    'bottom: calc(76px + env(safe-area-inset-bottom, 0px));',
    'position: static;\n    min-height: 0;\n    height: 0;',
    '.header .logo {\n    display: none;',
    '-webkit-backdrop-filter: none !important;',
    '.account-bar-wrap {\n    display: none;',
    '.modal-overlay {\n    z-index: 250;',
  ];
  cssRules.forEach(rule => assert(css.includes(rule), `Mobile navigation CSS is missing: ${rule}`));
  assert(pageShell.includes('window.closeMobileMoreMenu'), 'Mobile more menu close bridge is missing');
  assert(pageShell.includes("mobileMore.classList.toggle('active', navPage === 'quality' || navPage === 'compare')"), 'Overflow page state must highlight More');
  assert(uiCore.includes("const mobileBackdrop = document.getElementById('mobile-sheet-backdrop')"), 'Mobile settings drawer must share the backdrop');
  return { tabs: 5, overflowItems: 4 };
}

function checkAccountCenter() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const templates = read('nba2k26-system-templates.js');
  const htmlTemplates = read('nba2k26-html-templates.js');
  const uiCore = read('nba2k26-ui-core.js');
  const cloudSync = read('nba2k26-cloud-sync.js');
  const dataMenuStart = templates.indexOf('registry.dataMenuModal');
  const accountCenterStart = templates.indexOf('registry.accountCenterModal');
  const dataMenu = templates.slice(dataMenuStart, accountCenterStart);
  const accountCenter = templates.slice(accountCenterStart);

  assert(html.includes('id="settings-account"'), 'Settings menu is missing the standalone account entry');
  assert(html.includes('data-template-slot="account-center-modal"'), 'Account center template slot is missing');
  assert(htmlTemplates.includes("['account-center-modal', 'accountCenterModal']"), 'Account center template is not injected');
  assert(!dataMenu.includes('cloud-sync-panel'), 'Data Backup must not contain cloud account controls');
  [
    'id="account-modal"',
    'id="cloud-auth-form"',
    'id="cloud-session-panel"',
    'id="cloud-account-chip"',
    'data-cloud-auth-action',
    'data-cloud-session-action',
  ].forEach(rule => assert(accountCenter.includes(rule), `Account center is missing: ${rule}`));
  assert(uiCore.includes("if (item.id === 'settings-account')"), 'Settings account entry is not wired');
  assert(cloudSync.includes("authForm.hidden = status.signedIn"), 'Account center must hide auth form after sign-in');
  assert(cloudSync.includes("sessionPanel.hidden = !status.signedIn"), 'Account center must show session panel after sign-in');
  return { states: 2 };
}

function checkPwaAssets() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const htmlRefs = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)]
    .map(match => match[1]);
  const manifest = JSON.parse(read('manifest.json'));
  const manifestRefs = [
    manifest.start_url,
    ...(manifest.icons || []).map(icon => icon.src),
  ].filter(Boolean);
  const requiredRefs = new Set(['./nba2k26-build-tracker.html', ...htmlRefs, ...manifestRefs]);

  for (const ref of requiredRefs) {
    assert(fs.existsSync(path.join(root, localFile(ref))), `Referenced asset is missing: ${ref}`);
  }

  const sw = read('sw.js');
  const staticBlock = sw.match(/const STATIC = \[([\s\S]*?)\];/);
  assert(staticBlock, 'Service worker STATIC list not found');
  const staticRefs = new Set([...staticBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]));

  for (const ref of requiredRefs) {
    assert(staticRefs.has(ref), `Service worker STATIC is missing ${ref}`);
  }
  for (const ref of staticRefs) {
    assert(fs.existsSync(path.join(root, localFile(ref))), `Service worker STATIC asset is missing on disk: ${ref}`);
  }

  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert(
    scripts.indexOf('./nba2k26-player-profile-core.js') > -1 &&
      scripts.indexOf('./nba2k26-player-profile-core.js') < scripts.indexOf('./nba2k26-player-profiles.js'),
    'Player profile core must load before player profiles'
  );

  return { requiredRefs: requiredRefs.size, staticRefs: staticRefs.size };
}

function checkRoutes() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('nba2k26-page-shell.js'), context, { filename: 'nba2k26-page-shell.js' });
  const shell = context.window.NBA2K26_PAGE_SHELL;
  assert(shell, 'Page shell export missing');

  const cases = [
    ['#overview', { page: 'overview' }],
    ['#builds', { page: 'builds' }],
    ['#players', { page: 'players' }],
    ['#games', { page: 'games' }],
    ['#quality', { page: 'quality' }],
    ['#compare', { page: 'compare' }],
    ['#intel', { page: 'players', playersView: 'intel' }],
    ['#detail/build-1', { page: 'detail', buildId: 'build-1' }],
    ['#player/player-1', { page: 'player', playerId: 'player-1' }],
    ['', { page: 'overview' }],
  ];

  cases.forEach(([hash, expected]) => {
    const actual = shell.routeFromHash(hash);
    Object.keys(expected).forEach(key => {
      assert(actual[key] === expected[key], `routeFromHash(${hash}) expected ${key}=${expected[key]}, got ${actual[key]}`);
    });
  });
  assert(shell.routeHash({ page: 'detail', buildId: 'build-1' }) === '#detail/build-1', 'detail route hash failed');
  assert(shell.routeHash({ page: 'player', playerId: 'player-1' }) === '#player/player-1', 'player route hash failed');
  assert(shell.routeHash({ page: 'players', playersView: 'intel' }) === '#intel', 'intel route hash failed');
  assert(shell.routeHash({ page: 'players', playersView: 'directory' }) === '#players', 'players directory route hash failed');
  const compareRoute = shell.routeFromHash('#compare/build-1,build-2');
  assert(compareRoute.page === 'compare', 'compare route page failed');
  assert(Array.isArray(compareRoute.compareIds), 'compare route ids missing');
  assert(compareRoute.compareIds.join(',') === 'build-1,build-2', 'compare route ids failed');
  assert(shell.routeHash({ page: 'compare', compareIds: ['build-1', 'build-2'] }) === '#compare/build-1,build-2', 'compare route hash failed');
  assert(shell.routeHash({ page: 'compare', compareIds: [] }) === '#compare', 'empty compare route hash failed');
  assert(read('nba2k26-cloud-sync.js').includes('routeFromHash(location.hash)'), 'Cloud reload must restore from routeFromHash(location.hash)');

  return { routes: cases.length };
}

function checkPlayersSubviewRouting() {
  const appGlobals = read('nba2k26-app-globals.js');
  const pageShell = read('nba2k26-page-shell.js');
  const cloudSync = read('nba2k26-cloud-sync.js');

  assert(appGlobals.includes("playersView: 'directory'"), 'Players subview state is missing');
  assert(appGlobals.includes('function normalizePlayersView'), 'Players subview normalizer is missing');
  assert(appGlobals.includes("switchPlayersView(state.playersView || 'directory'"), 'Players render must respect saved subview');
  assert(appGlobals.includes("const route = { page: 'players', playersView: nextView }"), 'Players tab switch must write a route-aware state');
  assert(pageShell.includes('showPage(s);'), 'Browser history popstate must preserve route details');
  assert(cloudSync.includes('window.showPage(route.page ? route'), 'Cloud reload must preserve route details');

  return { subviews: 2 };
}

function checkCompareRouting() {
  const appGlobals = read('nba2k26-app-globals.js');
  const pageShell = read('nba2k26-page-shell.js');
  const cloudSync = read('nba2k26-cloud-sync.js');

  assert(pageShell.includes("value.startsWith('compare/')"), 'Compare deep-link route parser is missing');
  assert(pageShell.includes("route.page === 'compare'"), 'Compare route hash branch is missing');
  assert(appGlobals.includes('function normalizeCompareIds'), 'Compare route normalizer is missing');
  assert(appGlobals.includes('function syncCompareRoute'), 'Compare route sync helper is missing');
  assert(appGlobals.includes("targetPage === 'compare' && Object.prototype.hasOwnProperty.call(route, 'compareIds')"), 'Compare route must restore selected builds');
  assert(appGlobals.includes("compareIds: targetPage === 'compare' ? compareIdsForRoute() : undefined"), 'Compare history state must include selected builds');
  assert(appGlobals.includes('syncCompareRoute();'), 'Compare selector changes must sync route');
  assert(cloudSync.includes('window.showPage(route.page ? route'), 'Cloud reload must pass route details to showPage');

  return { compareRoutes: 2 };
}

function sampleAggregate(games) {
  const wins = games.filter(game => game.result === 'W').length;
  const losses = games.filter(game => game.result === 'L').length;
  const sum = key => games.reduce((total, game) => total + (Number(game[key]) || 0), 0);
  const avg = key => games.length ? (sum(key) / games.length).toFixed(1) : '0.0';
  const fgm = sum('fg2m') + sum('fg3m');
  const fga = sum('fg2a') + sum('fg3a');
  return {
    wins,
    losses,
    winPct: games.length ? ((wins / games.length) * 100).toFixed(0) : '0',
    ppg: avg('pts'),
    rpg: avg('reb'),
    apg: avg('ast'),
    topg: avg('to'),
    plusMinus: avg('pm'),
    fgPct: fga ? ((fgm / fga) * 100).toFixed(1) : '0.0',
    fg3Pct: sum('fg3a') ? ((sum('fg3m') / sum('fg3a')) * 100).toFixed(1) : '0.0',
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function checkContextBarLogic() {
  const context = vm.createContext({
    window: {
      NBA2K26_GAME_ANALYSIS: {
        compareGamesByChronology: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
      },
    },
    t: value => value,
  });
  vm.runInContext(read('nba2k26-render-modules.js'), context, { filename: 'nba2k26-render-modules.js' });
  const render = context.window.NBA2K26_RENDER;
  assert(render && render.accountBarHtml, 'Render account bar export missing');

  const state = {
    builds: [
      { id: 'b1', name: 'Floor General', position: 'PG', ovr: 92, archetype: '2-Way Playmaker' },
      { id: 'b2', name: 'Paint Anchor', position: 'C', ovr: 88, archetype: 'Glass Cleaner' },
    ],
    games: [
      {
        id: 'g1',
        buildId: 'b1',
        result: 'W',
        mode: 'Rec',
        date: '2026-05-20',
        pts: 24,
        reb: 6,
        ast: 11,
        pm: 14,
        roster: {
          teammates: [{ name: 'Alpha' }],
          opponents: [{ name: 'Beta' }],
        },
      },
    ],
    players: [{ id: 'p1', primaryName: 'Alpha' }],
    compareIds: ['b1', 'b2'],
    currentBuildId: 'b1',
  };
  const renderPage = page => render.accountBarHtml({ state, aggregate: sampleAggregate, escapeHtml, page });

  const players = renderPage('players');
  assert(players.includes('PLAYER DIRECTORY'), 'Players context kicker missing');
  assert(players.includes('Player Directory'), 'Players context title missing');
  assert(players.includes('Open Intel'), 'Players primary action should open intel when roster data exists');

  const games = renderPage('games');
  assert(games.includes('GAME LOG'), 'Games context kicker missing');
  assert(games.includes('All Games'), 'Games context title missing');
  assert(games.includes('Record Game'), 'Games primary action should record a game');

  const compare = renderPage('compare');
  assert(compare.includes('COMPARE VIEW'), 'Compare context kicker missing');
  assert(compare.includes('Build Compare'), 'Compare context title missing');
  assert(compare.includes('COMPARE SLOTS'), 'Compare metric cards missing');

  const builds = renderPage('builds');
  assert(builds.includes('BUILD LIBRARY'), 'Builds context kicker missing');
  assert(builds.includes('New Build'), 'Builds primary action regressed');

  return { pages: 4 };
}

function checkActionableEmptyStates() {
  const gamesJs = read('nba2k26-global-games.js');
  const compareJs = read('nba2k26-build-compare.js');
  assert(gamesJs.includes('No games recorded yet') && gamesJs.includes('quickLogGame'), 'Games empty state must offer a next action');
  assert(compareJs.includes('Select two builds to compare') && compareJs.includes('Open Build Library'), 'Compare empty state must guide the next action');
  return { states: 2 };
}

function checkPlayerRendering() {
  const context = vm.createContext({
    window: {},
    localStorage: { getItem: () => 'en' },
  });
  context.window.localStorage = context.localStorage;
  vm.runInContext(read('nba2k26-player-profile-core.js'), context, { filename: 'nba2k26-player-profile-core.js' });
  vm.runInContext(read('nba2k26-player-profiles.js'), context, { filename: 'nba2k26-player-profiles.js' });

  const profiles = [{ id: 'p_alpha', primaryName: 'Alpha', aliases: ['Alpha', 'A1'], notes: '', createdAt: '2026-05-01' }];
  const games = [{
    id: 'g1',
    buildId: 'b1',
    result: 'W',
    mode: 'Rec',
    date: '2026-05-20',
    roster: {
      teammates: [{ name: 'Alpha', position: 'PG', pts: 31, reb: 4, ast: 9, fgm: 12, fga: 20, fg3m: 4, fg3a: 8, ftm: 3, fta: 3, grade: 'A' }],
      opponents: [{ name: 'Beta', position: 'SG', pts: 18, reb: 2, ast: 5 }],
    },
  }];
  const html = context.window.NBA2K26_PLAYER_PROFILES.renderPlayersPanel(profiles, games, {
    escapeHtml: context.window.NBA2K26_PLAYER_PROFILE_CORE.esc,
    t: value => value,
  });

  assert(html.includes('player-card'), 'Player card did not render');
  assert(html.includes('Alpha'), 'Player name missing from card');
  assert(html.includes('31.0') && html.includes('PPG'), 'Player stat summary missing from card');
  assert(html.includes('data-total="1"'), 'Player appearance count missing from card');

  return { cards: 1 };
}

class ClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.dataset = {};
    this.disabled = false;
    this.classList = new ClassList();
    this.listeners = {};
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatchEvent(event) { this.lastEvent = event.type; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  insertAdjacentHTML(_where, html) { this.innerHTML += html; }
}

class FakeDocument {
  constructor() {
    this.byId = new Map();
    this.documentElement = new FakeElement('html');
    this.body = new FakeElement('body');
  }
  getElementById(id) {
    if (!this.byId.has(id)) this.byId.set(id, new FakeElement(id));
    return this.byId.get(id);
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  addEventListener() {}
  createElement() { return new FakeElement(); }
}

function checkGlobalGamesFilterPersistence() {
  const document = new FakeDocument();
  const context = vm.createContext({
    document,
    window: {
      NBA2K26_GAME_ANALYSIS: {
        compareGamesByChronology: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
      },
    },
    t: value => value,
  });
  vm.runInContext(read('nba2k26-global-games.js'), context, { filename: 'nba2k26-global-games.js' });
  assert(context.window.NBA2K26_GLOBAL_GAMES, 'Global games module export missing');

  document.getElementById('gp-filter-result').value = 'W';
  document.getElementById('gp-filter-mode').value = 'Rec';
  document.getElementById('gp-filter-build').value = 'b1';
  document.getElementById('gp-filter-search').value = 'Alpha';

  const state = {
    allGamesFilter: { result: 'W', mode: 'Rec', build: 'b1', search: 'Alpha', sortKey: 'pts', sortDir: 'asc' },
    builds: [{ id: 'b1', name: 'Alpha Build' }, { id: 'b2', name: 'Beta Build' }],
    games: [
      { id: 'g1', buildId: 'b1', result: 'W', mode: 'Rec', date: '2026-05-20', pts: 30, reb: 5, ast: 8 },
      { id: 'g2', buildId: 'b2', result: 'L', mode: 'Park', date: '2026-05-19', pts: 12, reb: 2, ast: 3 },
    ],
  };

  context.window.NBA2K26_GLOBAL_GAMES.renderAllGamesPage({ state, aggregate: sampleAggregate, t: value => value });
  const html = document.getElementById('all-games-container').innerHTML;
  assert(html.includes('<option value="W" selected'), 'All Games result filter did not render selected state');
  assert(html.includes('<option value="Rec" selected'), 'All Games mode filter did not render selected state');
  assert(html.includes('<option value="b1" selected'), 'All Games build filter did not render selected state');
  assert(html.includes('value="Alpha"'), 'All Games search filter did not render saved query');
  assert(html.includes('class="gp-sortable asc" data-sort-key="pts"'), 'All Games saved sort state did not render');
  assert(html.includes('Clear Filters'), 'All Games clear filter action missing');
  assert(state.allGamesFilter.result === 'W' && state.allGamesFilter.sortKey === 'pts', 'All Games filter state was not preserved after render');

  context.window.NBA2K26_GLOBAL_GAMES.clearAllGamesFilters();
  assert(state.allGamesFilter.result === 'All', 'All Games clear filters did not reset result');
  assert(state.allGamesFilter.sortKey === 'date' && state.allGamesFilter.sortDir === 'desc', 'All Games clear filters did not reset sort');

  return { filters: 4 };
}

function checkPlayerPageUiPersistence() {
  const appGlobals = read('nba2k26-app-globals.js');
  const playerProfiles = read('nba2k26-player-profiles.js');

  assert(appGlobals.includes('playerPageUi:'), 'Player page UI state is missing');
  assert(appGlobals.includes('function defaultPlayerPageUi'), 'Player page default UI helper is missing');
  assert(appGlobals.includes('function getPlayerPageUiState'), 'Player page UI state helper is missing');
  assert(appGlobals.includes('function applyPlayerPageUiState'), 'Player page UI apply helper is missing');
  assert(appGlobals.includes('function switchPlayerTab(tabId, options = {})'), 'Player page tab switch must accept options');
  assert(appGlobals.includes('function filterGameLog(btn, filterType, value, options = {})'), 'Player log filter must accept options');
  assert(appGlobals.includes('applyPlayerPageUiState({ drawTrends: false });'), 'Player page render must restore saved UI state');
  assert(appGlobals.includes("state.playerPageUi = { tab: 'overview', logSide: 'all', logResult: 'all', logSeason: 'all' };"), 'Opening a different player must reset player page UI state');
  assert(appGlobals.includes("_logFilterSeason = 'all';"), 'Fresh overlay player card must reset season filter');
  assert(playerProfiles.includes('data-log-value="tm"'), 'Player log side filter buttons must expose values');
  assert(playerProfiles.includes('data-log-value="W"'), 'Player log result filter buttons must expose values');
  assert(playerProfiles.includes('data-log-value="${s.n}"'), 'Player log season filter buttons must expose values');

  return { states: 4 };
}

function checkOcrApply() {
  const document = new FakeDocument();
  const localStore = new Map();
  const context = vm.createContext({
    console,
    document,
    window: {},
    localStorage: {
      getItem: key => localStore.get(key) || null,
      setItem: (key, value) => localStore.set(key, String(value)),
      removeItem: key => localStore.delete(key),
    },
    location: { hostname: '127.0.0.1', protocol: 'http:' },
    Event: class { constructor(type) { this.type = type; } },
    Image: class {},
    URL: { revokeObjectURL() {}, createObjectURL: () => 'blob:upgrade-guard' },
    Blob: class {},
    t: value => value,
    escapeHtml: value => String(value ?? ''),
    toast: message => { context.lastToast = message; },
  });
  context.window = context;
  context.window.top = context.window;
  context.window.NBA2K26_GAME_FORM = { refreshGameModalPreview: () => { context.previewRefreshed = true; } };

  [
    'ocr-file', 'ocr-modal', 'ocr-img', 'ocr-status', 'ocr-tips', 'ocr-confirm-btn', 'ocr-result-area',
    'ocr-result-grid', 'ocr-audit-summary', 'ocr-confidence-badge', 'ocr-strategy-badge', 'ocr-apply-status',
    'g-pts', 'g-reb', 'g-ast', 'g-score-own', 'g-score-opp', 'g-grade', 'g-result', 'g-date', 'g-mode',
    'g-opponent', 'g-teammate',
  ].forEach(id => document.getElementById(id));

  vm.runInContext(read('nba2k26-ocr-parser.js'), context, { filename: 'nba2k26-ocr-parser.js' });
  vm.runInContext(read('nba2k26-ocr.js'), context, { filename: 'nba2k26-ocr.js' });
  assert(context.window.NBA2K26_OCR, 'OCR module export missing');

  const makeInput = (field, value) => {
    const el = new FakeElement();
    el.dataset.field = field;
    el.value = String(value);
    return el;
  };
  const grid = document.getElementById('ocr-result-grid');
  grid.querySelectorAll = selector => selector === 'input[data-field], select[data-field]'
    ? [
        makeInput('g-pts', 24),
        makeInput('g-reb', 8),
        makeInput('g-score-own', 82),
        makeInput('g-score-opp', 75),
      ]
    : [];
  grid.querySelector = () => null;

  context.window.NBA2K26_OCR.pendingResult = {
    strategy: 'upgrade-guard',
    values: {
      'g-pts': 24,
      'g-reb': 8,
      'g-score-own': 82,
      'g-score-opp': 75,
      'g-result': 'W',
      'g-grade': 'A',
    },
    warnings: [{ fieldIds: ['g-score-own'], message: 'verify scoreboard' }],
  };

  const count = context.window.NBA2K26_OCR.applyStaged();
  assert(count >= 6, `OCR apply filled too few fields: ${count}`);
  assert(document.getElementById('g-pts').value === '24', 'OCR did not apply points');
  assert(document.getElementById('g-result').value === 'W', 'OCR did not apply result');
  assert(document.getElementById('ocr-apply-status').innerHTML.includes('upgrade-guard'), 'OCR apply status missing strategy');
  assert(context.previewRefreshed, 'OCR apply did not refresh game modal preview');

  return { applied: count };
}

function checkSeoMeta() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const required = [
    /<meta\s+name="description"\s+content="[^"]+"/i,
    /<meta\s+property="og:title"\s+content="[^"]+"/i,
    /<meta\s+property="og:description"\s+content="[^"]+"/i,
    /<meta\s+property="og:image"\s+content="\.\/og-image\.png"/i,
    /<meta\s+name="twitter:card"\s+content="summary_large_image"/i,
    /<meta\s+name="twitter:image"\s+content="\.\/og-image\.png"/i,
  ];
  required.forEach(re => assert(re.test(html), `SEO/social meta missing or malformed: ${re}`));
  assert(fs.existsSync(path.join(root, 'og-image.png')), 'og-image.png share card is missing');
  return { tags: required.length };
}

const results = {
  css: checkCssVariables(),
  mobileTheme: checkMobileLightTheme(),
  mobileNative: checkMobileNativeTheme(),
  mobileTabs: checkMobileBottomTabs(),
  accountCenter: checkAccountCenter(),
  assets: checkPwaAssets(),
  seo: checkSeoMeta(),
  routes: checkRoutes(),
  playersSubview: checkPlayersSubviewRouting(),
  compareRouting: checkCompareRouting(),
  contextBar: checkContextBarLogic(),
  emptyStates: checkActionableEmptyStates(),
  globalGames: checkGlobalGamesFilterPersistence(),
  playerPageUi: checkPlayerPageUiPersistence(),
  players: checkPlayerRendering(),
  ocrApply: checkOcrApply(),
};

console.log(
  `upgrade guards ok: css ${results.css.cssFiles} files/${results.css.vars} vars, ` +
  `${results.mobileTheme.rules} mobile light-theme rules, ` +
  `${results.mobileNative.rules} native mobile rules, ` +
  `${results.mobileTabs.tabs} mobile tabs/${results.mobileTabs.overflowItems} overflow items, ` +
  `${results.accountCenter.states} account states, ` +
  `${results.assets.requiredRefs} required asset refs, ${results.assets.staticRefs} sw refs, ` +
  `${results.routes.routes} routes, ${results.playersSubview.subviews} player subviews, ` +
  `${results.compareRouting.compareRoutes} compare routes, ${results.contextBar.pages} context pages, ` +
  `${results.emptyStates.states} empty states, ${results.globalGames.filters} game filters, ` +
  `${results.playerPageUi.states} player page states, ${results.players.cards} player card, ${results.ocrApply.applied} OCR fields, ` +
  `${results.seo.tags} seo/social tags`
);
