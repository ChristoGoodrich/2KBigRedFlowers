const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

class ClassList {
  constructor(owner) {
    this.owner = owner;
    this.set = new Set();
  }
  add(...names) { names.forEach(name => this.set.add(name)); }
  remove(...names) { names.forEach(name => this.set.delete(name)); }
  contains(name) { return this.set.has(name); }
  toggle(name, force) {
    const next = force == null ? !this.set.has(name) : !!force;
    if (next) this.set.add(name);
    else this.set.delete(name);
    return next;
  }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.disabled = false;
    this.children = [];
    this.classList = new ClassList(this);
    this.listeners = {};
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatchEvent(event) {
    const handler = this.listeners[event.type];
    if (handler) handler(event);
  }
  setAttribute(name, value) { this[name] = String(value); }
  getAttribute(name) { return this[name]; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); }
  click() { this.clicked = true; }
  closest(selector) {
    if (selector === '.attr-row') return this.attrRow || null;
    if (selector === '.settings-item') return this.settingsItem || null;
    if (selector === '.roster-row') return this.rosterRow || null;
    return null;
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  insertAdjacentHTML() {}
  contains() { return false; }
}

class FakeDocument {
  constructor() {
    this.byId = new Map();
    this.body = new FakeElement('body');
    this.documentElement = new FakeElement('html');
    this.readyState = 'complete';
    this.gameTabs = ['main', 'teammates', 'opponents', 'media'].map(tab => {
      const button = new FakeElement();
      button.dataset.gameTab = tab;
      button.textContent = tab;
      if (tab === 'main') button.classList.add('active');
      return button;
    });
    this.gamePanels = ['main', 'teammates', 'opponents', 'media'].map(tab => {
      const panel = new FakeElement();
      panel.dataset.gameTabPanel = tab;
      if (tab === 'main') panel.classList.add('active');
      return panel;
    });
    this.themeButtons = ['system', 'dark', 'light'].map(mode => {
      const button = new FakeElement();
      button.dataset.themeMode = mode;
      button.textContent = mode;
      return button;
    });
    this.langButtons = ['zh', 'en'].map(lang => {
      const button = new FakeElement();
      button.dataset.lang = lang;
      button.textContent = lang;
      return button;
    });
    this.ocrEngineTabs = ['zhipu', 'tesseract'].map(engine => {
      const button = new FakeElement();
      button.dataset.engine = engine;
      button.textContent = engine;
      return button;
    });
    this.ocrEntries = [new FakeElement()];
  }
  getElementById(id) {
    if (!this.byId.has(id)) this.byId.set(id, new FakeElement(id));
    return this.byId.get(id);
  }
  querySelector(selector) {
    if (selector === '[data-game-tab].active') {
      return this.gameTabs.find(tab => tab.classList.contains('active')) || null;
    }
    const gameTab = selector.match(/^\[data-game-tab="([^"]+)"\]$/);
    if (gameTab) return this.gameTabs.find(tab => tab.dataset.gameTab === gameTab[1]) || null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === '[data-game-tab]') return this.gameTabs;
    if (selector === '[data-game-tab-panel]') return this.gamePanels;
    if (selector === '.attr-input') return [];
    if (selector === '.build-tab' || selector === '.build-tab-pane') return [];
    if (selector === '.game-form-watch') return [];
    if (selector === '.roster-row') return [];
    if (selector === '.theme-choice-btn') return this.themeButtons;
    if (selector === '.lang-choice-btn') return this.langButtons;
    if (selector === '.ocr-engine-tab') return this.ocrEngineTabs;
    if (selector === '.ocr-entry') return this.ocrEntries;
    if (selector === '.modal-overlay') return [];
    return [];
  }
  createElement(id) { return new FakeElement(id); }
  addEventListener() {}
}

function loadScript(context, file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const document = new FakeDocument();
const localStore = new Map();
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Event: class { constructor(type) { this.type = type; } },
  Blob: class { constructor(parts) { this.parts = parts; } },
  URL: { createObjectURL: () => 'blob:flow-smoke', revokeObjectURL() {} },
  Image: class {},
  FileReader: class {},
  location: { hostname: '127.0.0.1', href: 'http://127.0.0.1/flow-smoke' },
  OCRParser: null,
  Tesseract: {},
  localStorage: {
    getItem: key => localStore.get(key) || null,
    setItem: (key, value) => localStore.set(key, String(value)),
    removeItem: key => localStore.delete(key),
  },
  document,
  window: {
    document,
    location: { hostname: '127.0.0.1', href: 'http://127.0.0.1/flow-smoke' },
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
    refreshLanguage() {},
  },
  t: value => value,
});
context.window.window = context.window;
context.window.localStorage = context.localStorage;
context.window.t = context.t;
context.window.OCRParser = context.OCRParser;
context.window.Tesseract = context.Tesseract;

loadScript(context, 'nba2k26-i18n.js');
context.t = context.window.t;
loadScript(context, 'nba2k26-ui-core.js');
loadScript(context, 'nba2k26-game-analysis.js');
loadScript(context, 'nba2k26-build-form.js');
loadScript(context, 'nba2k26-game-form.js');
loadScript(context, 'nba2k26-data-portability.js');
loadScript(context, 'nba2k26-build-detail.js');
loadScript(context, 'nba2k26-ocr-parser.js');
context.OCRParser = context.window.OCRParser || context.OCRParser;
loadScript(context, 'nba2k26-ocr.js');
context.toast = context.window.NBA2K26_UI_CORE.toast;
context.customConfirm = async () => true;

const state = { builds: [], games: [], currentBuildId: null, editingBuildId: null, editingGameId: null };
const saved = new Map();
const deleted = [];
const toasts = [];
const deps = {
  state,
  ATTR_GROUPS: { fin: [], sho: [], pla: [], def: [], reb: [], phy: [] },
  setCurrentBadges: badges => { state.badges = badges; },
  getCurrentBadges: () => state.badges || {},
  renderBadgeList() {},
  updateGroupAvg() {},
  saveToStorage: async (key, value) => { saved.set(key, value); return true; },
  deleteFromStorage: async key => { deleted.push(key); saved.delete(key); return true; },
  toast: (message, bad) => toasts.push({ message, bad: !!bad }),
  closeBuildModal: () => context.window.NBA2K26_BUILD_FORM.closeBuildModal(state),
  renderBuilds() {},
  renderBuildDetail() {},
  customConfirm: async () => true,
  showPage: page => { state.page = page; },
  escapeHtml: value => String(value),
  closeGameModal: () => context.window.NBA2K26_GAME_FORM.closeGameModal(state),
  closeDataModal: () => context.window.NBA2K26_DATA_PORTABILITY.closeDataModal(),
  loadData: async () => {
    state.builds = [];
    state.games = [];
    for (const [key, value] of saved.entries()) {
      if (key.startsWith('build:')) state.builds.push(value);
      if (key.startsWith('game:')) state.games.push(value);
    }
  },
  renderOverview() {},
};
context.state = state;
context.renderBuilds = deps.renderBuilds;
context.renderOverview = deps.renderOverview;

[
  'b-name','b-archetype','b-position','b-position-2','b-body-type','b-height','b-weight','b-wingspan','b-ovr',
  'b-takeover-1','b-takeover-2','b-specialization','b-jumpshot-base','b-jumpshot-release','b-notes',
  'build-modal','build-modal-title','b-delete-btn','page-builds','page-detail','detail-container',
  'game-modal','game-modal-title','g-delete-btn','ocr-apply-status','game-outcome-line','game-eff-line','game-grade-chip',
  'g-mode','g-date','g-result','g-score-own','g-score-opp','g-pts','g-reb','g-ast','g-stl','g-blk','g-to','g-pf','g-pm',
  'g-fg2m','g-fg2a','g-fg3m','g-fg3a','g-ftm','g-fta','g-grade','g-notes',
  'g-teammates-table','g-teammates-detail-toggle','g-teammates-rows','g-opponents-table','g-opponents-detail-toggle','g-opponents-rows',
  'g-prev-step','g-step-label','g-next-step','data-stats','data-modal','page-overview',
  'toast','theme-mode-label','language-mode-label',
  'ocr-file','ocr-modal','ocr-img','ocr-status','ocr-tips','ocr-confirm-btn','ocr-result-area',
  'ocr-result-grid','ocr-confidence-badge','ocr-strategy-badge','ocr-default-engine',
  'zhipu-api-key','zhipu-key-status','ocr-settings-modal'
].forEach(id => document.getElementById(id));

document.getElementById('page-builds').classList.add('active');
document.getElementById('page-overview').classList.add('active');

(async () => {
  const buildForm = context.window.NBA2K26_BUILD_FORM;
  const gameForm = context.window.NBA2K26_GAME_FORM;
  const dataPortability = context.window.NBA2K26_DATA_PORTABILITY;
  const buildDetail = context.window.NBA2K26_BUILD_DETAIL;
  const uiCore = context.window.NBA2K26_UI_CORE;

  uiCore.setThemeMode('dark');
  if (document.documentElement.getAttribute('data-theme') !== 'dark') throw new Error('dark theme did not apply');
  uiCore.setThemeMode('light');
  if (document.documentElement.getAttribute('data-theme-mode') !== 'light') throw new Error('light theme mode did not persist');
  uiCore.setThemeMode('system');
  if (localStore.get('nba2k-theme-mode') !== 'system') throw new Error('system theme mode did not persist');

  context.setLang('en');
  if (localStore.get('nba2k_lang') !== 'en' || context.window.currentLang !== 'en') throw new Error('English language switch failed');
  context.setLang('zh');
  if (localStore.get('nba2k_lang') !== 'zh' || context.window.currentLang !== 'zh') throw new Error('Chinese language switch failed');

  context.openOCRSettings();
  if (!document.getElementById('ocr-settings-modal').classList.contains('active')) throw new Error('OCR settings modal did not open');
  document.getElementById('ocr-default-engine').value = 'tesseract';
  document.getElementById('zhipu-api-key').value = 'smoke-key';
  context.saveOCRSettings();
  if (localStore.get('ocr_engine') !== 'tesseract' || localStore.get('ocr_zhipu_key') !== 'smoke-key') throw new Error('OCR settings did not save');
  if (document.getElementById('ocr-settings-modal').classList.contains('active')) throw new Error('OCR settings modal did not close');

  buildForm.openBuildModal(null, deps);
  document.getElementById('b-name').value = 'Smoke Iso';
  document.getElementById('b-archetype').value = 'Two-Way Shot Creator';
  document.getElementById('b-position').value = 'SG';
  await buildForm.saveBuild(deps);
  if (state.builds.length !== 1) throw new Error('new build was not saved');

  state.editingBuildId = state.builds[0].id;
  buildForm.openBuildModal(state.builds[0].id, deps);
  document.getElementById('b-name').value = 'Smoke Iso Edited';
  await buildForm.saveBuild(deps);
  if (state.builds[0].name !== 'Smoke Iso Edited') throw new Error('build edit did not persist');

  await buildForm.duplicateBuild(state.builds[0].id, deps);
  if (state.builds.length !== 2 || !state.builds[0].name.includes('(Copy)')) throw new Error('build duplicate failed');

  state.currentBuildId = state.builds[1].id;
  gameForm.openGameModal(null, deps);
  gameForm.showGameTab('main');
  if (!document.querySelector('[data-game-tab="main"]').classList.contains('active')) throw new Error('game tab switch failed');
  gameForm.nextGameStep();
  if (!document.querySelector('[data-game-tab="teammates"]').classList.contains('active')) throw new Error('next game tab failed');
  gameForm.prevGameStep();
  if (!document.querySelector('[data-game-tab="main"]').classList.contains('active')) throw new Error('previous game tab failed');
  document.getElementById('g-date').value = '2026-05-22';
  document.getElementById('g-score-own').value = '82';
  document.getElementById('g-score-opp').value = '75';
  document.getElementById('g-pts').value = '24';
  document.getElementById('g-reb').value = '6';
  document.getElementById('g-ast').value = '8';
  document.getElementById('g-fg2m').value = '9';
  document.getElementById('g-fg2a').value = '16';
  document.getElementById('g-fg3m').value = '4';
  document.getElementById('g-fg3a').value = '9';
  document.getElementById('g-ftm').value = '2';
  document.getElementById('g-fta').value = '2';
  await gameForm.saveGame(deps);
  if (state.games.length !== 1 || state.games[0].pts !== 24 || state.games[0].pm !== 7) throw new Error('game save failed');

  gameForm.openGameModal(state.games[0].id, deps);
  document.getElementById('g-pts').value = '31';
  await gameForm.saveGame(deps);
  if (state.games.length !== 1 || state.games[0].pts !== 31) throw new Error('game edit failed');

  gameForm.openGameModal(state.games[0].id, deps);
  await gameForm.deleteGame(deps);
  if (state.games.length !== 0) throw new Error('game delete failed');

  dataPortability.openDataModal(state);
  await dataPortability.exportData(deps);
  const imported = {
    builds: [{ id: 'imported-build', name: 'Imported Build', createdAt: Date.now() }],
    games: [
      { id: 'imported-game', buildId: 'imported-build', mode: 'Rec', result: 'W' },
      { id: 'imported-game-2', buildId: 'imported-build', mode: 'Park', result: 'L' },
    ],
  };
  await dataPortability.importData({ text: async () => JSON.stringify(imported) }, deps);
  if (!saved.has('build:imported-build') || !saved.has('game:imported-game') || !saved.has('game:imported-game-2')) throw new Error('import did not save payload');
  if (!state.builds.some(build => build.id === 'imported-build') || !state.games.some(game => game.id === 'imported-game') || !state.games.some(game => game.id === 'imported-game-2')) {
    throw new Error('import did not reload state');
  }

  const deleteTargetId = state.builds.find(build => build.name === 'Smoke Iso Edited')?.id;
  state.editingBuildId = deleteTargetId;
  await buildForm.deleteBuild(deps);
  if (state.builds.some(build => build.id === deleteTargetId)) throw new Error('build delete failed');

  state.currentBuildId = 'imported-build';
  state.currentMode = 'All';
  state.detailTab = 'overview';
  state.gameFilter = { result: 'All', dateFrom: '', dateTo: '', search: '', sortKey: 'date', sortDir: 'desc' };
  buildDetail.renderBuildDetail({
    state,
    renderAccountBar() {},
    showPage: page => { state.page = page; },
    applyGameFilters: games => games,
    aggregate: games => {
      const n = games.length;
      const wins = games.filter(game => game.result === 'W').length;
      return {
        ppg: n ? '1.0' : '0.0', rpg: '0.0', apg: '0.0', spg: '0.0', bpg: '0.0', topg: '0.0',
        fgPct: '0.0', fg3Pct: '0.0', ftPct: '0.0', plusMinus: '0.0',
        wins, losses: n - wins, winPct: n ? '100.0' : '0.0',
      };
    },
    ATTR_GROUPS: {
      fin: { label: 'Finishing', keys: ['closeShot'] },
      sho: { label: 'Shooting', keys: ['threePoint'] },
    },
    groupAvg: (attrs, group) => group === 'sho' ? 92 : 65,
    escapeHtml: value => String(value ?? ''),
    escapeAttr: value => String(value ?? ''),
    TIER_ORDER: {},
    renderAggregate: () => '<div class="aggregate-smoke"></div>',
    renderAttrsPanel: () => '<div class="attrs-smoke"></div>',
    mergeBadges: () => ({ merged: {}, autoOnly: {} }),
    getBadgeRecommendations: () => [{
      name: 'Limitless Range',
      targetLabel: 'GOLD',
      attrLabel: 'Three-Point 93',
      gap: 3,
    }],
    renderBadgesPanel: () => '',
    renderTrendPanel: () => '',
    renderSeasonInsights: () => '<section class="season-insight-wrap"></section>',
    renderFirstGameRecap: () => '',
    renderSeasonSummary: () => '',
    renderRosterSummary: () => '',
    renderRosterChemistry: () => '',
    renderHighlightsGallery: () => '',
    renderGameFilterBar: () => '',
    renderGamesTable: () => '',
  });
  if (!document.getElementById('detail-container').innerHTML.includes('detail-decision-strip')) {
    throw new Error('detail decision strip did not render');
  }
  if (!document.getElementById('detail-container').innerHTML.includes('GOLD') || !document.getElementById('detail-container').innerHTML.includes('+3')) {
    throw new Error('detail badge recommendation did not render');
  }
  if (!document.getElementById('detail-container').innerHTML.includes('season-insight-wrap')) {
    throw new Error('season insight panel did not render');
  }

  console.log('flow ok: build create/edit/copy/delete, game create/edit/delete/tab controls, OCR settings, theme/lang, export/import reload, detail decision strip, badge recommendation and season insight render');
  console.log(`storage writes: ${saved.size}, deletes: ${deleted.length}, toasts: ${toasts.length}`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
