// NBA 2K26 game statistics and trend analysis helpers.
// Pure or near-pure functions used by build cards, detail pages, and Performance Lab.
(function(window) {
  'use strict';

  // Memoisation keyed on the full ordered id list. A boundary-only fingerprint
  // (length + first/last id) collides for same-length subsets that share their
  // first and last game but differ in the middle — e.g. a per-build slice and a
  // per-mode slice taken from the same sorted list — returning a stale, wrong
  // aggregate for the second caller. The full-id key is still O(n) (cheaper than
  // the reduce it guards) and stays collision-free for persisted games.
  // Cleared on any game save/delete (invalidateAggCache) and when it grows past 60.
  const _aggCache = new Map();
  function _aggKey(games) {
    const n = games.length;
    if (n === 0) return '0';
    let key = n + ':';
    for (let i = 0; i < n; i++) {
      const id = games[i] && games[i].id;
      key += (id == null ? '#' + i : id) + ',';
    }
    return key;
  }

  function aggregate(games) {
    const key    = _aggKey(games);
    const cached = _aggCache.get(key);
    if (cached) return cached;

    const n = games.length;
    if (n === 0) {
      const zero = { ppg:'0.0', rpg:'0.0', apg:'0.0', spg:'0.0', bpg:'0.0', topg:'0.0',
        fgPct:'0.0', fg3Pct:'0.0', ftPct:'0.0', plusMinus:'0.0',
        wins:0, losses:0, winPct:'0.0' };
      _aggCache.set(key, zero);
      return zero;
    }
    const sum = games.reduce((a,g) => ({
      pts: a.pts + (g.pts||0),
      reb: a.reb + (g.reb||0),
      ast: a.ast + (g.ast||0),
      stl: a.stl + (g.stl||0),
      blk: a.blk + (g.blk||0),
      to: a.to + (g.to||0),
      pm: a.pm + (g.pm||0),
      fgm: a.fgm + (g.fg2m||0) + (g.fg3m||0),
      fga: a.fga + (g.fg2a||0) + (g.fg3a||0),
      fg3m: a.fg3m + (g.fg3m||0),
      fg3a: a.fg3a + (g.fg3a||0),
      ftm: a.ftm + (g.ftm||0),
      fta: a.fta + (g.fta||0),
      wins: a.wins + (g.result === 'W' ? 1 : 0),
    }), {pts:0,reb:0,ast:0,stl:0,blk:0,to:0,pm:0,fgm:0,fga:0,fg3m:0,fg3a:0,ftm:0,fta:0,wins:0});
    const pct = (m,a) => a === 0 ? '0.0' : (100*m/a).toFixed(1);
    const avg = (v) => (v/n).toFixed(1);
    const result = {
      ppg: avg(sum.pts), rpg: avg(sum.reb), apg: avg(sum.ast),
      spg: avg(sum.stl), bpg: avg(sum.blk), topg: avg(sum.to),
      fgPct: pct(sum.fgm, sum.fga),
      fg3Pct: pct(sum.fg3m, sum.fg3a),
      ftPct: pct(sum.ftm, sum.fta),
      plusMinus: avg(sum.pm),
      wins: sum.wins, losses: n - sum.wins,
      winPct: (100 * sum.wins / n).toFixed(1),
    };
    if (_aggCache.size >= 60) _aggCache.clear();
    _aggCache.set(key, result);
    return result;
  }

  // Invalidate the cache for a specific set of games (call after save/delete).
  function invalidateAggCache() { _aggCache.clear(); }

  function gameDaySeq(game) {
    const seq = Number(game?.daySeq);
    return Number.isFinite(seq) ? seq : 1;
  }

  function compareGamesByChronology(a, b, direction = 'desc') {
    const dir = direction === 'asc' ? 1 : -1;
    const da = String(a?.date || '');
    const db = String(b?.date || '');
    if (da !== db) return da < db ? -dir : dir;

    const seqDiff = (gameDaySeq(a) - gameDaySeq(b)) * dir;
    if (seqDiff !== 0) return seqDiff;

    const ia = String(a?.id || '');
    const ib = String(b?.id || '');
    return ia < ib ? -dir : ia > ib ? dir : 0;
  }

  // Per-position breakdown: returns array of {position, games, wins, ppg, winPct}
  // for games that have a myPosition value set.
  function aggregateByPosition(games) {
    const pos = new Map();
    games.forEach(g => {
      const p = (g.myPosition || '').trim();
      if (!p) return;
      const row = pos.get(p) || { position: p, games: 0, wins: 0, pts: 0 };
      row.games += 1;
      if (g.result === 'W') row.wins += 1;
      row.pts += g.pts || 0;
      pos.set(p, row);
    });
    return [...pos.values()]
      .map(row => ({
        position: row.position,
        games:    row.games,
        wins:     row.wins,
        ppg:      row.games ? (row.pts / row.games).toFixed(1) : '0.0',
        winPct:   row.games ? (100 * row.wins / row.games).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.games - a.games);
  }

  function aggregateRoster(games, side) {
    const cleanSide = side === 'opponents' ? 'opponents' : 'teammates';
    const rows = new Map();
    games.forEach(game => {
      const players = game.roster && Array.isArray(game.roster[cleanSide]) ? game.roster[cleanSide] : [];
      players.forEach(player => {
        const name = String(player.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const row = rows.get(key) || {
          name,
          games: 0,
          wins: 0,
          losses: 0,
          pts: 0,
          reb: 0,
          ast: 0,
          stl: 0,
          blk: 0,
          to: 0,
          pm: 0,
          fgm: 0,
          fga: 0,
          fg3m: 0,
          fg3a: 0,
        };
        row.games += 1;
        if (game.result === 'W') row.wins += 1;
        else row.losses += 1;
        row.pts += player.pts || 0;
        row.reb += player.reb || 0;
        row.ast += player.ast || 0;
        row.stl += player.stl || 0;
        row.blk += player.blk || 0;
        row.to += player.to || 0;
        row.pm += player.pm || 0;
        row.fgm += player.fgm || 0;
        row.fga += player.fga || 0;
        row.fg3m += player.fg3m || 0;
        row.fg3a += player.fg3a || 0;
        rows.set(key, row);
      });
    });

    const avg = (value, gamesCount) => gamesCount ? (value / gamesCount).toFixed(1) : '0.0';
    const pct = (made, attempts) => attempts ? (100 * made / attempts).toFixed(1) : '0.0';
    return [...rows.values()]
      .map(row => ({
        ...row,
        ppg: avg(row.pts, row.games),
        rpg: avg(row.reb, row.games),
        apg: avg(row.ast, row.games),
        spg: avg(row.stl, row.games),
        bpg: avg(row.blk, row.games),
        topg: avg(row.to, row.games),
        plusMinus: avg(row.pm, row.games),
        fgPct: pct(row.fgm, row.fga),
        fg3Pct: pct(row.fg3m, row.fg3a),
        winPct: row.games ? (100 * row.wins / row.games).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.games - a.games || parseFloat(b.winPct) - parseFloat(a.winPct) || a.name.localeCompare(b.name));
  }
  

  function compareRecentVsOverall(games, recentN = 5) {
    if (games.length < recentN + 1) return null;
    const sorted = [...games].sort(compareGamesByChronology);
    const recent = sorted.slice(0, recentN);
    const earlier = sorted.slice(recentN);
    const recentAgg = aggregate(recent);
    const earlierAgg = aggregate(earlier);
    return {
      recent: recentAgg,
      earlier: earlierAgg,
      recentN,
      earlierN: earlier.length,
    };
  }
  
  function trendArrow(curr, prev) {
    const c = parseFloat(curr) || 0;
    const p = parseFloat(prev) || 0;
    if (Math.abs(c - p) < 0.5) return '<span style="color:var(--text-fade);">&mdash;</span>';
    if (c > p) return `<span style="color:var(--green);">&uarr; ${(c - p).toFixed(1)}</span>`;
    return `<span style="color:var(--red);">&darr; ${(p - c).toFixed(1)}</span>`;
  }

  // ====================== PERSONAL RECORDS ======================
  const PR_STAT_KEYS = [
    { key: 'pts',  label: 'PTS' },
    { key: 'reb',  label: 'REB' },
    { key: 'ast',  label: 'AST' },
    { key: 'stl',  label: 'STL' },
    { key: 'blk',  label: 'BLK' },
    { key: 'fg3m', label: '3PM' },
    { key: 'pm',   label: '+/-' },
  ];

  function getPersonalRecords(games) {
    const records = {};
    PR_STAT_KEYS.forEach(({ key }) => {
      let best = null;
      games.forEach(game => {
        const val = game[key];
        if (typeof val !== 'number' || !Number.isFinite(val)) return;
        if (best === null || val > best.val) {
          best = { val, gameId: game.id, date: game.date, mode: game.mode, result: game.result };
        }
      });
      records[key] = best;
    });
    return records;
  }

  function checkNewPRs(newGame, priorGames) {
    const prior = getPersonalRecords(priorGames);
    return PR_STAT_KEYS.reduce((acc, { key, label }) => {
      const val = newGame[key];
      if (typeof val !== 'number' || !Number.isFinite(val)) return acc;
      if (val > 0 && (prior[key] === null || val > prior[key].val)) {
        acc.push({ key, label, val, prev: prior[key]?.val ?? null });
      }
      return acc;
    }, []);
  }

  // Closeness to PR: for a given game, find which stats are within `gapPct`
  // (default 20%) of the prior PR. Returns array sorted by smallest gap first.
  function nearPRReads(game, priorGames, opts) {
    if (!game) return [];
    const gapPct = (opts && Number.isFinite(opts.gapPct)) ? opts.gapPct : 0.20;
    const prior = getPersonalRecords(priorGames);
    const reads = [];
    PR_STAT_KEYS.forEach(({ key, label }) => {
      const val = Number(game[key]);
      if (!Number.isFinite(val) || val <= 0) return;
      const pr = prior[key];
      if (!pr) return;                // no prior baseline
      if (val >= pr.val) return;      // game already matches/exceeds PR (handled by checkNewPRs)
      const gap = pr.val - val;
      const rel = gap / Math.max(1, pr.val);
      if (rel <= gapPct) reads.push({ key, label, val, pr: pr.val, gap, rel });
    });
    reads.sort((a, b) => a.gap - b.gap);
    return reads;
  }

  // For each PR stat key, how many games have been logged since the current PR
  // was set. Returns a map { key: { label, games, pr, lastDate } }.
  function gamesSincePRMap(allGames) {
    const sortedAsc = [...(allGames || [])].sort((a, b) => compareGamesByChronology(a, b, 'asc'));
    const result = {};
    PR_STAT_KEYS.forEach(({ key, label }) => {
      let bestIdx = -1;
      let bestVal = -Infinity;
      sortedAsc.forEach((g, i) => {
        const v = Number(g[key]);
        if (!Number.isFinite(v)) return;
        if (v > bestVal) { bestVal = v; bestIdx = i; }
      });
      if (bestIdx === -1) { result[key] = null; return; }
      const since = sortedAsc.length - 1 - bestIdx;
      result[key] = {
        label, key,
        pr: bestVal,
        gamesSince: since,
        prDate: sortedAsc[bestIdx]?.date || null,
      };
    });
    return result;
  }

  window.NBA2K26_GAME_ANALYSIS = {
    aggregate,
    invalidateAggCache,
    compareGamesByChronology,
    aggregateByPosition,
    aggregateRoster,
    compareRecentVsOverall,
    trendArrow,
    getPersonalRecords,
    checkNewPRs,
    nearPRReads,
    gamesSincePRMap,
    PR_STAT_KEYS,
  };
})(window);
