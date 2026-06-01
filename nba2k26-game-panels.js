// NBA 2K26 game detail analysis panels.
// Renders trend and season summary panels for build detail pages.
(function(window) {
  'use strict';

  function pct(made, attempts) {
    return attempts > 0 ? (100 * made / attempts).toFixed(1) : '0.0';
  }

  function signed(value) {
    const n = Number(value) || 0;
    return n > 0 ? `+${n}` : String(n);
  }

  function jsArg(value) {
    return JSON.stringify(String(value || ''))
      .replace(/</g, '\\u003c')
      .replace(/&/g, '\\u0026');
  }

  function gameShotStats(game) {
    const fgm = (Number(game?.fg2m) || 0) + (Number(game?.fg3m) || 0);
    const fga = (Number(game?.fg2a) || 0) + (Number(game?.fg3a) || 0);
    const fg3m = Number(game?.fg3m) || 0;
    const fg3a = Number(game?.fg3a) || 0;
    return {
      fgm,
      fga,
      fg3m,
      fg3a,
      fgPct: fga ? Number(100 * fgm / fga) : 0,
      fg3Pct: fg3a ? Number(100 * fg3m / fg3a) : 0,
    };
  }

  function rosterCounts(game) {
    const roster = game?.roster || {};
    const teammates = Array.isArray(roster.teammates) ? roster.teammates.filter(player => String(player?.name || '').trim()).length : 0;
    const opponents = Array.isArray(roster.opponents) ? roster.opponents.filter(player => String(player?.name || '').trim()).length : 0;
    return { teammates, opponents, total: teammates + opponents };
  }

  function renderPostgameReview(game, games, deps) {
    const { aggregate, escapeHtml } = deps;
    if (!game || typeof aggregate !== 'function') return '';

    const allGames = Array.isArray(games) ? games : [];
    const priorGames = allGames.filter(row => row.id !== game.id);
    const priorAgg = aggregate(priorGames);
    const shots = gameShotStats(game);
    const roster = rosterCounts(game);
    const hasScore = Number(game.scoreOwn || 0) > 0 || Number(game.scoreOpp || 0) > 0;
    const scoreDiff = hasScore ? Math.abs((Number(game.scoreOwn) || 0) - (Number(game.scoreOpp) || 0)) : null;
    const won = game.result === 'W';
    const flags = [];

    const addFlag = (tone, label, value, detail) => flags.push({ tone, label, value, detail });
    if (!hasScore) addFlag('warn', t('Score'), '-', t('Add final score so W/L and plus-minus stay trustworthy.'));
    if (!roster.total) addFlag('warn', t('Roster'), '0', t('Add teammate or opponent rows to unlock chemistry reads.'));
    if (!game.grade) addFlag('warn', t('Grade'), '-', t('Add grade after the match for quality tracking.'));
    if ((Number(game.to) || 0) >= 4) addFlag('review', t('Turnovers'), game.to, t('Turnovers created the first review point.'));
    if (shots.fga >= 8 && shots.fgPct < 45) addFlag('review', t('Shot Quality'), `${shots.fgPct.toFixed(1)}%`, t('Efficiency dropped below the target range.'));
    if (shots.fg3a >= 5 && shots.fg3Pct < 33) addFlag('warn', t('3PT Selection'), `${shots.fg3m}/${shots.fg3a}`, t('Three-point volume needs a cleaner shot diet.'));
    if ((Number(game.pm) || 0) < -5) addFlag('review', t('Impact'), signed(game.pm), t('Negative plus-minus says to review lineup fit and defensive possessions.'));
    if (scoreDiff !== null && scoreDiff <= 5) addFlag('warn', t('Close Game'), `${scoreDiff}`, t('Small margin: tag what changed late in the game.'));
    if (priorGames.length >= 3) {
      const deltaPts = (Number(game.pts) || 0) - (Number.parseFloat(priorAgg.ppg) || 0);
      if (deltaPts >= 6) addFlag('good', t('Trend'), `+${deltaPts.toFixed(1)} PTS`, t('Scoring jumped above the recent baseline.'));
      if (deltaPts <= -6) addFlag('review', t('Trend'), `${deltaPts.toFixed(1)} PTS`, t('Scoring fell below the recent baseline.'));
    }
    if ((Number(game.pm) || 0) >= 8) addFlag('good', t('Impact'), signed(game.pm), t('Strong impact: protect this role next game.'));

    const mainRead = flags.find(flag => flag.tone === 'review') ||
      flags.find(flag => flag.tone === 'warn') ||
      flags.find(flag => flag.tone === 'good') ||
      { tone: won ? 'good' : 'warn', label: won ? t('Win Pattern') : t('Loss Pattern'), value: won ? t('Clean win') : t('Clean loss'), detail: won ? t('Win logged: repeat the role and test if it holds.') : t('Loss logged: isolate one fix before changing the build.') };

    let nextTarget = won
      ? t('Repeat the winning role and compare the next sample.')
      : t('Pick one adjustment and re-test this build next game.');
    if (!hasScore) nextTarget = t('Track the final score before saving the next log.');
    else if (!roster.total) nextTarget = t('Track teammates/opponents next game to close the chemistry loop.');
    else if ((Number(game.to) || 0) >= 4) nextTarget = `${t('Keep turnovers under')} ${Math.max(1, (Number(game.to) || 0) - 1)} ${t('next game.')}`;
    else if (shots.fga >= 8 && shots.fgPct < 45) nextTarget = t('Aim for 50% FG with fewer forced looks.');
    else if (shots.fg3a >= 5 && shots.fg3Pct < 33) nextTarget = t('Trim rushed threes; hunt cleaner catch-and-shoot chances.');

    const scoreText = hasScore ? `${Number(game.scoreOwn) || 0}-${Number(game.scoreOpp) || 0}` : t('No score');
    const flagCards = flags.length
      ? flags.slice(0, 6).map(flag => `
        <article class="postgame-flag ${flag.tone}">
          <span>${escapeHtml(flag.label)}</span>
          <strong>${escapeHtml(flag.value)}</strong>
          <small>${escapeHtml(flag.detail)}</small>
        </article>
      `).join('')
      : `<article class="postgame-flag good"><span>${t('Review flags')}</span><strong>${t('Clean')}</strong><small>${t('This game is clean enough to trust.')}</small></article>`;
    const buildIdArg = jsArg(game.buildId);
    const gameIdArg = jsArg(game.id);

    const GA = window.NBA2K26_GAME_ANALYSIS;
    const newPRs = (GA && typeof GA.checkNewPRs === 'function') ? GA.checkNewPRs(game, priorGames) : [];
    const nearPRs = (GA && typeof GA.nearPRReads === 'function') ? GA.nearPRReads(game, priorGames) : [];
    const prCards = [];
    newPRs.slice(0, 3).forEach(pr => {
      const prevText = pr.prev !== null ? `${t('Previous PR')}: ${pr.prev}` : t('First record');
      prCards.push(`
        <article class="pr-card pr-card-new" tabindex="0">
          <span class="pr-card-tag">🏆 ${t('NEW PR')}</span>
          <strong>${escapeHtml(pr.label)} ${pr.val}</strong>
          <small>${escapeHtml(prevText)}</small>
        </article>
      `);
    });
    nearPRs.slice(0, 3 - prCards.length).forEach(near => {
      prCards.push(`
        <article class="pr-card pr-card-near" tabindex="0">
          <span class="pr-card-tag">🎯 ${t('Near PR')}</span>
          <strong>${escapeHtml(near.label)} ${near.val} <em>/ ${near.pr}</em></strong>
          <small>${t('gap')} ${near.gap}</small>
        </article>
      `);
    });
    const prStrip = prCards.length
      ? `<div class="postgame-pr-strip" role="group" aria-label="${t('Personal record reads')}">${prCards.join('')}</div>`
      : '';

    return `
      <section class="save-feedback postgame-review ${mainRead.tone}">
        <div class="save-feedback-main">
          <div class="save-feedback-kicker">${t('POSTGAME REVIEW')}</div>
          <div class="save-feedback-title">${escapeHtml(game.result || '-')} ${escapeHtml(scoreText)} &middot; ${game.pts || 0} ${t('PTS')} &middot; ${game.reb || 0} ${t('REB')} &middot; ${game.ast || 0} ${t('AST')}</div>
          <div class="save-feedback-copy">${t('Build read updated.')} ${escapeHtml(mainRead.detail)}</div>
          <div class="postgame-next">
            <span>${t('Next target')}</span>
            <strong>${escapeHtml(nextTarget)}</strong>
          </div>
        </div>
        <div class="postgame-read">
          <span>${t('What decided it')}</span>
          <strong>${escapeHtml(mainRead.label)}</strong>
          <small>${escapeHtml(mainRead.value)}</small>
        </div>
        <div class="save-feedback-metrics">
          <div><span>${t('Roster')}</span><strong>${roster.teammates}/${roster.opponents}</strong><small>${t('teammates/opponents')}</small></div>
          <div><span>${t('Shot line')}</span><strong>${shots.fgm}/${shots.fga}</strong><small>${shots.fg3m}/${shots.fg3a} 3PT</small></div>
          <div><span>${t('Mode')}</span><strong>${escapeHtml(game.mode || '-')}</strong><small>${game.date || '-'}</small></div>
          <div><span>${t('Impact')}</span><strong>${signed(game.pm)}</strong><small>+/-</small></div>
        </div>
        ${prStrip}
        <div class="postgame-flags">${flagCards}</div>
        <div class="save-feedback-actions">
          <button class="context-action primary" onclick='openGameModal(${gameIdArg})'>${t('Review This Game')}</button>
          <button class="context-action" onclick='setDetailTab("games")'>${t('Review Games')}</button>
          ${roster.total ? `<button class="context-action" onclick='setDetailTab("roster")'>${t('Roster Chemistry')}</button>` : ''}
          <button class="context-action" onclick='openGameModal()'>${t('Record Next Game')}</button>
          <button class="context-action" onclick='exportBuildReport(${buildIdArg})'>${t('Export Report')}</button>
          <button class="context-action" onclick="dismissGameSaveFeedback()">${t('Dismiss')}</button>
        </div>
      </section>
    `;
  }

  function renderFirstGameRecap(games, deps) {
    const { escapeHtml } = deps;
    if (games.length !== 1) return '';

    const game = games[0];
    const fgm = (game.fg2m || 0) + (game.fg3m || 0);
    const fga = (game.fg2a || 0) + (game.fg3a || 0);
    const fgPct = pct(fgm, fga);
    const fg3Pct = pct(game.fg3m || 0, game.fg3a || 0);
    const scoreLine = game.scoreOwn || game.scoreOpp ? `${game.scoreOwn || 0}-${game.scoreOpp || 0}` : t('No score');
    const resultClass = game.result === 'W' ? 'win' : 'loss';
    const resultLabel = game.result === 'W' ? t('Win') : t('Loss');
    const note = game.notes ? escapeHtml(game.notes) : t('Add a short note after the next game to make trend analysis easier.');
    const read = [
      `${game.pts || 0} ${t('points')}`,
      `${game.reb || 0} ${t('rebounds')}`,
      `${game.ast || 0} ${t('assists')}`,
      `${fgPct}% FG`,
    ].join(' · ');
    const suggestion = (game.ast || 0) >= 8
      ? t('Playmaking showed up early. Track turnovers next game to see if the creation load is sustainable.')
      : (game.pts || 0) >= 25
        ? t('Scoring translated immediately. Add another game to see whether shot diet and efficiency hold.')
        : parseFloat(fgPct) >= 55
          ? t('Efficiency is the first positive signal. Keep the next sample focused on volume and role clarity.')
          : t('Treat this as a baseline. The next game should clarify whether the build needs attribute or playstyle adjustments.');

    return `
      <section class="first-game-recap">
        <div class="recap-main">
          <div class="recap-kicker">${t('FIRST GAME RECAP')}</div>
          <div class="recap-title"><span class="recap-result ${resultClass}">${resultLabel}</span> ${escapeHtml(scoreLine)} · ${escapeHtml(game.mode || 'Game')}</div>
          <div class="recap-sub">${escapeHtml(read)}</div>
          <div class="recap-note">${note}</div>
        </div>
        <div class="recap-metrics">
          <div class="recap-metric"><span>${game.grade || '-'}</span><label>${t('Grade')}</label></div>
          <div class="recap-metric"><span>${fgPct}%</span><label>FG</label></div>
          <div class="recap-metric"><span>${fg3Pct}%</span><label>3PT</label></div>
          <div class="recap-metric"><span>${signed(game.pm)}</span><label>+/-</label></div>
        </div>
        <div class="recap-next">
          <div class="recap-next-label">${t('Next Read')}</div>
          <div>${escapeHtml(suggestion)}</div>
        </div>
      </section>
    `;
  }

  function renderGameTrendPanel(games, deps) {
    const { compareRecentVsOverall, trendArrow } = deps;
    const trend = compareRecentVsOverall(games, 5);
    if (!trend) return '';

    const r = trend.recent;
    const e = trend.earlier;
    const items = [
      { label: 'PPG', cur: r.ppg, prev: e.ppg },
      { label: 'RPG', cur: r.rpg, prev: e.rpg },
      { label: 'APG', cur: r.apg, prev: e.apg },
      { label: 'FG%', cur: r.fgPct, prev: e.fgPct },
      { label: '3P%', cur: r.fg3Pct, prev: e.fg3Pct },
      { label: '+/-', cur: r.plusMinus, prev: e.plusMinus },
      { label: 'Win%', cur: r.winPct, prev: e.winPct },
    ];

    return `
      <div class="trend-wrap">
        <div class="trend-title">
          <span style="color:var(--orange);">${t('TREND')}</span> ${t('RECENT FORM')}
          <span class="trend-sub">// ${t('last')} ${trend.recentN} ${t('games')} vs ${t('previous')} ${trend.earlierN}</span>
        </div>
        <div class="trend-grid">
          ${items.map(it => `
            <div class="trend-cell">
              <div class="trend-label">${it.label}</div>
              <div class="trend-value">${it.cur}</div>
              <div class="trend-arrow">${trendArrow(it.cur, it.prev)}</div>
              <div class="trend-prev">${t('prev')} ${it.prev}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Position insight card — shown only when ≥2 different positions are logged
  function renderPositionInsightCard(games, aggregateByPosition, card, number, escapeHtml) {
    if (typeof aggregateByPosition !== 'function') return '';
    const rows = aggregateByPosition(games);
    if (rows.length < 2) return '';
    const best = rows[0];
    const others = rows.slice(1, 3).map(r => `${r.position} ${r.winPct}%W`).join(', ');
    const detail = others
      ? `${best.games} GP · ${best.ppg} PPG · ${t('others')}: ${others}`
      : `${best.games} GP · ${best.ppg} PPG`;
    const tone = number(best.winPct) >= 55 ? 'good' : number(best.winPct) <= 40 ? 'review' : '';
    return card('Best position', `${best.position} (${best.winPct}% W)`, detail, tone);
  }

  function renderSeasonInsights(games, deps) {
    const { aggregate, compareRecentVsOverall, aggregateByPosition, escapeHtml } = deps;
    if (games.length < 2) return '';

    const all = aggregate(games);
    const sorted = [...games].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
    const recentGames = sorted.slice(0, Math.min(5, sorted.length));
    const recent = aggregate(recentGames);
    const trend = compareRecentVsOverall(games, Math.min(5, Math.max(2, Math.floor(games.length / 2))));
    const wins = games.filter(game => game.result === 'W');
    const losses = games.filter(game => game.result !== 'W');
    const winAgg = aggregate(wins);
    const lossAgg = aggregate(losses);
    const number = value => parseFloat(value) || 0;
    const signedDelta = value => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
    const resultDelta = wins.length && losses.length
      ? `${signedDelta(number(winAgg.plusMinus) - number(lossAgg.plusMinus))} +/-`
      : t('Need wins and losses');
    const modeRows = Object.entries(games.reduce((acc, game) => {
      const mode = game.mode || 'Game';
      if (!acc[mode]) acc[mode] = [];
      acc[mode].push(game);
      return acc;
    }, {})).map(([mode, rows]) => ({ mode, rows, agg: aggregate(rows) }));
    modeRows.sort((a, b) =>
      (b.rows.length >= 2 ? 1 : 0) - (a.rows.length >= 2 ? 1 : 0) ||
      number(b.agg.winPct) - number(a.agg.winPct) ||
      number(b.agg.plusMinus) - number(a.agg.plusMinus) ||
      b.rows.length - a.rows.length
    );
    const bestMode = modeRows[0];
    const riskFlags = [];
    if (trend) {
      const recentTo = number(trend.recent.topg);
      const earlierTo = number(trend.earlier.topg);
      const recentFg = number(trend.recent.fgPct);
      const earlierFg = number(trend.earlier.fgPct);
      const recentPm = number(trend.recent.plusMinus);
      const earlierPm = number(trend.earlier.plusMinus);
      if (recentTo - earlierTo >= 0.8) riskFlags.push(t('Turnovers rising'));
      if (earlierFg - recentFg >= 4) riskFlags.push(t('Shooting dip'));
      if (earlierPm - recentPm >= 4) riskFlags.push(t('Plus-minus dip'));
    }
    if (!riskFlags.length && number(recent.topg) > 3) riskFlags.push(t('Turnover load high'));
    const riskText = riskFlags.length ? riskFlags.join(' / ') : t('No major efficiency risk');
    const recentText = trend
      ? `${signedDelta(number(trend.recent.winPct) - number(trend.earlier.winPct))}% W, ${signedDelta(number(trend.recent.ppg) - number(trend.earlier.ppg))} PPG`
      : `${recentAggLabel(recentGames.length)}: ${recent.winPct}% W, ${recent.ppg} PPG`;

    const card = (label, value, copy, tone = '') => `
      <article class="season-insight-card ${tone}">
        <span>${escapeHtml(t(label))}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(copy)}</small>
      </article>
    `;

    return `
      <section class="season-insight-wrap">
        <div class="season-insight-head">
          <div>
            <div class="season-insight-kicker">${t('SEASON INSIGHTS')}</div>
            <div class="season-insight-title">${t('Trend decisions, not just totals')}</div>
          </div>
          <div class="season-insight-sample">${games.length} ${t('games total')}</div>
        </div>
        <div class="season-insight-grid">
          ${card('Recent shift', recentText, trend ? t('Recent sample compared with earlier games.') : t('Recent sample only; add more games for a stronger split.'), trend && number(trend.recent.winPct) < number(trend.earlier.winPct) ? 'review' : 'good')}
          ${card('Win/loss split', resultDelta, wins.length && losses.length ? `${winAgg.ppg} ${t('PPG')} in wins, ${lossAgg.ppg} ${t('PPG')} in losses.` : t('Record both results to reveal what changes.'), wins.length && losses.length && number(winAgg.plusMinus) <= number(lossAgg.plusMinus) ? 'review' : '')}
          ${card('Efficiency risk', riskText, `${recent.topg} ${t('TOPG')} / ${recent.fgPct}% FG / ${recent.fg3Pct}% 3P ${t('recently')}`, riskFlags.length ? 'warn' : 'good')}
          ${card('Best mode', bestMode ? bestMode.mode : '-', bestMode ? `${bestMode.rows.length} GP / ${bestMode.agg.winPct}% W / ${signed(bestMode.agg.plusMinus)} +/-` : t('Mode split unlocks after logging games.'), bestMode && number(bestMode.agg.winPct) >= number(all.winPct) ? 'good' : '')}
          ${renderPositionInsightCard(games, aggregateByPosition, card, number, escapeHtml)}
        </div>
      </section>
    `;
  }

  function recentAggLabel(count) {
    return `${t('last')} ${count}`;
  }

  function renderGameSeasonSummary(games, deps) {
    const { aggregate, escapeHtml } = deps;
    if (games.length < 2) return '';

    const monthMap = {};
    games.forEach(g => {
      const d = g.date || '';
      const ym = d.length >= 7 ? d.slice(0, 7) : d.slice(0, 4);
      if (!monthMap[ym]) monthMap[ym] = [];
      monthMap[ym].push(g);
    });

    const monthKeys = Object.keys(monthMap).sort().reverse();
    const monthCards = monthKeys.map(ym => {
      const mg = monthMap[ym];
      const a = aggregate(mg);
      const label = ym || 'Unknown';
      return `
        <div class="month-card">
          <div class="month-label">${escapeHtml(label)}</div>
          <div class="month-stats">
            <div class="month-stat"><span class="month-stat-label">${t('Games')}</span><span class="month-stat-value">${mg.length}</span></div>
            <div class="month-stat"><span class="month-stat-label">${t('Record')}</span><span class="month-stat-value"><span class="result-w">${a.wins}W</span> <span class="result-l">${a.losses}L</span></span></div>
            <div class="month-stat"><span class="month-stat-label">${t('Win %')}</span><span class="month-stat-value ${parseFloat(a.winPct) >= 50 ? 'good' : 'bad'}">${a.winPct}%</span></div>
            <div class="month-stat"><span class="month-stat-label">${t('PPG')}</span><span class="month-stat-value hot">${a.ppg}</span></div>
            <div class="month-stat"><span class="month-stat-label">${t('RPG')}</span><span class="month-stat-value">${a.rpg}</span></div>
            <div class="month-stat"><span class="month-stat-label">${t('APG')}</span><span class="month-stat-value">${a.apg}</span></div>
            <div class="month-stat"><span class="month-stat-label">FG%</span><span class="month-stat-value">${a.fgPct}</span></div>
            <div class="month-stat"><span class="month-stat-label">3P%</span><span class="month-stat-value">${a.fg3Pct}</span></div>
          </div>
        </div>
      `;
    }).join('');

    const sorted = [...games].sort((a, b) => window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a, b, 'asc'));
    let maxWin = 0;
    let maxLose = 0;
    let curWin = 0;
    let curLose = 0;
    sorted.forEach(g => {
      if (g.result === 'W') {
        curWin++;
        curLose = 0;
        maxWin = Math.max(maxWin, curWin);
      } else {
        curLose++;
        curWin = 0;
        maxLose = Math.max(maxLose, curLose);
      }
    });

    const best = (fn, cmp) => {
      let record = null;
      games.forEach(g => {
        const value = fn(g);
        if (value !== null && (record === null || cmp(value, fn(record)))) record = g;
      });
      return record;
    };

    const records = [
      { label: t('High PTS'), value: best(g => g.pts,  (v, bv) => v > bv), fmt: g => g ? g.pts  : '-' },
      { label: t('High REB'), value: best(g => g.reb,  (v, bv) => v > bv), fmt: g => g ? g.reb  : '-' },
      { label: t('High AST'), value: best(g => g.ast,  (v, bv) => v > bv), fmt: g => g ? g.ast  : '-' },
      { label: t('High STL'), value: best(g => g.stl,  (v, bv) => v > bv), fmt: g => g ? g.stl  : '-' },
      { label: t('High BLK'), value: best(g => g.blk,  (v, bv) => v > bv), fmt: g => g ? g.blk  : '-' },
      { label: t('High 3PM'), value: best(g => g.fg3m, (v, bv) => v > bv), fmt: g => g ? g.fg3m : '-' },
      { label: t('High +/-'), value: best(g => g.pm,   (v, bv) => v > bv), fmt: g => g ? (g.pm >= 0 ? '+' : '') + g.pm : '-' },
    ];

    const recordsHtml = records.map(record => {
      const g = record.value;
      return `
        <div class="record-cell">
          <div class="record-value">${record.fmt(g)}</div>
          <div class="record-label">${record.label}</div>
          ${g ? `<div class="record-meta">${escapeHtml(g.mode)} - ${g.date || '-'}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="season-wrap">
        <div class="season-title">
          <span style="color:var(--yellow);">${t('SEASON')}</span> ${t('SUMMARY')}
          <span class="season-sub">${games.length} ${t('games total')}</span>
        </div>

        <div class="streak-row">
          <div class="streak-card win">
            <div class="streak-num">${maxWin}</div>
            <div class="streak-label">${t('Longest win streak')}</div>
          </div>
          <div class="streak-card lose">
            <div class="streak-num">${maxLose}</div>
            <div class="streak-label">${t('Longest loss streak')}</div>
          </div>
        </div>

        <div class="season-title" style="font-size:11px;margin-top:4px;">
          <span style="color:var(--orange);">${t('MONTHLY')}</span> ${t('TREND')}
        </div>
        <div class="month-grid">${monthCards}</div>

        <div class="season-title" style="font-size:11px;margin-top:4px;">
          <span style="color:var(--yellow);">${t('SINGLE-GAME')}</span> ${t('RECORDS')}
        </div>
        <div class="records-grid">${recordsHtml}</div>
      </div>
    `;
  }

  function renderRosterChemistry(games, deps) {
    const { aggregateRoster, escapeHtml } = deps;
    if (!games.some(game => game.roster && (
      (Array.isArray(game.roster.teammates) && game.roster.teammates.length) ||
      (Array.isArray(game.roster.opponents) && game.roster.opponents.length)
    ))) return '';

    const renderRows = (rows, emptyText) => rows.length ? rows.slice(0, 12).map(row => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.games}</td>
        <td><span class="${parseFloat(row.winPct) >= 50 ? 'result-w' : 'result-l'}">${row.winPct}%</span></td>
        <td>${row.ppg}</td>
        <td>${row.rpg}</td>
        <td>${row.apg}</td>
        <td>${row.spg}</td>
        <td>${row.bpg}</td>
        <td>${row.topg}</td>
        <td>${row.fgPct}</td>
        <td>${row.fg3Pct}</td>
        <td class="${parseFloat(row.plusMinus) >= 0 ? 'pm-pos' : 'pm-neg'}">${parseFloat(row.plusMinus) >= 0 ? '+' : ''}${row.plusMinus}</td>
      </tr>
    `).join('') : `<tr><td colspan="12" class="roster-empty">${escapeHtml(emptyText)}</td></tr>`;

    const num = value => Number.parseFloat(value) || 0;
    const one = value => (Number(value) || 0).toFixed(1);
    const signedOne = value => `${num(value) >= 0 ? '+' : ''}${one(value)}`;
    const playerStat = (player, key) => Number(player?.[key]) || 0;
    const uniquePlayers = (game, side) => {
      const players = game.roster && Array.isArray(game.roster[side]) ? game.roster[side] : [];
      const seen = new Map();
      players.forEach(player => {
        const name = String(player?.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!seen.has(key)) seen.set(key, { ...player, name, key });
      });
      return [...seen.values()];
    };
    const buildTeammatePairs = () => {
      const pairs = new Map();
      games.forEach(game => {
        const players = uniquePlayers(game, 'teammates');
        if (players.length < 2) return;
        for (let i = 0; i < players.length - 1; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const duo = [players[i], players[j]].sort((a, b) => a.key.localeCompare(b.key));
            const key = `${duo[0].key}|${duo[1].key}`;
            const row = pairs.get(key) || {
              names: [duo[0].name, duo[1].name],
              games: 0,
              wins: 0,
              pts: 0,
              ast: 0,
              pm: 0,
            };
            row.games += 1;
            if (game.result === 'W') row.wins += 1;
            row.pts += playerStat(duo[0], 'pts') + playerStat(duo[1], 'pts');
            row.ast += playerStat(duo[0], 'ast') + playerStat(duo[1], 'ast');
            row.pm += playerStat(duo[0], 'pm') + playerStat(duo[1], 'pm');
            pairs.set(key, row);
          }
        }
      });
      return [...pairs.values()].map(row => {
        const winPct = row.games ? (100 * row.wins / row.games) : 0;
        const plusMinus = row.games ? row.pm / row.games : 0;
        const ppg = row.games ? row.pts / row.games : 0;
        const apg = row.games ? row.ast / row.games : 0;
        return {
          ...row,
          winPct,
          plusMinus,
          ppg,
          apg,
          score: (winPct * 0.65) + (plusMinus * 3) + (ppg * 0.25) + (Math.min(row.games, 8) * 4),
        };
      }).sort((a, b) => b.score - a.score || b.games - a.games || b.winPct - a.winPct);
    };
    const buildOpponentMatchups = () => {
      const rows = new Map();
      games.forEach(game => {
        uniquePlayers(game, 'opponents').forEach(player => {
          const key = player.key;
          const row = rows.get(key) || {
            name: player.name,
            games: 0,
            wins: 0,
            pts: 0,
            ast: 0,
            pm: 0,
          };
          row.games += 1;
          if (game.result === 'W') row.wins += 1;
          row.pts += playerStat(player, 'pts');
          row.ast += playerStat(player, 'ast');
          row.pm += playerStat(player, 'pm');
          rows.set(key, row);
        });
      });
      return [...rows.values()].map(row => {
        const winPct = row.games ? (100 * row.wins / row.games) : 0;
        const ppg = row.games ? row.pts / row.games : 0;
        const apg = row.games ? row.ast / row.games : 0;
        const plusMinus = row.games ? row.pm / row.games : 0;
        return {
          ...row,
          winPct,
          ppg,
          apg,
          plusMinus,
          difficulty: ((100 - winPct) * 0.8) + (ppg * 0.55) + (plusMinus * 3) + (Math.min(row.games, 8) * 3),
        };
      }).sort((a, b) => b.difficulty - a.difficulty || b.games - a.games || b.ppg - a.ppg);
    };
    const pairLabel = row => {
      if (!row) return '';
      if (row.games >= 3 && row.winPct >= 70 && row.plusMinus >= 3) return t('Core Duo');
      if (row.winPct >= 60 && row.plusMinus >= 0) return t('Hot Pair');
      if (row.winPct < 45 || row.plusMinus < -3) return t('Needs Review');
      return t('Stable Pair');
    };
    const matchupLabel = row => {
      if (!row) return '';
      if (row.games >= 2 && row.winPct <= 40 && row.plusMinus >= 1) return t('Nemesis');
      if (row.winPct >= 60 && row.plusMinus <= 0) return t('Favorable');
      return t('Even Rival');
    };
    const teammateRows = aggregateRoster(games, 'teammates');
    const opponentRows = aggregateRoster(games, 'opponents');
    const allRows = [
      ...teammateRows.map(row => ({ ...row, side: t('Teammate') })),
      ...opponentRows.map(row => ({ ...row, side: t('Opponent') })),
    ];
    const max = (rows, key) => Math.max(1, ...rows.map(row => Math.abs(parseFloat(row[key]) || 0)));
    const maxGames = max(allRows, 'games');
    const maxPts = max(allRows, 'ppg');
    const maxAst = max(allRows, 'apg');
    const maxPm = max(allRows, 'plusMinus');
    const clampPct = value => Math.max(3, Math.min(100, Number(value) || 0));
    const bar = (label, value, width, tone = '') => `
      <div class="player-bar-row">
        <span>${escapeHtml(label)}</span>
        <div class="player-bar-track"><i class="${tone}" style="width:${clampPct(width)}%;"></i></div>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
    const renderPlayerCard = (row, rank, sideClass) => `
      <article class="player-visual-card ${sideClass}">
        <div class="player-visual-head">
          <span>#${rank} ${escapeHtml(row.side)}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <small>${row.games} GP · ${row.winPct}% W · ${parseFloat(row.plusMinus) >= 0 ? '+' : ''}${row.plusMinus}</small>
        </div>
        <div class="player-bars">
          ${bar('Sample', `${row.games} GP`, (row.games / maxGames) * 100, 'sample')}
          ${bar('Win%', `${row.winPct}%`, parseFloat(row.winPct), parseFloat(row.winPct) >= 50 ? 'good' : 'bad')}
          ${bar('PPG', row.ppg, (parseFloat(row.ppg) / maxPts) * 100, 'score')}
          ${bar('APG', row.apg, (parseFloat(row.apg) / maxAst) * 100, 'assist')}
          ${bar('+/-', `${parseFloat(row.plusMinus) >= 0 ? '+' : ''}${row.plusMinus}`, (Math.abs(parseFloat(row.plusMinus) || 0) / maxPm) * 100, parseFloat(row.plusMinus) >= 0 ? 'good' : 'bad')}
        </div>
      </article>
    `;
    const topPlayers = allRows
      .slice()
      .sort((a, b) =>
        parseFloat(b.winPct) - parseFloat(a.winPct) ||
        parseFloat(b.plusMinus) - parseFloat(a.plusMinus) ||
        parseFloat(b.ppg) - parseFloat(a.ppg) ||
        b.games - a.games
      )
      .slice(0, 4);
    const teammatePairs = buildTeammatePairs();
    const opponentMatchups = buildOpponentMatchups();
    const reliablePairs = teammatePairs.filter(row => row.games >= 2);
    const topPair = reliablePairs[0] || teammatePairs[0];
    const riskPair = (reliablePairs.length ? [...reliablePairs] : [...teammatePairs])
      .sort((a, b) => a.winPct - b.winPct || a.plusMinus - b.plusMinus || b.games - a.games)[0];
    const bestTeammate = [...teammateRows].sort((a, b) =>
      num(b.winPct) - num(a.winPct) ||
      num(b.plusMinus) - num(a.plusMinus) ||
      b.games - a.games
    )[0];
    const toughestOpponent = opponentMatchups[0];
    const favorableTarget = [...opponentMatchups].sort((a, b) =>
      b.winPct - a.winPct ||
      a.plusMinus - b.plusMinus ||
      b.games - a.games
    )[0];
    const teammateTotals = teammateRows.reduce((acc, row) => ({
      games: acc.games + row.games,
      pts: acc.pts + row.pts,
      ast: acc.ast + row.ast,
      pm: acc.pm + row.pm,
    }), { games: 0, pts: 0, ast: 0, pm: 0 });
    const opponentTotals = opponentRows.reduce((acc, row) => ({
      games: acc.games + row.games,
      pts: acc.pts + row.pts,
      ast: acc.ast + row.ast,
      pm: acc.pm + row.pm,
    }), { games: 0, pts: 0, ast: 0, pm: 0 });
    const avgTotal = (total, gamesCount) => gamesCount ? (total / gamesCount).toFixed(1) : '0.0';
    const trackedGames = games.filter(game => game.roster && (
      (Array.isArray(game.roster.teammates) && game.roster.teammates.length) ||
      (Array.isArray(game.roster.opponents) && game.roster.opponents.length)
    )).length;
    const relationMeta = (row, fallback) => row
      ? `${row.games} GP &middot; ${one(row.winPct)}% W &middot; ${signedOne(row.plusMinus)} +/-`
      : escapeHtml(t(fallback));
    const relationCards = [
      {
        label: t('Best ally'),
        name: bestTeammate?.name || '-',
        meta: relationMeta(bestTeammate, 'No teammate data yet.'),
        tone: 'good',
      },
      {
        label: t('Top duo'),
        name: topPair ? topPair.names.join(' + ') : '-',
        meta: topPair ? `${topPair.games} GP &middot; ${one(topPair.winPct)}% W &middot; ${pairLabel(topPair)}` : escapeHtml(t('No pair data yet.')),
        tone: 'good',
      },
      {
        label: t('Risk pairing'),
        name: riskPair ? riskPair.names.join(' + ') : '-',
        meta: riskPair ? `${riskPair.games} GP &middot; ${one(riskPair.winPct)}% W &middot; ${signedOne(riskPair.plusMinus)} +/-` : escapeHtml(t('No pair data yet.')),
        tone: 'warn',
      },
      {
        label: t('Toughest rival'),
        name: toughestOpponent?.name || '-',
        meta: relationMeta(toughestOpponent, 'No opponent data yet.'),
        tone: 'bad',
      },
      {
        label: t('Favorable target'),
        name: favorableTarget?.name || '-',
        meta: favorableTarget ? `${favorableTarget.games} GP &middot; ${one(favorableTarget.winPct)}% W &middot; ${matchupLabel(favorableTarget)}` : escapeHtml(t('No opponent data yet.')),
        tone: 'good',
      },
    ].map(card => `
      <article class="relationship-card ${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.name)}</strong>
        <small>${card.meta}</small>
      </article>
    `).join('');
    const pairRows = teammatePairs.length ? teammatePairs.slice(0, 6).map(row => `
      <article class="chem-pair-row ${row.winPct >= 60 && row.plusMinus >= 0 ? 'good' : row.winPct < 45 || row.plusMinus < -3 ? 'bad' : ''}">
        <div class="chem-pair-main">
          <strong>${escapeHtml(row.names.join(' + '))}</strong>
          <span>${row.games} GP &middot; ${one(row.winPct)}% W &middot; ${signedOne(row.plusMinus)} +/-</span>
        </div>
        <div class="chem-pair-stats">
          <span>${one(row.ppg)} ${t('PPG')}</span>
          <span>${one(row.apg)} ${t('APG')}</span>
          <b>${escapeHtml(pairLabel(row))}</b>
        </div>
      </article>
    `).join('') : `<div class="roster-empty">${t('Track two or more teammates in the same game to unlock pair chemistry.')}</div>`;
    const matchupRows = opponentMatchups.length ? opponentMatchups.slice(0, 6).map(row => `
      <article class="chem-matchup-row ${row.winPct >= 60 && row.plusMinus <= 0 ? 'good' : row.winPct <= 40 && row.plusMinus >= 1 ? 'bad' : ''}">
        <div class="chem-pair-main">
          <strong>${escapeHtml(row.name)}</strong>
          <span>${row.games} GP &middot; ${one(row.winPct)}% ${t('User win rate')} &middot; ${signedOne(row.plusMinus)} +/-</span>
        </div>
        <div class="chem-pair-stats">
          <span>${one(row.ppg)} ${t('PPG')}</span>
          <span>${one(row.apg)} ${t('APG')}</span>
          <b>${escapeHtml(matchupLabel(row))}</b>
        </div>
      </article>
    `).join('') : `<div class="roster-empty">${t('No opponent data yet.')}</div>`;
    const confidence = row => row.games >= 5 ? t('High confidence') : row.games >= 3 ? t('Medium confidence') : t('Small sample');
    const teammateScore = row =>
      num(row.winPct) * 0.58 +
      num(row.plusMinus) * 5 +
      num(row.ppg) * 0.25 +
      num(row.apg) * 1.2 +
      Math.min(row.games, 8) * 3;
    const teammateRiskScore = row =>
      (100 - num(row.winPct)) * 0.55 +
      Math.max(0, -num(row.plusMinus)) * 6 +
      Math.max(0, num(row.topg) - 2) * 5 +
      Math.min(row.games, 8) * 2;
    const recommendTeammates = teammateRows
      .map(row => ({
        tone: 'good',
        name: row.name,
        tag: t('Play with'),
        score: teammateScore(row),
        confidence: confidence(row),
        meta: `${row.games} GP / ${row.winPct}% W / ${signedOne(row.plusMinus)} +/-`,
        reason: num(row.winPct) >= 60
          ? t('Wins travel with this teammate.')
          : num(row.plusMinus) >= 2
            ? t('Lineups with this teammate usually swing positive.')
            : t('Useful sample; keep testing the fit.'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const avoidTeammates = teammateRows
      .filter(row => row.games >= 2 && (num(row.winPct) < 48 || num(row.plusMinus) < -2.5 || num(row.topg) >= 3))
      .map(row => ({
        tone: 'warn',
        name: row.name,
        tag: t('Use caution'),
        score: teammateRiskScore(row),
        confidence: confidence(row),
        meta: `${row.games} GP / ${row.winPct}% W / ${signedOne(row.plusMinus)} +/-`,
        reason: num(row.plusMinus) < -2.5
          ? t('Negative plus-minus keeps showing up with this fit.')
          : num(row.winPct) < 48
            ? t('Win rate says this pairing needs context before trusting it.')
            : t('Turnover profile makes this lineup risky.'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const recommendDuos = teammatePairs
      .filter(row => row.games >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(row => ({
        tone: row.winPct >= 60 && row.plusMinus >= 0 ? 'good' : 'neutral',
        name: row.names.join(' + '),
        tag: t('Duo'),
        confidence: confidence(row),
        meta: `${row.games} GP / ${one(row.winPct)}% W / ${signedOne(row.plusMinus)} +/-`,
        reason: row.winPct >= 60 && row.plusMinus >= 0
          ? t('Best two-player chemistry in the current sample.')
          : t('Promising duo; needs more games before locking it in.'),
      }));
    const opponentAvoid = opponentMatchups
      .filter(row => row.games >= 1)
      .slice(0, 4)
      .map(row => ({
        tone: row.winPct <= 45 || row.plusMinus >= 2 ? 'bad' : 'warn',
        name: row.name,
        tag: t('Prepare for'),
        confidence: confidence(row),
        meta: `${row.games} GP / ${one(row.winPct)}% ${t('User win rate')} / ${signedOne(row.plusMinus)} +/-`,
        reason: row.winPct <= 45
          ? t('This matchup has suppressed your win rate.')
          : row.plusMinus >= 2
            ? t('Their box score impact is trending dangerous.')
            : t('Respect the matchup; difficulty score is high.'),
      }));
    const targetOpponents = [...opponentMatchups]
      .filter(row => row.games >= 1)
      .sort((a, b) =>
        b.winPct - a.winPct ||
        a.plusMinus - b.plusMinus ||
        b.games - a.games
      )
      .slice(0, 4)
      .map(row => ({
        tone: 'good',
        name: row.name,
        tag: t('Attack'),
        confidence: confidence(row),
        meta: `${row.games} GP / ${one(row.winPct)}% ${t('User win rate')} / ${signedOne(row.plusMinus)} +/-`,
        reason: row.winPct >= 60
          ? t('You have controlled this matchup so far.')
          : t('This looks like the softer side of the matchup map.'),
      }));
    const renderRecList = (title, subtitle, rows, emptyText) => `
      <section class="lineup-rec-list">
        <div class="lineup-rec-list-head">
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(subtitle)}</small>
        </div>
        <div class="lineup-rec-rows">
          ${rows.length ? rows.map(row => `
            <article class="lineup-rec-row ${row.tone}">
              <div class="lineup-rec-main">
                <span>${escapeHtml(row.tag)}</span>
                <strong>${escapeHtml(row.name)}</strong>
                <small>${escapeHtml(row.reason)}</small>
              </div>
              <div class="lineup-rec-meta">
                <b>${escapeHtml(row.confidence)}</b>
                <em>${escapeHtml(row.meta)}</em>
              </div>
            </article>
          `).join('') : `<div class="roster-empty">${escapeHtml(emptyText)}</div>`}
        </div>
      </section>
    `;
    const lineupRecommendationPanel = `
      <section class="lineup-advisor-board">
        <div class="chem-board-head">
          <div>
            <span>${t('LINEUP ADVISOR')}</span>
            <strong>${t('Recommendation and avoid list')}</strong>
          </div>
          <small>${t('Uses teammate fit, duo chemistry, opponent difficulty, sample size, wins, and plus-minus.')}</small>
        </div>
        <div class="lineup-advisor-grid">
          ${renderRecList(t('Recommended teammates'), t('Use these names when you can choose the run.'), recommendTeammates, t('Need teammate rows before recommendations are reliable.'))}
          ${renderRecList(t('Caution teammates'), t('Do not ban them; review role, mode, and sample first.'), avoidTeammates, t('No teammate avoid flags yet.'))}
          ${renderRecList(t('Recommended duos'), t('Best two-player combinations from shared games.'), recommendDuos, t('Track two teammates in the same game to unlock duo advice.'))}
          ${renderRecList(t('Avoid / prepare opponents'), t('Hard matchups that deserve a specific plan.'), opponentAvoid, t('No opponent avoid flags yet.'))}
          ${renderRecList(t('Attackable opponents'), t('Matchups where your build has produced results.'), targetOpponents, t('No favorable opponent data yet.'))}
        </div>
      </section>
    `;

    return `
      <div class="roster-chem-wrap">
        <div class="season-title">
          <span style="color:var(--orange);">${t('ROSTER')}</span> ${t('CHEMISTRY')}
          <span class="season-sub">${trackedGames} ${t('games with player data')}</span>
        </div>
        <section class="player-visual-wrap">
          <div class="player-visual-headline">
            <div>
              <div class="player-visual-kicker">${t('PLAYER MAP')}</div>
              <div class="player-visual-title">${t('Who changes the game?')}</div>
            </div>
            <div class="player-visual-summary">
              <span>${t('Teammates')}: ${teammateRows.length}</span>
              <span>${t('Opponents')}: ${opponentRows.length}</span>
              <span>${t('Pair appearances')}: ${teammatePairs.length}</span>
            </div>
          </div>
          <div class="player-visual-grid">
            ${topPlayers.length ? topPlayers.map((row, index) => renderPlayerCard(row, index + 1, row.side === t('Teammate') ? 'teammate' : 'opponent')).join('') : `<div class="roster-empty">${t('No player data yet.')}</div>`}
          </div>
          <div class="player-split-grid">
            <div class="player-split-card">
              <span>${t('Teammate production')}</span>
              <strong>${avgTotal(teammateTotals.pts, teammateTotals.games)} ${t('PPG')}</strong>
              <small>${avgTotal(teammateTotals.ast, teammateTotals.games)} ${t('APG')} · ${avgTotal(teammateTotals.pm, teammateTotals.games)} +/-</small>
            </div>
            <div class="player-split-card opponent">
              <span>${t('Opponent production')}</span>
              <strong>${avgTotal(opponentTotals.pts, opponentTotals.games)} ${t('PPG')}</strong>
              <small>${avgTotal(opponentTotals.ast, opponentTotals.games)} ${t('APG')} · ${avgTotal(opponentTotals.pm, opponentTotals.games)} +/-</small>
            </div>
          </div>
        </section>
        <section class="chemistry-board">
          <div class="chem-board-head">
            <div>
              <span>${t('RELATIONSHIP MAP')}</span>
              <strong>${t('Player relationship scorecard')}</strong>
            </div>
            <small>${t('Built from teammate pairs, opponent matchups, wins, and plus-minus.')}</small>
          </div>
          <div class="relationship-card-grid">${relationCards}</div>
        </section>
        ${lineupRecommendationPanel}
        <div class="chem-board-grid">
          <section class="chemistry-board">
            <div class="chem-board-head">
              <div>
                <span>${t('LINEUP CHEMISTRY')}</span>
                <strong>${t('Top teammate pairs')}</strong>
              </div>
              <small>${t('Pair stats count games where both players appeared together.')}</small>
            </div>
            <div class="chem-pair-list">${pairRows}</div>
          </section>
          <section class="chemistry-board">
            <div class="chem-board-head">
              <div>
                <span>${t('MATCHUP MAP')}</span>
                <strong>${t('Opponent difficulty')}</strong>
              </div>
              <small>${t('W% is your win rate against them. +/- is their box score impact.')}</small>
            </div>
            <div class="chem-pair-list">${matchupRows}</div>
          </section>
        </div>
        <div class="roster-chem-grid">
          <section class="roster-chem-card">
            <div class="roster-chem-title">${t('Teammates')}</div>
            <div class="roster-table-wrap">
              <table class="roster-table">
                <thead><tr><th>${t('Player')}</th><th>GP</th><th>W%</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG%</th><th>3P%</th><th>+/-</th></tr></thead>
                <tbody>${renderRows(teammateRows, t('No teammate data yet.'))}</tbody>
              </table>
            </div>
          </section>
          <section class="roster-chem-card">
            <div class="roster-chem-title">${t('Opponents')}</div>
            <div class="roster-table-wrap">
              <table class="roster-table">
                <thead><tr><th>${t('Player')}</th><th>GP</th><th>W%</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG%</th><th>3P%</th><th>+/-</th></tr></thead>
                <tbody>${renderRows(opponentRows, t('No opponent data yet.'))}</tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderRosterSummary(games, deps) {
    const { aggregateRoster, escapeHtml } = deps;
    const teammates = aggregateRoster(games, 'teammates');
    const opponents = aggregateRoster(games, 'opponents');
    if (!teammates.length && !opponents.length) return '';

    const byWinAndSample = rows => [...rows].sort((a, b) =>
      b.games - a.games ||
      parseFloat(b.winPct) - parseFloat(a.winPct) ||
      parseFloat(b.plusMinus) - parseFloat(a.plusMinus)
    );
    const bestTeammate = [...teammates].sort((a, b) =>
      parseFloat(b.winPct) - parseFloat(a.winPct) ||
      parseFloat(b.plusMinus) - parseFloat(a.plusMinus) ||
      b.games - a.games
    )[0];
    const commonOpponent = byWinAndSample(opponents)[0];
    const riskyTeammate = [...teammates].filter(row => row.games >= 2).sort((a, b) =>
      parseFloat(a.winPct) - parseFloat(b.winPct) ||
      parseFloat(a.plusMinus) - parseFloat(b.plusMinus)
    )[0] || teammates[teammates.length - 1];

    const card = (label, row, fallback, extra = '') => `
      <div class="chem-summary-card">
        <div class="chem-summary-label">${escapeHtml(t(label))}</div>
        <div class="chem-summary-name">${row ? escapeHtml(row.name) : '-'}</div>
        <div class="chem-summary-meta">${row ? `${row.games} GP · ${row.winPct}% W · ${parseFloat(row.plusMinus) >= 0 ? '+' : ''}${row.plusMinus} +/-${extra}` : escapeHtml(t(fallback))}</div>
      </div>
    `;

    return `
      <div class="chem-summary-grid">
        ${card('Best teammate', bestTeammate, 'No teammate data yet.')}
        ${card('Common opponent', commonOpponent, 'No opponent data yet.', commonOpponent ? ` · ${commonOpponent.ppg} PPG` : '')}
        ${card('Watch pairing', riskyTeammate, 'Need at least one teammate row.')}
      </div>
    `;
  }

  function renderHighlightsGallery(games, deps) {
    const { escapeHtml } = deps;
    const allMedia = [];
    games.forEach(game => {
      if (!Array.isArray(game.media) || !game.media.length) return;
      game.media.forEach(item => {
        if (item && item.dataUrl) {
          allMedia.push({ ...item, gameDate: game.date, gameMode: game.mode, gameResult: game.result, gameId: game.id });
        }
      });
    });
    if (!allMedia.length) return '';

    return `
      <div class="highlights-gallery-wrap">
        <div class="season-title">
          <span style="color:var(--orange);">${t('HIGHLIGHTS')}</span> ${t('GALLERY')}
          <span class="season-sub">${allMedia.length} ${t('screenshots')}</span>
        </div>
        <div class="highlights-grid">
          ${allMedia.map(item => `
            <div class="highlight-card" data-game-id="${escapeHtml(item.gameId)}" onclick="openGameModal(this.dataset.gameId)">
              <div class="highlight-img-wrap">
                <img class="highlight-img" src="${item.dataUrl}" alt="${t('Screenshot')}" loading="lazy">
                <div class="highlight-badge ${item.gameResult === 'W' ? 'win' : 'loss'}">${item.gameResult || '-'}</div>
              </div>
              ${item.caption ? `<div class="highlight-caption">${escapeHtml(item.caption)}</div>` : ''}
              <div class="highlight-meta">${escapeHtml(item.gameMode || '-')} · ${item.gameDate || '-'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.NBA2K26_GAME_PANELS = {
    renderFirstGameRecap,
    renderPostgameReview,
    renderTrendPanel: renderGameTrendPanel,
    renderSeasonInsights,
    renderSeasonSummary: renderGameSeasonSummary,
    renderRosterChemistry,
    renderRosterSummary,
    renderHighlightsGallery,
  };
})(window);
