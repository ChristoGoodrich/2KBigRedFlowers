// NBA 2K26 build detail page orchestration.
// Owns build detail page assembly while leaving detail subpanels in their modules.
(function(window) {
  'use strict';

  const defaultGameFilter = () => ({
    result: 'All',
    dateFrom: '',
    dateTo: '',
    search: '',
    sortKey: 'date',
    sortDir: 'desc',
  });

  function jsArg(value) {
    return JSON.stringify(String(value))
      .replace(/</g, '\\u003c')
      .replace(/&/g, '\\u0026');
  }

  function openBuildDetail(id, deps) {
    const { state, showPage, renderBuildDetail } = deps;
    state.currentBuildId = id;
    state.currentMode = 'All';
    state.detailTab = 'overview';
    state.gameFilter = defaultGameFilter();
    showPage('detail');
    renderBuildDetail();
  }

  function buildAttributeReads(attrs, deps) {
    const { ATTR_GROUPS, groupAvg } = deps;
    if (!ATTR_GROUPS || typeof groupAvg !== 'function' || !attrs || Object.keys(attrs).length === 0) {
      return { best: null, weakest: null };
    }

    const rows = Object.keys(ATTR_GROUPS)
      .map(group => ({
        group,
        label: ATTR_GROUPS[group].label,
        avg: groupAvg(attrs, group),
      }))
      .filter(row => typeof row.avg === 'number');

    if (!rows.length) return { best: null, weakest: null };
    rows.sort((a, b) => b.avg - a.avg);
    return {
      best: rows[0],
      weakest: rows[rows.length - 1],
    };
  }

  function buildTrendReads(allGames, agg, recentAgg) {
    if (!allGames.length) {
      return {
        title: t('First useful next step'),
        action: t('Record one clean baseline game before tuning the build.'),
        tone: 'warn',
      };
    }
    if (allGames.length < 3) {
      return {
        title: t('Sample is still thin'),
        action: t('Get to three games before making a structural change.'),
        tone: 'warn',
      };
    }

    const winDelta = parseFloat(recentAgg.winPct) - parseFloat(agg.winPct);
    const scoringDelta = parseFloat(recentAgg.ppg) - parseFloat(agg.ppg);
    const turnoverDelta = parseFloat(recentAgg.topg) - parseFloat(agg.topg);
    if (winDelta < -8) {
      return {
        title: t('Recent results need review'),
        action: t('Open game records and check losses, turnovers, and matchup notes first.'),
        tone: 'review',
      };
    }
    if (turnoverDelta > 1) {
      return {
        title: t('Creation load is risky'),
        action: t('Turnovers are rising recently. Try a lower-risk shot diet or more off-ball possessions.'),
        tone: 'review',
      };
    }
    if (scoringDelta > 3) {
      return {
        title: t('Scoring role is trending up'),
        action: t('Keep the role stable and compare efficiency across the next few games.'),
        tone: 'good',
      };
    }
    return {
      title: t('Role looks stable'),
      action: t('Use the badge and scout tabs to decide the next single-variable adjustment.'),
      tone: 'good',
    };
  }

  function renderDecisionStrip(args) {
    const { allGames, agg, recentAgg, attrReads, hasBadges, badgeRecommendations, escapeHtml } = args;
    const trend = buildTrendReads(allGames, agg, recentAgg);
    const best = attrReads.best;
    const weakest = attrReads.weakest;
    const bestCopy = best
      ? `${t(best.label)} ${best.avg}`
      : t('Add attributes to unlock a strength read.');
    const weakCopy = weakest
      ? `${t(weakest.label)} ${weakest.avg}`
      : t('No weakness read yet.');
    const topBadge = badgeRecommendations && badgeRecommendations[0];
    const badgeCopy = topBadge
      ? `${t(topBadge.name)} -> ${topBadge.targetLabel} (${topBadge.attrLabel}, +${topBadge.gap})`
      : hasBadges
        ? t('Badge tab can explain equipped and auto-unlocked tiers.')
        : t('Add badges or attributes to unlock badge recommendations.');

    return `
      <section class="detail-decision-strip">
        <article class="decision-card ${trend.tone}">
          <span>${t('Next move')}</span>
          <strong>${escapeHtml(trend.title)}</strong>
          <small>${escapeHtml(trend.action)}</small>
        </article>
        <article class="decision-card good">
          <span>${t('Strongest area')}</span>
          <strong>${escapeHtml(bestCopy)}</strong>
          <small>${t('Use this to protect the build identity.')}</small>
        </article>
        <article class="decision-card ${weakest && weakest.avg < 70 ? 'review' : 'warn'}">
          <span>${t('Watch area')}</span>
          <strong>${escapeHtml(weakCopy)}</strong>
          <small>${t('Check whether this shows up in losses before changing attributes.')}</small>
        </article>
        <article class="decision-card">
          <span>${t('Badge read')}</span>
          <strong>${topBadge ? t('Closest upgrade') : hasBadges ? t('Ready to inspect') : t('Needs setup')}</strong>
          <small>${escapeHtml(badgeCopy)}</small>
        </article>
      </section>
    `;
  }

  function renderBuildDetail(deps) {
    const {
      state,
      renderAccountBar,
      showPage,
      applyGameFilters,
      aggregate,
      ATTR_GROUPS,
      groupAvg,
      escapeHtml,
      escapeAttr,
      TIER_ORDER,
      renderAggregate,
      renderAttrsPanel,
      mergeBadges,
      getBadgeRecommendations,
      renderBadgesPanel,
      renderTrendPanel,
      renderSeasonInsights,
      renderFirstGameRecap,
      renderPostgameReview,
      renderSeasonSummary,
      renderRosterSummary,
      renderRosterChemistry,
      renderHighlightsGallery,
      renderGameFilterBar,
      renderGamesTable,
      renderPlayersPanel,
      players = [],
    } = deps;

    const build = state.builds.find(item => item.id === state.currentBuildId);
    if (!build) {
      showPage('builds');
      return;
    }

    renderAccountBar('detail');

    const allGames = state.games.filter(game => game.buildId === build.id);
    const modes = ['All', ...new Set(allGames.map(game => game.mode))];
    let filtered = state.currentMode === 'All'
      ? allGames
      : allGames.filter(game => game.mode === state.currentMode);
    filtered = applyGameFilters(filtered);

    const agg = aggregate(filtered);
    const attrs = build.attrs || {};
    const badges = build.badges || {};
    const hasAttrs = Object.keys(attrs).length > 0;
    const isV2 = badges._format === 'v2' ||
      (typeof badges === 'object' && Object.keys(badges).some(key => TIER_ORDER[badges[key]] && key !== '_format'));
    const hasBadges = isV2
      ? Object.keys(badges).some(key => key !== '_format' && TIER_ORDER[badges[key]])
      : ['legend', 'hof', 'gold', 'silver', 'bronze'].some(tier => badges[tier]);

    const badgePanel = (hasBadges || hasAttrs)
      ? (() => {
          const { merged, autoOnly } = mergeBadges(badges, attrs);
          return renderBadgesPanel(merged, autoOnly, attrs);
        })()
      : '';
    const created = build.createdAt ? new Date(build.createdAt).toLocaleDateString() : '-';
    // Legacy tab ids fold into the consolidated 5-tab layout.
    const TAB_ALIAS = { trends: 'analysis', report: 'analysis', players: 'roster', attrs: 'build', badges: 'build' };
    const activeTab = TAB_ALIAS[state.detailTab] || state.detailTab || 'overview';
    const playerCount = (window.NBA2K26_PLAYER_PROFILES && players.length)
      ? window.NBA2K26_PLAYER_PROFILES.forGames(players, allGames).length
      : 0;
    const rosterTracked = filtered.filter(game => game.roster && (
      (Array.isArray(game.roster.teammates) && game.roster.teammates.length) ||
      (Array.isArray(game.roster.opponents) && game.roster.opponents.length)
    )).length;
    const attrCount = hasAttrs ? Object.keys(attrs).length : 0;
    const badgeCount = hasBadges ? Object.keys(badges).filter(key => key !== '_format').length : 0;
    const buildSub = (attrCount || badgeCount)
      ? [attrCount ? `${attrCount} ${t('ratings')}` : '', badgeCount ? `${badgeCount} ${t('badges')}` : ''].filter(Boolean).join(' · ')
      : t('empty');
    const detailTabs = [
      { id: 'overview', label: t('Overview'),      sub: `${allGames.length} ${t('games')}` },
      { id: 'analysis', label: t('Analysis'),      sub: allGames.length >= 3 ? t('trends · grades · splits') : t('need 3+') },
      { id: 'games',    label: t('Game Records'),  sub: `${filtered.length} ${t('shown')}` },
      { id: 'roster',   label: t('Roster & Players'), sub: `${rosterTracked} ${t('tracked')} · ${playerCount} ${t('players')}` },
      { id: 'build',    label: t('Build Setup'),   sub: buildSub },
    ];
    const starterPanel = allGames.length === 0 ? `
      <section class="build-starter-panel">
        <div>
          <div class="starter-kicker">${t('START THIS BUILD')}</div>
          <div class="starter-title">${t('Record the first game for this build')}</div>
          <div class="starter-copy">${t('Game logs unlock trend analysis, mode splits, season summaries, and build-specific recommendations. If the structure is still changing, edit attributes first, then record a clean first sample.')}</div>
        </div>
        <div class="starter-actions">
          <button class="context-action primary" onclick="openGameModal()">${t('Record First Game')}</button>
          <button class="context-action" onclick="shareBuild('${build.id}')">${t('Share Build')}</button>
          <button class="context-action" onclick="openBuildModal('${build.id}')">${t('Edit Build')}</button>
          <button class="context-action" onclick="renderScoutReport('${build.id}')">${t('Scout Report')}</button>
        </div>
      </section>
    ` : '';
    const sortedBuildGames = allGames
      .slice()
      .sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
    const recentBuildGames = sortedBuildGames.slice(0, Math.min(5, sortedBuildGames.length));
    const recentAgg = aggregate(recentBuildGames);
    // At-a-glance stat rail uses the full build sample (mode/filter independent).
    const allAgg = aggregate(allGames);
    const posSplit = window.NBA2K26_ADVANCED_ANALYTICS?.positionSplit
      ? window.NBA2K26_ADVANCED_ANALYTICS.positionSplit(allGames)
      : [];
    const bestPos = posSplit.length
      ? posSplit.slice().sort((a, b) => b.winPct - a.winPct || b.n - a.n)[0]
      : null;
    const pm = parseFloat(allAgg.plusMinus) || 0;
    const statRail = allGames.length ? `
      <section class="detail-stat-rail" aria-label="${t('Key stats')}">
        <div class="stat-chip"><span>${t('Record')}</span><strong>${allAgg.wins}-${allAgg.losses}</strong><small>${allAgg.winPct}% W · ${allGames.length} ${t('games')}</small></div>
        <div class="stat-chip"><span>${t('PPG')}</span><strong>${allAgg.ppg}</strong><small>${t('RPG')} ${allAgg.rpg} · ${t('APG')} ${allAgg.apg}</small></div>
        <div class="stat-chip"><span>${t('Shooting')}</span><strong>${allAgg.fgPct}%</strong><small>${allAgg.fg3Pct}% 3P · ${allAgg.ftPct}% FT</small></div>
        <div class="stat-chip"><span>+/-</span><strong class="${pm >= 0 ? 'pos' : 'neg'}">${pm >= 0 ? '+' : ''}${allAgg.plusMinus}</strong><small>${t('per game')}</small></div>
        ${bestPos ? `<div class="stat-chip"><span>${t('Best position')}</span><strong>${escapeHtml(bestPos.pos)}</strong><small>${bestPos.n} GP · ${bestPos.winPct.toFixed(0)}% W</small></div>` : ''}
      </section>
    ` : '';
    const attrReads = buildAttributeReads(attrs, { ATTR_GROUPS, groupAvg });
    const badgeRecommendations = typeof getBadgeRecommendations === 'function'
      ? getBadgeRecommendations(attrs, (() => {
          const { merged } = mergeBadges(badges, attrs);
          return merged;
        })())
      : [];
    const scoreGame = game => (game.pts || 0) + (game.reb || 0) * 1.2 + (game.ast || 0) * 1.5 +
      (game.stl || 0) * 2 + (game.blk || 0) * 2 - (game.to || 0) * 1.5 + (game.pm || 0) * 0.35;
    const riskGame = allGames.length > 1
      ? allGames.slice().sort((a, b) => scoreGame(a) - scoreGame(b))[0]
      : null;
    const readiness = allGames.length === 0
      ? t('Untested')
      : allGames.length < 3
        ? t('Needs reps')
        : parseFloat(agg.winPct) >= 60
          ? t('Ready')
          : t('Review');
    const readinessClass = allGames.length === 0
      ? 'empty'
      : allGames.length < 3
        ? 'warn'
        : parseFloat(agg.winPct) >= 60
          ? 'good'
          : 'review';
    const nextTitle = allGames.length === 0
      ? t('Record first game')
      : allGames.length < 3
        ? t('Build the sample')
        : parseFloat(recentAgg.winPct) >= parseFloat(agg.winPct)
          ? t('Keep testing this role')
          : t('Review recent drop');
    const nextCopy = allGames.length === 0
      ? t('Log one clean baseline before judging this build.')
      : allGames.length < 3
        ? t('Get to three games before changing attributes or badges.')
        : parseFloat(recentAgg.winPct) >= parseFloat(agg.winPct)
          ? t('Recent form is holding. Change one variable at a time.')
          : t('Recent results trail the full sample. Check turnovers, shot profile, and matchup notes.');
    const riskCopy = riskGame
      ? `${riskGame.date || '-'} · ${riskGame.mode || '-'} · ${riskGame.pts || 0} ${t('PTS')} · ${riskGame.to || 0} ${t('TO')} · ${riskGame.result || '-'}`
      : t('Risk read unlocks after two games.');
    const detailCommand = `
      <section class="detail-command">
        <div class="detail-command-main">
          <div class="detail-command-kicker">${t('BUILD READ')}</div>
          <div class="detail-command-title">${nextTitle}</div>
          <div class="detail-command-copy">${nextCopy}</div>
          <div class="detail-command-actions">
            <button class="context-action primary" onclick="openGameModal()">${allGames.length ? t('Record Game') : t('Record First Game')}</button>
            ${riskGame ? `<button class="context-action" onclick='setDetailTab("games")'>${t('Review Games')}</button>` : `<button class="context-action" onclick="openBuildModal('${build.id}')">${t('Edit Build')}</button>`}
          </div>
        </div>
        <div class="detail-command-grid">
          <div class="detail-read-card ${readinessClass}">
            <span>${t('Status')}</span>
            <strong>${readiness}</strong>
            <small>${allGames.length ? `${allGames.length} ${t('games')} · ${agg.winPct}% W · ${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}` : t('No sample yet')}</small>
          </div>
          <div class="detail-read-card">
            <span>${t('Recent form')}</span>
            <strong>${recentBuildGames.length ? `${recentAgg.wins}W-${recentAgg.losses}L` : '-'}</strong>
            <small>${recentBuildGames.length ? `${recentBuildGames.length} ${t('game sample')} · ${recentAgg.ppg} ${t('PPG')}` : t('No recent game')}</small>
          </div>
          <div class="detail-read-card">
            <span>${t('Risk game')}</span>
            <strong>${riskGame ? `${riskGame.pts || 0} PTS` : '-'}</strong>
            <small>${escapeHtml(riskCopy)}</small>
          </div>
        </div>
      </section>
    `;
    const decisionStrip = renderDecisionStrip({
      allGames,
      agg,
      recentAgg,
      attrReads,
      hasBadges,
      badgeRecommendations,
      escapeHtml,
    });
    const savedGame = state.lastSavedGameId
      ? allGames.find(game => game.id === state.lastSavedGameId)
      : null;
    const savedRoster = savedGame?.roster || {};
    const savedTeammates = Array.isArray(savedRoster.teammates) ? savedRoster.teammates.length : 0;
    const savedOpponents = Array.isArray(savedRoster.opponents) ? savedRoster.opponents.length : 0;
    const savedScore = savedGame && (savedGame.scoreOwn || savedGame.scoreOpp)
      ? `${savedGame.scoreOwn || 0}-${savedGame.scoreOpp || 0}`
      : '';
    const saveFeedback = savedGame ? `
      <section class="save-feedback">
        <div class="save-feedback-main">
          <div class="save-feedback-kicker">${t('GAME SAVED')}</div>
          <div class="save-feedback-title">${savedGame.result || '-'} ${savedScore ? `${savedScore} · ` : ''}${savedGame.pts || 0} ${t('PTS')} · ${savedGame.reb || 0} ${t('REB')} · ${savedGame.ast || 0} ${t('AST')}</div>
          <div class="save-feedback-copy">${t('Build read updated.')} ${agg.wins}W-${agg.losses}L · ${agg.winPct}% W · ${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}</div>
        </div>
        <div class="save-feedback-metrics">
          <div><span>${t('Roster')}</span><strong>${savedTeammates}/${savedOpponents}</strong><small>${t('teammates/opponents')}</small></div>
          <div><span>${t('Mode')}</span><strong>${escapeHtml(savedGame.mode || '-')}</strong><small>${savedGame.date || '-'}</small></div>
        </div>
        <div class="save-feedback-actions">
          <button class="context-action primary" onclick='setDetailTab("games")'>${t('Review Games')}</button>
          <button class="context-action" onclick="dismissGameSaveFeedback()">${t('Dismiss')}</button>
        </div>
      </section>
    ` : '';
    const renderedPostgameReview = savedGame && typeof renderPostgameReview === 'function'
      ? renderPostgameReview(savedGame, allGames)
      : '';

    const streakBadge = (allGames.length >= 3 && window.NBA2K26_VISUALIZATIONS?.streakBadgeHtml)
      ? window.NBA2K26_VISUALIZATIONS.streakBadgeHtml(allGames)
      : '';
    const detailDisclosure = (title, sub, body, options = {}) => {
      if (!body) return '';
      return `
        <details class="density-disclosure${options.className ? ` ${options.className}` : ''}"${options.open ? ' open' : ''}>
          <summary>
            <span>${escapeHtml(title)}</span>
            <small>${escapeHtml(sub || '')}</small>
          </summary>
          <div class="density-disclosure-body">${body}</div>
        </details>
      `;
    };
    const directContent = (body, className = '') => body
      ? `<div class="detail-direct-stack${className ? ` ${className}` : ''}">${body}</div>`
      : '';
    const overviewDeepReads = allGames.length > 0 ? [
      renderRosterSummary(filtered),
      allGames.length > 1 && typeof renderSeasonInsights === 'function' ? renderSeasonInsights(filtered) : '',
      renderHighlightsGallery(filtered),
      renderTrendPanel(filtered),
      renderSeasonSummary(filtered),
    ].filter(Boolean).join('') : '';
    const buildVisuals = allGames.length > 0 && window.NBA2K26_VISUALIZATIONS
      ? window.NBA2K26_VISUALIZATIONS.renderBuildVisuals({
          build,
          games: filtered,
          allGames,
          aggregate,
          escapeHtml,
          escapeAttr,
        })
      : '';
    const trajectoryAnalysis = allGames.length > 0 ? `
      <section class="viz-lab detail-viz">
        <div class="viz-grid">
          ${window.NBA2K26_VISUALIZATIONS ? window.NBA2K26_VISUALIZATIONS.renderBuildTrajectory(allGames, escapeHtml, escapeAttr) : ''}
          ${window.NBA2K26_VISUALIZATIONS?.renderRollingWinRate ? window.NBA2K26_VISUALIZATIONS.renderRollingWinRate(allGames, escapeHtml, escapeAttr) : ''}
        </div>
      </section>
    ` : '';
    const advancedAnalysis = allGames.length >= 3 ? [
      window.NBA2K26_VISUALIZATIONS?.renderEfficiencyDashboard ? window.NBA2K26_VISUALIZATIONS.renderEfficiencyDashboard(filtered, escapeHtml, escapeAttr) : '',
      window.NBA2K26_VISUALIZATIONS?.renderPythagoreanPanel ? window.NBA2K26_VISUALIZATIONS.renderPythagoreanPanel(allGames, escapeHtml, escapeAttr) : '',
      window.NBA2K26_VISUALIZATIONS?.renderModeEfficiencyMatrix ? window.NBA2K26_VISUALIZATIONS.renderModeEfficiencyMatrix(allGames, escapeHtml, escapeAttr) : '',
      window.NBA2K26_VISUALIZATIONS?.renderReportCard ? window.NBA2K26_VISUALIZATIONS.renderReportCard(allGames, escapeHtml, escapeAttr) : '',
    ].filter(Boolean).join('') : '';
    const splitsAnalysis = window.NBA2K26_ADVANCED_ANALYTICS
      ? window.NBA2K26_ADVANCED_ANALYTICS.renderSplitsDrawer(allGames, { t, escapeHtml, escapeAttr, domId: 'build-splits', flat: true })
      : '';
    const rosterAnalysis = allGames.length > 0 ? [
      allGames.length >= 3 && window.NBA2K26_VISUALIZATIONS?.renderTeammateChemistry ? window.NBA2K26_VISUALIZATIONS.renderTeammateChemistry(allGames, escapeHtml, escapeAttr) : '',
      renderRosterChemistry(filtered),
      renderPlayersPanel ? renderPlayersPanel(allGames) : '',
    ].filter(Boolean).join('') : '';
    const buildSetup = [
      hasAttrs ? renderAttrsPanel(attrs) : '',
      badgePanel || '',
    ].filter(Boolean).join('');

    document.getElementById('detail-container').innerHTML = `
      <div class="workspace-header">
        <div>
          <div class="workspace-kicker">${t('BUILD WORKSPACE')}</div>
          <h1 class="workspace-title">${escapeHtml(build.name)} ${streakBadge}</h1>
          <div class="workspace-sub">${escapeHtml(build.archetype || build.position || 'Build')} · ${created} · ${allGames.length} ${t('logged games')}</div>
        </div>
        <div class="workspace-tools">
          <button class="tool-action" onclick="addToCompare('${build.id}')">${t('Add to Compare')}</button>
          <button class="tool-action" onclick="exportBuildCard('${build.id}')">${t('Export Card')}</button>
          <button class="tool-action" onclick="exportBuildReport('${build.id}')">${t('Export Report')}</button>
          <button class="tool-action" onclick="shareBuild('${build.id}')">${t('Share Build')}</button>
          <button class="tool-action" onclick="renderScoutReport('${build.id}')">${t('Scout Report')}</button>
          <button class="tool-action" onclick="openBuildModal('${build.id}')">${t('Edit Build')}</button>
        </div>
      </div>

      ${statRail}
      ${detailCommand}
      ${decisionStrip}
      ${renderedPostgameReview || saveFeedback}

      <div class="detail-top">
        <aside class="detail-sidebar">
          <div class="detail-name">${escapeHtml(build.name)}</div>
          ${build.archetype ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--yellow);letter-spacing:1px;margin-bottom:12px;">${escapeHtml(build.archetype)}</div>` : ''}
          <div class="detail-position-row">
            <span class="tag tag-primary">${escapeHtml(build.position)}</span>
            ${build.position2 ? `<span class="tag tag-outline">/ ${escapeHtml(build.position2)}</span>` : ''}
            ${build.ovr ? `<span class="tag tag-outline">${build.ovr} OVR</span>` : ''}
          </div>
          <div class="detail-specs">
            <div class="spec-row"><span class="spec-label">${t('Height')}</span><span class="spec-value">${escapeHtml(build.height || '-')}</span></div>
            <div class="spec-row"><span class="spec-label">${t('Weight')}</span><span class="spec-value">${build.weight ? build.weight + ' lbs' : '-'}</span></div>
            <div class="spec-row"><span class="spec-label">${t('Wingspan')}</span><span class="spec-value">${escapeHtml(build.wingspan || '-')}</span></div>
            ${build.bodyType ? `<div class="spec-row"><span class="spec-label">${t('Body')}</span><span class="spec-value">${escapeHtml(build.bodyType)}</span></div>` : ''}
            ${build.takeover1 ? `<div class="spec-row"><span class="spec-label">${t('Takeover')}</span><span class="spec-value" style="color:var(--orange);font-size:11px;">${escapeHtml(build.takeover1)}</span></div>` : ''}
            ${build.takeover2 ? `<div class="spec-row"><span class="spec-label">${t('Takeover 2')}</span><span class="spec-value" style="font-size:11px;">${escapeHtml(build.takeover2)}</span></div>` : ''}
            ${build.specialization ? `<div class="spec-row"><span class="spec-label">${t('Spec')}</span><span class="spec-value">${escapeHtml(build.specialization)}</span></div>` : ''}
            ${build.jumpshotBase ? `<div class="spec-row"><span class="spec-label">${t('Jumpshot')}</span><span class="spec-value" style="font-size:11px;">${escapeHtml(build.jumpshotBase)}${build.jumpshotRelease ? ' / ' + escapeHtml(build.jumpshotRelease) : ''}</span></div>` : ''}
            <div class="spec-row"><span class="spec-label">${t('Games')}</span><span class="spec-value">${allGames.length}</span></div>
          </div>
          ${build.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--border);font-size:12px;color:var(--text-dim);line-height:1.5;">${escapeHtml(build.notes)}</div>` : ''}
        </aside>

        <div>
          <div class="mode-tabs">
            ${modes.map(mode => `<button class="mode-tab ${state.currentMode === mode ? 'active' : ''}" onclick='setMode(${jsArg(mode)})'>${mode === 'All' ? 'All' : escapeHtml(mode)}</button>`).join('')}
          </div>
          ${renderAggregate(agg, filtered.length)}
        </div>
      </div>

      <div class="detail-tabs" role="tablist" aria-label="Build detail sections">
        ${detailTabs.map(tab => `
          <button class="detail-tab ${activeTab === tab.id ? 'active' : ''}" onclick='setDetailTab(${jsArg(tab.id)})' type="button">
            <span>${escapeHtml(tab.label)}</span>
            <small>${escapeHtml(tab.sub)}</small>
          </button>
        `).join('')}
      </div>

      <div class="detail-tab-panel">
        ${activeTab === 'overview' ? `
          ${starterPanel}
          ${allGames.length === 1 ? renderFirstGameRecap(allGames) : ''}
          ${detailDisclosure(t('BUILD VISUALS'), `${allGames.length} ${t('games')}`, buildVisuals)}
          ${detailDisclosure(t('Analysis'), `${allGames.length} ${t('games')}`, overviewDeepReads)}
        ` : ''}

        ${activeTab === 'analysis' ? `
          ${allGames.length === 0 ? `<div class="empty-state"><div class="empty-state-text">${t('// record games to unlock trend, grade, and split analysis')}</div></div>` : ''}
          ${directContent([trajectoryAnalysis, advancedAnalysis, splitsAnalysis].filter(Boolean).join(''), 'analysis-direct-stack')}
        ` : ''}

        ${activeTab === 'games' ? `
          <div class="table-section tabbed-table-section">
            <div class="section-title">${t('Game Records')} <span style="color:var(--text-fade);font-size:13px;font-family:'JetBrains Mono',monospace;letter-spacing:2px;margin-left:auto;">${filtered.length} ${t('games')}</span></div>
            ${renderGameFilterBar()}
            ${renderGamesTable(filtered)}
          </div>
        ` : ''}

        ${activeTab === 'roster' ? `
          ${allGames.length > 0
            ? directContent(rosterAnalysis, 'roster-direct-stack')
            : `<div class="empty-state"><div class="empty-state-text">${t('// record games with teammate or opponent rows to unlock chemistry analysis')}</div></div>`}
        ` : ''}

        ${activeTab === 'build' ? `
          ${buildSetup
            ? directContent(buildSetup, 'build-direct-stack')
            : `<div class="empty-state"><div class="empty-state-text">${t('// no build attributes or badges saved yet')}</div></div>`}
        ` : ''}
      </div>
    `;
  }

  function setMode(mode, deps) {
    const { state, renderBuildDetail } = deps;
    state.currentMode = mode;
    renderBuildDetail();
  }

  function setDetailTab(tab, deps) {
    const { state, renderBuildDetail } = deps;
    state.detailTab = tab || 'overview';
    renderBuildDetail();
  }

  window.NBA2K26_BUILD_DETAIL = {
    openBuildDetail,
    renderBuildDetail,
    setMode,
    setDetailTab,
  };
})(window);
