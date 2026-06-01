// NBA 2K26 render helpers.
// These functions produce HTML strings only; the main app still owns state and events.
(function(window) {
  'use strict';

  function jsArg(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function metricCard(label, value, sub, options = {}) {
    return `
      <div class="account-bar-card ${options.primary ? 'primary' : ''}">
        <div class="account-bar-label">${label}</div>
        <div class="account-bar-value ${options.hot ? 'hot' : ''}">${value}</div>
        <div class="account-bar-sub">${sub}</div>
      </div>
    `;
  }

  function contextAction(page, context = {}) {
    const currentBuild = context.currentBuild || null;
    const defaultBuild = context.defaultBuild || null;
    const builds = context.builds || [];
    const games = context.games || [];
    const hasRosterIntel = games.some(game => {
      const roster = game.roster || {};
      return (roster.teammates || []).length || (roster.opponents || []).length;
    });

    if (page === 'detail' && currentBuild) {
      return `<button class="context-action primary" onclick="openGameModal()">${t('Record Game')}</button>`;
    }
    if (page === 'overview') {
      return `<button class="context-action" onclick="openDataModal()">${t('Backup')}</button>`;
    }
    if (page === 'quality') {
      return `<button class="context-action primary" onclick="renderDataQuality()">${t('Refresh audit')}</button>`;
    }
    if (page === 'players') {
      if (hasRosterIntel) return `<button class="context-action primary" onclick="switchPlayersView('intel')">${t('Open Intel')}</button>`;
      if (defaultBuild) return `<button class="context-action primary" onclick="quickLogGame('${jsArg(defaultBuild.id)}')">${t('Record Game')}</button>`;
      return `<button class="context-action primary" onclick="openBuildModal()">${t('Create Build')}</button>`;
    }
    if (page === 'games') {
      if (defaultBuild) return `<button class="context-action primary" onclick="quickLogGame('${jsArg(defaultBuild.id)}')">${t('Record Game')}</button>`;
      return `<button class="context-action primary" onclick="openBuildModal()">${t('Create Build')}</button>`;
    }
    if (page === 'compare') {
      if (builds.length >= 2) return `<button class="context-action" onclick="showPage('builds')">${t('Build Library')}</button>`;
      return `<button class="context-action primary" onclick="openBuildModal()">${t('Create Build')}</button>`;
    }
    return `<button class="context-action primary" onclick="openBuildModal()">${t('New Build')}</button>`;
  }

  function accountBarHtml({ state, aggregate, escapeHtml, page = 'builds' }) {
    const games = state.games || [];
    const builds = state.builds || [];
    const currentBuild = builds.find(build => build.id === state.currentBuildId);
    const sortedGames = [...games].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
    const recent = sortedGames.slice(0, 10);
    const agg = aggregate(games);
    const recentAgg = aggregate(recent);

    const modeMap = {};
    games.forEach(game => {
      const mode = game.mode || 'Unknown';
      if (!modeMap[mode]) modeMap[mode] = [];
      modeMap[mode].push(game);
    });
    const topMode = Object.keys(modeMap)
      .map(mode => ({ mode, count: modeMap[mode].length, agg: aggregate(modeMap[mode]) }))
      .sort((a, b) => b.count - a.count)[0];

    const buildRows = builds.map(build => {
      const buildGames = games.filter(game => game.buildId === build.id);
      return { build, games: buildGames, agg: aggregate(buildGames) };
    }).filter(row => row.games.length > 0);
    const bestBuild = buildRows.sort((a, b) => {
      const scoreA = (parseFloat(a.agg.winPct) || 0) + (parseFloat(a.agg.ppg) || 0) + (parseFloat(a.agg.plusMinus) || 0);
      const scoreB = (parseFloat(b.agg.winPct) || 0) + (parseFloat(b.agg.ppg) || 0) + (parseFloat(b.agg.plusMinus) || 0);
      return scoreB - scoreA;
    })[0];

    const pageTitle = page === 'overview'
      ? t('Career Overview')
      : page === 'quality'
        ? t('Data Quality Center')
      : page === 'detail' && currentBuild
        ? currentBuild.name
        : t('Build Library');
    const pageSub = page === 'overview'
      ? t('All builds, all modes')
      : page === 'quality'
        ? t('Find broken links, missing fields, duplicate samples, and stat conflicts')
      : page === 'detail' && currentBuild
        ? `${currentBuild.position || '-'}${currentBuild.ovr ? ` · ${currentBuild.ovr} OVR` : ''}${currentBuild.archetype ? ` · ${currentBuild.archetype}` : ''}`
        : `${builds.length} ${t('builds managed')}`;

    const record = `${agg.wins}W-${agg.losses}L`;
    const recentTone = parseFloat(recentAgg.winPct) >= parseFloat(agg.winPct);
    const lastGame = recent[0];
    const detailGames = currentBuild ? games.filter(game => game.buildId === currentBuild.id) : [];
    const detailAgg = aggregate(detailGames);
    const detailSorted = [...detailGames].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
    const detailRecent = detailSorted.slice(0, Math.min(5, detailSorted.length));
    const detailRecentAgg = aggregate(detailRecent);
    const detailRecentTone = detailGames.length >= 2 && parseFloat(detailRecentAgg.winPct) >= parseFloat(detailAgg.winPct);
    const defaultBuild = currentBuild || bestBuild?.build || builds[0] || null;
    const rosterRows = games.flatMap(game => {
      const roster = game.roster || {};
      return [...(roster.teammates || []), ...(roster.opponents || [])];
    });
    const rosterNames = new Set(rosterRows.map(row => String(row.name || '').trim()).filter(Boolean));
    const teammateNames = new Set(games.flatMap(game => ((game.roster || {}).teammates || []))
      .map(row => String(row.name || '').trim())
      .filter(Boolean));
    const opponentNames = new Set(games.flatMap(game => ((game.roster || {}).opponents || []))
      .map(row => String(row.name || '').trim())
      .filter(Boolean));
    const playerCount = Math.max((state.players || []).length, rosterNames.size);
    const selectedCompareCount = (state.compareIds || []).filter(Boolean).length;
    const gameBuildIds = new Set(games.map(game => game.buildId).filter(Boolean));
    const pageMetaMap = {
      overview: {
        kicker: t('ACCOUNT VIEW'),
        title: t('Career Overview'),
        sub: t('All builds, all modes'),
      },
      builds: {
        kicker: t('BUILD LIBRARY'),
        title: t('Build Library'),
        sub: `${builds.length} ${t('builds managed')}`,
      },
      players: {
        kicker: t('PLAYER DIRECTORY'),
        title: t('Player Directory'),
        sub: playerCount
          ? `${playerCount} ${t('players tracked')} / ${opponentNames.size} ${t('opponents')}`
          : t('Roster names appear here after games are logged'),
      },
      games: {
        kicker: t('GAME LOG'),
        title: t('All Games'),
        sub: games.length
          ? `${games.length} ${t('games logged')} / ${gameBuildIds.size} ${t('builds used')}`
          : t('Record a game from any build'),
      },
      quality: {
        kicker: t('DATA VIEW'),
        title: t('Data Quality Center'),
        sub: t('Find broken links, missing fields, duplicate samples, and stat conflicts'),
      },
      compare: {
        kicker: t('COMPARE VIEW'),
        title: t('Build Compare'),
        sub: builds.length >= 2
          ? `${selectedCompareCount} ${t('selected')} / ${builds.length} ${t('available')}`
          : t('Create at least two builds to compare'),
      },
    };
    const pageMeta = page === 'detail' && currentBuild
      ? {
        kicker: t('CURRENT BUILD'),
        title: currentBuild.name,
        sub: [
          currentBuild.position || '-',
          currentBuild.ovr ? `${currentBuild.ovr} OVR` : '',
          currentBuild.archetype || '',
        ].filter(Boolean).join(' / '),
      }
      : pageMetaMap[page] || pageMetaMap.builds;

    let cards;
    if (page === 'detail' && currentBuild) {
      const recentLabel = detailRecent.length
        ? `${t('last')} ${detailRecent.length} ${t('games')}`
        : t('this build only');
      cards = [
        metricCard(t('BUILD RECORD'), `${detailAgg.wins}W-${detailAgg.losses}L`, `${detailGames.length} ${t('games logged')}`, { primary: true, hot: detailGames.length > 0 }),
        metricCard(t('WIN RATE'), detailGames.length ? `${detailAgg.winPct}%` : '-', t('this build only'), { hot: parseFloat(detailAgg.winPct) >= 50 }),
        metricCard(t('SCORING'), detailGames.length ? detailAgg.ppg : '-', `${detailAgg.rpg} ${t('RPG')} / ${detailAgg.apg} ${t('APG')}`),
        metricCard(t('FORM'), detailRecent.length ? `${detailRecentAgg.wins}W-${detailRecentAgg.losses}L` : '-', recentLabel, { hot: detailRecentTone }),
      ];
    } else if (page === 'overview') {
      cards = [
        metricCard(t('ACCOUNT RECORD'), record, `${games.length} ${t('games logged')} / ${builds.length} ${t('BUILDS')}`, { primary: true, hot: games.length > 0 }),
        metricCard(t('WIN RATE'), games.length ? `${agg.winPct}%` : '-', `${t('RECENT FORM')} ${recentAgg.winPct || 0}%`, { hot: parseFloat(agg.winPct) >= 50 }),
        metricCard(t('RECENT 10'), recent.length ? `${recentAgg.wins}W-${recentAgg.losses}L` : '-', `${recent.length} ${t('game sample')}`, { hot: recentTone }),
        metricCard(t('MAIN MODE'), escapeHtml(topMode?.mode || '-'), topMode ? `${topMode.count} ${t('games logged')} / ${topMode.agg.winPct}% W` : '-'),
      ];
    } else if (page === 'players') {
      cards = [
        metricCard(t('PLAYERS'), playerCount || '-', (state.players || []).length ? `${(state.players || []).length} ${t('saved profiles')}` : t('from roster data'), { primary: true, hot: playerCount > 0 }),
        metricCard(t('TEAMMATES'), teammateNames.size || '-', rosterRows.length ? `${rosterRows.length} ${t('roster rows')}` : t('log rosters from games')),
        metricCard(t('OPPONENTS'), opponentNames.size || '-', opponentNames.size ? t('intel ready') : t('add opponent stats')),
        metricCard(t('LAST GAME'), lastGame ? escapeHtml(lastGame.date || '-') : '-', lastGame ? escapeHtml(lastGame.mode || t('Unknown mode')) : t('record a game first')),
      ];
    } else if (page === 'games') {
      cards = [
        metricCard(t('GAME RECORD'), games.length ? record : '-', `${games.length} ${t('games logged')}`, { primary: true, hot: games.length > 0 }),
        metricCard(t('WIN RATE'), games.length ? `${agg.winPct}%` : '-', recent.length ? `${t('RECENT FORM')} ${recentAgg.winPct}%` : t('needs game data'), { hot: parseFloat(agg.winPct) >= 50 }),
        metricCard(t('ACTIVE BUILDS'), gameBuildIds.size || '-', `${builds.length} ${t('builds managed')}`),
        metricCard(t('LAST GAME'), lastGame ? escapeHtml(lastGame.date || '-') : '-', lastGame ? escapeHtml(lastGame.mode || t('Unknown mode')) : t('add a game from build detail')),
      ];
    } else if (page === 'compare') {
      cards = [
        metricCard(t('COMPARE SLOTS'), selectedCompareCount || '-', `${Math.max(2, selectedCompareCount || 0)} ${t('visible slots')}`, { primary: true, hot: selectedCompareCount >= 2 }),
        metricCard(t('ELIGIBLE BUILDS'), builds.length, builds.length >= 2 ? t('ready to compare') : t('needs another build')),
        metricCard(t('TESTED BUILDS'), buildRows.length || '-', games.length ? `${games.length} ${t('logged games')}` : t('no games logged yet')),
        metricCard(t('BEST SAMPLE'), bestBuild ? escapeHtml(bestBuild.build.name) : '-', bestBuild ? `${bestBuild.agg.winPct}% W / ${bestBuild.agg.ppg} ${t('PPG')}` : t('needs game data')),
      ];
    } else {
      cards = [
        metricCard(t('BUILDS'), builds.length, games.length ? `${games.length} ${t('logged games')}` : t('no games logged yet'), { primary: true, hot: builds.length > 0 }),
        metricCard(t('BEST BUILD'), bestBuild ? escapeHtml(bestBuild.build.name) : '-', bestBuild ? `${bestBuild.agg.winPct}% W / ${bestBuild.agg.ppg} ${t('PPG')}` : t('needs game data')),
        metricCard(t('RECENT FORM'), recent.length ? `${recentAgg.wins}W-${recentAgg.losses}L` : '-', `${recent.length} ${t('game sample')}`, { hot: recentTone }),
        metricCard(t('LAST GAME'), lastGame ? escapeHtml(lastGame.date || '-') : '-', lastGame ? escapeHtml(lastGame.mode || t('Unknown mode')) : t('add a game from build detail')),
      ];
    }

    return `
      <div class="account-bar context-summary" data-context="${escapeHtml(page)}">
        <div class="context-intro">
          <div class="context-kicker">${escapeHtml(pageMeta.kicker)}</div>
          <div class="context-title">${escapeHtml(pageMeta.title)}</div>
          <div class="context-sub">${escapeHtml(pageMeta.sub)}</div>
        </div>
        ${cards.join('')}
        <div class="context-actions">
          ${contextAction(page, { currentBuild, defaultBuild, builds, games })}
        </div>
      </div>
    `;
  }
  function buildsHtml({ state, aggregate, groupAvg, attrGroups, t, escapeHtml }) {
    if (!state.builds || state.builds.length === 0) {
      return `
        <div class="empty-state build-library-empty">
          <div class="empty-state-icon">+</div>
          <div class="empty-state-title">${t('No builds in the library')}</div>
          <div class="empty-state-text">${t('// create a build first, then use Overview to track performance')}</div>
          <button class="context-action primary" type="button" onclick="openBuildModal()">${t('Create Build')}</button>
        </div>
      `;
    }
    const buildRows = state.builds.map(build => {
      const games = (state.games || []).filter(g => g.buildId === build.id);
      const agg = aggregate(games);
      const latestGame = games
        .slice()
        .sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology)[0];
      const score = (parseFloat(agg.winPct) || 0) * 0.55 +
        (parseFloat(agg.plusMinus) || 0) * 2.2 +
        (parseFloat(agg.ppg) || 0) * 0.9 +
        (parseFloat(agg.apg) || 0) * 1.6 -
        (parseFloat(agg.topg) || 0) * 2.4;
      return { build, games, agg, latestGame, score };
    });
    const testedRows = buildRows.filter(row => row.games.length > 0);
    const rankedRows = testedRows.slice().sort((a, b) => b.score - a.score);
    const bestRow = rankedRows[0];
    const lowSampleRow = buildRows
      .slice()
      .sort((a, b) => a.games.length - b.games.length || String(b.build.createdAt || '').localeCompare(String(a.build.createdAt || '')))[0];
    const recentRow = testedRows
      .slice()
      .sort((a, b) => window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a.latestGame, b.latestGame))[0];
    const commandCards = [
      {
        label: t('Best sample'),
        row: bestRow,
        title: bestRow ? bestRow.build.name : t('No sample yet'),
        copy: bestRow ? `${bestRow.games.length} GP · ${bestRow.agg.winPct}% W · ${bestRow.agg.ppg} ${t('PPG')} · ${parseFloat(bestRow.agg.plusMinus) >= 0 ? '+' : ''}${bestRow.agg.plusMinus}` : t('Record games to rank builds.'),
        tone: 'primary',
      },
      {
        label: t('Needs reps'),
        row: lowSampleRow,
        title: lowSampleRow ? lowSampleRow.build.name : t('Create a build'),
        copy: lowSampleRow ? `${lowSampleRow.games.length} GP · ${lowSampleRow.games.length < 3 ? t('low sample') : t('sample is usable')} · ${escapeHtml(lowSampleRow.build.position || '-')}` : t('Create a build first.'),
        tone: lowSampleRow && lowSampleRow.games.length < 3 ? 'warn' : '',
      },
      {
        label: t('Recently used'),
        row: recentRow,
        title: recentRow ? recentRow.build.name : t('No recent game'),
        copy: recentRow ? `${recentRow.latestGame?.date || '-'} · ${escapeHtml(recentRow.latestGame?.mode || '-')} · ${recentRow.latestGame?.result || '-'}` : t('Log a game from any build detail.'),
        tone: '',
      },
    ];
    const formatSigned = value => {
      const number = parseFloat(value) || 0;
      return `${number >= 0 ? '+' : ''}${number.toFixed(1)}`;
    };
    const attrRead = row => {
      const attrs = row.build.attrs || {};
      const groups = Object.keys(attrGroups || {})
        .map(group => ({ group, label: attrGroups[group].label, value: groupAvg(attrs, group) }))
        .filter(item => item.value != null);
      if (!groups.length) return '-';
      groups.sort((a, b) => b.value - a.value);
      return `${t(groups[0].label)} ${groups[0].value}`;
    };
    const compareRows = (testedRows.length >= 2 ? rankedRows : buildRows)
      .slice()
      .sort((a, b) => {
        if (testedRows.length >= 2) return b.score - a.score;
        return b.games.length - a.games.length || String(b.build.createdAt || '').localeCompare(String(a.build.createdAt || ''));
      })
      .slice(0, 2);
    const compareHtml = compareRows.length >= 2 ? (() => {
      const [a, b] = compareRows;
      const scoreDelta = a.score - b.score;
      const recommended = scoreDelta >= 0 ? a : b;
      const alternate = scoreDelta >= 0 ? b : a;
      const reason = recommended.games.length < 3
        ? t('Recommendation is sample-limited; log more games before committing.')
        : parseFloat(recommended.agg.winPct) >= parseFloat(alternate.agg.winPct)
          ? t('Stronger record and impact in the current sample.')
          : t('Higher impact score despite a different win rate profile.');
      const metric = (label, left, right, tone = '') => `
        <div class="build-compare-metric ${tone}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(left)}</strong>
          <strong>${escapeHtml(right)}</strong>
        </div>
      `;
      return `
        <section class="build-compare-panel">
          <div class="build-compare-head">
            <div>
              <div class="build-command-kicker">${t('BUILD COMPARISON')}</div>
              <div class="build-command-title">${t('Quick two-build read')}</div>
              <div class="build-command-sub">${t('Auto-picked from current samples so the library has an immediate decision read.')}</div>
            </div>
            <div class="build-compare-pick">
              <span>${t('Recommended')}</span>
              <strong>${escapeHtml(recommended.build.name || 'Unnamed')}</strong>
              <small>${escapeHtml(reason)}</small>
            </div>
          </div>
          <div class="build-compare-table">
            <div class="build-compare-build">
              <button type="button" onclick="openBuildDetail('${jsArg(a.build.id)}')">${escapeHtml(a.build.name || 'Unnamed')}</button>
              <small>${escapeHtml(a.build.position || '-')} ${a.build.ovr ? ` / ${a.build.ovr} OVR` : ''}</small>
            </div>
            <div class="build-compare-build">
              <button type="button" onclick="openBuildDetail('${jsArg(b.build.id)}')">${escapeHtml(b.build.name || 'Unnamed')}</button>
              <small>${escapeHtml(b.build.position || '-')} ${b.build.ovr ? ` / ${b.build.ovr} OVR` : ''}</small>
            </div>
            ${metric('GP', `${a.games.length}`, `${b.games.length}`)}
            ${metric('W%', `${a.agg.winPct}%`, `${b.agg.winPct}%`)}
            ${metric('PPG', a.agg.ppg, b.agg.ppg)}
            ${metric('APG / TO', `${a.agg.apg} / ${a.agg.topg}`, `${b.agg.apg} / ${b.agg.topg}`)}
            ${metric('+/-', formatSigned(a.agg.plusMinus), formatSigned(b.agg.plusMinus), 'impact')}
            ${metric(t('Best attribute'), attrRead(a), attrRead(b))}
          </div>
        </section>
      `;
    })() : '';
    const commandHtml = `
      <section class="build-command">
        <div class="build-command-head">
          <div>
            <div class="build-command-kicker">${t('BUILD COMMAND')}</div>
            <div class="build-command-title">${t('Choose the next build')}</div>
            <div class="build-command-sub">${state.builds.length} ${t('builds managed')} · ${(state.games || []).length} ${t('logged games')}</div>
          </div>
          <button class="context-action primary" type="button" onclick="openBuildModal()">${t('New Build')}</button>
        </div>
        <div class="build-command-grid">
          ${commandCards.map(card => `
            <button class="build-command-card ${card.tone}" type="button" onclick="${card.row ? `openBuildDetail('${jsArg(card.row.build.id)}')` : `openBuildModal()`}">
              <span>${card.label}</span>
              <strong>${escapeHtml(card.title)}</strong>
              <small>${escapeHtml(card.copy)}</small>
            </button>
          `).join('')}
        </div>
      </section>
    `;
    return commandHtml + compareHtml + '<div class="builds-grid">' + buildRows.map(row => {
      const b = row.build;
      const games = row.games;
      const agg = row.agg;
      const attrs = b.attrs || {};
      let topGroup = null, topVal = 0;
      if (Object.keys(attrs).length > 0) {
        Object.keys(attrGroups).forEach(g => {
          const v = groupAvg(attrs, g);
          if (v != null && v > topVal) { topVal = v; topGroup = g; }
        });
      }
      const topLabel = topGroup ? `${t(attrGroups[topGroup].label)} ${topVal}` : '';
      const id = jsArg(b.id);
      const status = games.length === 0
        ? t('Untested')
        : games.length < 3
          ? t('Needs reps')
          : parseFloat(agg.winPct) >= 60
            ? t('Ready')
            : t('Needs review');
      const statusClass = games.length === 0
        ? 'empty'
        : games.length < 3
          ? 'warn'
          : parseFloat(agg.winPct) >= 60
            ? 'good'
            : 'review';

      return `
        <div class="build-card" onclick="openBuildDetail('${id}')">
          <div class="build-card-header">
            <div style="flex:1;min-width:0;">
              <div class="build-card-status ${statusClass}">${status}</div>
              <div class="build-name">${escapeHtml(b.name || 'Unnamed')}</div>
              ${b.archetype ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--yellow);letter-spacing:1px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.archetype)}</div>` : ''}
            </div>
            <div class="build-card-actions">
              <button class="card-action-btn" onclick="event.stopPropagation();quickLogGame('${id}')" title="${t('Record Game')}">●</button>
              <button class="card-action-btn" onclick="event.stopPropagation();duplicateBuild('${id}')" title="${t('Duplicate')}">⊕</button>
              <div class="build-position">${escapeHtml(b.position || '-')}</div>
            </div>
          </div>
          <div class="build-meta">
            <div>HT <span>${escapeHtml(b.height || '-')}</span></div>
            <div>WT <span>${escapeHtml(b.weight ? String(b.weight) : '-')}</span></div>
            <div>OVR <span>${escapeHtml(b.ovr ? String(b.ovr) : '-')}</span></div>
            ${topLabel ? `<div style="margin-left:auto;color:var(--orange);">★ <span>${topLabel}</span></div>` : ''}
          </div>
          <div class="build-stats">
            <div class="stat-mini"><div class="stat-mini-label">GP</div><div class="stat-mini-value">${games.length}</div></div>
            <div class="stat-mini"><div class="stat-mini-label">PPG</div><div class="stat-mini-value">${agg.ppg}</div></div>
            <div class="stat-mini"><div class="stat-mini-label">APG</div><div class="stat-mini-value">${agg.apg}</div></div>
            <div class="stat-mini"><div class="stat-mini-label">W%</div><div class="stat-mini-value">${agg.winPct}</div></div>
          </div>
          <div class="build-card-foot">
            <span>${games.length ? `${agg.wins}W-${agg.losses}L · ${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}` : t('Record first game')}</span>
            <span>${row.latestGame ? `${escapeHtml(row.latestGame.mode || '-')} · ${row.latestGame.date || '-'}` : t('No recent game')}</span>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }

  window.NBA2K26_RENDER = {
    accountBarHtml,
    buildsHtml,
  };
})(window);
