// Game-year data registry.
// Everything that changes when 2K ships a new game lives in a per-year dataset
// (nba2k-gamedata-2k26.js, nba2k-gamedata-2k27.js, ...) and is registered here.
// The rest of the app reads the active dataset through the legacy global names
// (ATTR_GROUPS, BADGE_CATEGORIES, BADGE_THRESHOLDS, NBA2K_SEASONS, ...) so the
// classic-script compatibility surface is unchanged.
//
// Adding next year's game should be one new dataset file plus one sw.js/HTML
// entry -- never another sweep across every source file.
(function (window) {
  'use strict';

  const registry = Object.create(null);

  // Threshold builders shared by every dataset. A tier whose requirements are
  // not publicly known yet must be null, never an empty array: null means
  // "unknown, do not auto-unlock", [] would read as "no requirement, always met".
  const helpers = {
    req(k, val) { return { k, val }; },
    reqAll(...items) { return { all: items }; },
    reqAny(...items) { return { any: items }; },
    tierReq(bronze, silver, gold, hof, legend) {
      return { bronze, silver, gold, hof, legend: legend === undefined ? null : legend };
    },
  };

  const YEAR_KEY = 'gamedata:year';

  function register(year, dataset) {
    registry[year] = Object.assign({ year }, dataset);
    // Re-resolve on every registration so dataset files can load in any order
    // and `active` is valid as soon as the first one has run.
    API.active = registry[resolveYear()];
    return registry[year];
  }

  function get(year) { return registry[year] || null; }

  // Newest first, so years() [0] is the latest registered game.
  function years() { return Object.keys(registry).sort().reverse(); }

  function storedYear() {
    try { return window.localStorage ? window.localStorage.getItem(YEAR_KEY) : null; }
    catch (e) { return null; }
  }

  function resolveYear() {
    const stored = storedYear();
    if (stored && registry[stored]) return stored;
    const available = years();
    return available.length ? available[0] : null;
  }

  // Records are keyed by build/game id, not by game year, so switching years
  // never rewrites stored data -- badge ids that a year's catalog does not
  // define simply stop resolving until the user switches back.
  function setYear(year) {
    if (!registry[year]) return false;
    try { if (window.localStorage) window.localStorage.setItem(YEAR_KEY, year); }
    catch (e) { /* private mode: fall through to the in-memory switch */ }
    API.active = registry[year];
    return true;
  }

  const API = {
    helpers,
    register,
    get,
    years,
    setYear,
    resolveYear,
    // Kept current by register(); never null once a dataset file has loaded.
    active: null,
  };

  window.NBA2K_GAMEDATA = API;
})(window);
