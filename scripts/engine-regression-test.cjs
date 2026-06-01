// Engine boundary + regression tests for the pure analytics modules.
// Locks in the division-by-zero / empty-array / NaN guards verified during the
// logic-layer audit, and pins the aggregate() cache-collision fix so a future
// edit cannot quietly reintroduce a boundary-only cache key.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// The analytics modules are IIFEs of the form (function(window){…})(window).
// Provide a shared window shim and eval them in order (advanced-analytics reads
// window.NBA2K26_GAME_ANALYSIS for its chronological sort).
const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
function load(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  new Function('window', code)(sandbox.window);
}
load('nba2k26-game-analysis.js');
load('nba2k26-advanced-analytics.js');
load('nba2k26-ovr-estimator.js');

const GA = sandbox.window.NBA2K26_GAME_ANALYSIS;
const AA = sandbox.window.NBA2K26_ADVANCED_ANALYTICS;
const OVR = sandbox.window.NBA2K26_OVR_ESTIMATOR;

let passed = 0;
const failures = [];
function check(label, cond) {
  if (cond) { passed++; } else { failures.push(label); }
}

const mkGame = (id, o = {}) => Object.assign({
  id, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pm: 0,
  fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, result: 'W',
}, o);

// ── aggregate(): empty / single / NaN-safety ───────────────────────────────
const z = GA.aggregate([]);
check('aggregate([]) ppg is 0.0', z.ppg === '0.0');
check('aggregate([]) winPct is 0.0', z.winPct === '0.0');
check('aggregate([]) wins/losses are 0', z.wins === 0 && z.losses === 0);

const one = GA.aggregate([mkGame('s1', { pts: 30, reb: 10, result: 'W' })]);
check('aggregate single ppg', one.ppg === '30.0');
check('aggregate single winPct', one.winPct === '100.0');

// Missing / non-numeric fields must not yield NaN in any output field.
const dirty = GA.aggregate([
  mkGame('d1', { pts: undefined, reb: null, fg2a: 0, fg3a: 0, fta: 0 }),
  mkGame('d2', { pts: NaN, result: 'L' }),
]);
const anyNaN = Object.values(dirty).some(v => typeof v === 'string' && v.includes('NaN'));
check('aggregate tolerates missing/NaN stats (no NaN output)', !anyNaN);
check('aggregate guards FG% div-by-zero', dirty.fgPct === '0.0');

// ── REGRESSION: aggregate() cache-collision (boundary-only key) ─────────────
// Two same-length subsets that share their first (g1) and last (g5) game but
// differ in the middle must NOT collide in the memo cache.
const subsetA = [mkGame('g1', { pts: 10 }), mkGame('g2', { pts: 40 }), mkGame('g5', { pts: 10 })]; // ppg 20.0
const subsetB = [mkGame('g1', { pts: 10 }), mkGame('g3', { pts: 0, result: 'L' }), mkGame('g5', { pts: 10, result: 'L' })]; // ppg 6.7
const aPpg = GA.aggregate(subsetA).ppg;
const bPpg = GA.aggregate(subsetB).ppg;
check('cache key distinguishes same-boundary subsets (A=20.0)', aPpg === '20.0');
check('cache key distinguishes same-boundary subsets (B=6.7)', bPpg === '6.7');
check('cache collision regression: A !== B', aPpg !== bPpg);

// ── advanced-analytics: every summary surface survives empty / tiny input ───
let threw = null;
try { AA.summary([]); } catch (e) { threw = e; }
check('advanced summary([]) does not throw', threw === null);
const sEmpty = AA.summary([]);
check('shootingProfile([]) tsPct is 0 (no div-by-zero)', sEmpty.shooting.tsPct === 0);
check('venueSplit([]) home winPct is 0', sEmpty.venue.home.winPct === 0);
check('marginProfile([]) close bucket empty', sEmpty.margin.close.n === 0);
check('streaks([]) currentType null', sEmpty.streaks.currentType === null);
check('lineupSynergy([]) best empty', Array.isArray(sEmpty.synergy.best) && sEmpty.synergy.best.length === 0);

// shootingProfile with attempts present computes finite TS%
const shoot = AA.shootingProfile([mkGame('x', { pts: 3, fg3m: 1, fg3a: 1, fg2a: 0 })]);
check('shootingProfile finite tsPct with shots', Number.isFinite(shoot.tsPct) && shoot.tsPct > 0);

// ── ovr-estimator: empty guard, clamping, unknown-position fallback ─────────
check('estimate({}, PG) returns null (totalWeight 0 guard)', OVR.estimate({}, 'PG') === null);
const lowOvr = OVR.estimate({ threePoint: 25, ballHandle: 25, passAccuracy: 25, speedWithBall: 25, speed: 25 }, 'PG');
check('estimate clamps to >= 60', lowOvr >= 60);
const hiOvr = OVR.estimate({ threePoint: 99, ballHandle: 99, passAccuracy: 99, speedWithBall: 99, speed: 99, midRange: 99 }, 'PG');
check('estimate clamps to <= 99', hiOvr <= 99);
const known = OVR.estimate({ threePoint: 80, ballHandle: 80 }, 'PG');
const unknown = OVR.estimate({ threePoint: 80, ballHandle: 80 }, 'ZZ');
check('estimate falls back to PG for unknown position', known === unknown);

if (failures.length) {
  throw new Error(`engine regression FAILED — ${failures.length} check(s):\n` + failures.map(f => '  ✗ ' + f).join('\n'));
}
console.log(`engine regression ok: ${passed} checks — aggregate boundaries + cache-collision regression, advanced-analytics empty-input guards, ovr-estimator clamp/fallback`);
