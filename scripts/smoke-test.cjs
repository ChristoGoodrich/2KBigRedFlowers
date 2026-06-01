const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'nba2k26-build-tracker.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptRe = /<script(?:\s+src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/g;
const cssHrefRe = /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g;
const idRe = /\bid="([^"]+)"/g;

const localScripts = [];
const localExternalScripts = [];
const remoteScripts = [];
const inlineScripts = [];
let structuralSurface = html;
let combined = '';
let match;

while ((match = scriptRe.exec(html))) {
  const src = match[1];
  if (src && /^https?:\/\//i.test(src)) {
    remoteScripts.push(src);
    continue;
  }

  let code = match[2] || '';
  let label = 'inline script';
  if (src) {
    const localPath = path.join(root, src.replace(/^\.\//, ''));
    code = fs.readFileSync(localPath, 'utf8');
    label = src;
    localExternalScripts.push(src);
    if (src.includes('template')) {
      structuralSurface += `\n${code}`;
    }
  } else {
    inlineScripts.push(code.trim());
  }

  new Function(code);
  combined += `\n;\n// ${label}\n${code}`;
  localScripts.push(label);
}

new Function(combined);

// nba2k26-ocr.js and nba2k26-ocr-parser.js are lazy-loaded at runtime by
// nba2k26-ocr-lazy.js, so they are not in the HTML <script> set. Parse them
// standalone and fold their source into the app-surface corpus so the
// closeOCRModal / NBA2K26_OCR checks below still cover them.
const lazyOcrScripts = ['./nba2k26-ocr-parser.js', './nba2k26-ocr.js'];
for (const src of lazyOcrScripts) {
  const code = fs.readFileSync(path.join(root, src.replace(/^\.\//, '')), 'utf8');
  new Function(code);
  combined += `\n;\n// ${src} (lazy)\n${code}`;
}

const cssLinks = [];
while ((match = cssHrefRe.exec(html))) {
  const href = match[1];
  if (/^https?:\/\//i.test(href)) continue;
  const localPath = path.join(root, href.replace(/^\.\//, ''));
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing stylesheet: ${href}`);
  }
  cssLinks.push(href);
}

const expectedCssLinks = [
  './nba2k26-theme.css',
  './nba2k26-shell.css',
  './nba2k26-visualizations.css',
  './nba2k26-components.css',
  './nba2k26-modals-forms.css',
  './nba2k26-build-detail.css',
  './nba2k26-game-detail.css',
  './nba2k26-ocr-data.css',
  './nba2k26-scout-report.css',
  './nba2k26-readability.css',
  './nba2k26-beauty.css',
  './nba2k26-ultra.css',
  './nba2k26-compare.css',
  './nba2k26-opponent-intel.css',
  './nba2k26-premium.css'
];

const expectedLocalExternalScripts = [
  './nba2k26-scout-data.js',
  './nba2k26-build-engine.js',
  './nba2k26-badges.js',
  './nba2k26-badge-editor.js',
  './nba2k26-i18n.js',
  './nba2k26-scout-report.js',
  './nba2k26-storage.js',
  './nba2k26-runtime-config.js',
  './nba2k26-cloud-sync.js',
  './nba2k26-game-analysis.js',
  './nba2k26-advanced-analytics.js',
  './nba2k26-visualizations.js',
  './nba2k26-render-modules.js',
  './nba2k26-performance-lab.js',
  './nba2k26-game-panels.js',
  './nba2k26-game-table.js',
  './nba2k26-game-detail.js',
  './nba2k26-player-profile-core.js',
  './nba2k26-player-profiles.js',
  './nba2k26-game-form.js',
  './nba2k26-build-form.js',
  './nba2k26-data-portability.js',
  './nba2k26-data-quality.js',
  './nba2k26-page-shell.js',
  './nba2k26-build-detail.js',
  './nba2k26-build-detail-panels.js',
  './nba2k26-ui-core.js',
  './nba2k26-build-template.js',
  './nba2k26-game-template.js',
  './nba2k26-ocr-templates.js',
  './nba2k26-system-templates.js',
  './nba2k26-html-templates.js',
  './nba2k26-global-games.js',
  './nba2k26-share-card.js',
  './nba2k26-build-compare.js',
  './nba2k26-opponent-intel.js',
  './nba2k26-app-bootstrap.js',
  './nba2k26-ovr-estimator.js',
  './nba2k26-app-globals.js',
  './nba2k26-ocr-lazy.js',
  './nba2k26-interactions.js'
];

function assertSameOrder(label, actual, expected) {
  const actualJoined = actual.join('\n');
  const expectedJoined = expected.join('\n');
  if (actualJoined !== expectedJoined) {
    throw new Error(`${label} order changed.\nExpected:\n${expectedJoined}\nActual:\n${actualJoined}`);
  }
}

assertSameOrder('Stylesheet', cssLinks, expectedCssLinks);
assertSameOrder('Local script', localExternalScripts, expectedLocalExternalScripts);

if (!inlineScripts.some((script) => script.includes('bootstrapApp();'))) {
  throw new Error('Missing inline bootstrapApp() call after sidecar scripts');
}

const idCounts = new Map();
while ((match = idRe.exec(structuralSurface))) {
  idCounts.set(match[1], (idCounts.get(match[1]) || 0) + 1);
}

const requiredIds = [
  'settings-wrap',
  'settings-menu',
  'account-bar-wrap',
  'page-builds',
  'builds-container',
  'page-detail',
  'detail-container',
  'page-overview',
  'overview-container',
  'page-quality',
  'quality-container',
  'build-modal',
  'build-modal-title',
  'b-name',
  'b-archetype',
  'b-position',
  'b-position-2',
  'b-body-type',
  'b-height',
  'b-weight',
  'b-wingspan',
  'b-ovr',
  'b-takeover-1',
  'b-takeover-2',
  'b-specialization',
  'attr-avg-fin',
  'attr-avg-sho',
  'attr-avg-pla',
  'attr-avg-def',
  'attr-avg-reb',
  'attr-avg-phy',
  'badge-summary',
  'badge-list-container',
  'b-jumpshot-base',
  'b-jumpshot-release',
  'b-notes',
  'b-delete-btn',
  'game-modal',
  'game-modal-title',
  'ocr-file',
  'ocr-apply-status',
  'game-outcome-line',
  'game-eff-line',
  'game-grade-chip',
  'g-mode',
  'g-date',
  'g-result',
  'g-score-own',
  'g-score-opp',
  'g-pts',
  'g-reb',
  'g-ast',
  'g-stl',
  'g-blk',
  'g-to',
  'g-pf',
  'g-pm',
  'g-fg2m',
  'g-fg2a',
  'g-fg3m',
  'g-fg3a',
  'g-ftm',
  'g-fta',
  'g-grade',
  'g-notes',
  'g-teammates-detail-toggle',
  'g-teammates-table',
  'g-teammates-rows',
  'g-opponents-detail-toggle',
  'g-opponents-table',
  'g-opponents-rows',
  'g-delete-btn',
  'g-prev-step',
  'g-step-label',
  'g-next-step',
  'ocr-modal',
  'ocr-img',
  'ocr-status',
  'ocr-result-area',
  'ocr-confidence-badge',
  'ocr-strategy-badge',
  'ocr-result-grid',
  'ocr-tips',
  'ocr-confirm-btn',
  'ocr-settings-modal',
  'confirm-modal',
  'data-modal',
  'toast',
  'import-file-modal'
];

for (const id of requiredIds) {
  const count = idCounts.get(id) || 0;
  if (count !== 1) {
    throw new Error(`Expected exactly one #${id}; found ${count}`);
  }
}

const requiredTemplateSlots = [
  'build-modal',
  'game-modal',
  'ocr-processing-modal',
  'ocr-settings-modal',
  'confirm-modal',
  'data-menu-modal'
];

for (const slot of requiredTemplateSlots) {
  const marker = `data-template-slot="${slot}"`;
  const count = html.split(marker).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one template slot ${slot}; found ${count}`);
  }
}

const templatedModalIds = [
  'build-modal',
  'game-modal',
  'ocr-modal',
  'ocr-settings-modal',
  'confirm-modal',
  'data-modal'
];

for (const id of templatedModalIds) {
  const marker = `id="${id}"`;
  const htmlCount = html.split(marker).length - 1;
  if (htmlCount !== 0) {
    throw new Error(`Templated modal #${id} should live in nba2k26-html-templates.js, not the HTML shell`);
  }
}

const requiredBoundaries = [
  'HEAD ASSETS',
  'APP HEADER',
  'ACCOUNT BAR',
  'APP PAGES',
  'BUILDS LIST PAGE',
  'BUILD DETAIL PAGE',
  'OVERVIEW PAGE',
  'DATA QUALITY PAGE',
  'BUILD MODAL',
  'GAME MODAL',
  'OCR PROCESSING MODAL',
  'OCR SETTINGS MODAL',
  'CUSTOM CONFIRM MODAL',
  'DATA MENU MODAL',
  'TOAST ROOT',
  'SCRIPT LOAD ORDER'
];

for (const boundary of requiredBoundaries) {
  const begin = `<!-- BEGIN ${boundary} -->`;
  const end = `<!-- END ${boundary} -->`;
  const beginCount = html.split(begin).length - 1;
  const endCount = html.split(end).length - 1;
  if (beginCount !== 1 || endCount !== 1) {
    throw new Error(`Expected one BEGIN/END pair for ${boundary}; found ${beginCount}/${endCount}`);
  }
  if (html.indexOf(begin) > html.indexOf(end)) {
    throw new Error(`Boundary order is inverted for ${boundary}`);
  }
}

const requiredSnippets = [
  'function bootstrapApp',
  'function openBuildModal',
  'async function saveBuild',
  'function openGameModal',
  'async function saveGame',
  'function renderBuildDetail',
  'function renderOverview',
  'build-compare-panel',
  'function openDataModal',
  'function renderDataQuality',
  'function closeDataModal',
  'function closeOCRModal',
  'window.NBA2K26_PLAYER_PROFILE_CORE',
  'window.NBA2K26_OCR',
  'window.NBA2K26_HTML_TEMPLATES',
  'const ATTR_GROUPS',
  'const BADGE_CATEGORIES',
  'async function loadData',
  'async function saveToStorage'
];

for (const snippet of requiredSnippets) {
  if (!combined.includes(snippet)) {
    throw new Error(`Missing expected app surface: ${snippet}`);
  }
}

const i18nPath = path.join(root, 'nba2k26-i18n.js');
const i18nSource = fs.readFileSync(i18nPath, 'utf8');
const i18nCopyStart = i18nSource.indexOf('const I18N_COPY = {');
const i18nCopyEnd = i18nSource.indexOf('const I18N_PLACEHOLDERS', i18nCopyStart);
if (i18nCopyStart === -1 || i18nCopyEnd === -1) {
  throw new Error('Could not locate I18N_COPY block for translation coverage check');
}

const i18nCopySource = i18nSource.slice(i18nCopyStart, i18nCopyEnd);
const i18nKeys = new Set();
const i18nKeyRe = /^\s*(?:'((?:\\.|[^'])*)'|([A-Za-z_$][\w$]*))\s*:/gm;
while ((match = i18nKeyRe.exec(i18nCopySource))) {
  i18nKeys.add((match[1] || match[2]).replace(/\\'/g, "'"));
}

const tCallRe = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
const usedI18nKeys = new Set();
while ((match = tCallRe.exec(`${combined}\n${html}`))) {
  usedI18nKeys.add(match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

const missingI18nKeys = [...usedI18nKeys].filter(key => !i18nKeys.has(key)).sort();
if (missingI18nKeys.length) {
  throw new Error(`Missing I18N_COPY entries for t() keys:\n${missingI18nKeys.join('\n')}`);
}

console.log(`syntax ok: ${localScripts.length} local scripts parsed individually and combined`);
console.log(`assets ok: ${cssLinks.length} layered stylesheet(s), ${localExternalScripts.length} local script src(s)`);
console.log(`templates ok: ${requiredTemplateSlots.length} slot(s), modal ids resolved through html templates`);
console.log(`structure ok: ${requiredIds.length} required id(s), ${requiredBoundaries.length} boundary pair(s)`);
console.log(`i18n ok: ${usedI18nKeys.size} literal t() key(s) covered`);
if (remoteScripts.length) {
  console.log(`remote scripts skipped: ${remoteScripts.length}`);
}
