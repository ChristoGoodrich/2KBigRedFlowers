// NBA 2K26 data portability helpers.
// Owns export, import, clear-all, and the data modal display.
(function(window) {
  'use strict';

  function buildExportPayload(state) {
    return {
      _meta: {
        app: 'NBA 2K26 Build Tracker',
        version: 2,
        exportedAt: new Date().toISOString(),
        buildCount: state.builds.length,
        gameCount: state.games.length,
      },
      builds: state.builds,
      games: state.games,
    };
  }

  function sanitizeFilePart(value) {
    return String(value || 'share')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'share';
  }

  function summarizeBuild(build) {
    if (!build) return null;
    return {
      id: build.id,
      name: build.name,
      position: build.position,
      position2: build.position2,
      archetype: build.archetype,
      ovr: build.ovr,
    };
  }

  function buildSharePayload(build, games, deps) {
    const aggregate = deps && deps.aggregate;
    const linkedGames = games.filter(game => game.buildId === build.id);
    const summary = typeof aggregate === 'function' ? aggregate(linkedGames) : null;
    return {
      _meta: {
        app: 'NBA 2K26 Build Tracker',
        type: 'build-share',
        version: 1,
        exportedAt: new Date().toISOString(),
        gameCount: linkedGames.length,
      },
      build,
      linkedGames,
      summary,
    };
  }

  function gameSharePayload(game, build) {
    return {
      _meta: {
        app: 'NBA 2K26 Build Tracker',
        type: 'game-share',
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      game,
      build: build || null,
      buildSummary: summarizeBuild(build),
    };
  }

  function downloadText(filename, text, type = 'text/markdown;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function tsFilePart() {
    return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  }

  function reportDeps(deps) {
    const fallbackAggregate = window.NBA2K26_GAME_ANALYSIS?.aggregate || (() => ({
      ppg: '0.0', rpg: '0.0', apg: '0.0', spg: '0.0', bpg: '0.0', topg: '0.0',
      fgPct: '0.0', fg3Pct: '0.0', ftPct: '0.0', plusMinus: '0.0',
      wins: 0, losses: 0, winPct: '0.0',
    }));
    return {
      aggregate: deps?.aggregate || fallbackAggregate,
      aggregateRoster: deps?.aggregateRoster || window.NBA2K26_GAME_ANALYSIS?.aggregateRoster,
      compareRecentVsOverall: deps?.compareRecentVsOverall || window.NBA2K26_GAME_ANALYSIS?.compareRecentVsOverall,
      compareGamesByChronology: window.NBA2K26_GAME_ANALYSIS?.compareGamesByChronology,
      dateToSeason: deps?.dateToSeason || (typeof dateToSeason === 'function' ? dateToSeason : null),
      currentSeason: deps?.currentSeason || (typeof currentSeason === 'function' ? currentSeason : null),
      seasons: deps?.seasons || (typeof NBA2K26_SEASONS !== 'undefined' ? NBA2K26_SEASONS : []),
    };
  }

  function sortGamesForReport(games, helpers, direction = 'desc') {
    const rows = [...games];
    if (typeof helpers.compareGamesByChronology === 'function') {
      return rows.sort((a, b) => helpers.compareGamesByChronology(a, b, direction));
    }
    return rows.sort((a, b) => {
      const da = String(a?.date || '');
      const db = String(b?.date || '');
      return direction === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    });
  }

  function mdCell(value) {
    const text = value === undefined || value === null || value === '' ? '-' : String(value);
    return text.replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
  }

  function mdTable(headers, rows) {
    if (!rows.length) return '_No data._';
    const head = `| ${headers.map(mdCell).join(' | ')} |`;
    const sep = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map(row => `| ${row.map(mdCell).join(' | ')} |`).join('\n');
    return `${head}\n${sep}\n${body}`;
  }

  function scoreLine(game) {
    if (!game || (!game.scoreOwn && !game.scoreOpp)) return '-';
    return `${game.scoreOwn || 0}-${game.scoreOpp || 0}`;
  }

  function signed(value) {
    const n = Number(value) || 0;
    return n > 0 ? `+${n}` : String(n);
  }

  function signedText(value) {
    const n = Number.parseFloat(value) || 0;
    return n >= 0 ? `+${value}` : String(value);
  }

  function gameFgText(game) {
    const fgm = (Number(game?.fg2m) || 0) + (Number(game?.fg3m) || 0);
    const fga = (Number(game?.fg2a) || 0) + (Number(game?.fg3a) || 0);
    return `${fgm}/${fga}`;
  }

  function seasonNumberForDate(date, helpers) {
    if (!date) return null;
    if (typeof helpers.dateToSeason === 'function') return helpers.dateToSeason(date);
    const row = helpers.seasons.find(season => date >= season.from && date <= season.to);
    return row ? row.n : null;
  }

  function seasonLabel(season) {
    if (!season) return 'Unknown season';
    return `${season.label || season.name || `S${season.n}`} (${season.from || '-'} to ${season.to || '-'})`;
  }

  function seasonForNumber(number, helpers) {
    return helpers.seasons.find(season => String(season.n) === String(number)) || null;
  }

  function resolveReportSeason(games, helpers) {
    const current = typeof helpers.currentSeason === 'function' ? helpers.currentSeason() : null;
    if (current) {
      const currentGames = games.filter(game => seasonNumberForDate(game.date, helpers) === current.n);
      if (currentGames.length || !games.length) return current;
    }
    const recentDated = sortGamesForReport(games.filter(game => game.date), helpers)[0];
    const recentSeasonNumber = seasonNumberForDate(recentDated?.date, helpers);
    return seasonForNumber(recentSeasonNumber, helpers) || current || helpers.seasons[helpers.seasons.length - 1] || null;
  }

  function groupRows(games, keyFn, aggregate) {
    const buckets = new Map();
    games.forEach(game => {
      const key = keyFn(game) || 'Unknown';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(game);
    });
    return [...buckets.entries()].map(([label, rows]) => ({
      label,
      rows,
      agg: aggregate(rows),
    })).sort((a, b) =>
      b.rows.length - a.rows.length ||
      Number.parseFloat(b.agg.winPct) - Number.parseFloat(a.agg.winPct) ||
      Number.parseFloat(b.agg.plusMinus) - Number.parseFloat(a.agg.plusMinus)
    );
  }

  function personalHighRows(games) {
    const stats = [
      ['pts', 'PTS'],
      ['reb', 'REB'],
      ['ast', 'AST'],
      ['stl', 'STL'],
      ['blk', 'BLK'],
      ['fg3m', '3PM'],
      ['pm', '+/-'],
    ];
    return stats.map(([key, label]) => {
      let best = null;
      games.forEach(game => {
        const value = Number(game?.[key]);
        if (!Number.isFinite(value)) return;
        if (!best || value > best.value) best = { value, game };
      });
      return best
        ? [label, key === 'pm' ? signed(best.value) : best.value, best.game.date || '-', best.game.mode || '-', best.game.result || '-']
        : [label, '-', '-', '-', '-'];
    });
  }

  function reportInsightBullets(games, helpers) {
    if (!games.length) return ['No games are logged in this report scope yet.'];
    const agg = helpers.aggregate(games);
    const bullets = [];
    const winPct = Number.parseFloat(agg.winPct) || 0;
    const plusMinus = Number.parseFloat(agg.plusMinus) || 0;
    const topg = Number.parseFloat(agg.topg) || 0;
    if (winPct >= 60) bullets.push(`Winning profile is strong at ${agg.winPct}% with ${signedText(agg.plusMinus)} average plus-minus.`);
    else if (winPct < 45) bullets.push(`Win rate is under pressure at ${agg.winPct}%; review shot quality, turnovers, and lineup fit.`);
    else bullets.push(`Record is in the middle band at ${agg.winPct}%; the next edge likely comes from consistency.`);
    if (plusMinus >= 3) bullets.push(`On-court impact is positive: ${signedText(agg.plusMinus)} plus-minus per game.`);
    if (topg >= 3.5) bullets.push(`Turnover load is high at ${agg.topg} per game; protect possessions before raising usage.`);
    if (games.length >= 6 && typeof helpers.compareRecentVsOverall === 'function') {
      const trend = helpers.compareRecentVsOverall(games, Math.min(5, Math.max(2, Math.floor(games.length / 2))));
      if (trend) {
        const deltaW = (Number.parseFloat(trend.recent.winPct) || 0) - (Number.parseFloat(trend.earlier.winPct) || 0);
        const deltaP = (Number.parseFloat(trend.recent.ppg) || 0) - (Number.parseFloat(trend.earlier.ppg) || 0);
        bullets.push(`Recent form: ${deltaW >= 0 ? '+' : ''}${deltaW.toFixed(1)} win% and ${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(1)} PPG versus earlier games.`);
      }
    }
    return bullets;
  }

  function buildMarkdownReport(build, games, deps) {
    const helpers = reportDeps(deps);
    const aggregate = helpers.aggregate;
    const linkedGames = sortGamesForReport(games, helpers);
    const agg = aggregate(linkedGames);
    const recentGames = linkedGames.slice(0, 5);
    const recentAgg = aggregate(recentGames);
    const seasonRows = groupRows(linkedGames, game => {
      const number = seasonNumberForDate(game.date, helpers);
      const season = seasonForNumber(number, helpers);
      return season ? (season.label || `S${season.n}`) : 'No season';
    }, aggregate);
    const modeRows = groupRows(linkedGames, game => game.mode || 'Game', aggregate);
    const teammates = typeof helpers.aggregateRoster === 'function' ? helpers.aggregateRoster(linkedGames, 'teammates').slice(0, 6) : [];
    const opponents = typeof helpers.aggregateRoster === 'function' ? helpers.aggregateRoster(linkedGames, 'opponents').slice(0, 6) : [];
    const exportedAt = new Date().toLocaleString();
    const profileRows = [
      ['Build', build.name || '-'],
      ['Archetype', build.archetype || '-'],
      ['Position', [build.position, build.position2].filter(Boolean).join(' / ') || '-'],
      ['OVR', build.ovr || '-'],
      ['Height', build.height || '-'],
      ['Weight', build.weight ? `${build.weight} lbs` : '-'],
      ['Wingspan', build.wingspan || '-'],
      ['Games', linkedGames.length],
    ];
    const snapshotRows = [
      ['Record', `${agg.wins}W-${agg.losses}L`],
      ['Win %', `${agg.winPct}%`],
      ['PPG / RPG / APG', `${agg.ppg} / ${agg.rpg} / ${agg.apg}`],
      ['FG / 3P / FT', `${agg.fgPct}% / ${agg.fg3Pct}% / ${agg.ftPct}%`],
      ['STL / BLK / TO', `${agg.spg} / ${agg.bpg} / ${agg.topg}`],
      ['+/-', signedText(agg.plusMinus)],
      ['Recent 5', recentGames.length ? `${recentAgg.wins}W-${recentAgg.losses}L, ${recentAgg.ppg} PPG, ${signedText(recentAgg.plusMinus)} +/-` : '-'],
    ];
    const gameRows = linkedGames.slice(0, 40).map(game => [
      game.date || '-',
      game.mode || '-',
      game.result || '-',
      scoreLine(game),
      game.pts || 0,
      game.reb || 0,
      game.ast || 0,
      gameFgText(game),
      `${game.fg3m || 0}/${game.fg3a || 0}`,
      signed(game.pm),
      game.notes || '',
    ]);
    return `# NBA 2K26 Build Report - ${mdCell(build.name || 'Unnamed Build')}

Exported: ${mdCell(exportedAt)}

## Build Profile
${mdTable(['Field', 'Value'], profileRows)}

## Performance Snapshot
${mdTable(['Metric', 'Value'], snapshotRows)}

## Read
${reportInsightBullets(linkedGames, helpers).map(item => `- ${mdCell(item)}`).join('\n')}

## Season Breakdown
${mdTable(['Season', 'GP', 'Record', 'Win %', 'PPG', 'APG', 'FG%', '3P%', '+/-'], seasonRows.map(row => [
      row.label,
      row.rows.length,
      `${row.agg.wins}W-${row.agg.losses}L`,
      `${row.agg.winPct}%`,
      row.agg.ppg,
      row.agg.apg,
      `${row.agg.fgPct}%`,
      `${row.agg.fg3Pct}%`,
      signedText(row.agg.plusMinus),
    ]))}

## Mode Breakdown
${mdTable(['Mode', 'GP', 'Record', 'Win %', 'PPG', 'RPG', 'APG', '+/-'], modeRows.map(row => [
      row.label,
      row.rows.length,
      `${row.agg.wins}W-${row.agg.losses}L`,
      `${row.agg.winPct}%`,
      row.agg.ppg,
      row.agg.rpg,
      row.agg.apg,
      signedText(row.agg.plusMinus),
    ]))}

## Personal Highs
${mdTable(['Stat', 'Best', 'Date', 'Mode', 'Result'], personalHighRows(linkedGames))}

## Roster Notes
${mdTable(['Teammate', 'GP', 'Win %', 'PPG', 'APG', '+/-'], teammates.map(row => [
      row.name,
      row.games,
      `${row.winPct}%`,
      row.ppg,
      row.apg,
      signedText(row.plusMinus),
    ]))}

${mdTable(['Opponent', 'GP', 'User Win %', 'PPG', 'APG', '+/-'], opponents.map(row => [
      row.name,
      row.games,
      `${row.winPct}%`,
      row.ppg,
      row.apg,
      signedText(row.plusMinus),
    ]))}

## Game Log
${mdTable(['Date', 'Mode', 'Result', 'Score', 'PTS', 'REB', 'AST', 'FG', '3P', '+/-', 'Notes'], gameRows)}
`;
  }

  function seasonMarkdownReport(state, deps) {
    const helpers = reportDeps(deps);
    const season = resolveReportSeason(state.games, helpers);
    const seasonGames = season
      ? state.games.filter(game => seasonNumberForDate(game.date, helpers) === season.n)
      : state.games;
    const games = sortGamesForReport(seasonGames, helpers);
    const aggregate = helpers.aggregate;
    const agg = aggregate(games);
    const buildRows = state.builds.map(build => {
      const rows = games.filter(game => game.buildId === build.id);
      return { build, rows, agg: aggregate(rows) };
    }).filter(row => row.rows.length)
      .sort((a, b) =>
        b.rows.length - a.rows.length ||
        Number.parseFloat(b.agg.winPct) - Number.parseFloat(a.agg.winPct) ||
        Number.parseFloat(b.agg.ppg) - Number.parseFloat(a.agg.ppg)
      );
    const modeRows = groupRows(games, game => game.mode || 'Game', aggregate);
    const recentRows = games.slice(0, 12).map(game => {
      const build = state.builds.find(item => item.id === game.buildId);
      return [
        game.date || '-',
        build?.name || '-',
        game.mode || '-',
        game.result || '-',
        scoreLine(game),
        game.pts || 0,
        game.reb || 0,
        game.ast || 0,
        `${game.fg3m || 0}/${game.fg3a || 0}`,
        signed(game.pm),
      ];
    });
    const exportedAt = new Date().toLocaleString();
    return {
      season,
      markdown: `# NBA 2K26 Season Report - ${mdCell(seasonLabel(season))}

Exported: ${mdCell(exportedAt)}

## Season Snapshot
${mdTable(['Metric', 'Value'], [
        ['Games', games.length],
        ['Record', `${agg.wins}W-${agg.losses}L`],
        ['Win %', `${agg.winPct}%`],
        ['PPG / RPG / APG', `${agg.ppg} / ${agg.rpg} / ${agg.apg}`],
        ['FG / 3P / FT', `${agg.fgPct}% / ${agg.fg3Pct}% / ${agg.ftPct}%`],
        ['+/-', signedText(agg.plusMinus)],
        ['Builds used', buildRows.length],
      ])}

## Read
${reportInsightBullets(games, helpers).map(item => `- ${mdCell(item)}`).join('\n')}

## Build Leaderboard
${mdTable(['Build', 'Position', 'GP', 'Record', 'Win %', 'PPG', 'APG', 'FG%', '3P%', '+/-'], buildRows.map(row => [
        row.build.name || '-',
        [row.build.position, row.build.position2].filter(Boolean).join(' / ') || '-',
        row.rows.length,
        `${row.agg.wins}W-${row.agg.losses}L`,
        `${row.agg.winPct}%`,
        row.agg.ppg,
        row.agg.apg,
        `${row.agg.fgPct}%`,
        `${row.agg.fg3Pct}%`,
        signedText(row.agg.plusMinus),
      ]))}

## Mode Breakdown
${mdTable(['Mode', 'GP', 'Record', 'Win %', 'PPG', 'RPG', 'APG', '+/-'], modeRows.map(row => [
        row.label,
        row.rows.length,
        `${row.agg.wins}W-${row.agg.losses}L`,
        `${row.agg.winPct}%`,
        row.agg.ppg,
        row.agg.rpg,
        row.agg.apg,
        signedText(row.agg.plusMinus),
      ]))}

## Season Highs
${mdTable(['Stat', 'Best', 'Date', 'Mode', 'Result'], personalHighRows(games))}

## Recent Games
${mdTable(['Date', 'Build', 'Mode', 'Result', 'Score', 'PTS', 'REB', 'AST', '3P', '+/-'], recentRows)}
`,
    };
  }

  function normalizeImportPayload(data) {
    if (data && Array.isArray(data.builds)) {
      return {
        builds: data.builds,
        games: Array.isArray(data.games) ? data.games : [],
      };
    }
    if (data && data._meta && data._meta.type === 'build-share' && data.build) {
      return {
        builds: [data.build],
        games: Array.isArray(data.linkedGames) ? data.linkedGames : [],
      };
    }
    if (data && data._meta && data._meta.type === 'game-share' && data.game) {
      return {
        builds: data.build && data.build.id ? [data.build] : [],
        games: [data.game],
      };
    }
    throw new Error('Invalid backup file format');
  }

  function downloadJson(filename, json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
    if (!copied) throw new Error('Clipboard copy failed');
    return true;
  }

  async function sharePayload(payload, filenameBase, deps) {
    const toast = deps && deps.toast ? deps.toast : function() {};
    const json = JSON.stringify(payload, null, 2);
    const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const filename = `${sanitizeFilePart(filenameBase)}-${ts}.json`;

    try {
      await copyText(json);
      toast(t('Share JSON copied'));
      return { copied: true, downloaded: false };
    } catch (error) {
      console.warn('Clipboard share failed, downloading JSON instead:', error);
      downloadJson(filename, json);
      toast(t('Share JSON downloaded'));
      return { copied: false, downloaded: true };
    }
  }

  async function shareBuild(id, deps) {
    const { state, toast } = deps;
    const build = state.builds.find(item => item.id === id);
    if (!build) {
      toast(t('Build not found'), true);
      return null;
    }
    const payload = buildSharePayload(build, state.games, deps);
    return sharePayload(payload, `2k26-build-${build.name || build.id}`, deps);
  }

  async function shareGame(id, deps) {
    const { state, toast } = deps;
    const game = state.games.find(item => item.id === id);
    if (!game) {
      toast(t('Game not found'), true);
      return null;
    }
    const build = state.builds.find(item => item.id === game.buildId);
    const label = build && build.name ? `${build.name}-${game.date || game.id}` : `game-${game.date || game.id}`;
    const payload = gameSharePayload(game, build);
    return sharePayload(payload, `2k26-game-${label}`, deps);
  }

  async function exportBuildReport(id, deps) {
    const { state, toast } = deps;
    const build = state.builds.find(item => item.id === id);
    if (!build) {
      toast(t('Build not found'), true);
      return null;
    }
    const games = state.games.filter(game => game.buildId === id);
    const markdown = buildMarkdownReport(build, games, deps);
    const filename = `2k26-build-report-${sanitizeFilePart(build.name || build.id)}-${tsFilePart()}.md`;
    downloadText(filename, markdown);
    toast(t('Build report exported'));
    return { filename, markdown };
  }

  async function exportSeasonReport(deps) {
    const { state, toast } = deps;
    const report = seasonMarkdownReport(state, deps);
    const label = report.season ? (report.season.label || `S${report.season.n}`) : 'season';
    const filename = `2k26-season-report-${sanitizeFilePart(label)}-${tsFilePart()}.md`;
    downloadText(filename, report.markdown);
    toast(t('Season report exported'));
    return { filename, markdown: report.markdown, season: report.season };
  }

  function csvCell(value) {
    const text = value === undefined || value === null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  // Flatten every game into one spreadsheet row: box score, shooting splits,
  // derived percentages, margin, season, and the named rosters on both sides.
  function gamesToCsv(state, deps) {
    const helpers = reportDeps(deps);
    const buildName = id => (state.builds.find(build => build.id === id) || {}).name || '';
    const games = sortGamesForReport(state.games, helpers, 'asc');
    const pct = (made, att) => att > 0 ? (100 * made / att).toFixed(1) : '';
    const names = (game, side) => (game.roster && Array.isArray(game.roster[side]) ? game.roster[side] : [])
      .map(player => String(player.name || '').trim()).filter(Boolean).join('; ');
    const headers = [
      'date', 'daySeq', 'build', 'mode', 'venue', 'result', 'scoreOwn', 'scoreOpp', 'margin',
      'season', 'myPosition', 'pts', 'reb', 'ast', 'stl', 'blk', 'to', 'pf',
      'fg2m', 'fg2a', 'fg3m', 'fg3a', 'ftm', 'fta', 'fgPct', 'fg3Pct', 'ftPct',
      'pm', 'grade', 'teammates', 'opponents', 'notes',
    ];
    const rows = games.map(game => {
      const fgm = (Number(game.fg2m) || 0) + (Number(game.fg3m) || 0);
      const fga = (Number(game.fg2a) || 0) + (Number(game.fg3a) || 0);
      const own = Number(game.scoreOwn) || 0;
      const opp = Number(game.scoreOpp) || 0;
      return [
        game.date || '', game.daySeq || 1, buildName(game.buildId), game.mode || '',
        game.venue === 'away' ? 'away' : 'home', game.result || '', own, opp, own - opp,
        seasonNumberForDate(game.date, helpers) || '', game.myPosition || '',
        game.pts || 0, game.reb || 0, game.ast || 0, game.stl || 0, game.blk || 0, game.to || 0, game.pf || 0,
        game.fg2m || 0, game.fg2a || 0, game.fg3m || 0, game.fg3a || 0, game.ftm || 0, game.fta || 0,
        pct(fgm, fga), pct(game.fg3m || 0, game.fg3a || 0), pct(game.ftm || 0, game.fta || 0),
        game.pm || 0, game.grade || '', names(game, 'teammates'), names(game, 'opponents'), game.notes || '',
      ];
    });
    return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  }

  async function exportGamesCsv(deps) {
    const { state, toast, closeDataModal } = deps;
    if (!state.games.length) {
      toast(t('No games to export'), true);
      return null;
    }
    const csv = gamesToCsv(state, deps);
    const filename = `2k26-games-${tsFilePart()}.csv`;
    // Prefix a UTF-8 BOM so Excel reads non-ASCII names correctly.
    downloadText(filename, '﻿' + csv, 'text/csv;charset=utf-8');
    toast(`${t('Exported')} ${state.games.length} ${t('games')}`);
    if (typeof closeDataModal === 'function') closeDataModal();
    return { filename, csv };
  }

  async function exportData(deps) {
    const { state, toast, closeDataModal } = deps;
    const data = buildExportPayload(state);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

    link.href = url;
    link.download = `2k26-tracker-backup-${ts}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast(`${t('Exported')} ${state.builds.length} ${t('builds')} - ${state.games.length} ${t('games')}`);
    closeDataModal();
  }

  async function importData(file, deps) {
    const { state, customConfirm, saveToStorage, loadData, renderBuilds, renderOverview, toast, closeDataModal } = deps;
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const payload = normalizeImportPayload(data);

      const games = payload.games;
      const ok = await customConfirm(
        `${t('Import')} <strong style="color:var(--orange);">${payload.builds.length}</strong> ${t('builds')} / <strong style="color:var(--orange);">${games.length}</strong> ${t('games')}?<br><br>${t('Matching IDs will be overwritten.')}`,
        t('Import data')
      );
      if (!ok) return;

      let added = 0;
      let updated = 0;
      for (const build of payload.builds) {
        if (!build.id) continue;
        const exists = state.builds.find(item => item.id === build.id);
        const saved = await saveToStorage('build:' + build.id, build);
        if (saved) {
          if (exists) updated++;
          else added++;
        }
      }
      for (const game of games) {
        if (!game.id) continue;
        await saveToStorage('game:' + game.id, game);
      }

      await loadData();
      renderBuilds();
      if (document.getElementById('page-overview').classList.contains('active')) renderOverview();
      toast(`${t('Import complete')} - ${t('added')} ${added} - ${t('updated')} ${updated}`);
      closeDataModal();
    } catch (error) {
      console.error('Import failed:', error);
      toast(t('Import failed: invalid file format'), true);
    }
  }

  async function clearAllData(deps) {
    const { state, customConfirm, deleteFromStorage, toast, closeDataModal, showPage } = deps;
    const ok = await customConfirm(
      `${t('Permanently delete')}:<br><br><strong style="color:var(--red);">${state.builds.length}</strong> ${t('builds')}<br><strong style="color:var(--red);">${state.games.length}</strong> ${t('game records')}<br><br><span style="color:var(--yellow);">${t('This cannot be undone.')} ${t('Export a backup first if needed.')}</span>`,
      t('Clear all data')
    );
    if (!ok) return;

    for (const build of state.builds) {
      await deleteFromStorage('build:' + build.id);
    }
    for (const game of state.games) {
      await deleteFromStorage('game:' + game.id);
    }

    state.builds = [];
    state.games = [];
    toast(t('All data cleared'));
    closeDataModal();
    showPage('builds');
  }

  function openDataModal(state) {
    const bytes = JSON.stringify({ builds: state.builds, games: state.games }).length;
    document.getElementById('data-stats').innerHTML = `
      ${t('Current database')}:<br>
      - ${state.builds.length} ${t('builds')}<br>
      - ${state.games.length} ${t('games')}<br>
      - ${t('Estimated size')}: ${Math.round(bytes / 1024)} KB
    `;
    document.getElementById('data-modal').classList.add('active');
  }

  function closeDataModal() {
    document.getElementById('data-modal').classList.remove('active');
  }

  window.NBA2K26_DATA_PORTABILITY = {
    buildExportPayload,
    buildSharePayload,
    gameSharePayload,
    normalizeImportPayload,
    shareBuild,
    shareGame,
    exportBuildReport,
    exportSeasonReport,
    exportData,
    exportGamesCsv,
    gamesToCsv,
    importData,
    clearAllData,
    openDataModal,
    closeDataModal,
  };
})(window);
