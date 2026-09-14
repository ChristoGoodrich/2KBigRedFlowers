const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'nba2k-build-tracker.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const cssHrefRe = /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g;
const idRe = /\bid="([^"]+)"/g;

function extractScriptBlocks(source) {
  const lowerSource = source.toLowerCase();
  const blocks = [];
  let cursor = 0;
  while (cursor < source.length) {
    const openStart = lowerSource.indexOf('<script', cursor);
    if (openStart === -1) break;
    const openEnd = source.indexOf('>', openStart);
    const closeStart = lowerSource.indexOf('</script', openEnd + 1);
    const closeEnd = source.indexOf('>', closeStart);
    if (openEnd === -1 || closeStart === -1 || closeEnd === -1) {
      throw new Error('Could not parse HTML script block');
    }
    const openTag = source.slice(openStart, openEnd + 1);
    blocks.push({
      src: openTag.match(/\bsrc\s*=\s*"([^"]+)"/i)?.[1],
      code: source.slice(openEnd + 1, closeStart),
    });
    cursor = closeEnd + 1;
  }
  return blocks;
}

const localScripts = [];
const localExternalScripts = [];
const remoteScripts = [];
const inlineScripts = [];
let structuralSurface = html;
let combined = '';
let match;

for (const script of extractScriptBlocks(html)) {
  const src = script.src;
  if (src && /^https?:\/\//i.test(src)) {
    remoteScripts.push(src);
    continue;
  }

  let code = script.code || '';
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

// nba2k-ocr.js and nba2k-ocr-parser.js are lazy-loaded at runtime by
// nba2k-ocr-lazy.js, so they are not in the HTML <script> set. Parse them
// standalone and fold their source into the app-surface corpus so the
// closeOCRModal / NBA2K_OCR checks below still cover them.
const lazyOcrScripts = ['./nba2k-ocr-parser.js', './nba2k-ocr.js'];
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
  './nba2k-theme.css',
  './nba2k-shell.css',
  './nba2k-visualizations.css',
  './nba2k-components.css',
  './nba2k-modals-forms.css',
  './nba2k-build-detail.css',
  './nba2k-game-detail.css',
  './nba2k-ocr-data.css',
  './nba2k-scout-report.css',
  './nba2k-readability.css',
  './nba2k-beauty.css',
  './nba2k-ultra.css',
  './nba2k-compare.css',
  './nba2k-opponent-intel.css',
  './nba2k-premium.css',
  './nba2k-mobile.css'
];

const expectedLocalExternalScripts = [
  './nba2k-gamedata.js',
  './nba2k-gamedata-2k26.js',
  './nba2k-gamedata-2k27.js',
  './nba2k-scout-data.js',
  './nba2k-build-engine.js',
  './nba2k-badges.js',
  './nba2k-badge-editor.js',
  './nba2k-i18n.js',
  './nba2k-scout-report.js',
  './nba2k-storage.js',
  './nba2k-runtime-config.js',
  './nba2k-app-update.js',
  './nba2k-cloud-sync.js',
  './nba2k-game-analysis.js',
  './nba2k-advanced-analytics.js',
  './nba2k-visualizations.js',
  './nba2k-render-modules.js',
  './nba2k-performance-lab.js',
  './nba2k-game-panels.js',
  './nba2k-game-table.js',
  './nba2k-game-detail.js',
  './nba2k-player-profile-core.js',
  './nba2k-player-profiles.js',
  './nba2k-game-form.js',
  './nba2k-build-form.js',
  './nba2k-data-portability.js',
  './nba2k-data-quality.js',
  './nba2k-page-shell.js',
  './nba2k-build-detail.js',
  './nba2k-build-detail-panels.js',
  './nba2k-ui-core.js',
  './nba2k-build-template.js',
  './nba2k-game-template.js',
  './nba2k-ocr-templates.js',
  './nba2k-system-templates.js',
  './nba2k-html-templates.js',
  './nba2k-global-games.js',
  './nba2k-share-card.js',
  './nba2k-build-compare.js',
  './nba2k-opponent-intel.js',
  './nba2k-app-bootstrap.js',
  './nba2k-ovr-estimator.js',
  './nba2k-app-globals.js',
  './nba2k-ocr-lazy.js',
  './nba2k-interactions.js'
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
  'data-menu-modal',
  'account-center-modal',
  'about-app-modal',
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
  'data-modal',
  'account-modal',
  'about-modal',
];

for (const id of templatedModalIds) {
  const marker = `id="${id}"`;
  const htmlCount = html.split(marker).length - 1;
  if (htmlCount !== 0) {
    throw new Error(`Templated modal #${id} should live in nba2k-html-templates.js, not the HTML shell`);
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
  'ACCOUNT CENTER MODAL',
  'ABOUT APP MODAL',
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
  'window.NBA2K_PLAYER_PROFILE_CORE',
  'window.NBA2K_OCR',
  'window.NBA2K_HTML_TEMPLATES',
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

const i18nPath = path.join(root, 'nba2k-i18n.js');
const i18nSource = fs.readFileSync(i18nPath, 'utf8');
const i18nCopyStart = i18nSource.indexOf('const I18N_COPY = {');
const i18nCopyEnd = i18nSource.indexOf('const I18N_PLACEHOLDERS', i18nCopyStart);
if (i18nCopyStart === -1 || i18nCopyEnd === -1) {
  throw new Error('Could not locate I18N_COPY block for translation coverage check');
}

const i18nCopySource = i18nSource.slice(i18nCopyStart, i18nCopyEnd);
const i18nKeys = new Set();

function extractObjectKey(line) {
  const source = line.trimStart();
  const quote = source[0];
  if (quote === "'" || quote === '"') {
    let key = '';
    for (let index = 1; index < source.length; index += 1) {
      const char = source[index];
      if (char === '\\' && index + 1 < source.length) {
        const escaped = source[index + 1];
        key += escaped === quote || escaped === '\\' ? escaped : `\\${escaped}`;
        index += 1;
      } else if (char === quote) {
        return /^\s*:/.test(source.slice(index + 1)) ? key : null;
      } else {
        key += char;
      }
    }
    return null;
  }
  return source.match(/^([A-Za-z_$][\w$]*)\s*:/)?.[1] || null;
}

for (const line of i18nCopySource.split(/\r?\n/)) {
  const key = extractObjectKey(line);
  if (key) i18nKeys.add(key);
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
