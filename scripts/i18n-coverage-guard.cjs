// i18n coverage guard — catches hardcoded English that can never be translated.
//
// The app translates UI text two ways: `${t('Key')}` in dynamic render code, and
// a class-allowlist that translates static template text by dictionary lookup.
// Either way, a user-visible English string MUST exist as a key in I18N_COPY or
// it stays English in the Chinese UI. This guard scans every UI-rendering file
// for literal HTML text nodes and flags any English text that has no dictionary
// entry (and is not a stat abbreviation or an allowlisted token).
//
// It automates the manual sweeps that found: build-modal attr labels, the OCR
// Settings labels, "Game Records", and the visualizations detail-viz block.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Files that emit user-facing HTML (render functions + static modal templates).
const UI_FILES = [
  'nba2k26-performance-lab.js', 'nba2k26-visualizations.js', 'nba2k26-build-detail.js',
  'nba2k26-build-detail-panels.js', 'nba2k26-game-panels.js', 'nba2k26-game-table.js',
  'nba2k26-global-games.js', 'nba2k26-build-compare.js', 'nba2k26-player-profiles.js',
  'nba2k26-render-modules.js', 'nba2k26-opponent-intel.js', 'nba2k26-data-quality.js',
  'nba2k26-scout-report.js', 'nba2k26-share-card.js', 'nba2k26-game-form.js',
  'nba2k26-build-form.js', 'nba2k26-badge-editor.js',
  'nba2k26-build-template.js', 'nba2k26-game-template.js',
  'nba2k26-ocr-templates.js', 'nba2k26-system-templates.js',
];

// ── Load the I18N_COPY key set (same slice the smoke test uses). ────────────
const i18nSource = fs.readFileSync(path.join(root, 'nba2k26-i18n.js'), 'utf8');
const copyStart = i18nSource.indexOf('const I18N_COPY = {');
const copyEnd = i18nSource.indexOf('const I18N_PLACEHOLDERS', copyStart);
const copySrc = i18nSource.slice(copyStart, copyEnd);
const KEYS = new Set();
const keyRe = /^\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|([A-Za-z_$][\w$]*))\s*:/gm;
let m;
while ((m = keyRe.exec(copySrc))) {
  KEYS.add((m[1] || m[2] || m[3]).replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

// Stat abbreviations / scoreboard tokens kept in English by convention, plus a
// few non-translatable tokens (brand names, units, separators).
const ABBREV = /^[A-Z0-9][A-Z0-9%+–−/.\- ]*$/; // all-caps stat codes: PTS, FG%, 3PM-A, W–L, +/-
const ALLOW = new Set([
  'NBA 2K26', 'OCR', 'CSV', 'API', 'OpenAI', 'Tesseract', 'Zhipu', 'GLM-4V',
  'vs', 'v', '·', '—', '-', '/', '+', '%', 'x', '×',
  // stat headers kept in English with mixed case
  'eFG%', 'Win%', 'W/L:', 'TS%', 'PNG, JPG',
]);

function isTranslatable(text) {
  const t = text.trim();
  if (!t) return true;
  if (!/[A-Za-z]/.test(t)) return true;        // pure numbers/symbols
  if (ABBREV.test(t)) return true;             // stat abbreviations
  if (ALLOW.has(t)) return true;               // explicit allowlist
  if (KEYS.has(t)) return true;                // has a dictionary entry
  return false;
}

// Literal HTML text node: between `>` and `<`, no interpolation (`$`), no braces
// or angle brackets, immediately followed by a closing tag or a child tag start.
// `=`, `|`, and backtick never occur in real UI copy but are common in the JS
// expressions inside template literals, so they mark a false match to discard.
const textNodeRe = />([^<>{}$=|`]*[A-Za-z][^<>{}$=|`]*)<(?=[/a-zA-Z])/g;

const offenders = [];
for (const file of UI_FILES) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // Elements carrying data-i18n are translated at runtime via that attribute;
    // their inner text (and any child-tag-split fragments) need no dictionary key.
    if (line.includes('data-i18n')) return;
    let mm;
    const re = new RegExp(textNodeRe.source, 'g');
    while ((mm = re.exec(line))) {
      const text = mm[1];
      if (!isTranslatable(text)) {
        offenders.push(`${file}:${i + 1}  "${text.trim()}"  → no I18N_COPY key (hardcoded, will not translate)`);
      }
    }
  });
}

if (offenders.length) {
  throw new Error(
    `i18n coverage guard FAILED — ${offenders.length} hardcoded string(s) with no translation key:\n` +
    offenders.join('\n') +
    `\n\nFix by wrapping in t()/tr() and adding the key to I18N_COPY, or add a true abbreviation to the ABBREV/ALLOW lists in this guard.`
  );
}

console.log(`i18n coverage guard ok: ${UI_FILES.length} UI files scanned, all literal text nodes are translatable (${KEYS.size} keys)`);
