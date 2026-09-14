// Game-year data layer guard.
//
// The other guards are static: they parse sources and diff asset lists. This one
// actually boots the data layer and the modules that read it, so a malformed or
// dishonest dataset fails here instead of in the app.
//
// It pins the invariants that make a per-year dataset safe to ship:
//   - every registered year exposes the full shape the app reads;
//   - a badge whose thresholds are unknown never auto-unlocks;
//   - switching years swaps the catalog without touching stored records;
//   - season lookups degrade visibly (stale) instead of silently.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

const checks = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

function boot(yearPreference) {
  const store = new Map();
  if (yearPreference) store.set('gamedata:year', yearPreference);

  // Minimal DOM stub: the modules under test register listeners at load time but
  // this guard only exercises their pure data paths.
  const document = {
    addEventListener() {},
    removeEventListener() {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    document,
    localStorage: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
    },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);

  for (const file of [
    'nba2k-gamedata.js',
    'nba2k-gamedata-2k26.js',
    'nba2k-gamedata-2k27.js',
    'nba2k-build-engine.js',
    'nba2k-badges.js',
    'nba2k-app-globals.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return context;
}

// ---------------------------------------------------------------- shape
const base = boot(null);
const G = base.NBA2K_GAMEDATA;

assert(!!G, 'gamedata registry is exposed on window');
assert(G.years().join(',') === '2k27,2k26', 'registry lists years newest first');
assert(G.active.year === '2k27', 'newest registered year is active by default');

const REQUIRED = [
  'label', 'subtitle', 'meta', 'attrGroups', 'attrLabels', 'positionWeights',
  'animThresholds', 'badgeCategories', 'tiers', 'badgeThresholds', 'seasons',
];
for (const year of G.years()) {
  const data = G.get(year);
  for (const key of REQUIRED) {
    assert(data[key] != null, `${year} dataset defines ${key}`);
  }
  const attrKeys = Object.values(data.attrGroups).flatMap(group => group.keys);
  const unlabelled = attrKeys.filter(k => !data.attrLabels[k]);
  assert(unlabelled.length === 0, `${year} labels every grouped attribute`);
  for (const position of Object.keys(data.positionWeights)) {
    const missing = attrKeys.filter(k => data.positionWeights[position][k] == null);
    assert(missing.length === 0, `${year} ${position} weights cover every attribute`);
  }
  // Thresholds may be sparse, but they may not invent badges.
  const catalogIds = new Set(data.badgeCategories.flatMap(c => c.badges.map(b => b.id)));
  const orphans = Object.keys(data.badgeThresholds).filter(id => !catalogIds.has(id));
  assert(orphans.length === 0, `${year} thresholds only reference catalog badges`);
}

// ------------------------------------------------------- honesty of 2k27
const d27 = G.get('2k27');
const badges27 = d27.badgeCategories.flatMap(c => c.badges);
assert(
  d27.badgeCategories.map(c => c.id).join(',') === 'finishing,shooting,playmaking,defense,rebounding,physicals',
  '2k27 splits the catalog into the six shipped disciplines',
);
assert(
  badges27.every(b => b.confidence === 'confirmed' || b.confidence === 'provisional'),
  '2k27 tags every badge with a confidence level',
);
assert(d27.meta.complete === false, '2k27 dataset is flagged incomplete');
assert(
  badges27.length <= d27.meta.badgeCountOfficial,
  '2k27 encodes no more badges than the official count',
);
assert(d27.meta.legendViaSynergy === true, '2k27 records that Legend is not attribute-gated');
assert(
  Object.values(d27.badgeThresholds).every(def => def.tiers.legend === null),
  '2k27 leaves every legend tier unset because Synergy grants it',
);
// A tier must be null (unknown) or a non-empty group list. An empty array would
// read as "no requirement" and unlock the badge for everyone.
for (const [id, def] of Object.entries(d27.badgeThresholds)) {
  for (const [tier, groups] of Object.entries(def.tiers)) {
    assert(
      groups === null || (Array.isArray(groups) && groups.length > 0),
      `2k27 ${id}.${tier} is null or a real requirement, never an empty list`,
    );
  }
}

// --------------------------------------------- unknown badges stay locked
const maxedAttrs = {};
for (const group of Object.values(d27.attrGroups)) {
  for (const key of group.keys) maxedAttrs[key] = 99;
}
const auto27 = base.computeAutoBadges(maxedAttrs);
const withThresholds = new Set(Object.keys(d27.badgeThresholds));
const unlockedWithoutData = Object.keys(auto27).filter(id => !withThresholds.has(id));
assert(
  unlockedWithoutData.length === 0,
  'a 99-everything build unlocks no 2k27 badge that has no published thresholds',
);
assert(
  auto27.posterizer === 'hof',
  'a 99-everything build reaches the published 2k27 Posterizer HOF tier, not Legend',
);
assert(
  base.meetsBadgeTier(maxedAttrs, null) === false && base.meetsBadgeTier(maxedAttrs, []) === false,
  'an unknown or empty tier requirement is never met',
);

// ------------------------------------------------------------ 2k26 intact
const legacy = boot('2k26');
const d26 = legacy.NBA2K_GAMEDATA.active;
assert(d26.year === '2k26', 'a stored year preference selects that dataset');
assert(
  d26.badgeCategories.flatMap(c => c.badges).length === d26.meta.badgeCountOfficial,
  '2k26 catalog still holds all 40 shipped badges',
);
assert(d26.seasons.length === 8, '2k26 keeps its eight official seasons');
assert(
  d26.seasons.every(s => !s.estimated),
  '2k26 season dates are all published, none estimated',
);
const auto26 = legacy.computeAutoBadges(maxedAttrs);
assert(
  Object.keys(auto26).length === Object.keys(d26.badgeThresholds).length &&
    Object.values(auto26).every(tier => tier === 'legend'),
  '2k26 still auto-unlocks every badge to Legend at 99 attributes',
);

// -------------------------------------------------------------- seasons
assert(legacy.dateToSeason('2025-09-05') === 1, '2k26 maps its Season 1 opening date');
assert(legacy.dateToSeason('2026-08-06') === 8, '2k26 maps its Season 8 closing date');
assert(legacy.dateToSeason('2026-09-13') === null, '2k26 reports no season past its table');
// Regression: currentSeason() used to hand back a finished season unflagged, so
// the UI presented S8 as live for every date after 2026-08-06.
const stale26 = legacy.currentSeason();
assert(
  !stale26 || stale26.n !== 8 || stale26.stale === true,
  '2k26 flags an out-of-range current season as stale',
);
assert(base.dateToSeason('2026-08-26') === 1, '2k27 maps its confirmed Season 1 start');
assert(
  d27.seasons.length === 8 && d27.seasons[0].from === '2026-08-26',
  '2k27 season table starts on the confirmed Season 1 date',
);
assert(
  d27.seasons.every(s => s.estimated === true),
  '2k27 marks every season range estimated while 2K has not published end dates',
);
for (let i = 1; i < d27.seasons.length; i++) {
  assert(
    d27.seasons[i].from > d27.seasons[i - 1].to,
    `2k27 season ${d27.seasons[i].n} starts after season ${d27.seasons[i - 1].n} ends`,
  );
}

console.log(
  `gamedata guard ok: ${checks.length} checks — ` +
  `${G.years().length} years registered, active ${G.active.year}, ` +
  `${badges27.length}/${d27.meta.badgeCountOfficial} 2k27 badges encoded ` +
  `(${badges27.filter(b => b.confidence === 'confirmed').length} confirmed, ` +
  `${badges27.filter(b => b.confidence === 'provisional').length} provisional, ` +
  `${d27.meta.pendingBadges.length} unplaced), ` +
  `${Object.keys(d27.badgeThresholds).length} with published thresholds`,
);
