// NBA 2K26 Data Quality Center.
// Scans local state for broken links, stat conflicts, duplicates, and thin records.
(function(window) {
  'use strict';

  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const hasNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const norm = value => String(value || '').trim().toLowerCase();
  const tr = value => typeof window.t === 'function' ? window.t(value) : value;
  const defaultEscape = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const jsArg = value => String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };
  const AREA_LABELS = {
    build: 'Builds',
    game: 'Games',
    roster: 'Rosters',
    player: 'Players',
  };

  function seasonForDate(date) {
    if (!date) return null;
    const seasons = typeof NBA2K26_SEASONS !== 'undefined' ? NBA2K26_SEASONS : [];
    return seasons.find(season => date >= season.from && date <= season.to) || null;
  }

  function actionButton(label, command, escapeHtml, escapeAttr) {
    return `<button class="dq-action-btn" type="button" onclick="${escapeAttr(command)}">${escapeHtml(label)}</button>`;
  }

  function analyzeDataQuality(state) {
    const builds = Array.isArray(state?.builds) ? state.builds : [];
    const games = Array.isArray(state?.games) ? state.games : [];
    const players = Array.isArray(state?.players) ? state.players : [];
    const buildById = new Map(builds.map(build => [String(build.id || ''), build]).filter(([id]) => id));
    const issues = [];
    const add = issue => {
      issues.push({
        id: `dq-${issues.length + 1}`,
        severity: issue.severity || 'info',
        area: issue.area || 'game',
        code: issue.code || 'general',
        title: issue.title || 'Data issue',
        detail: issue.detail || '',
        recordLabel: issue.recordLabel || '-',
        recordKey: issue.recordKey || issue.recordLabel || issue.code || `issue-${issues.length + 1}`,
        action: issue.action || '',
      });
    };

    if (!builds.length) {
      add({
        severity: 'info',
        area: 'build',
        code: 'no-builds',
        title: 'No builds yet',
        detail: 'Create one build before quality checks can connect games to builds.',
        recordLabel: 'Build Library',
      });
    }

    const buildNames = new Map();
    builds.forEach(build => {
      const label = build.name || build.id || 'Unnamed build';
      if (!build.id) {
        add({
          severity: 'critical',
          area: 'build',
          code: 'build-missing-id',
          title: 'Build is missing an ID',
          detail: 'This build cannot safely link games or exports.',
          recordLabel: label,
        });
      }
      if (!String(build.name || '').trim()) {
        add({
          severity: 'critical',
          area: 'build',
          code: 'build-missing-name',
          title: 'Build is missing a name',
          detail: 'Name the build so reports, comparisons, and game links stay readable.',
          recordLabel: label,
          recordKey: `build:${build.id || label}:name`,
        });
      }
      if (!String(build.position || '').trim()) {
        add({
          severity: 'warning',
          area: 'build',
          code: 'build-missing-position',
          title: 'Build position is empty',
          detail: 'Add a position so build comparisons and role reads are easier to trust.',
          recordLabel: label,
          recordKey: `build:${build.id}:position`,
          action: build.id ? `openBuildModal('${jsArg(build.id)}')` : '',
        });
      }
      if (hasNumber(build.ovr) && (num(build.ovr) < 40 || num(build.ovr) > 99)) {
        add({
          severity: 'warning',
          area: 'build',
          code: 'build-ovr-range',
          title: 'Build OVR is outside the expected range',
          detail: 'OVR should usually stay between 40 and 99.',
          recordLabel: label,
          recordKey: `build:${build.id}:ovr`,
          action: build.id ? `openBuildModal('${jsArg(build.id)}')` : '',
        });
      }
      const attrCount = build.attrs && typeof build.attrs === 'object'
        ? Object.values(build.attrs).filter(value => hasNumber(value) && num(value) > 0).length
        : 0;
      if (attrCount > 0 && attrCount < 8) {
        add({
          severity: 'info',
          area: 'build',
          code: 'build-thin-attrs',
          title: 'Build attribute coverage is thin',
          detail: 'Only a few attributes are filled, so scout reports and comparison reads may be shallow.',
          recordLabel: label,
          recordKey: `build:${build.id}:attrs`,
          action: build.id ? `openBuildModal('${jsArg(build.id)}')` : '',
        });
      }
      const nameKey = norm(build.name);
      if (nameKey) {
        const rows = buildNames.get(nameKey) || [];
        rows.push(build);
        buildNames.set(nameKey, rows);
      }
    });

    buildNames.forEach(rows => {
      if (rows.length <= 1) return;
      add({
        severity: 'warning',
        area: 'build',
        code: 'duplicate-build-name',
        title: 'Duplicate build name',
        detail: 'Multiple builds share this name. Rename one if they are different builds.',
        recordLabel: rows[0].name || 'Unnamed build',
        recordKey: `build-name:${norm(rows[0].name)}`,
        action: rows[0].id ? `openBuildModal('${jsArg(rows[0].id)}')` : '',
      });
    });

    const gameFingerprints = new Map();
    games.forEach(game => {
      const build = buildById.get(String(game.buildId || ''));
      const label = `${game.date || 'No date'} / ${game.mode || 'No mode'} / ${game.result || '-'}`;
      const action = game.id ? `openGameFromGlobalList('${jsArg(game.id)}','${jsArg(game.buildId)}')` : '';

      if (!game.id) {
        add({
          severity: 'critical',
          area: 'game',
          code: 'game-missing-id',
          title: 'Game is missing an ID',
          detail: 'This game cannot be edited or linked reliably.',
          recordLabel: label,
        });
      }
      if (!game.buildId || !build) {
        add({
          severity: 'critical',
          area: 'game',
          code: 'game-missing-build',
          title: 'Game points to a missing build',
          detail: 'Reconnect this game to an existing build or import the missing build.',
          recordLabel: label,
          recordKey: `game:${game.id}:build`,
          action,
        });
      }
      if (!String(game.date || '').trim()) {
        add({
          severity: 'warning',
          area: 'game',
          code: 'game-missing-date',
          title: 'Game date is empty',
          detail: 'Add a date so chronology, seasons, recent form, and reports stay correct.',
          recordLabel: label,
          recordKey: `game:${game.id}:date`,
          action,
        });
      } else if (typeof NBA2K26_SEASONS !== 'undefined' && !seasonForDate(game.date)) {
        add({
          severity: 'info',
          area: 'game',
          code: 'game-outside-season',
          title: 'Game date is outside tracked seasons',
          detail: 'Season reports may ignore this game unless the official season ranges are updated.',
          recordLabel: label,
          recordKey: `game:${game.id}:season`,
          action,
        });
      }
      if (!String(game.mode || '').trim()) {
        add({
          severity: 'warning',
          area: 'game',
          code: 'game-missing-mode',
          title: 'Game mode is empty',
          detail: 'Mode breakdowns and matchup trends need this field.',
          recordLabel: label,
          recordKey: `game:${game.id}:mode`,
          action,
        });
      }
      if (game.result !== 'W' && game.result !== 'L') {
        add({
          severity: 'critical',
          area: 'game',
          code: 'game-result-invalid',
          title: 'Game result is not W or L',
          detail: 'Set the result so every win-rate surface stays stable.',
          recordLabel: label,
          recordKey: `game:${game.id}:result`,
          action,
        });
      }

      const hasScore = hasNumber(game.scoreOwn) && hasNumber(game.scoreOpp);
      if (hasScore) {
        const scoreOwn = num(game.scoreOwn);
        const scoreOpp = num(game.scoreOpp);
        const expectedResult = scoreOwn > scoreOpp ? 'W' : scoreOwn < scoreOpp ? 'L' : '';
        if (expectedResult && game.result && expectedResult !== game.result) {
          add({
            severity: 'critical',
            area: 'game',
            code: 'score-result-mismatch',
            title: 'Score and result disagree',
            detail: 'Final score and saved result point in different directions.',
            recordLabel: `${label} / ${scoreOwn}-${scoreOpp}`,
            recordKey: `game:${game.id}:score-result`,
            action,
          });
        }
        if (scoreOwn === 0 && scoreOpp === 0 && (num(game.pts) > 0 || num(game.reb) > 0 || num(game.ast) > 0)) {
          add({
            severity: 'info',
            area: 'game',
            code: 'scoreboard-empty',
            title: 'Scoreboard is still 0-0',
            detail: 'Add the final score if you want plus-minus and result checks to be stronger.',
            recordLabel: label,
            recordKey: `game:${game.id}:score-empty`,
            action,
          });
        }
        if (hasNumber(game.pm) && Math.abs(num(game.pm) - (scoreOwn - scoreOpp)) > 1) {
          add({
            severity: 'warning',
            area: 'game',
            code: 'pm-score-mismatch',
            title: 'Plus-minus does not match the final score',
            detail: 'Saved plus-minus does not match score margin.',
            recordLabel: label,
            recordKey: `game:${game.id}:pm`,
            action,
          });
        }
      }

      const shotPairs = [
        ['fg2m', 'fg2a', 'FG'],
        ['fg3m', 'fg3a', '3PT'],
        ['ftm', 'fta', 'FT'],
      ];
      shotPairs.forEach(([made, attempted, labelKey]) => {
        if (num(game[made]) > num(game[attempted])) {
          add({
            severity: 'critical',
            area: 'game',
            code: 'shooting-made-over-attempts',
            title: 'Made shots exceed attempts',
            detail: 'One shooting line has more makes than attempts.',
            recordLabel: label,
            recordKey: `game:${game.id}:${made}`,
            action,
          });
        }
      });
      const shotAttempts = num(game.fg2a) + num(game.fg3a) + num(game.fta);
      if (shotAttempts > 0) {
        const expectedPts = num(game.fg2m) * 2 + num(game.fg3m) * 3 + num(game.ftm);
        if (num(game.pts) > 0 && Math.abs(num(game.pts) - expectedPts) > 6) {
          add({
            severity: 'warning',
            area: 'game',
            code: 'points-shot-line-gap',
            title: 'Points and shot line are far apart',
            detail: 'PTS and entered shot line imply different totals.',
            recordLabel: label,
            recordKey: `game:${game.id}:points-shot-line`,
            action,
          });
        }
      }

      const fingerprint = [
        game.buildId || '',
        game.date || '',
        game.mode || '',
        game.result || '',
        hasNumber(game.scoreOwn) ? num(game.scoreOwn) : '',
        hasNumber(game.scoreOpp) ? num(game.scoreOpp) : '',
        num(game.pts),
        num(game.reb),
        num(game.ast),
      ].join('|');
      const fpRows = gameFingerprints.get(fingerprint) || [];
      fpRows.push(game);
      gameFingerprints.set(fingerprint, fpRows);

      const roster = game.roster && typeof game.roster === 'object' ? game.roster : {};
      const teammates = Array.isArray(roster.teammates) ? roster.teammates : [];
      const opponents = Array.isArray(roster.opponents) ? roster.opponents : [];
      if (!teammates.length && !opponents.length) {
        add({
          severity: 'info',
          area: 'roster',
          code: 'roster-empty',
          title: 'No roster rows on this game',
          detail: 'Roster names unlock chemistry, opponent intel, and player profile reads.',
          recordLabel: label,
          recordKey: `game:${game.id}:roster-empty`,
          action,
        });
      } else if (!teammates.length || !opponents.length) {
        add({
          severity: 'info',
          area: 'roster',
          code: 'roster-one-sided',
          title: 'Roster is only filled on one side',
          detail: 'Add both teammates and opponents when possible for matchup quality.',
          recordLabel: label,
          recordKey: `game:${game.id}:roster-one-sided`,
          action,
        });
      }

      const rosterNameMap = new Map();
      [
        ['teammates', teammates],
        ['opponents', opponents],
      ].forEach(([side, rows]) => {
        const sideNames = new Map();
        rows.forEach(player => {
          const nameKey = norm(player.name);
          if (!nameKey) return;
          sideNames.set(nameKey, (sideNames.get(nameKey) || 0) + 1);
          const seen = rosterNameMap.get(nameKey) || new Set();
          seen.add(side);
          rosterNameMap.set(nameKey, seen);
          [['fgm', 'fga', 'FG'], ['fg3m', 'fg3a', '3PT'], ['ftm', 'fta', 'FT']].forEach(([made, attempted, labelKey]) => {
            if (num(player[made]) > num(player[attempted])) {
              add({
                severity: 'warning',
                area: 'roster',
                code: 'roster-shooting-made-over-attempts',
                title: 'Roster shot line has made over attempts',
                detail: 'One roster row has more makes than attempts.',
                recordLabel: label,
                recordKey: `game:${game.id}:roster:${side}:${nameKey}:${made}`,
                action,
              });
            }
          });
        });
        sideNames.forEach((count, nameKey) => {
          if (count <= 1) return;
          add({
            severity: 'warning',
            area: 'roster',
            code: 'roster-duplicate-side',
            title: 'Duplicate player on the same roster side',
            detail: 'The same name appears more than once on one roster side.',
            recordLabel: label,
            recordKey: `game:${game.id}:roster-dup:${side}:${nameKey}`,
            action,
          });
        });
      });
      rosterNameMap.forEach((sides, nameKey) => {
        if (!(sides.has('teammates') && sides.has('opponents'))) return;
        add({
          severity: 'critical',
          area: 'roster',
          code: 'roster-cross-side-duplicate',
          title: 'Player appears on both sides in one game',
          detail: 'Move the player to the correct side so relationship and opponent reads do not conflict.',
          recordLabel: label,
          recordKey: `game:${game.id}:roster-cross-side:${nameKey}`,
          action,
        });
      });
    });

    gameFingerprints.forEach(rows => {
      if (rows.length <= 1) return;
      const first = rows[0];
      add({
        severity: 'warning',
        area: 'game',
        code: 'duplicate-game-sample',
        title: 'Possible duplicate game sample',
        detail: 'Multiple games share build, date, mode, score, and main box score.',
        recordLabel: `${first.date || 'No date'} / ${first.mode || 'No mode'}`,
        recordKey: `game-fingerprint:${rows.map(row => row.id || '').join(':')}`,
        action: first.id ? `openGameFromGlobalList('${jsArg(first.id)}','${jsArg(first.buildId)}')` : '',
      });
    });

    const aliasMap = new Map();
    players.forEach(player => {
      const label = player.primaryName || player.id || 'Unnamed player';
      if (!String(player.primaryName || '').trim()) {
        add({
          severity: 'critical',
          area: 'player',
          code: 'player-missing-name',
          title: 'Player profile is missing a primary name',
          detail: 'Profiles need a readable name for aliases, exports, and profile pages.',
          recordLabel: label,
          recordKey: `player:${player.id}:name`,
        });
      }
      const aliases = Array.isArray(player.aliases) ? player.aliases : [];
      if (!aliases.length) {
        add({
          severity: 'warning',
          area: 'player',
          code: 'player-missing-aliases',
          title: 'Player profile has no aliases',
          detail: 'Add at least the primary name as an alias so roster rows keep linking.',
          recordLabel: label,
          recordKey: `player:${player.id}:aliases`,
          action: player.id ? `openPlayerPage('${jsArg(player.id)}')` : '',
        });
      }
      aliases.forEach(alias => {
        const key = norm(alias);
        if (!key) return;
        const rows = aliasMap.get(key) || [];
        rows.push(player);
        aliasMap.set(key, rows);
      });
      if (games.length) {
        const allAliases = new Set([player.primaryName, ...aliases].map(norm).filter(Boolean));
        const appears = games.some(game => {
          const roster = game.roster || {};
          return ['teammates', 'opponents'].some(side =>
            (Array.isArray(roster[side]) ? roster[side] : []).some(row => allAliases.has(norm(row.name)))
          );
        });
        if (!appears) {
          add({
            severity: 'info',
            area: 'player',
            code: 'player-orphan-profile',
            title: 'Player profile has no roster appearances',
            detail: 'This may be an old alias or a profile created before roster data was cleaned.',
            recordLabel: label,
            recordKey: `player:${player.id}:orphan`,
            action: player.id ? `openPlayerPage('${jsArg(player.id)}')` : '',
          });
        }
      }
    });

    aliasMap.forEach(rows => {
      const uniqueIds = [...new Set(rows.map(player => player.id || player.primaryName))];
      if (uniqueIds.length <= 1) return;
      add({
        severity: 'warning',
        area: 'player',
        code: 'duplicate-player-alias',
        title: 'Alias is shared by multiple player profiles',
        detail: 'Merge profiles or remove the duplicate alias so roster rows choose the right player.',
        recordLabel: rows[0].primaryName || 'Player alias',
        recordKey: `player-alias:${norm(rows[0].primaryName)}:${uniqueIds.join(':')}`,
        action: rows[0].id ? `openPlayerPage('${jsArg(rows[0].id)}')` : '',
      });
    });

    issues.sort((a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      String(a.area).localeCompare(String(b.area)) ||
      String(a.recordLabel).localeCompare(String(b.recordLabel))
    );

    const counts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      acc[issue.area] = (acc[issue.area] || 0) + 1;
      return acc;
    }, { critical: 0, warning: 0, info: 0 });
    const uniqueIssueRecords = new Set(issues.map(issue => issue.recordKey)).size;
    const scanned = builds.length + games.length + players.length;
    const score = Math.max(0, Math.round(100 - counts.critical * 18 - counts.warning * 7 - counts.info * 2));
    const cleanRecords = Math.max(0, scanned - uniqueIssueRecords);
    const cleanChecks = [
      {
        label: 'Build links',
        ok: !issues.some(issue => issue.code === 'game-missing-build'),
        detail: 'Every game should point to an existing build.',
      },
      {
        label: 'Result logic',
        ok: !issues.some(issue => issue.code === 'score-result-mismatch' || issue.code === 'game-result-invalid'),
        detail: 'Score, result, and win-rate calculations should agree.',
      },
      {
        label: 'Shot lines',
        ok: !issues.some(issue => issue.code === 'shooting-made-over-attempts' || issue.code === 'roster-shooting-made-over-attempts'),
        detail: 'Made shots should never exceed attempts.',
      },
      {
        label: 'Roster identity',
        ok: !issues.some(issue => issue.code === 'roster-cross-side-duplicate' || issue.code === 'duplicate-player-alias'),
        detail: 'Player names should resolve cleanly to one side and one profile.',
      },
    ];

    return {
      score,
      scanned,
      cleanRecords,
      issues,
      counts,
      cleanChecks,
      categories: [
        { key: 'build', label: 'Builds', scanned: builds.length, issues: counts.build || 0 },
        { key: 'game', label: 'Games', scanned: games.length, issues: counts.game || 0 },
        { key: 'roster', label: 'Rosters', scanned: games.length, issues: counts.roster || 0 },
        { key: 'player', label: 'Players', scanned: players.length, issues: counts.player || 0 },
      ],
    };
  }

  function severityLabel(severity) {
    if (severity === 'critical') return tr('Fix first');
    if (severity === 'warning') return tr('Review');
    return tr('Watch');
  }

  function scoreLabel(score) {
    if (score >= 90) return tr('Clean');
    if (score >= 75) return tr('Usable');
    if (score >= 55) return tr('Needs review');
    return tr('Needs repair');
  }

  function renderDataQualityCenter(deps) {
    const state = deps.state || {};
    const escapeHtml = deps.escapeHtml || defaultEscape;
    const escapeAttr = deps.escapeAttr || escapeHtml;
    const audit = analyzeDataQuality(state);
    const issueRows = audit.issues.map(issue => `
      <article class="dq-issue-row ${issue.severity}" data-severity="${escapeAttr(issue.severity)}" data-area="${escapeAttr(issue.area)}">
        <div class="dq-issue-severity">${escapeHtml(severityLabel(issue.severity))}</div>
        <div class="dq-issue-main">
          <strong>${escapeHtml(tr(issue.title))}</strong>
          <span>${escapeHtml(issue.recordLabel)}</span>
          <small>${escapeHtml(tr(issue.detail))}</small>
        </div>
        <div class="dq-issue-area">${escapeHtml(tr(AREA_LABELS[issue.area] || issue.area))}</div>
        <div class="dq-issue-action">
          ${issue.action ? actionButton(tr('Open record'), issue.action, escapeHtml, escapeAttr) : ''}
        </div>
      </article>
    `).join('');
    const filterButtons = [
      ['all', 'All', audit.issues.length],
      ['critical', 'Fix first', audit.counts.critical || 0],
      ['warning', 'Review', audit.counts.warning || 0],
      ['info', 'Watch', audit.counts.info || 0],
      ['build', 'Builds', audit.counts.build || 0],
      ['game', 'Games', audit.counts.game || 0],
      ['roster', 'Rosters', audit.counts.roster || 0],
      ['player', 'Players', audit.counts.player || 0],
    ].map(([key, label, count], index) => `
      <button class="dq-filter-btn${index === 0 ? ' active' : ''}" type="button" data-dq-filter="${escapeAttr(key)}" onclick="NBA2K26_DATA_QUALITY.filterQualityRows('${escapeAttr(key)}')">
        <span>${escapeHtml(tr(label))}</span><b>${count}</b>
      </button>
    `).join('');
    const topIssues = audit.issues.filter(issue => issue.severity === 'critical').slice(0, 3);
    const topIssueHtml = topIssues.length ? topIssues.map(issue => `
      <div class="dq-fix-card ${issue.severity}">
        <span>${escapeHtml(tr(AREA_LABELS[issue.area] || issue.area))}</span>
        <strong>${escapeHtml(tr(issue.title))}</strong>
        <small>${escapeHtml(issue.recordLabel)}</small>
      </div>
    `).join('') : `
      <div class="dq-fix-card clean">
        <span>${escapeHtml(tr('No blockers'))}</span>
        <strong>${escapeHtml(tr('Core data is connected'))}</strong>
        <small>${escapeHtml(tr('No critical build, score, roster, or player identity blockers found.'))}</small>
      </div>
    `;
    const categoryHtml = audit.categories.map(category => {
      const clean = Math.max(0, category.scanned - category.issues);
      const pct = category.scanned ? Math.round(clean / category.scanned * 100) : 100;
      return `
        <button class="dq-category-card" type="button" onclick="NBA2K26_DATA_QUALITY.filterQualityRows('${escapeAttr(category.key)}')">
          <span>${escapeHtml(tr(category.label))}</span>
          <strong>${category.issues}</strong>
          <small>${category.scanned} ${escapeHtml(tr('scanned'))} / ${pct}% ${escapeHtml(tr('clean'))}</small>
        </button>
      `;
    }).join('');
    const cleanCheckHtml = audit.cleanChecks.map(check => `
      <div class="dq-signal ${check.ok ? 'ok' : 'warn'}">
        <b>${check.ok ? escapeHtml(tr('OK')) : escapeHtml(tr('Check'))}</b>
        <span>${escapeHtml(tr(check.label))}</span>
        <small>${escapeHtml(tr(check.detail))}</small>
      </div>
    `).join('');

    return `
      <div class="data-quality-center">
        <section class="dq-hero">
          <div class="dq-hero-main">
            <div class="dq-kicker">${escapeHtml(tr('DATA QUALITY CENTER'))}</div>
            <h2>${escapeHtml(tr('Find what can break reports before it does.'))}</h2>
            <p>${escapeHtml(tr('Scans builds, games, rosters, scores, shooting lines, and player profiles for contradictions that simple backups cannot catch.'))}</p>
            <div class="dq-hero-actions">
              <button class="context-action primary" type="button" onclick="renderDataQuality()">${escapeHtml(tr('Refresh audit'))}</button>
              <button class="context-action" type="button" onclick="openDataModal()">${escapeHtml(tr('Backup'))}</button>
            </div>
          </div>
          <div class="dq-score-card">
            <div class="dq-score-ring" style="--dq-score:${audit.score}">
              <strong>${audit.score}</strong>
              <span>${escapeHtml(scoreLabel(audit.score))}</span>
            </div>
            <div class="dq-score-meta">
              <span>${audit.scanned} ${escapeHtml(tr('records scanned'))}</span>
              <span>${audit.cleanRecords} ${escapeHtml(tr('records without flags'))}</span>
            </div>
          </div>
        </section>

        <section class="dq-stat-grid">
          <div class="dq-stat critical"><span>${escapeHtml(tr('Fix first'))}</span><strong>${audit.counts.critical || 0}</strong><small>${escapeHtml(tr('Breaks links or math'))}</small></div>
          <div class="dq-stat warning"><span>${escapeHtml(tr('Review'))}</span><strong>${audit.counts.warning || 0}</strong><small>${escapeHtml(tr('Likely to skew reads'))}</small></div>
          <div class="dq-stat info"><span>${escapeHtml(tr('Watch'))}</span><strong>${audit.counts.info || 0}</strong><small>${escapeHtml(tr('Low-risk cleanup'))}</small></div>
          <div class="dq-stat clean"><span>${escapeHtml(tr('Clean records'))}</span><strong>${audit.cleanRecords}</strong><small>${escapeHtml(tr('No active flags'))}</small></div>
        </section>

        <section class="dq-grid">
          <div class="dq-panel dq-fix-panel">
            <div class="dq-panel-head">
              <strong>${escapeHtml(tr('Fix first queue'))}</strong>
              <small>${escapeHtml(tr('Highest-risk issues from the current local data.'))}</small>
            </div>
            <div class="dq-fix-list">${topIssueHtml}</div>
          </div>
          <div class="dq-panel">
            <div class="dq-panel-head">
              <strong>${escapeHtml(tr('Quality signals'))}</strong>
              <small>${escapeHtml(tr('Quick checks that protect reports and recommendations.'))}</small>
            </div>
            <div class="dq-signal-list">${cleanCheckHtml}</div>
          </div>
        </section>

        <section class="dq-category-grid">${categoryHtml}</section>

        <section class="dq-panel dq-issue-panel">
          <div class="dq-panel-head dq-issue-head">
            <div>
              <strong>${escapeHtml(tr('Issue register'))}</strong>
              <small>${escapeHtml(tr('Use filters, open the record, then refresh the audit after saving.'))}</small>
            </div>
            <div class="dq-filter-bar">${filterButtons}</div>
          </div>
          <div class="dq-issue-list" id="dq-issue-list">
            ${issueRows || `<div class="dq-empty">${escapeHtml(tr('No data quality issues found.'))}</div>`}
          </div>
        </section>
      </div>
    `;
  }

  function filterQualityRows(filter) {
    const key = filter || 'all';
    document.querySelectorAll('.dq-filter-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.dqFilter === key);
    });
    document.querySelectorAll('.dq-issue-row').forEach(row => {
      const show = key === 'all' || row.dataset.severity === key || row.dataset.area === key;
      row.hidden = !show;
    });
  }

  window.NBA2K26_DATA_QUALITY = {
    analyzeDataQuality,
    renderDataQualityCenter,
    filterQualityRows,
  };
})(window);
