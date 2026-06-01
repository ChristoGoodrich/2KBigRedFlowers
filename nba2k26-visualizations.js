// NBA 2K26 visual analytics panels.
// Pure HTML/SVG renderers shared by account overview and build detail pages.
(function(window) {
  'use strict';

  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const fmt = (value, digits = 1) => num(value).toFixed(digits);
  const signed = value => `${num(value) >= 0 ? '+' : ''}${fmt(value)}`;
  const percent = (made, att) => att ? fmt((made / att) * 100) : '0.0';
  const safe = (fn, value) => fn ? fn(value) : String(value ?? '');
  const tr = value => typeof window.t === 'function' ? window.t(value) : value;
  const jsArg = value => JSON.stringify(String(value ?? ''));

  function byDateAsc(a, b) {
    return window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a, b, 'asc');
  }

  function scoreGame(game) {
    return num(game.pts) + num(game.reb) * 1.2 + num(game.ast) * 1.5 +
      num(game.stl) * 2 + num(game.blk) * 2 - num(game.to) * 1.5 + num(game.pm) * 0.35;
  }

  function tooltipHtml(lines, escapeHtml) {
    return `
      <span class="viz-tooltip" role="tooltip">
        ${lines.map(line => `<span>${safe(escapeHtml, line)}</span>`).join('')}
      </span>
    `;
  }

  function shotTotals(games) {
    return games.reduce((acc, game) => {
      acc.fg2m += num(game.fg2m);
      acc.fg2a += num(game.fg2a);
      acc.fg3m += num(game.fg3m);
      acc.fg3a += num(game.fg3a);
      acc.ftm += num(game.ftm);
      acc.fta += num(game.fta);
      return acc;
    }, { fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 });
  }

  function statTotals(games) {
    return games.reduce((acc, game) => {
      ['pts', 'reb', 'ast', 'stl', 'blk', 'to', 'pm'].forEach(key => { acc[key] += num(game[key]); });
      return acc;
    }, { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pm: 0 });
  }

  function pointsFor(games, maxHeight = 86) {
    if (!games.length) return '';
    const scores = games.map(scoreGame);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = Math.max(1, max - min);
    return scores.map((score, index) => {
      const x = games.length === 1 ? 50 : (index / (games.length - 1)) * 100;
      const y = maxHeight - ((score - min) / range) * (maxHeight - 8);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function miniTimeline(games, escapeHtml, escapeAttr) {
    const sorted = [...games].sort(byDateAsc).slice(-14);
    if (!sorted.length) {
      return `<div class="viz-empty">${tr('Record games to unlock trend lines.')}</div>`;
    }
    const scores = sorted.map(scoreGame);
    const maxScore = Math.max(1, ...scores.map(Math.abs));
    const latestScore = scores[scores.length - 1];
    const peakScore = Math.max(...scores);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return `
      <div class="viz-pulse-help">${tr('Recent 14 games, left to right. Bar height is performance score, not points.')}</div>
      <div class="viz-read-guide" role="note">
        <strong>${tr('How to read')}</strong>
        <span>${tr('Hover, focus, or tap chart items for exact values. Game bars open the source record.')}</span>
      </div>
      <div class="viz-score-strip">
        <div><span>${tr('Latest score')}</span><strong>${fmt(latestScore)}</strong></div>
        <div><span>${tr('Average score')}</span><strong>${fmt(avgScore)}</strong></div>
        <div><span>${tr('Peak score')}</span><strong>${fmt(peakScore)}</strong></div>
        <div><span>${tr('Sample')}</span><strong>${sorted.length}</strong></div>
      </div>
      <div class="viz-timeline" role="group" aria-label="${safe(escapeAttr, tr('Recent performance score timeline'))}">
        <svg class="viz-sparkline" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pointsFor(sorted)}"></polyline>
        </svg>
        <div class="viz-bars">
          ${sorted.map(game => {
            const score = scoreGame(game);
            const height = clamp((Math.abs(score) / maxScore) * 100, 10, 100);
            const title = `${game.date || '-'} ${game.result || '-'} ${game.pts || 0} PTS ${signed(game.pm || 0)} +/- score ${fmt(score)}`;
            const open = game.id ? ` onclick='openGameModal(${jsArg(game.id)})'` : '';
            return `
              <button class="viz-game-bar ${game.result === 'W' ? 'win' : 'loss'}" type="button" title="${safe(escapeAttr, title)}" aria-label="${safe(escapeAttr, title)}"${open}>
                <i style="height:${height.toFixed(0)}%"></i>
                <small>${safe(escapeHtml, game.result || '-')}</small>
                ${tooltipHtml([
                  `${game.date || '-'} - ${game.result || '-'}`,
                  `${game.pts || 0} PTS / ${game.reb || 0} REB / ${game.ast || 0} AST`,
                  `${game.stl || 0} STL / ${game.blk || 0} BLK / ${game.to || 0} TO`,
                  `${signed(game.pm || 0)} +/- / ${fmt(score)} score`,
                ], escapeHtml)}
              </button>
            `;
          }).join('')}
        </div>
      </div>
      <div class="viz-pulse-axis" aria-hidden="true">
        <span>${tr('Oldest')}</span>
        <span>${tr('Each bar = one game')}</span>
        <span>${tr('Newest')}</span>
      </div>
    `;
  }

  function valueFor(game, key) {
    const fgMade = num(game.fg2m) + num(game.fg3m);
    const fgAtt = num(game.fg2a) + num(game.fg3a);
    if (key === 'fgPct') return fgAtt ? (fgMade / fgAtt) * 100 : 0;
    if (key === 'fg3Pct') return num(game.fg3a) ? (num(game.fg3m) / num(game.fg3a)) * 100 : 0;
    if (key === 'ftPct') return num(game.fta) ? (num(game.ftm) / num(game.fta)) * 100 : 0;
    if (key === 'fg2a') return num(game.fg2a);
    if (key === 'fg3a') return num(game.fg3a);
    if (key === 'fta') return num(game.fta);
    if (key === 'result') return game.result === 'W' ? 1 : 0;
    return num(game[key]);
  }

  function metricPoints(values) {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return values.map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 42 - ((value - min) / range) * 34;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function trendSummary(values, invert = false) {
    if (values.length < 2) return { text: 'Need sample', tone: 'flat' };
    const half = Math.max(1, Math.floor(values.length / 2));
    const earlier = values.slice(0, half);
    const recent = values.slice(-half);
    const avg = rows => rows.reduce((sum, value) => sum + value, 0) / Math.max(1, rows.length);
    const delta = avg(recent) - avg(earlier);
    const good = invert ? delta < -0.25 : delta > 0.25;
    const bad = invert ? delta > 0.25 : delta < -0.25;
    return {
      text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`,
      tone: good ? 'good' : bad ? 'bad' : 'flat',
    };
  }

  function renderShotProfile(games, aggregate, escapeHtml) {
    const shots = shotTotals(games);
    const totalAttempts = shots.fg2a + shots.fg3a + shots.fta;
    const share = value => totalAttempts ? clamp((value / totalAttempts) * 100) : 0;
    const agg = aggregate(games);
    const rows = [
      { label: tr('2PT volume'), value: `${shots.fg2m}/${shots.fg2a}`, pct: share(shots.fg2a), tone: 'orange', sub: `${percent(shots.fg2m, shots.fg2a)}%` },
      { label: tr('3PT volume'), value: `${shots.fg3m}/${shots.fg3a}`, pct: share(shots.fg3a), tone: 'blue', sub: `${agg.fg3Pct}%` },
      { label: tr('FT pressure'), value: `${shots.ftm}/${shots.fta}`, pct: share(shots.fta), tone: 'green', sub: `${agg.ftPct}%` },
    ];
    return `
      <div class="viz-panel">
        <div class="viz-panel-title">${tr('Shot Profile')}</div>
        <div class="viz-shot-stack">
          ${rows.map(row => `
            <div class="viz-shot-row" tabindex="0" aria-label="${safe(escapeHtml, `${row.label}: ${row.value}, ${row.sub}, ${row.pct.toFixed(0)}% of attempts`)}">
              <div><strong>${safe(escapeHtml, row.label)}</strong><small>${safe(escapeHtml, row.value)} · ${row.sub}</small></div>
              <div class="viz-track"><i class="${row.tone}" style="width:${row.pct.toFixed(0)}%"></i></div>
              ${tooltipHtml([
                `${row.label}`,
                `${row.value} made/attempted`,
                `${row.sub} accuracy`,
                `${row.pct.toFixed(0)}% of total shot volume`,
              ], escapeHtml)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderStatMix(games, escapeHtml) {
    const totals = statTotals(games);
    const count = Math.max(1, games.length);
    const rows = [
      ['PTS', totals.pts / count, 35, 'orange'],
      ['REB', totals.reb / count, 16, 'yellow'],
      ['AST', totals.ast / count, 14, 'blue'],
      ['STL', totals.stl / count, 4, 'green'],
      ['BLK', totals.blk / count, 4, 'purple'],
      ['TO', totals.to / count, 6, 'red'],
    ];
    return `
      <div class="viz-panel">
        <div class="viz-panel-title">${tr('Box Score Shape')}</div>
        <div class="viz-stat-bars">
          ${rows.map(([label, value, target, tone]) => `
            <div class="viz-stat-row" tabindex="0" aria-label="${safe(escapeHtml, `${label}: ${fmt(value)} per game, ${clamp((value / target) * 100).toFixed(0)}% of guide scale ${target}`)}">
              <span>${safe(escapeHtml, label)}</span>
              <div class="viz-track"><i class="${tone}" style="width:${clamp((value / target) * 100).toFixed(0)}%"></i></div>
              <strong>${fmt(value)}</strong>
              ${tooltipHtml([
                `${label}: ${fmt(value)} per game`,
                `Guide scale: ${target}`,
                `${clamp((value / target) * 100).toFixed(0)}% of the visual scale`,
              ], escapeHtml)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function buildRows(state, aggregate) {
    return (state.builds || []).map(build => {
      const games = (state.games || []).filter(game => game.buildId === build.id);
      const agg = aggregate(games);
      const score = num(agg.winPct) + num(agg.plusMinus) * 2 + num(agg.ppg) * 0.7 + num(agg.apg) - num(agg.topg) * 2;
      return { build, games, agg, score };
    }).filter(row => row.games.length > 0).sort((a, b) => b.score - a.score);
  }

  function modeRows(games, aggregate) {
    const modes = [...new Set(games.map(game => game.mode || 'Unknown'))];
    return modes.map(mode => {
      const sample = games.filter(game => (game.mode || 'Unknown') === mode);
      return { mode, games: sample, agg: aggregate(sample) };
    }).sort((a, b) => b.games.length - a.games.length);
  }

  function renderRowBars(rows, options) {
    const { type, escapeHtml, escapeAttr } = options;
    const maxGames = Math.max(1, ...rows.map(row => row.games.length));
    if (!rows.length) return `<div class="viz-empty">${tr('No split data yet.')}</div>`;
    return rows.slice(0, 6).map((row, index) => {
      const label = type === 'build' ? row.build.name : row.mode;
      const sub = `${row.games.length} GP · ${row.agg.winPct}% W · ${signed(row.agg.plusMinus)}`;
      const width = clamp((row.games.length / maxGames) * 100, 8, 100);
      const action = type === 'build' ? ` onclick="openBuildDetail('${safe(escapeAttr, row.build.id)}')"` : '';
      const scoreLine = type === 'build' && row.score != null ? `Build score ${fmt(row.score)}` : `${row.agg.ppg} PPG`;
      return `
        <button class="viz-rank-row" type="button"${action} aria-label="${safe(escapeAttr, `${label || '-'}: ${sub}`)}">
          <span>#${index + 1}</span>
          <div><strong>${safe(escapeHtml, label || '-')}</strong><small>${safe(escapeHtml, sub)}</small></div>
          <em style="width:${width.toFixed(0)}%"></em>
          ${tooltipHtml([
            `${label || '-'}`,
            `${row.games.length} games in sample`,
            `${row.agg.winPct}% win rate / ${row.agg.ppg} PPG`,
            `${signed(row.agg.plusMinus)} +/- / ${scoreLine}`,
          ], escapeHtml)}
        </button>
      `;
    }).join('');
  }

  function renderKeyTrends(games, escapeHtml, escapeAttr) {
    const sorted = [...games].sort(byDateAsc).slice(-16);
    const metrics = [
      { key: 'result', label: 'Win%', suffix: '%', scale: 100 },
      { key: 'pts',    label: 'PTS' },
      { key: 'pm',     label: '+/-' },
      { key: 'ast',    label: 'AST' },
      { key: 'fgPct',  label: 'FG%', suffix: '%' },
      { key: 'to',     label: 'TO', invert: true },
    ];
    if (!sorted.length) {
      return `
        <div class="viz-panel viz-wide">
          <div class="viz-panel-title">${tr('Key Trends')}</div>
          <div class="viz-empty">${tr('Record games to see every stat trend over time.')}</div>
        </div>
      `;
    }
    return `
      <div class="viz-panel viz-wide viz-key-trends">
        <div class="viz-panel-title">${tr('Key Trends')}</div>
        <div class="viz-key-trend-grid">
          ${metrics.map(metric => {
            const values = sorted.map(game => valueFor(game, metric.key) * (metric.scale || 1));
            const latest = values[values.length - 1] || 0;
            const first  = values[0] || 0;
            const trend  = trendSummary(values, metric.invert);
            const displayLatest = metric.key === 'result'
              ? `${latest.toFixed(0)}${metric.suffix}`
              : `${latest.toFixed(metric.suffix ? 0 : 1)}${metric.suffix || ''}`;
            const pts = metricPoints(values);
            const fillPts = pts ? `${pts} 100,46 0,46` : '';
            const title = `${metric.label} latest ${displayLatest} trend ${trend.text}`;
            return `
              <div class="viz-key-card ${trend.tone}" tabindex="0" title="${safe(escapeAttr, title)}" aria-label="${safe(escapeAttr, title)}">
                <div class="viz-trend-head">
                  <span>${safe(escapeHtml, metric.label)}</span>
                  <strong>${displayLatest}</strong>
                </div>
                <svg class="viz-key-spark" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
                  ${fillPts ? `<polygon class="viz-key-fill" points="${fillPts}"/>` : ''}
                  <polyline class="viz-key-line" points="${pts}"/>
                </svg>
                <div class="viz-trend-foot">
                  <span>${safe(escapeHtml, trend.text)}</span>
                  <small>${sorted.length} games</small>
                </div>
                ${tooltipHtml([
                  `${metric.label}: ${displayLatest}`,
                  `Trend: ${trend.text}`,
                  `First: ${first.toFixed(metric.suffix ? 0 : 1)}${metric.suffix || ''}`,
                  `${sorted[0]?.date || '-'} → ${sorted[sorted.length - 1]?.date || '-'}`,
                ], escapeHtml)}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderOverviewVisuals(args) {
    const { state, aggregate, escapeHtml, escapeAttr } = args;
    const games = state.games || [];

    return `
      <section class="viz-lab">
        <div class="viz-grid">
          <div class="viz-panel viz-wide">
            <div class="viz-panel-title">${tr('Recent 14 Games - Performance Score')}</div>
            ${miniTimeline(games, escapeHtml, escapeAttr)}
          </div>
          ${renderKeyTrends(games, escapeHtml, escapeAttr)}
          ${renderShotProfile(games, aggregate, escapeHtml)}
          ${renderStatMix(games, escapeHtml)}
        </div>
      </section>
    `;
  }

  function renderBuildVisuals(args) {
    const { build, games, allGames, aggregate, escapeHtml, escapeAttr } = args;
    const sample = games || allGames || [];
    const agg = aggregate(sample);
    const modes = modeRows(sample, aggregate);
    const sorted = [...sample].sort(byDateAsc);
    const last = sorted[sorted.length - 1];
    const best = [...sample].sort((a, b) => scoreGame(b) - scoreGame(a))[0];
    const review = [...sample].sort((a, b) => scoreGame(a) - scoreGame(b))[0];
    const bestLine = best ? `${best.date || '-'} · ${best.pts || 0} PTS · ${best.result || '-'}` : 'No game yet';
    const reviewLine = review ? `${review.date || '-'} · ${review.pts || 0} PTS · ${review.to || 0} TO` : 'No game yet';

    return `
      <section class="viz-lab detail-viz">
        <div class="viz-head">
          <div>
            <div class="viz-kicker">${tr('BUILD VISUALS')}</div>
            <div class="viz-title">${safe(escapeHtml, build.name || 'Build')} ${tr('map')}</div>
            <div class="viz-sub">${sample.length} ${tr('shown games')} · ${allGames.length} ${tr('total build games')} · ${safe(escapeHtml, build.position || '-')}</div>
          </div>
          <div class="viz-grade ${num(agg.plusMinus) < 0 ? 'bad' : ''}">
            <span>${sample.length ? `${agg.winPct}% W` : tr('No Sample')}</span>
            <small>${sample.length ? `${agg.ppg} PPG · ${signed(agg.plusMinus)} +/-` : tr('Record a baseline game')}</small>
          </div>
        </div>
        <div class="viz-context-strip">
          <span>${tr('Interactive visual desk')}</span>
          <strong>${tr('Start with the score pulse, then inspect shot profile, stat shape, and film anchors.')}</strong>
        </div>
        <div class="viz-grid">
          <div class="viz-panel viz-wide">
            <div class="viz-panel-title">${tr('Recent 14 Games - Performance Score')}</div>
            ${miniTimeline(sample, escapeHtml, escapeAttr)}
          </div>
          ${renderShotProfile(sample, aggregate, escapeHtml)}
          ${renderStatMix(sample, escapeHtml)}
          <div class="viz-panel">
            <div class="viz-panel-title">${tr('Mode Fit')}</div>
            <div class="viz-rank-list">${renderRowBars(modes, { type: 'mode', escapeHtml, escapeAttr })}</div>
          </div>
          <div class="viz-panel">
            <div class="viz-panel-title">${tr('Film Anchors')}</div>
            <div class="viz-anchor-grid">
              <div tabindex="0"><span>${tr('Latest')}</span><strong>${last ? safe(escapeHtml, `${last.date || '-'} · ${last.result || '-'}`) : '-'}</strong><small>${last ? safe(escapeHtml, `${last.pts || 0} PTS · ${last.reb || 0} REB · ${last.ast || 0} AST`) : tr('No game yet')}</small>${tooltipHtml(last ? [tr('Latest game'), `${last.date || '-'} - ${last.result || '-'}`, `${last.pts || 0} PTS / ${last.reb || 0} REB / ${last.ast || 0} AST`, `${signed(last.pm || 0)} +/-`] : [tr('No game yet')], escapeHtml)}</div>
              <div tabindex="0"><span>${tr('Best')}</span><strong>${safe(escapeHtml, bestLine)}</strong><small>${tr('Use this as the ceiling sample.')}</small>${tooltipHtml(best ? [tr('Best performance score'), `${best.date || '-'} - ${best.result || '-'}`, `${best.pts || 0} PTS / ${best.reb || 0} REB / ${best.ast || 0} AST`, `${fmt(scoreGame(best))} score`] : [tr('No game yet')], escapeHtml)}</div>
              <div tabindex="0"><span>${tr('Review')}</span><strong>${safe(escapeHtml, reviewLine)}</strong><small>${tr('Start here for risk review.')}</small>${tooltipHtml(review ? [tr('Lowest performance score'), `${review.date || '-'} - ${review.result || '-'}`, `${review.pts || 0} PTS / ${review.to || 0} TO`, `${fmt(scoreGame(review))} score`] : [tr('No game yet')], escapeHtml)}</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderBuildTrajectory(games, escapeHtml, escapeAttr) {
    const sorted = [...games].sort(byDateAsc);
    const n = sorted.length;

    if (n < 3) {
      return `
        <div class="viz-panel viz-wide">
          <div class="viz-panel-title">${tr('Build Trajectory')}</div>
          <div class="viz-empty">${tr('Record 3+ games to unlock trajectory analysis.')}</div>
        </div>`;
    }

    // Cumulative win rate after each game
    let runWins = 0;
    const cumPcts = sorted.map((g, i) => {
      if (g.result === 'W') runWins++;
      return runWins / (i + 1);
    });

    // Early vs late trajectory
    const half = Math.max(1, Math.floor(n / 2));
    const earlyWR = sorted.slice(0, half).filter(g => g.result === 'W').length / half;
    const lateWR  = sorted.slice(n - half).filter(g => g.result === 'W').length  / half;
    const delta    = lateWR - earlyWR;
    const traj     = delta > 0.08 ? 'up' : delta < -0.08 ? 'down' : 'flat';
    const trajColor = traj === 'up' ? 'var(--green)' : traj === 'down' ? 'var(--red)' : 'var(--text-dim)';
    const trajLabel = traj === 'up' ? ('↑ ' + tr('IMPROVING')) : traj === 'down' ? ('↓ ' + tr('DECLINING')) : ('→ ' + tr('STEADY'));

    // SVG coordinate helpers (viewBox 0 0 100 64)
    const sx = i => n === 1 ? 50 : 1 + (i / (n - 1)) * 98;
    const sy = p => 60 - p * 56;   // p=0→60, p=0.5→32, p=1→4
    const refY = sy(0.5);           // 32

    const curvePts = cumPcts.map((p, i) => `${sx(i).toFixed(1)},${sy(p).toFixed(1)}`).join(' ');
    const lastX = sx(n - 1).toFixed(1);
    const lastY = sy(cumPcts[n - 1]).toFixed(1);
    const fillPts = `${curvePts} ${lastX},62 1,62`;
    const fillColor = traj === 'up' ? '#43d968' : traj === 'down' ? '#D4001A' : '#888888';

    // Milestones
    const currentPct = cumPcts[n - 1];
    const maxPct   = Math.max(...cumPcts);
    const peakIdx  = cumPcts.indexOf(maxPct);
    const fiftyIdx = cumPcts.findIndex(p => p >= 0.5);

    // Rolling 5-game stats
    const W = 5;
    function rollStat(fn) {
      return sorted.map((_, i) => fn(sorted.slice(Math.max(0, i - W + 1), i + 1)));
    }
    const rollWR  = rollStat(sl => sl.filter(g => g.result === 'W').length / sl.length * 100);
    const rollPPG = rollStat(sl => sl.reduce((s, g) => s + num(g.pts), 0) / sl.length);
    const rollPM  = rollStat(sl => sl.reduce((s, g) => s + num(g.pm),  0) / sl.length);

    function rollCard(label, vals, suffix) {
      const trend = trendSummary(vals);
      const latest = vals[vals.length - 1] || 0;
      const pts = metricPoints(vals);
      const fillP = pts ? `${pts} 100,46 0,46` : '';
      return `
        <div class="viz-key-card ${trend.tone}" tabindex="0">
          <div class="viz-trend-head">
            <span>${label}</span>
            <strong>${latest.toFixed(1)}${suffix}</strong>
          </div>
          <svg class="viz-key-spark" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
            ${fillP ? `<polygon class="viz-key-fill" points="${fillP}"/>` : ''}
            <polyline class="viz-key-line" points="${pts}"/>
          </svg>
          <div class="viz-trend-foot">
            <span>${trend.text}</span>
            <small>${n} ${tr('games')}</small>
          </div>
        </div>`;
    }

    return `
      <div class="viz-panel viz-wide viz-traj-panel">
        <div class="viz-panel-title">${tr('Career Win Rate Arc')}</div>
        <div class="viz-traj-meta">
          <span class="viz-traj-badge" style="color:${trajColor}">${trajLabel}</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">${n} ${tr('games')} · ${tr('Current')}: ${(currentPct * 100).toFixed(1)}%</span>
        </div>
        <div class="viz-traj-wrap">
          <div class="viz-traj-ylabels" aria-hidden="true">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <div class="viz-traj-chart">
            <svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-label="${safe(escapeAttr, tr('Career win rate curve'))}">
              <polygon fill="${fillColor}" fill-opacity="0.10" points="${fillPts}"/>
              <line class="viz-traj-ref" x1="0" y1="${refY}" x2="100" y2="${refY}"/>
              <polyline class="viz-traj-line" points="${curvePts}" style="stroke:${trajColor}"/>
              <circle class="viz-traj-dot" cx="${lastX}" cy="${lastY}" r="2.5" style="fill:${trajColor}"/>
            </svg>
            <div class="viz-traj-axis" aria-hidden="true">
              <span>G1</span>
              <span>${tr('← 50% line →')}</span>
              <span>G${n}</span>
            </div>
          </div>
        </div>
        <div class="viz-traj-stats">
          <div class="viz-traj-stat"><span>${tr('Current WR')}</span><strong>${(currentPct * 100).toFixed(1)}%</strong></div>
          <div class="viz-traj-stat"><span>${tr('Career Peak')}</span><strong>${(maxPct * 100).toFixed(1)}%</strong><small>G${peakIdx + 1}</small></div>
          <div class="viz-traj-stat"><span>${tr('Early avg')}</span><strong>${(earlyWR * 100).toFixed(1)}%</strong><small>${tr('first')} ${half}</small></div>
          <div class="viz-traj-stat"><span>${tr('Recent avg')}</span><strong>${(lateWR * 100).toFixed(1)}%</strong><small>${tr('last')} ${half}</small></div>
          ${fiftyIdx >= 0
            ? `<div class="viz-traj-stat"><span>${tr('Hit 50%')}</span><strong>G${fiftyIdx + 1}</strong><small>${tr('first time')}</small></div>`
            : `<div class="viz-traj-stat"><span>${tr('Hit 50%')}</span><strong>—</strong><small>${tr('not yet')}</small></div>`}
        </div>
      </div>

      <div class="viz-panel viz-wide">
        <div class="viz-panel-title">${tr('5-Game Rolling Momentum')}</div>
        <div class="viz-key-trend-grid" style="margin-top:12px">
          ${rollCard(tr('5-Game Win%'), rollWR, '%')}
          ${rollCard(tr('5-Game PPG'),  rollPPG, '')}
          ${rollCard(tr('5-Game +/-'),  rollPM,  '')}
        </div>
      </div>
    `;
  }

  // ── Advanced Efficiency Dashboard ─────────────────────────────────────────
  function effGrade(val, hi, mid, lo) {
    if (val === null || !Number.isFinite(val)) return { label: '—', cls: 'eff-na' };
    if (val >= hi)  return { label: tr('ELITE'), cls: 'eff-elite' };
    if (val >= mid) return { label: tr('GOOD'),  cls: 'eff-good'  };
    if (val >= lo)  return { label: tr('AVG'),   cls: 'eff-avg'   };
    return           { label: tr('BELOW'), cls: 'eff-below'  };
  }

  function effTotals(games) {
    return games.reduce((a, g) => {
      a.pts  += num(g.pts);
      a.fg2m += num(g.fg2m);
      a.fg2a += num(g.fg2a);
      a.fg3m += num(g.fg3m);
      a.fg3a += num(g.fg3a);
      a.ftm  += num(g.ftm);
      a.fta  += num(g.fta);
      a.ast  += num(g.ast);
      a.to   += num(g.to);
      a.stl  += num(g.stl);
      a.blk  += num(g.blk);
      a.pm   += num(g.pm);
      return a;
    }, { pts:0, fg2m:0, fg2a:0, fg3m:0, fg3a:0, ftm:0, fta:0, ast:0, to:0, stl:0, blk:0, pm:0 });
  }

  function calcMetrics(t, n) {
    const fga  = t.fg2a + t.fg3a;
    const tsAttempts = fga + 0.44 * t.fta;
    const ts   = tsAttempts > 0  ? (t.pts / (2 * tsAttempts)) * 100  : null;
    const efg  = fga > 0         ? ((t.fg2m + 1.5 * t.fg3m) / fga) * 100 : null;
    const asto = t.to > 0        ? t.ast / t.to                           : null;
    const stk  = n > 0           ? (t.stl + t.blk) / n                    : null;
    const net  = n > 0           ? t.pm / n                                : null;
    return { ts, efg, asto, stk, net };
  }

  function renderEfficiencyDashboard(games, escapeHtml, escapeAttr) {
    const n = games.length;
    if (n < 3) return '';

    const totals  = effTotals(games);
    const m       = calcMetrics(totals, n);

    const sorted  = [...games].sort(byDateAsc);
    const r5games = sorted.slice(-5);
    const r5n     = r5games.length;
    const r5t     = effTotals(r5games);
    const r5m     = calcMetrics(r5t, r5n);

    const fmtM = (v, dec = 1) => v === null || !Number.isFinite(v) ? '—' : fmt(v, dec);

    function metricCard(labelKey, career, recent, hi, mid, lo, unit = '') {
      const g = effGrade(career, hi, mid, lo);
      const careerStr = fmtM(career) + unit;
      const recentStr = fmtM(recent) + (recent !== null && Number.isFinite(recent) ? unit : '');
      const delta = (career !== null && recent !== null && Number.isFinite(career) && Number.isFinite(recent))
        ? recent - career : null;
      const deltaStr = delta !== null ? (delta >= 0 ? `+${fmt(delta)}` : fmt(delta)) : '';
      const deltaPos = delta !== null && delta >= 0;
      return `
        <div class="eff-card">
          <div class="eff-card-label">${tr(labelKey)}</div>
          <div class="eff-card-value">${careerStr}</div>
          <div class="eff-card-grade ${g.cls}">${g.label}</div>
          ${deltaStr ? `<div class="eff-card-delta ${deltaPos ? 'eff-delta-up' : 'eff-delta-down'}">${deltaStr} ${tr('Recent 5')}</div>` : ''}
        </div>
      `;
    }

    function compareRow(labelKey, career, recent, hi, mid, lo, unit = '') {
      const g  = effGrade(career, hi, mid, lo);
      const g5 = effGrade(recent,  hi, mid, lo);
      const careerStr = fmtM(career) + unit;
      const recentStr = fmtM(recent) + (recent !== null && Number.isFinite(recent) ? unit : '');
      return `
        <tr class="eff-cmp-row">
          <td class="eff-cmp-metric">${tr(labelKey)}</td>
          <td class="eff-cmp-val"><span class="eff-pip ${g.cls}"></span>${careerStr}</td>
          <td class="eff-cmp-val"><span class="eff-pip ${g5.cls}"></span>${recentStr}</td>
        </tr>
      `;
    }

    return `
      <section class="eff-section">
        <div class="eff-header">
          <span class="eff-title">${tr('EFFICIENCY')}</span>
          <span class="eff-sub">${tr('Advanced metrics')} · ${n} ${tr('games')}</span>
        </div>
        <div class="eff-grid">
          ${metricCard('True Shooting %', m.ts,   r5m.ts,   65, 58, 50, '%')}
          ${metricCard('Effective FG%',   m.efg,  r5m.efg,  58, 52, 46, '%')}
          ${metricCard('Assist / Turnover', m.asto, r5m.asto, 3, 2, 1, '')}
          ${metricCard('Stocks per game', m.stk,  r5m.stk,  3,  2,  1, '')}
          ${metricCard('Net Rating',      m.net,  r5m.net,  8,  4,  0, '')}
        </div>
        <div class="eff-compare-wrap">
          <table class="eff-compare-table">
            <thead>
              <tr>
                <th class="eff-cmp-head">${tr('Metric')}</th>
                <th class="eff-cmp-head">${tr('Career avg')}</th>
                <th class="eff-cmp-head">${tr('Recent 5')}</th>
              </tr>
            </thead>
            <tbody>
              ${compareRow('True Shooting %',   m.ts,   r5m.ts,   65, 58, 50, '%')}
              ${compareRow('Effective FG%',     m.efg,  r5m.efg,  58, 52, 46, '%')}
              ${compareRow('Assist / Turnover', m.asto, r5m.asto,  3,  2,  1, '')}
              ${compareRow('Stocks per game',   m.stk,  r5m.stk,   3,  2,  1, '')}
              ${compareRow('Net Rating',        m.net,  r5m.net,   8,  4,  0, '')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // ── Build Report Card ─────────────────────────────────────────────────────
  const RC_GRADE_LABELS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];
  const RC_GRADE_NUM    = { 'A+': 97, A: 88, 'B+': 78, B: 68, 'C+': 56, C: 44, D: 28 };
  const RC_GRADE_COLOR  = { 'A+': '#FFD000', A: '#FFD000', 'B+': '#43d968', B: '#43d968', 'C+': '#4da6ff', C: '#4da6ff', D: 'rgba(255,255,255,0.28)' };

  function rcGrade(val, thresholds) {
    if (val === null || val === undefined || !Number.isFinite(val)) return null;
    for (let i = 0; i < thresholds.length; i++) {
      if (val >= thresholds[i]) return RC_GRADE_LABELS[i];
    }
    return 'D';
  }

  function rcNumToGrade(s) {
    if (s >= 92) return 'A+';
    if (s >= 83) return 'A';
    if (s >= 73) return 'B+';
    if (s >= 63) return 'B';
    if (s >= 51) return 'C+';
    if (s >= 40) return 'C';
    return 'D';
  }

  function renderReportCard(games, escapeHtml, escapeAttr) {
    const n = games.length;
    if (n < 3) {
      return `<section class="rc-section">
        <div class="rc-empty">
          <div class="rc-empty-title">// ${tr('Need 3+ games for Report Card')}</div>
          <div class="rc-empty-sub">${tr('Record at least 3 games to generate your build report card.')}</div>
        </div>
      </section>`;
    }

    // ── Raw metrics ───────────────────────────────────────────────────────
    const ppg  = games.reduce((a, g) => a + num(g.pts), 0) / n;
    const rpg  = games.reduce((a, g) => a + num(g.reb), 0) / n;
    const apg  = games.reduce((a, g) => a + num(g.ast), 0) / n;
    const stkg = games.reduce((a, g) => a + num(g.stl) + num(g.blk), 0) / n;
    const topg = games.reduce((a, g) => a + num(g.to),  0) / n;
    const pm   = games.reduce((a, g) => a + num(g.pm),  0) / n;
    const wins = games.filter(g => g.result === 'W').length;
    const winPct = (wins / n) * 100;

    const T = games.reduce((a, g) => {
      a.pts += num(g.pts); a.fg2a += num(g.fg2a); a.fg3a += num(g.fg3a);
      a.fta  += num(g.fta); a.fg2m += num(g.fg2m); a.fg3m += num(g.fg3m); a.ftm += num(g.ftm);
      return a;
    }, { pts: 0, fg2a: 0, fg3a: 0, fta: 0, fg2m: 0, fg3m: 0, ftm: 0 });
    const fga = T.fg2a + T.fg3a;
    const tsAttempts = fga + 0.44 * T.fta;
    const ts = tsAttempts > 0 ? (T.pts / (2 * tsAttempts)) * 100 : null;

    // ── Dimension definitions ─────────────────────────────────────────────
    const dims = [
      {
        key: 'scoring',    label: tr('SCORING'),
        grade: rcGrade(ppg,    [30, 25, 20, 16, 12, 8]),
        value: fmt(ppg)    + ' PPG',
        score: Math.min(100, (ppg / 35) * 100),
      },
      {
        key: 'playmaking', label: tr('PLAYMAKING'),
        grade: rcGrade(apg,    [10, 7, 5, 3, 2, 1]),
        value: fmt(apg)    + ' APG',
        score: Math.min(100, (apg / 12) * 100),
      },
      {
        key: 'defense',    label: tr('DEFENSE'),
        grade: rcGrade(stkg,   [4, 3, 2.5, 2, 1.5, 1]),
        value: fmt(stkg)   + ' Stk/G',
        score: Math.min(100, (stkg / 5) * 100),
      },
      {
        key: 'rebounding', label: tr('REBOUNDING'),
        grade: rcGrade(rpg,    [15, 12, 9, 7, 5, 3]),
        value: fmt(rpg)    + ' RPG',
        score: Math.min(100, (rpg / 18) * 100),
      },
      {
        key: 'efficiency', label: tr('EFFICIENCY'),
        grade: ts !== null ? rcGrade(ts, [68, 63, 58, 53, 48, 43]) : null,
        value: ts !== null ? fmt(ts) + '% TS' : '—',
        score: ts !== null ? Math.min(100, (ts / 75) * 100) : 0,
      },
      {
        key: 'winning',    label: tr('WINNING'),
        grade: rcGrade(winPct, [75, 65, 55, 45, 35, 25]),
        value: fmt(winPct, 0) + '% WR',
        score: Math.min(100, winPct),
      },
    ];

    // ── Overall grade ─────────────────────────────────────────────────────
    const validDims = dims.filter(d => d.grade !== null);
    const avgScore  = validDims.reduce((a, d) => a + (RC_GRADE_NUM[d.grade] || 50), 0) / validDims.length;
    const overall   = rcNumToGrade(avgScore);
    const overallColor = RC_GRADE_COLOR[overall];

    // ── Strengths & weaknesses ────────────────────────────────────────────
    const sorted     = [...validDims].sort((a, b) => (RC_GRADE_NUM[b.grade] || 0) - (RC_GRADE_NUM[a.grade] || 0));
    const strengths  = sorted.filter(d => RC_GRADE_NUM[d.grade] >= 78).slice(0, 3);
    const weaknesses = sorted.filter(d => RC_GRADE_NUM[d.grade] <= 56).reverse().slice(0, 3);

    // ── Performance radar ─────────────────────────────────────────────────
    function perfRadar() {
      const r = 34, cx = 50, cy = 50;
      const scores = dims.map(d => d.score || 0);
      const angles = dims.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i / 6));
      function pts(vals) {
        return vals.map((v, i) => {
          const rad = r * Math.min(v / 100, 1);
          return `${(cx + Math.cos(angles[i]) * rad).toFixed(1)},${(cy + Math.sin(angles[i]) * rad).toFixed(1)}`;
        }).join(' ');
      }
      function ring(f) {
        return `<polygon points="${pts(Array(6).fill(100 * f))}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="0.5"/>`;
      }
      const axisLines = angles.map(a =>
        `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="rgba(255,255,255,0.09)" stroke-width="0.5"/>`
      ).join('');
      const labelEls = dims.map((d, i) => {
        const x = (cx + Math.cos(angles[i]) * (r + 12)).toFixed(1);
        const y = (cy + Math.sin(angles[i]) * (r + 12)).toFixed(1);
        const color = d.grade ? RC_GRADE_COLOR[d.grade] : 'rgba(255,255,255,0.28)';
        return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="7" font-weight="700" font-family="JetBrains Mono,monospace" fill="${color}">${d.grade || '—'}</text>`;
      }).join('');
      return `<svg class="rc-radar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${ring(1)}${ring(0.75)}${ring(0.5)}${ring(0.25)}
        ${axisLines}
        <polygon points="${pts(scores)}" fill="rgba(212,0,26,0.15)" stroke="#D4001A" stroke-width="1.5" stroke-linejoin="round"/>
        ${labelEls}
      </svg>`;
    }

    // ── Dimension row ─────────────────────────────────────────────────────
    function dimRow(d) {
      if (!d.grade) return '';
      const color   = RC_GRADE_COLOR[d.grade];
      const pct     = Math.round(Math.min(100, d.score));
      const gradeCls = RC_GRADE_NUM[d.grade] >= 88 ? 'rc-g-elite'
                     : RC_GRADE_NUM[d.grade] >= 68 ? 'rc-g-good'
                     : RC_GRADE_NUM[d.grade] >= 44 ? 'rc-g-avg'
                     : 'rc-g-below';
      return `<div class="rc-dim-row">
        <div class="rc-dim-label">${d.label}</div>
        <div class="rc-dim-bar-wrap"><div class="rc-dim-bar" style="width:${pct}%;background:${color}"></div></div>
        <div class="rc-dim-grade ${gradeCls}">${d.grade}</div>
        <div class="rc-dim-value">${d.value}</div>
      </div>`;
    }

    return `
      <section class="rc-section">
        <div class="rc-header">
          <span class="rc-title">${tr('REPORT CARD')}</span>
          <span class="rc-sub">${tr('Performance-based grades')} · ${n} ${tr('games')}</span>
        </div>

        <div class="rc-top">
          <div class="rc-overall-block">
            <div class="rc-overall-label">${tr('OVERALL')}</div>
            <div class="rc-overall-grade" style="color:${overallColor}">${overall}</div>
            <div class="rc-overall-score">${fmt(avgScore, 0)}<span>/100</span></div>
            <div class="rc-overall-sub">${n} ${tr('games')} · ${wins}W-${n - wins}L</div>
          </div>
          <div class="rc-radar-block">${perfRadar()}</div>
        </div>

        <div class="rc-dims">
          <div class="rc-dims-head">
            <span></span><span>${tr('Score')}</span><span>${tr('Grade')}</span><span>${tr('Metric')}</span>
          </div>
          ${dims.map(dimRow).join('')}
        </div>

        ${strengths.length ? `
        <div class="rc-callouts rc-strengths">
          <div class="rc-callout-head">▲ ${tr('STRENGTHS')}</div>
          ${strengths.map(d => `<div class="rc-callout">
            <span class="rc-callout-grade rc-g-${RC_GRADE_NUM[d.grade] >= 88 ? 'elite' : 'good'}">${d.grade}</span>
            <span class="rc-callout-text"><strong>${d.label}</strong> · ${d.value}</span>
          </div>`).join('')}
        </div>` : ''}

        ${weaknesses.length ? `
        <div class="rc-callouts rc-weaknesses">
          <div class="rc-callout-head">▼ ${tr('TO IMPROVE')}</div>
          ${weaknesses.map(d => `<div class="rc-callout">
            <span class="rc-callout-grade rc-g-${RC_GRADE_NUM[d.grade] <= 28 ? 'below' : 'avg'}">${d.grade}</span>
            <span class="rc-callout-text"><strong>${d.label}</strong> · ${d.value}</span>
          </div>`).join('')}
        </div>` : ''}
      </section>
    `;
  }

  // ── Wilson Score Confidence Interval for Win Rate ─────────────────────────
  // 95% CI via Wilson interval — better than normal approximation for small n.
  function winRateCI(wins, n) {
    if (!Number.isFinite(wins) || !Number.isFinite(n) || n <= 0) {
      return { point: 0, lower: 0, upper: 0, halfWidth: 0, n: 0, small: true };
    }
    const z = 1.96;
    const p = wins / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z / denom) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
    const lower = Math.max(0, center - margin) * 100;
    const upper = Math.min(1, center + margin) * 100;
    const point = p * 100;
    const halfWidth = (upper - lower) / 2;
    return { point, lower, upper, halfWidth, n, small: n < 5 };
  }

  // Compact CI display: "65% ±8% (n=15)" or "65% (n=3, low n)"
  function formatWinRateCI(wins, n, opts) {
    const ci = winRateCI(wins, n);
    if (ci.small) return `${ci.point.toFixed(0)}% (n=${ci.n}, ${tr('low n')})`;
    const compact = opts && opts.compact;
    return compact
      ? `${ci.point.toFixed(0)}% ±${ci.halfWidth.toFixed(0)}`
      : `${ci.point.toFixed(0)}% ±${ci.halfWidth.toFixed(0)}% (n=${ci.n})`;
  }

  // ── Pythagorean Expected Win Rate ─────────────────────────────────────────
  // Bill James / Daryl Morey for basketball: exponent 13.91.
  // Falls back to null if score data is missing.
  function pythagoreanWinRate(games, exponent) {
    const k = (typeof exponent === 'number' && exponent > 0) ? exponent : 13.91;
    let pts = 0, opp = 0, gpScored = 0;
    (games || []).forEach(g => {
      const so = Number(g.scoreOwn);
      const sa = Number(g.scoreOpp);
      if (Number.isFinite(so) && Number.isFinite(sa) && (so > 0 || sa > 0)) {
        pts += so;
        opp += sa;
        gpScored += 1;
      }
    });
    if (gpScored < 3 || pts + opp === 0) return null;
    const pK = Math.pow(pts, k);
    const oK = Math.pow(opp, k);
    const expWP = pK / (pK + oK);
    return {
      expWinPct: expWP * 100,
      gpScored,
      pf: pts,
      pa: opp,
      ppgFor: pts / gpScored,
      ppgAgainst: opp / gpScored,
    };
  }

  // ── Streak detection (current run of W or L) ──────────────────────────────
  function detectStreak(games) {
    if (!games || !games.length) return { type: null, count: 0 };
    const sorted = [...games].sort(byDateAsc);
    const last = sorted[sorted.length - 1]?.result;
    if (last !== 'W' && last !== 'L') return { type: null, count: 0 };
    let count = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].result === last) count++;
      else break;
    }
    return { type: last, count };
  }

  function streakBadgeHtml(games, opts) {
    const minRun = (opts && Number.isFinite(opts.min)) ? opts.min : 3;
    const s = detectStreak(games);
    if (s.count < minRun) return '';
    const isW = s.type === 'W';
    const icon = isW ? '🔥' : '❄';
    const cls = isW ? 'streak-hot' : 'streak-cold';
    const word = isW ? tr('wins') : tr('losses');
    const title = `${tr('Current streak')}: ${s.count} ${word}`;
    return `<span class="streak-badge ${cls}" title="${title}" aria-label="${title}">${icon} ${s.count}${s.type}</span>`;
  }

  // ── Multi-window Rolling Win Rate ─────────────────────────────────────────
  function renderRollingWinRate(games, escapeHtml, escapeAttr) {
    const sorted = [...games].sort(byDateAsc);
    const n = sorted.length;
    if (n < 5) {
      return `
        <div class="viz-panel viz-wide">
          <div class="viz-panel-title">${tr('Rolling Win Rate')}</div>
          <div class="viz-empty">${tr('Record 5+ games to unlock rolling win rate analysis.')}</div>
        </div>`;
    }

    function rolling(window) {
      return sorted.map((_, i) => {
        const start = Math.max(0, i - window + 1);
        const slice = sorted.slice(start, i + 1);
        return (slice.filter(g => g.result === 'W').length / slice.length) * 100;
      });
    }
    const wr3  = rolling(3);
    const wr5  = rolling(5);
    const wr10 = rolling(10);

    // viewBox 0 0 100 60
    const sx = i => n === 1 ? 50 : 2 + (i / (n - 1)) * 96;
    const sy = p => 56 - (clamp(p, 0, 100) / 100) * 52;
    const ptsFor = vals => vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');

    const cur3  = wr3[n - 1];
    const cur5  = wr5[n - 1];
    const cur10 = wr10[n - 1];

    let signal, signalCls;
    if (cur3 > cur10 + 15)      { signal = '🔥 ' + tr('Heating up');   signalCls = 'sig-hot';  }
    else if (cur3 < cur10 - 15) { signal = '❄ ' + tr('Cooling off'); signalCls = 'sig-cold'; }
    else                         { signal = '→ ' + tr('Steady form');  signalCls = 'sig-flat'; }

    return `
      <div class="viz-panel viz-wide viz-roll-panel">
        <div class="viz-panel-title">${tr('Rolling Win Rate')}</div>
        <div class="viz-roll-meta">
          <span class="viz-roll-signal ${signalCls}">${signal}</span>
          <span class="viz-roll-legend">
            <i class="lg lg-3"></i>${tr('3-game')}
            <i class="lg lg-5"></i>${tr('5-game')}
            <i class="lg lg-10"></i>${tr('10-game')}
          </span>
        </div>
        <div class="viz-roll-wrap">
          <div class="viz-roll-ylabels" aria-hidden="true">
            <span>100%</span><span>50%</span><span>0%</span>
          </div>
          <div class="viz-roll-chart">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-label="${safe(escapeAttr, tr('Rolling win rate over time'))}">
              <line class="viz-roll-ref" x1="0" y1="${sy(50).toFixed(1)}" x2="100" y2="${sy(50).toFixed(1)}"/>
              <polyline class="viz-roll-10" points="${ptsFor(wr10)}"/>
              <polyline class="viz-roll-5"  points="${ptsFor(wr5)}"/>
              <polyline class="viz-roll-3"  points="${ptsFor(wr3)}"/>
            </svg>
            <div class="viz-roll-axis" aria-hidden="true">
              <span>G1</span><span>G${n}</span>
            </div>
          </div>
        </div>
        <div class="viz-roll-cards">
          <div class="viz-roll-card lg-3"><span>${tr('3-game')}</span><strong>${cur3.toFixed(0)}%</strong></div>
          <div class="viz-roll-card lg-5"><span>${tr('5-game')}</span><strong>${cur5.toFixed(0)}%</strong></div>
          <div class="viz-roll-card lg-10"><span>${tr('10-game')}</span><strong>${cur10.toFixed(0)}%</strong></div>
        </div>
      </div>
    `;
  }

  // ── Efficiency by Mode Split ──────────────────────────────────────────────
  function renderModeEfficiencyMatrix(games, escapeHtml, escapeAttr) {
    if (!games || games.length < 3) return '';
    const byMode = new Map();
    games.forEach(g => {
      const m = String(g.mode || 'Unknown').trim() || 'Unknown';
      if (!byMode.has(m)) byMode.set(m, []);
      byMode.get(m).push(g);
    });
    if (byMode.size < 2) return '';

    const rows = [...byMode.entries()]
      .map(([mode, gs]) => {
        const totals = effTotals(gs);
        const m = calcMetrics(totals, gs.length);
        const wins = gs.filter(x => x.result === 'W').length;
        return {
          mode, n: gs.length, wins,
          winPct: (wins / gs.length) * 100,
          ts: m.ts, efg: m.efg, asto: m.asto, net: m.net,
        };
      })
      .filter(r => r.n >= 2)
      .sort((a, b) => b.n - a.n);

    if (rows.length < 2) return '';

    function tone(val, hi, mid) {
      if (val === null || !Number.isFinite(val)) return '';
      if (val >= hi)  return 'eff-elite';
      if (val >= mid) return 'eff-good';
      return 'eff-below';
    }
    function wrTone(p) {
      if (p >= 60) return 'eff-elite';
      if (p >= 50) return 'eff-good';
      if (p >= 40) return 'eff-avg';
      return 'eff-below';
    }
    const fmtV = (v, suf) => (v === null || !Number.isFinite(v)) ? '—' : fmt(v) + (suf || '');

    return `
      <div class="viz-panel viz-wide mode-eff-panel">
        <div class="viz-panel-title">${tr('Efficiency by Mode')}</div>
        <div class="mode-eff-help">${tr('Same build, different modes — does the playstyle scale?')}</div>
        <div class="mode-eff-table-wrap">
          <table class="mode-eff-table">
            <thead>
              <tr>
                <th>${tr('Mode')}</th>
                <th>GP</th>
                <th>${tr('Record')}</th>
                <th>W%</th>
                <th>TS%</th>
                <th>eFG%</th>
                <th>A/TO</th>
                <th>+/-</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td class="mode-eff-mode">${safe(escapeHtml, r.mode)}</td>
                  <td>${r.n}</td>
                  <td><span class="result-w">${r.wins}W</span>·<span class="result-l">${r.n - r.wins}L</span></td>
                  <td class="${wrTone(r.winPct)}">${r.winPct.toFixed(0)}%</td>
                  <td class="${tone(r.ts,  58, 50)}">${fmtV(r.ts,  '%')}</td>
                  <td class="${tone(r.efg, 52, 46)}">${fmtV(r.efg, '%')}</td>
                  <td class="${tone(r.asto, 2,  1)}">${fmtV(r.asto, '')}</td>
                  <td class="${r.net !== null && r.net >= 0 ? 'eff-good' : 'eff-below'}">${r.net !== null ? signed(r.net) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Teammate Chemistry Matrix ─────────────────────────────────────────────
  function renderTeammateChemistry(games, escapeHtml, escapeAttr) {
    if (!games || games.length < 3) return '';
    const byName = new Map();
    games.forEach(g => {
      const roster = g.roster || {};
      const teammates = Array.isArray(roster.teammates) ? roster.teammates : [];
      const seen = new Set();
      teammates.forEach(p => {
        if (p && p.self) return;
        const name = String(p && p.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const row = byName.get(key) || {
          name, n: 0, wins: 0, myPts: 0, myPm: 0,
          theirPts: 0, theirHas: 0,
        };
        row.name = name;
        row.n += 1;
        if (g.result === 'W') row.wins += 1;
        row.myPts += num(g.pts);
        row.myPm += num(g.pm);
        const tp = Number(p.pts);
        if (Number.isFinite(tp) && tp > 0) {
          row.theirPts += tp;
          row.theirHas += 1;
        }
        byName.set(key, row);
      });
    });

    const rows = [...byName.values()]
      .filter(r => r.n >= 3)
      .map(r => ({
        ...r,
        winPct: (r.wins / r.n) * 100,
        myPpg: r.myPts / r.n,
        myPmAvg: r.myPm / r.n,
        theirPpg: r.theirHas ? r.theirPts / r.theirHas : null,
      }))
      .sort((a, b) => b.winPct - a.winPct || b.n - a.n);

    if (!rows.length) {
      return `
        <div class="viz-panel viz-wide tm-chem-panel">
          <div class="viz-panel-title">${tr('Teammate Chemistry')}</div>
          <div class="viz-empty">${tr('Log roster names on 3+ games with the same teammate to unlock chemistry.')}</div>
        </div>`;
    }

    function tier(wp) {
      if (wp >= 65) return 'tm-elite';
      if (wp >= 50) return 'tm-good';
      if (wp >= 35) return 'tm-avg';
      return 'tm-bad';
    }
    const top = rows.slice(0, 10);

    return `
      <div class="viz-panel viz-wide tm-chem-panel">
        <div class="viz-panel-title">${tr('Teammate Chemistry')}</div>
        <div class="tm-chem-help">${tr('Teammates with 3+ shared games on this build, sorted by win rate.')}</div>
        <div class="tm-chem-table-wrap">
          <table class="tm-chem-table">
            <thead>
              <tr>
                <th>${tr('Teammate')}</th>
                <th>GP</th>
                <th>${tr('Record')}</th>
                <th>W%</th>
                <th>${tr('Your PPG')}</th>
                <th>${tr('Their PPG')}</th>
                <th>+/-</th>
              </tr>
            </thead>
            <tbody>
              ${top.map(r => `
                <tr>
                  <td class="tm-chem-name ${tier(r.winPct)}">${safe(escapeHtml, r.name)}</td>
                  <td>${r.n}</td>
                  <td><span class="result-w">${r.wins}W</span>·<span class="result-l">${r.n - r.wins}L</span></td>
                  <td class="${tier(r.winPct)}">${r.winPct.toFixed(0)}%</td>
                  <td>${r.myPpg.toFixed(1)}</td>
                  <td>${r.theirPpg !== null ? r.theirPpg.toFixed(1) : '—'}</td>
                  <td class="${r.myPmAvg >= 0 ? 'eff-good' : 'eff-below'}">${signed(r.myPmAvg)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Pythagorean Panel (shown alongside efficiency) ───────────────────────
  function renderPythagoreanPanel(games, escapeHtml, escapeAttr) {
    const pyth = pythagoreanWinRate(games);
    if (!pyth) return '';
    const wins = games.filter(g => g.result === 'W').length;
    const actual = games.length ? (wins / games.length) * 100 : 0;
    const diff = actual - pyth.expWinPct;
    let label, cls;
    if (diff > 8)       { label = tr('OVERPERFORMING'); cls = 'pyth-over'; }
    else if (diff < -8) { label = tr('UNDERPERFORMING'); cls = 'pyth-under'; }
    else                { label = tr('EXPECTED'); cls = 'pyth-meet'; }
    const explainer = diff > 8
      ? tr('Winning more close games than scoring margin predicts.')
      : diff < -8
        ? tr('Scoring margin suggests more wins than the record shows.')
        : tr('Record matches scoring margin — results feel earned.');
    return `
      <section class="pyth-section">
        <div class="pyth-header">
          <span class="pyth-title">${tr('PYTHAGOREAN')}</span>
          <span class="pyth-sub">${tr('Expected wins from scoring margin')} · ${pyth.gpScored} ${tr('games')}</span>
        </div>
        <div class="pyth-row">
          <div class="pyth-cell">
            <span>${tr('Actual W%')}</span>
            <strong>${actual.toFixed(0)}%</strong>
            <small>${wins}W-${games.length - wins}L</small>
          </div>
          <div class="pyth-cell">
            <span>${tr('Expected W%')}</span>
            <strong>${pyth.expWinPct.toFixed(0)}%</strong>
            <small>${pyth.ppgFor.toFixed(1)} ${tr('pts for')} / ${pyth.ppgAgainst.toFixed(1)} ${tr('pts against')}</small>
          </div>
          <div class="pyth-cell pyth-delta ${cls}">
            <span>${tr('WR delta')}</span>
            <strong>${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%</strong>
            <small>${label}</small>
          </div>
        </div>
        <div class="pyth-copy">${safe(escapeHtml, explainer)}</div>
      </section>
    `;
  }

  window.NBA2K26_VISUALIZATIONS = {
    renderOverviewVisuals,
    renderBuildVisuals,
    renderBuildTrajectory,
    renderEfficiencyDashboard,
    renderReportCard,
    detectStreak,
    streakBadgeHtml,
    renderRollingWinRate,
    renderModeEfficiencyMatrix,
    renderTeammateChemistry,
    winRateCI,
    formatWinRateCI,
    pythagoreanWinRate,
    renderPythagoreanPanel,
  };
})(window);
