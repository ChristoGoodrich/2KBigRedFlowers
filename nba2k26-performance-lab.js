// NBA 2K26 Performance Lab overview renderer.
// Keeps overview analysis out of the main HTML while preserving classic-script globals.
(function(window) {
  'use strict';

  window.toggleDrawer = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.open = !el.open;
    if (el.open) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function renderOverviewLab(deps) {
    const {
      state,
      aggregate,
      renderAccountBar,
      compareRecentVsOverall,
      renderTrendPanel,
      escapeHtml,
      escapeAttr,
    } = deps;

    function renderOverview() {
      renderAccountBar('overview');
      const c = document.getElementById('overview-container');
      const totalGames = state.games.length;
      const totalBuilds = state.builds.length;
      if (totalBuilds === 0 && totalGames === 0) {
        c.innerHTML = `
          <section class="first-run">
            <div class="first-run-badge">NBA 2K26</div>
            <h2 class="first-run-title">${t('Welcome to your build tracker')}</h2>
            <p class="first-run-lead">${t('Track every build, log your games, and see which setup actually wins.')}</p>
            <ol class="first-run-steps">
              <li><span class="frs-num">1</span><div><strong>${t('Create a build')}</strong><small>${t('Add your position, attributes, and badges.')}</small></div></li>
              <li><span class="frs-num">2</span><div><strong>${t('Log your games')}</strong><small>${t('Enter the box score after each game — or scan a screenshot.')}</small></div></li>
              <li><span class="frs-num">3</span><div><strong>${t('Read your trends')}</strong><small>${t('Win rate, shot profile, and chemistry update automatically.')}</small></div></li>
            </ol>
            <div class="first-run-actions">
              <button class="context-action primary" type="button" onclick="openBuildModal()">${t('Create your first build')}</button>
              <button class="context-action" type="button" onclick="openDataModal()">${t('Import existing data')}</button>
            </div>
          </section>`;
        if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
        return;
      }
      const agg = aggregate(state.games);
      const sortedGames = [...state.games].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
      const recent = sortedGames.slice(0, Math.min(10, sortedGames.length));
      const recentAgg = aggregate(recent);
      const trend = compareRecentVsOverall(state.games, Math.min(5, Math.max(2, Math.floor(state.games.length / 2))));
      const scoreGame = g => (g.pts || 0) + (g.reb || 0) * 1.2 + (g.ast || 0) * 1.5 + (g.stl || 0) * 2 + (g.blk || 0) * 2 - (g.to || 0) * 1.5 + (g.pm || 0) * 0.35;
      const sortedByScore = [...state.games].sort((a, b) => scoreGame(b) - scoreGame(a));
      const bestGame = sortedByScore[0];
      const riskGame = sortedByScore[sortedByScore.length - 1];
      const buildById = id => state.builds.find(b => b.id === id);
      const buildRows = state.builds.map(build => {
        const games = state.games.filter(g => g.buildId === build.id);
        const agg = aggregate(games);
        const score = (parseFloat(agg.winPct) || 0) * 0.55 +
          (parseFloat(agg.plusMinus) || 0) * 2.2 +
          (parseFloat(agg.ppg) || 0) * 0.9 +
          (parseFloat(agg.apg) || 0) * 1.6 -
          (parseFloat(agg.topg) || 0) * 2.4;
        return { build, games, n: games.length, agg, score };
      }).filter(row => row.n > 0);
      const rankedBuilds = [...buildRows].sort((a, b) => b.score - a.score);
      const mostUsedBuild = [...buildRows].sort((a, b) => b.n - a.n)[0];
      const bestBuild = rankedBuilds[0];
      const modeRows = [...new Set(state.games.map(g => g.mode || 'Unknown'))].map(mode => {
        const games = state.games.filter(g => (g.mode || 'Unknown') === mode);
        return { mode, n: games.length, agg: aggregate(games) };
      }).sort((a, b) => b.n - a.n);
      const bestMode = [...modeRows].sort((a, b) => {
        const sa = (parseFloat(a.agg.winPct) || 0) + (parseFloat(a.agg.plusMinus) || 0) * 2;
        const sb = (parseFloat(b.agg.winPct) || 0) + (parseFloat(b.agg.plusMinus) || 0) * 2;
        return sb - sa;
      })[0];
      const lastGames = sortedGames.slice(0, 4);
    
      const pctDelta = (current, base) => {
        const d = (parseFloat(current) || 0) - (parseFloat(base) || 0);
        return `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
      };
      const notes = [];
      const winDelta = pctDelta(recentAgg.winPct, agg.winPct);
      const ppgDelta = pctDelta(recentAgg.ppg, agg.ppg);
      if (state.games.length < 8) notes.push(t('Sample is still small. Treat recommendations as directional until you log 8+ games.'));
      if (bestBuild && mostUsedBuild && bestBuild.build.id !== mostUsedBuild.build.id && bestBuild.n >= 3) {
        notes.push(t('{name} is outperforming the highest-sample build. Run it more before changing attributes.').replace('{name}', bestBuild.build.name));
      }
      if (parseFloat(winDelta) >= 8) notes.push(t('Recent win rate is up {x} points. Keep the current build/mode rotation stable.').replace('{x}', winDelta));
      if (parseFloat(winDelta) <= -8) notes.push(t('Recent win rate is down {x} points. Compare turnovers, shot profile, and matchup notes.').replace('{x}', winDelta));
      if ((parseFloat(agg.topg) || 0) >= 3.5) notes.push(t('Turnovers are high at {x} per game. Passing and creation decisions are the first review target.').replace('{x}', agg.topg));
      if ((parseFloat(agg.fg3Pct) || 0) > 0 && (parseFloat(agg.fg3Pct) || 0) < 32) notes.push(t('3P% is {x}. Review shot quality before changing the build.').replace('{x}', agg.fg3Pct));
      if ((parseFloat(agg.plusMinus) || 0) < 0) notes.push(t('Average plus/minus is {x}. Check defensive impact and mode fit.').replace('{x}', agg.plusMinus));
      if (!notes.length) notes.push(t('Profile is stable. Test one variable at a time: mode, build, badge setup, or shot profile.'));
    
      const renderGame = (g, label, tone) => {
        const b = buildById(g?.buildId);
        if (!g) return '';
        return `
          <button class="lab-game-card ${tone}" type="button" onclick="openBuildDetail('${escapeAttr(g.buildId)}')">
            <span class="lab-game-label">${label}</span>
            <span class="lab-game-score">${g.pts}<small>PTS</small></span>
            <span class="lab-game-line">${g.reb} REB · ${g.ast} AST · ${g.stl} STL · ${g.blk} BLK</span>
            <span class="lab-game-meta">${b ? escapeHtml(b.name) : '?'} · ${escapeHtml(g.mode || '-')} · ${g.date || '-'} · ${g.result || '-'}</span>
          </button>
        `;
      };

      const renderHomeDashboard = () => {
        const hasBuilds = totalBuilds > 0;
        const hasGames = totalGames > 0;
        const actionBuild = bestBuild?.build || mostUsedBuild?.build || state.builds[0];
        const rankedPreview = hasGames
          ? rankedBuilds.slice(0, 3)
          : state.builds.slice(0, 3).map(build => ({ build, n: 0, agg: aggregate([]), games: [] }));
        const recent6 = hasGames ? [...state.games].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology).slice(0, 6) : [];
        const formDots = hasGames
          ? `<div class="home-form-dots">${recent6.map(g => `<span class="form-dot ${g.result === 'W' ? 'w' : 'l'}" title="${escapeAttr(g.result || '-')}"></span>`).join('')}</div>`
          : '';
        const buildActionTitle = actionBuild ? actionBuild.name : t('Create a build');
        const buildActionCopy = bestBuild
          ? `${bestBuild.n} ${t('games')}, ${bestBuild.agg.winPct}% ${t('win rate')}, ${parseFloat(bestBuild.agg.plusMinus) >= 0 ? '+' : ''}${bestBuild.agg.plusMinus} +/-.`
          : hasBuilds
            ? t('Pick one build and record the first sample before comparing.')
            : t('Add one build so games can attach to the right player.');
        const reviewActionTitle = riskGame
          ? `${riskGame.pts || 0} PTS, ${riskGame.to || 0} TO`
          : t('No review game yet');
        const reviewActionCopy = riskGame
          ? `${riskGame.date || '-'} in ${riskGame.mode || '-'}. Check turnovers, shot quality, matchup, and teammates.`
          : t('After two or more games, the weakest sample appears here for film-style review.');
        const logActionTitle = actionBuild ? `${t('Next log')}: ${actionBuild.name}` : t('Next log');
        const logActionCopy = hasGames
          ? t('Record the next game before changing too many variables. The trend read gets sharper every sample.')
          : t('Use the first game as a baseline. Names-only roster tracking is enough to start.');

        const renderChemistryIntel = () => {
          const PP = window.NBA2K26_PLAYER_PROFILES;
          if (!PP || !state.players.length) return '';
          const encountered = PP.forGames(state.players, state.games);
          if (!encountered.length) return '';
          const allies = [], rivals = [];
          encountered.forEach(profile => {
            const { asTeammate, asOpponent } = PP.getStats(profile, state.games);
            if (asTeammate.length >= 3) {
              const agg = PP.aggEntries(asTeammate);
              if (agg) allies.push({ profile, n: asTeammate.length, winPct: Math.round(agg.winPct) });
            }
            if (asOpponent.length >= 3) {
              const agg = PP.aggEntries(asOpponent);
              if (agg) rivals.push({ profile, n: asOpponent.length, winPct: Math.round(agg.winPct) });
            }
          });
          const topAllies = allies.sort((a, b) => b.winPct - a.winPct).slice(0, 5);
          const topRivals = rivals.sort((a, b) => a.winPct - b.winPct).slice(0, 5);
          if (!topAllies.length && !topRivals.length) return '';
          const allyColor = p => p >= 65 ? '#43d968' : p >= 50 ? '#f6c638' : '#e21a2f';
          const rivalColor = p => p <= 25 ? '#e21a2f' : p <= 40 ? '#ff8c42' : '#f6c638';
          const allyRows = topAllies.map(({ profile, n, winPct }) => `
            <button class="home-row" type="button" onclick="openPlayerPage(${JSON.stringify(profile.id)})">
              <span class="home-rank" style="color:${allyColor(winPct)}">${winPct}%</span>
              <span class="home-row-main">${escapeHtml(profile.primaryName)}</span>
              <span class="home-row-sub">${n}G · ${t('As Teammate')}</span>
            </button>`).join('');
          const rivalRows = topRivals.map(({ profile, n, winPct }) => {
            const tag = winPct <= 25 ? ' !' : winPct <= 40 ? ' *' : '';
            return `
            <button class="home-row" type="button" onclick="openPlayerPage(${JSON.stringify(profile.id)})">
              <span class="home-rank" style="color:${rivalColor(winPct)}">${winPct}%</span>
              <span class="home-row-main">${escapeHtml(profile.primaryName)}${tag}</span>
              <span class="home-row-sub">${n}G · ${t('As Opponent')}</span>
            </button>`;
          }).join('');
          return `
            <div class="home-panel-grid" style="margin-top:10px;">
              <div class="home-panel">
                <div class="home-panel-title">${t('Best Allies')}</div>
                <div class="home-list">
                  ${topAllies.length ? allyRows : `<div class="home-empty">${t('No teammate data yet.')}</div>`}
                </div>
              </div>
              <div class="home-panel">
                <div class="home-panel-title">${t('Tough Opponents')}</div>
                <div class="home-list">
                  ${topRivals.length ? rivalRows : `<div class="home-empty">${t('No opponent data yet.')}</div>`}
                </div>
              </div>
            </div>`;
        };

        const recentTrendRows = hasGames
          ? sortedGames.slice(0, Math.min(20, sortedGames.length)).reverse()
          : Array.from({ length: 20 }, (_, idx) => ({ empty: true, result: idx % 4 === 2 ? 'L' : 'W', pts: 0, reb: 0, ast: 0 }));
        const recentWindowCount = Math.min(20, totalGames);
        const chartMaxPts = Math.max(24, ...recentTrendRows.map(game => Number(game.pts) || 0));
        const trendMax = Math.max(30, ...recentTrendRows.map(game => Math.max(Number(game.pts) || 0, Number(game.ast) || 0, Number(game.reb) || 0)));
        const trendPoints = key => recentTrendRows.map((game, idx) => {
          const x = 18 + (idx * (520 / Math.max(1, recentTrendRows.length - 1)));
          const value = game.empty ? (key === 'pts' ? 17 + (idx % 5) : key === 'ast' ? 6 + (idx % 4) : 4 + (idx % 3)) : (Number(game[key]) || 0);
          return `${x.toFixed(1)},${(130 - (value / trendMax) * 96).toFixed(1)}`;
        }).join(' ');
        // Y-axis value labels for the four gridlines (viewBox y = 34/66/98/130,
        // which map to trendMax / 0.67 / 0.33 / 0). Rendered as an HTML overlay
        // because the SVG stretches horizontally (preserveAspectRatio="none") and
        // would distort any <text> drawn inside it.
        const axisLabelsHtml = [34, 66, 98, 130].map(y => {
          const val = trendMax * ((130 - y) / 96);
          return `<span class="lab-axis-label" style="top:${(y / 150 * 100).toFixed(2)}%">${Math.round(val)}</span>`;
        }).join('');
        // Per-series stat rail: turns each bare colored line into a labelled
        // average + recent-trend delta (last 5 vs the earlier games in the
        // window) + single-game high, so the chart carries real numbers.
        const realWindow = recentTrendRows.filter(g => !g.empty);
        const seriesStat = key => {
          const vals = realWindow.map(g => Number(g[key]) || 0);
          if (!vals.length) return { avg: '–', hi: '–', delta: null };
          const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
          let delta = null;
          if (vals.length >= 4) {
            const recentN = Math.min(5, Math.floor(vals.length / 2));
            delta = mean(vals.slice(-recentN)) - mean(vals.slice(0, vals.length - recentN));
          }
          return { avg: mean(vals).toFixed(1), hi: String(Math.max(...vals)), delta };
        };
        const trendSeries = [
          { key: 'pts', cls: 'pts', label: t('PPG') },
          { key: 'ast', cls: 'ast', label: t('APG') },
          { key: 'reb', cls: 'reb', label: t('RPG') },
        ];
        const railRowsHtml = trendSeries.map(s => {
          const st = seriesStat(s.key);
          let trendHtml = `<span class="lab-trend-flat">—</span>`;
          if (st.delta != null && Math.abs(st.delta) >= 0.5) {
            const up = st.delta > 0;
            trendHtml = `<span class="${up ? 'lab-trend-up' : 'lab-trend-down'}" title="${t('last 5 vs earlier')}">${up ? '▲' : '▼'} ${Math.abs(st.delta).toFixed(1)}</span>`;
          }
          return `
            <div class="lab-ref-trend-stat">
              <span class="lab-trend-key ${s.cls}">${escapeHtml(s.label)}</span>
              <strong class="lab-trend-avg">${st.avg}<small>${t('Avg')}</small></strong>
              <div class="lab-trend-meta">${trendHtml}<i>${t('High')} ${st.hi}</i></div>
            </div>`;
        }).join('');
        const trendDotsHtml = recentTrendRows.map((game, idx) => {
          if (game.empty) return '';
          const x = 18 + (idx * (520 / Math.max(1, recentTrendRows.length - 1)));
          const y = 130 - ((Number(game.pts) || 0) / trendMax) * 96;
          const result = game.result === 'W' ? t('Win') : t('Loss');
          const score = game.scoreOwn != null && game.scoreOpp != null ? `${game.scoreOwn}-${game.scoreOpp}` : '-';
          const aria = `${game.date || '-'} ${result}. ${game.pts || 0} ${t('PTS')}, ${game.ast || 0} ${t('AST')}, ${game.reb || 0} ${t('REB')}. ${t('Open build detail')}`;
          const edge = idx === 0 ? ' edge-start' : idx === recentTrendRows.length - 1 ? ' edge-end' : '';
          return `
            <button class="lab-ref-trend-point${edge}" type="button"
                    style="--point-x:${(x / 560 * 100).toFixed(2)}%;--point-y:${(y / 150 * 100).toFixed(2)}%"
                    aria-label="${escapeAttr(aria)}"
                    onclick="openBuildDetail('${escapeAttr(game.buildId)}')">
              <span class="lab-ref-trend-point-tip" role="tooltip">
                <b>${escapeHtml(game.date || '-')}</b>
                <em class="${game.result === 'W' ? 'win' : 'loss'}">${escapeHtml(result)} ${escapeHtml(score)}</em>
                <span>${game.pts || 0} ${t('PTS')} · ${game.ast || 0} ${t('AST')} · ${game.reb || 0} ${t('REB')}</span>
                <small>${t('Open build detail')}</small>
              </span>
            </button>`;
        }).join('');
        // Each distinct day becomes a visually bracketed segment: the first bar
        // of a new day gets a `day-start` divider line (so date ranges read
        // clearly), and its date label is left-aligned to that divider. Labels
        // are still thinned (a label only renders if enough columns have passed
        // since the last one) so dense day-by-day samples don't overlap, but the
        // dividers always mark every boundary.
        const minLabelGap = Math.max(1, Math.ceil(recentTrendRows.length / 8));
        let lastLabelText = null;
        let lastLabelIdx = -Infinity;
        const rhythmBars = recentTrendRows.map((game, idx) => {
          const pct = game.empty ? 20 + ((idx % 5) * 12) : Math.max(14, Math.round(((Number(game.pts) || 0) / chartMaxPts) * 100));
          const tone = game.empty ? 'empty' : game.result === 'W' ? 'win' : 'loss';
          const label = game.date ? game.date.slice(5).replace('-', '/') : `G${idx + 1}`;
          const isDayStart = label !== lastLabelText;
          const showLabel = isDayStart && (idx - lastLabelIdx) >= minLabelGap;
          lastLabelText = label;
          if (showLabel) lastLabelIdx = idx;
          // Hover tooltip — full per-game detail that the thinned axis can't show.
          let tipHtml = '';
          if (!game.empty) {
            const resWord = game.result === 'W' ? t('Win') : t('Loss');
            const score = (game.scoreOwn != null && game.scoreOpp != null) ? ` ${game.scoreOwn}-${game.scoreOpp}` : '';
            const statLine = `${Number(game.pts) || 0} ${t('PTS')} · ${Number(game.reb) || 0} ${t('REB')} · ${Number(game.ast) || 0} ${t('AST')}`;
            const meta = [game.opponent ? `${t('Opponent')}: ${game.opponent}` : '', game.mode || '', game.grade ? `${t('Grade')} ${game.grade}` : ''].filter(Boolean).join(' · ');
            tipHtml = `<span class="lab-ref-bar-tip" role="tooltip">`
              + `<b>${escapeHtml(game.date || label)}</b>`
              + `<em class="${tone}">${escapeHtml(resWord)}${escapeHtml(score)}</em>`
              + `<span>${escapeHtml(statLine)}</span>`
              + (meta ? `<small>${escapeHtml(meta)}</small>` : '')
              + `</span>`;
          }
          const cls = `lab-ref-bar ${tone}${isDayStart ? ' day-start' : ''}${showLabel ? '' : ' no-label'}`;
          if (game.empty) return `<span class="${cls}" style="--bar:${pct}%">${tipHtml}<i></i><b>${showLabel ? escapeHtml(label) : ''}</b></span>`;
          const aria = `${game.date || label} ${game.result === 'W' ? t('Win') : t('Loss')}. ${game.pts || 0} ${t('PTS')}, ${game.reb || 0} ${t('REB')}, ${game.ast || 0} ${t('AST')}. ${t('Open build detail')}`;
          return `<button class="${cls}" type="button" style="--bar:${pct}%" aria-label="${escapeAttr(aria)}" onclick="openBuildDetail('${escapeAttr(game.buildId)}')">${tipHtml}<i></i><b>${showLabel ? escapeHtml(label) : ''}</b></button>`;
        }).join('');
        const compareList = (rankedPreview.length ? rankedPreview : [{ build: null, n: 0, agg: aggregate([]), score: 0 }]).slice(0, 5);
        const topBuildCards = compareList.map((row, idx) => {
          const build = row.build;
          const openAction = build ? `openBuildDetail('${escapeAttr(build.id)}')` : 'openBuildModal()';
          const wr = row.n ? `${row.agg.winPct}%` : '-';
          const recordText = row.n ? `${row.agg.wins}-${row.agg.losses}` : '-';
          return `
            <button class="lab-ref-build-card ${idx === 0 ? 'featured' : ''}" type="button" onclick="${openAction}">
              <span class="lab-ref-pos">${escapeHtml(build?.position || (idx === 0 ? 'PG' : '-'))}</span>
              <strong>${escapeHtml(build?.name || (idx === 0 ? t('Create a build') : t('No sample')))}</strong>
              <small>${escapeHtml(build ? [build.height, build.weight ? `${build.weight} lbs` : '', build.position].filter(Boolean).join(' | ') : t('Log games to activate'))}</small>
              <span class="lab-ref-ring" style="--ring:${row.n ? `${Math.max(0, Math.min(100, parseFloat(row.agg.winPct) || 0))}%` : '0%'}"><em>${escapeHtml(wr)}</em><i>${t('WIN %')}</i></span>
              <span class="lab-ref-build-stats"><b>${escapeHtml(recordText)}</b><b>${escapeHtml(row.agg.ppg || '-')}</b><b>${escapeHtml(row.agg.apg || '-')}</b></span>
              <span class="lab-ref-build-labels"><i>${t('W-L')}</i><i>${t('PPG')}</i><i>${t('APG')}</i></span>
            </button>`;
        }).join('');
        const recentRowsHtml = lastGames.length ? lastGames.map(game => {
          const build = buildById(game.buildId);
          return `
            <tr class="clickable-row" onclick="openBuildDetail('${escapeAttr(game.buildId)}')">
              <td>${escapeHtml(game.date || '-')}</td><td>${escapeHtml(game.opponent || '-')}</td><td>${escapeHtml(game.mode || '-')}</td>
              <td class="${game.result === 'W' ? 'result-w' : 'result-l'}">${escapeHtml(game.result || '-')}</td>
              <td>${escapeHtml(game.scoreOwn != null && game.scoreOpp != null ? `${game.scoreOwn}-${game.scoreOpp}` : '-')}</td>
              <td>${game.pts || 0}</td><td>${game.reb || 0}</td><td>${game.ast || 0}</td><td>${escapeHtml(game.grade || '-')}</td><td>${build ? escapeHtml(build.name) : '-'}</td>
            </tr>`;
        }).join('') : `<tr><td colspan="10" class="lab-ref-empty-row">${t('No games logged yet. Create a build, then add the first game sample.')}</td></tr>`;
        const quickLogAction = actionBuild ? `quickLogGame('${escapeAttr(actionBuild.id)}')` : 'showPage(\'builds\')';

        // Career single-game highs — compact, genuinely useful, and not shown
        // elsewhere on Overview. Reuses the tested getPersonalRecords engine.
        const careerHighs = window.NBA2K26_GAME_ANALYSIS?.getPersonalRecords
          ? window.NBA2K26_GAME_ANALYSIS.getPersonalRecords(state.games)
          : {};
        const highCell = (key, label) => {
          const rec = careerHighs[key];
          const val = rec ? rec.val : '—';
          const hint = rec ? escapeAttr([rec.date, rec.mode].filter(Boolean).join(' · ')) : '';
          return `<div class="lab-ref-stat"${hint ? ` title="${hint}"` : ''}><span>${label}</span><strong>${val}</strong></div>`;
        };
        const careerHighsHtml = [
          highCell('pts', t('PTS')),
          highCell('reb', t('REB')),
          highCell('ast', t('AST')),
          highCell('fg3m', t('3PM')),
          highCell('stl', t('STL')),
          highCell('blk', t('BLK')),
        ].join('');

        // Career shooting splits + efficiency — sourced from the combined
        // aggregate; not surfaced elsewhere in the dashboard body.
        const pctClass = (value, threshold) => parseFloat(value) >= threshold ? ' class="good"' : '';
        const avgPm = parseFloat(agg.plusMinus) || 0;
        const shootingSplitsHtml = `
          <div class="lab-ref-side-row"><span>FG%</span><strong${pctClass(agg.fgPct, 50)}>${agg.fgPct}%</strong></div>
          <div class="lab-ref-side-row"><span>3P%</span><strong${pctClass(agg.fg3Pct, 36)}>${agg.fg3Pct}%</strong></div>
          <div class="lab-ref-side-row"><span>FT%</span><strong${pctClass(agg.ftPct, 75)}>${agg.ftPct}%</strong></div>
          <div class="lab-ref-side-row"><span>${t('Avg +/-')}</span><strong${avgPm >= 0 ? ' class="good"' : ''}>${avgPm >= 0 ? '+' : ''}${agg.plusMinus}</strong></div>
        `;

        // Career cumulative totals — summed straight from the game log.
        const totals = state.games.reduce((acc, game) => {
          acc.pts += Number(game.pts) || 0;
          acc.reb += Number(game.reb) || 0;
          acc.ast += Number(game.ast) || 0;
          acc.stl += Number(game.stl) || 0;
          acc.fg2a += Number(game.fg2a) || 0;
          acc.fg3a += Number(game.fg3a) || 0;
          acc.fta += Number(game.fta) || 0;
          return acc;
        }, { pts: 0, reb: 0, ast: 0, stl: 0, fg2a: 0, fg3a: 0, fta: 0 });
        const totalCell = (label, value) =>
          `<div class="lab-ref-stat"><span>${label}</span><strong>${value}</strong></div>`;
        const careerTotalsHtml = [
          totalCell(t('Games'), totalGames),
          totalCell(t('Record'), `${agg.wins}-${agg.losses}`),
          totalCell(t('PTS'), totals.pts),
          totalCell(t('REB'), totals.reb),
          totalCell(t('AST'), totals.ast),
          totalCell(t('STL'), totals.stl),
        ].join('');

        // Per-game shot-attempt distribution (volume, not accuracy).
        const perGame = value => totalGames ? (value / totalGames).toFixed(1) : '0.0';
        const totalFga = totals.fg2a + totals.fg3a;
        const threeRate = totalFga ? (100 * totals.fg3a / totalFga).toFixed(1) : '0.0';
        const shotDistHtml = `
          <div class="lab-ref-side-row"><span>${t('FGA / g')}</span><strong>${perGame(totalFga)}</strong></div>
          <div class="lab-ref-side-row"><span>${t('3PA / g')}</span><strong>${perGame(totals.fg3a)}</strong></div>
          <div class="lab-ref-side-row"><span>${t('FTA / g')}</span><strong>${perGame(totals.fta)}</strong></div>
          <div class="lab-ref-side-row"><span>${t('3PA Rate')}</span><strong>${threeRate}%</strong></div>
        `;

        return `
          <section class="home-dashboard lab-reference-dashboard">
            <div class="lab-ref-shell">
              <main class="lab-ref-main">
                <div class="lab-ref-top-row">
                  <section class="lab-ref-panel lab-ref-season">
                    <div class="lab-ref-panel-head"><strong>${t('Season Rhythm')}</strong><button class="lab-ref-select" type="button">${recentWindowCount} ${t('games')}</button></div>
                    <div class="lab-ref-legend"><span class="win"></span>${t('Wins')}<span class="loss"></span>${t('Losses')}<span class="line"></span>${t('Points')}</div>
                    <div class="lab-ref-bars">${rhythmBars}</div>
                  </section>
                  <section class="lab-ref-panel lab-ref-comparison">
                    <div class="lab-ref-panel-head"><strong>${t('Build comparison')}</strong><button class="lab-ref-link" type="button" onclick="showPage('builds')">${t('View All Builds')}</button></div>
                    <div class="lab-ref-compare-list">
                      ${compareList.map((row, idx) => {
                        const build = row.build;
                        const wr = row.n ? `${row.agg.winPct}%` : '-';
                        const record = row.n ? `${row.agg.wins}-${row.agg.losses}` : '-';
                        return `<button class="lab-ref-compare-row ${idx === 0 ? 'active' : ''}" type="button" onclick="${build ? `openBuildDetail('${escapeAttr(build.id)}')` : 'openBuildModal()'}"><span>${escapeHtml(build?.name || (idx === 0 ? t('Create a build') : t('No sample')))}</span><strong>${escapeHtml(wr)}</strong><em>${escapeHtml(record)}</em></button>`;
                      }).join('')}
                    </div>
                  </section>
                </div>
                <section class="lab-ref-panel lab-ref-trend">
                  <div class="lab-ref-panel-head"><strong>${t('Game performance trend')}</strong><button class="lab-ref-select" type="button">${t('Last')} ${recentWindowCount} ${t('games')}</button></div>
                  <div class="lab-ref-trend-body">
                    <div class="lab-ref-trend-chart">
                      <div class="lab-ref-chart-wrap">
                        ${axisLabelsHtml}
                        <svg class="lab-ref-line-chart" viewBox="0 0 560 150" preserveAspectRatio="none" role="img" aria-label="${t('Recent game trend')}">
                          <path d="M18 34 H542 M18 66 H542 M18 98 H542 M18 130 H542" class="grid"></path>
                          <polyline points="${trendPoints('pts')}" class="pts"></polyline>
                          <polyline points="${trendPoints('ast')}" class="ast"></polyline>
                          <polyline points="${trendPoints('reb')}" class="reb"></polyline>
                        </svg>
                        <div class="lab-ref-trend-points">${trendDotsHtml}</div>
                      </div>
                      <div class="lab-ref-legend"><span class="pts"></span>${t('PPG')}<span class="ast"></span>${t('APG')}<span class="reb"></span>${t('RPG')}</div>
                      <div class="lab-ref-chart-hint">${t('Focus or tap a point to inspect the game. Open it to review the build.')}</div>
                    </div>
                    <div class="lab-ref-trend-rail">${railRowsHtml}</div>
                  </div>
                </section>
                <section class="lab-ref-panel lab-ref-builds">
                  <div class="lab-ref-panel-head"><strong>${t('Top Builds')}</strong><button class="lab-ref-link" type="button" onclick="showPage('builds')">${t('Manage Builds')}</button></div>
                  <div class="lab-ref-build-strip">${topBuildCards}</div>
                </section>
                <section class="lab-ref-panel lab-ref-recent">
                  <div class="lab-ref-panel-head"><strong>${t('Recent Games')}</strong><button class="lab-ref-link" type="button" onclick="showPage('games')">${t('View All Games')}</button></div>
                  <div class="lab-ref-table-wrap"><table class="lab-ref-table"><thead><tr><th>${t('Date')}</th><th>${t('Opponent')}</th><th>${t('Mode')}</th><th>${t('Result')}</th><th>${t('Score')}</th><th>${t('PTS')}</th><th>${t('REB')}</th><th>${t('AST')}</th><th>${t('Grade')}</th><th>${t('Build')}</th></tr></thead><tbody>${recentRowsHtml}</tbody></table></div>
                </section>
              </main>
              <details class="lab-ref-secondary"${window.matchMedia && window.matchMedia('(min-width: 561px)').matches ? ' open' : ''}>
                <summary class="lab-ref-secondary-summary">
                  <span>${t('More analytics')}</span>
                  <small>${t('Career highs, shooting, totals, and quick actions')}</small>
                </summary>
                <aside class="lab-ref-sidebar">
                <section class="lab-ref-panel side-panel">
                  <div class="lab-ref-panel-head"><strong>${t('Career Highs')}</strong><button type="button" onclick="showPage('games')">${t('View All Games')}</button></div>
                  <div class="lab-ref-stat-grid">${careerHighsHtml}</div>
                </section>
                <section class="lab-ref-panel side-panel">
                  <div class="lab-ref-panel-head"><strong>${t('Shooting Splits')}</strong></div>
                  ${shootingSplitsHtml}
                </section>
                <section class="lab-ref-panel side-panel">
                  <div class="lab-ref-panel-head"><strong>${t('Shot Distribution')}</strong></div>
                  ${shotDistHtml}
                </section>
                <section class="lab-ref-panel side-panel">
                  <div class="lab-ref-panel-head"><strong>${t('Career Totals')}</strong></div>
                  <div class="lab-ref-stat-grid">${careerTotalsHtml}</div>
                </section>
                <section class="lab-ref-panel side-panel">
                  <div class="lab-ref-panel-head"><strong>${t('Quick Actions')}</strong></div>
                  <div class="lab-ref-action-grid">
                    <button type="button" onclick="${quickLogAction}">${t('Add Game')}</button><button type="button" onclick="openBuildModal()">${t('Add Build')}</button><button type="button" onclick="showPage('compare')">${t('Compare Builds')}</button>
                    <button type="button" onclick="showPage('quality')">${t('Data Quality')}</button><button type="button" onclick="openDataModal()">${t('Export Data')}</button><button type="button" onclick="document.getElementById('btn-settings-menu')?.click()">${t('Settings')}</button>
                  </div>
                  <button class="lab-ref-cta" type="button" onclick="document.getElementById('ocr-file')?.click()">${t('Scan New Screenshot')}</button>
                </section>
                </aside>
              </details>
            </div>
            ${renderChemistryIntel()}
          </section>
        `;
      };

      if (totalGames === 0) {
        c.innerHTML = renderHomeDashboard();
        return;
      }
    
      const labStat = `${agg.winPct}% W · ${agg.ppg} PPG · ${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}`;
      const compareStat = rankedBuilds.length > 0
        ? `${rankedBuilds.length} ${t('builds with data')}`
        : t('No build sample');
      const modeStat = modeRows.length > 0
        ? `${modeRows.length} ${t('modes tracked')}`
        : t('No mode sample');
      let splitsStat = '';
      let splitsDrawerHtml = '';
      if (window.NBA2K26_ADVANCED_ANALYTICS) {
        const st = window.NBA2K26_ADVANCED_ANALYTICS.streaks(state.games);
        splitsStat = st.currentType
          ? `${st.currentType}${st.currentLen} · ${t('Best')} ${st.longestWin}W`
          : `${t('Best')} ${st.longestWin}W / ${st.longestLoss}L`;
        splitsDrawerHtml = window.NBA2K26_ADVANCED_ANALYTICS.renderSplitsDrawer(state.games, { t, escapeHtml, escapeAttr });
      }

      c.innerHTML = renderHomeDashboard() + `
        <div class="analysis-shortcut-bar" role="group" aria-label="${t('Analysis tools')}">
          <button class="analysis-shortcut-btn" type="button" onclick="toggleDrawer('lab-perf')">
            <span class="asb-kicker">${t('DEEP ANALYSIS')}</span>
            <strong class="asb-title">${t('Performance Lab')}</strong>
            <span class="asb-stat">${escapeHtml(labStat)}</span>
          </button>
          <button class="analysis-shortcut-btn" type="button" onclick="toggleDrawer('lab-compare')">
            <span class="asb-kicker">${t('FULL TABLE')}</span>
            <strong class="asb-title">${t('Build comparison')}</strong>
            <span class="asb-stat">${escapeHtml(compareStat)}</span>
          </button>
          <button class="analysis-shortcut-btn" type="button" onclick="toggleDrawer('lab-mode')">
            <span class="asb-kicker">${t('FULL TABLE')}</span>
            <strong class="asb-title">${t('Mode split')}</strong>
            <span class="asb-stat">${escapeHtml(modeStat)}</span>
          </button>
          ${window.NBA2K26_ADVANCED_ANALYTICS ? `
          <button class="analysis-shortcut-btn" type="button" onclick="toggleDrawer('lab-splits')">
            <span class="asb-kicker">${t('DEEP ANALYSIS')}</span>
            <strong class="asb-title">${t('Splits & Tendencies')}</strong>
            <span class="asb-stat">${escapeHtml(splitsStat)}</span>
          </button>` : ''}
        </div>

        <details class="analysis-drawer" id="lab-perf"${totalGames >= 5 ? ' open' : ''}>
          <summary class="analysis-summary">
            <span>
              <span class="analysis-kicker">${t('DEEP ANALYSIS')}</span>
              <strong>${t('Performance Lab')}</strong>
              <small>${agg.wins}W-${agg.losses}L · ${agg.winPct}% W · ${bestBuild ? escapeHtml(bestBuild.build.name) : t('No build sample')} · ${bestMode ? escapeHtml(bestMode.mode) : t('No mode sample')}</small>
            </span>
            <span class="analysis-toggle" aria-hidden="true"></span>
          </summary>
          <section class="performance-lab">
          <div class="lab-hero">
            <div>
              <div class="lab-kicker">${t('PERFORMANCE LAB')}</div>
              <div class="lab-title">${t('Career diagnosis')}</div>
              <div class="lab-sub">${totalGames} ${t('games')} · ${totalBuilds} ${t('builds')} · ${recent.length} ${t('game sample')}</div>
            </div>
            <div class="lab-record">
              <span>${agg.wins}W-${agg.losses}L</span>
              <small>${agg.winPct}% ${t('win rate')}</small>
            </div>
          </div>
    
          <div class="lab-kpi-grid">
            <div class="lab-kpi"><span>${t('Recent W%')}</span><strong class="${parseFloat(recentAgg.winPct) >= parseFloat(agg.winPct) ? 'good' : 'bad'}">${recentAgg.winPct}%</strong><small>${winDelta} ${t('vs career')}</small></div>
            <div class="lab-kpi"><span>${t('Scoring')}</span><strong>${agg.ppg}</strong><small>${ppgDelta} ${t('recent PPG')}</small></div>
            <div class="lab-kpi"><span>${t('Efficiency')}</span><strong>${agg.fgPct}%</strong><small>${agg.fg3Pct}% 3P · ${agg.ftPct}% FT</small></div>
            <div class="lab-kpi"><span>${t('Impact')}</span><strong class="${parseFloat(agg.plusMinus) >= 0 ? 'good' : 'bad'}">${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}</strong><small>${agg.spg} SPG · ${agg.bpg} BPG</small></div>
          </div>
    
          <div class="lab-section-grid">
            <div class="lab-panel">
              <div class="lab-panel-title">${t('Decision notes')}</div>
              <div class="lab-notes">${notes.slice(0, 5).map(note => `<div>${escapeHtml(note)}</div>`).join('')}</div>
            </div>
            <div class="lab-panel">
              <div class="lab-panel-title">${t('Best current lane')}</div>
              <div class="lab-lane">
                <strong>${bestBuild ? escapeHtml(bestBuild.build.name) : '-'}</strong>
                <span>${bestBuild ? `${bestBuild.n} GP · ${bestBuild.agg.winPct}% W · ${bestBuild.agg.ppg} PPG · ${parseFloat(bestBuild.agg.plusMinus) >= 0 ? '+' : ''}${bestBuild.agg.plusMinus}` : t('No build sample')}</span>
              </div>
              <div class="lab-lane">
                <strong>${bestMode ? escapeHtml(bestMode.mode) : '-'}</strong>
                <span>${bestMode ? `${bestMode.n} GP · ${bestMode.agg.winPct}% W · ${parseFloat(bestMode.agg.plusMinus) >= 0 ? '+' : ''}${bestMode.agg.plusMinus}` : t('No mode sample')}</span>
              </div>
            </div>
          </div>
    
          ${trend ? renderTrendPanel(state.games) : ''}
    
          ${state.games.length >= 2 ? `
            <div class="lab-games">
              ${renderGame(bestGame, t('BEST GAME'), 'good')}
              ${renderGame(riskGame, t('REVIEW GAME'), 'bad')}
            </div>
          ` : ''}
          </section>
        </details>
    
        <details class="analysis-drawer compact" id="lab-compare">
          <summary class="analysis-summary">
            <span>
              <span class="analysis-kicker">FULL TABLE</span>
              <strong>Build comparison</strong>
              <small>${rankedBuilds.length} ${t('builds with data')} · ${t('sorted by performance score')}</small>
            </span>
            <span class="analysis-toggle" aria-hidden="true"></span>
          </summary>
          <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>${t('Rank')}</th><th>${t('Build')}</th><th>${t('Pos')}</th><th>GP</th><th>${t('Record')}</th><th>W%</th><th>PPG</th><th>APG</th><th>FG%</th><th>3P%</th><th>+/-</th></tr></thead>
            <tbody>
              ${rankedBuilds.map((r, i) => `
                <tr class="clickable-row" onclick="openBuildDetail('${escapeAttr(r.build.id)}')">
                  <td style="color:var(--orange);font-weight:800;">#${i + 1}</td>
                  <td style="color:var(--orange);font-weight:700;">${escapeHtml(r.build.name)}</td>
                  <td>${escapeHtml(r.build.position || '-')}</td>
                  <td>${r.n}</td>
                  <td><span class="result-w">${r.agg.wins}W</span> · <span class="result-l">${r.agg.losses}L</span></td>
                  <td>${r.agg.winPct}%</td>
                  <td>${r.agg.ppg}</td>
                  <td>${r.agg.apg}</td>
                  <td>${r.agg.fgPct}</td>
                  <td>${r.agg.fg3Pct}</td>
                  <td class="${parseFloat(r.agg.plusMinus)>=0?'pm-pos':'pm-neg'}">${parseFloat(r.agg.plusMinus)>=0?'+':''}${r.agg.plusMinus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div>
        </details>
    
        <details class="analysis-drawer compact" id="lab-mode">
          <summary class="analysis-summary">
            <span>
              <span class="analysis-kicker">FULL TABLE</span>
              <strong>Mode split</strong>
              <small>${modeRows.length} ${t('modes tracked')} · ${t('compare role fit before changing builds')}</small>
            </span>
            <span class="analysis-toggle" aria-hidden="true"></span>
          </summary>
          <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>${t('Mode')}</th><th>GP</th><th>${t('Record')}</th><th>W%</th><th>PPG</th><th>RPG</th><th>APG</th><th>FG%</th><th>3P%</th><th>+/-</th></tr></thead>
            <tbody>
              ${modeRows.map(r => `
                <tr>
                  <td style="color:var(--orange);font-weight:700;">${escapeHtml(r.mode)}</td>
                  <td>${r.n}</td>
                  <td><span class="result-w">${r.agg.wins}W</span> · <span class="result-l">${r.agg.losses}L</span></td>
                  <td>${r.agg.winPct}%</td>
                  <td>${r.agg.ppg}</td>
                  <td>${r.agg.rpg}</td>
                  <td>${r.agg.apg}</td>
                  <td>${r.agg.fgPct}</td>
                  <td>${r.agg.fg3Pct}</td>
                  <td class="${parseFloat(r.agg.plusMinus)>=0?'pm-pos':'pm-neg'}">${parseFloat(r.agg.plusMinus)>=0?'+':''}${r.agg.plusMinus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div>
        </details>
        ${splitsDrawerHtml}
      `;
    }


    return renderOverview();
  }

  window.NBA2K26_PERFORMANCE_LAB = {
    renderOverviewLab,
  };
})(window);
