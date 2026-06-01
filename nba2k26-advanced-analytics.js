// NBA 2K26 advanced analytics engine.
// Pure split/tendency computations layered on top of the raw game records,
// plus a render helper for the Overview "Splits & Tendencies" drawer.
// Surfaces signal the basic aggregate() never exposes: streaks, home/away
// splits, close-vs-blowout margins, shot diet (TS%/eFG%/scoring mix), and
// teammate-duo synergy.
(function(window) {
  'use strict';

  function chrono(games, dir) {
    const cmp = window.NBA2K26_GAME_ANALYSIS?.compareGamesByChronology;
    const list = [...(games || [])];
    if (typeof cmp === 'function') return list.sort((a, b) => cmp(a, b, dir));
    // Fallback: oldest-first by date string.
    return list.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) * (dir === 'desc' ? -1 : 1));
  }

  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const fix = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : (0).toFixed(d));

  // ---------------------------------------------------------------------------
  // Streaks — current run plus longest win/loss runs (chronological).
  // ---------------------------------------------------------------------------
  function streaks(games) {
    const asc = chrono(games, 'asc');
    let curType = null, curLen = 0, longestW = 0, longestL = 0, runType = null, runLen = 0;
    asc.forEach(g => {
      const r = g.result === 'W' ? 'W' : g.result === 'L' ? 'L' : null;
      if (!r) { runType = null; runLen = 0; return; }
      if (r === runType) runLen += 1;
      else { runType = r; runLen = 1; }
      if (r === 'W') longestW = Math.max(longestW, runLen);
      else longestL = Math.max(longestL, runLen);
    });
    // Current streak = trailing run from the newest game.
    for (let i = asc.length - 1; i >= 0; i--) {
      const r = asc[i].result === 'W' ? 'W' : asc[i].result === 'L' ? 'L' : null;
      if (!r) break;
      if (curType === null) { curType = r; curLen = 1; }
      else if (r === curType) curLen += 1;
      else break;
    }
    return { currentType: curType, currentLen: curLen, longestWin: longestW, longestLoss: longestL };
  }

  // ---------------------------------------------------------------------------
  // Venue split — home vs away performance.
  // ---------------------------------------------------------------------------
  function _split(games) {
    const n = games.length;
    const wins = games.filter(g => g.result === 'W').length;
    const pts = games.reduce((s, g) => s + num(g.pts), 0);
    const pm = games.reduce((s, g) => s + num(g.pm), 0);
    return {
      n, wins, losses: n - wins,
      winPct: n ? (100 * wins / n) : 0,
      ppg: n ? (pts / n) : 0,
      plusMinus: n ? (pm / n) : 0,
    };
  }

  function venueSplit(games) {
    const home = (games || []).filter(g => g.venue !== 'away');
    const away = (games || []).filter(g => g.venue === 'away');
    return { home: _split(home), away: _split(away) };
  }

  // ---------------------------------------------------------------------------
  // Margin profile — close (|margin|<=5), regular, and blowout (|margin|>=15).
  // ---------------------------------------------------------------------------
  function margin(g) {
    if (Number.isFinite(Number(g.scoreOwn)) && Number.isFinite(Number(g.scoreOpp))
        && (g.scoreOwn || g.scoreOpp)) {
      return num(g.scoreOwn) - num(g.scoreOpp);
    }
    // Fall back to plus/minus when explicit scores are missing.
    return num(g.pm);
  }

  function marginProfile(games, opts) {
    const closeMax = (opts && Number.isFinite(opts.closeMax)) ? opts.closeMax : 5;
    const blowMin = (opts && Number.isFinite(opts.blowMin)) ? opts.blowMin : 15;
    const buckets = { close: [], regular: [], blowout: [] };
    let biggestWin = null, worstLoss = null;
    (games || []).forEach(g => {
      const m = margin(g);
      const abs = Math.abs(m);
      if (abs <= closeMax) buckets.close.push(g);
      else if (abs >= blowMin) buckets.blowout.push(g);
      else buckets.regular.push(g);
      if (g.result === 'W' && (biggestWin === null || m > margin(biggestWin))) biggestWin = g;
      if (g.result === 'L' && (worstLoss === null || m < margin(worstLoss))) worstLoss = g;
    });
    const summarize = arr => {
      const n = arr.length;
      const wins = arr.filter(g => g.result === 'W').length;
      return { n, wins, losses: n - wins, winPct: n ? (100 * wins / n) : 0 };
    };
    return {
      closeMax, blowMin,
      close: summarize(buckets.close),
      regular: summarize(buckets.regular),
      blowout: summarize(buckets.blowout),
      blowoutWins: buckets.blowout.filter(g => g.result === 'W').length,
      blowoutLosses: buckets.blowout.filter(g => g.result === 'L').length,
      biggestWin: biggestWin ? { margin: margin(biggestWin), game: biggestWin } : null,
      worstLoss: worstLoss ? { margin: margin(worstLoss), game: worstLoss } : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Shot diet — TS%, eFG%, and where the points come from (2PT/3PT/FT mix).
  // ---------------------------------------------------------------------------
  function shootingProfile(games) {
    const s = (games || []).reduce((a, g) => ({
      fg2m: a.fg2m + num(g.fg2m), fg2a: a.fg2a + num(g.fg2a),
      fg3m: a.fg3m + num(g.fg3m), fg3a: a.fg3a + num(g.fg3a),
      ftm: a.ftm + num(g.ftm), fta: a.fta + num(g.fta),
    }), { fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 });
    const fgm = s.fg2m + s.fg3m;
    const fga = s.fg2a + s.fg3a;
    const pts2 = s.fg2m * 2, pts3 = s.fg3m * 3, ptsFt = s.ftm;
    const ptsTotal = pts2 + pts3 + ptsFt;
    const tsDen = 2 * (fga + 0.44 * s.fta);
    return {
      fgm, fga, ...s,
      tsPct: tsDen > 0 ? (100 * ptsTotal / tsDen) : 0,
      efgPct: fga > 0 ? (100 * (fgm + 0.5 * s.fg3m) / fga) : 0,
      threeRate: fga > 0 ? (100 * s.fg3a / fga) : 0,   // share of FGA that are 3s
      ftRate: fga > 0 ? (100 * s.fta / fga) : 0,        // free-throw generation
      mix: {
        two: ptsTotal ? (100 * pts2 / ptsTotal) : 0,
        three: ptsTotal ? (100 * pts3 / ptsTotal) : 0,
        ft: ptsTotal ? (100 * ptsFt / ptsTotal) : 0,
      },
      ptsTotal,
    };
  }

  // ---------------------------------------------------------------------------
  // Lineup synergy — win% for every teammate duo seen together, ranked.
  // Only counts named, connected human teammates to keep pairs meaningful.
  // ---------------------------------------------------------------------------
  function lineupSynergy(games, opts) {
    const minGames = (opts && Number.isFinite(opts.minGames)) ? opts.minGames : 3;
    const pairs = new Map();
    (games || []).forEach(g => {
      const tm = (g.roster && Array.isArray(g.roster.teammates)) ? g.roster.teammates : [];
      const names = [...new Set(tm
        .filter(p => p && String(p.name || '').trim() && !p.disconnected && !p.isAI)
        .map(p => String(p.name).trim()))];
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = names[i], b = names[j];
          const key = [a.toLowerCase(), b.toLowerCase()].sort().join(' :: ');
          const row = pairs.get(key) || { a, b, n: 0, wins: 0 };
          row.n += 1;
          if (g.result === 'W') row.wins += 1;
          pairs.set(key, row);
        }
      }
    });
    const ranked = [...pairs.values()]
      .filter(r => r.n >= minGames)
      .map(r => ({ ...r, winPct: 100 * r.wins / r.n }))
      .sort((a, b) => b.winPct - a.winPct || b.n - a.n);
    return { minGames, best: ranked.slice(0, 5), worst: [...ranked].reverse().slice(0, 5), all: ranked };
  }

  // ---------------------------------------------------------------------------
  // Position split — the build owner's own stats grouped by the position they
  // played (game.myPosition). Full per-position averages, not just win%.
  // ---------------------------------------------------------------------------
  function positionSplit(games) {
    const byPos = new Map();
    (games || []).forEach(g => {
      const p = String(g.myPosition || '').trim();
      if (!p) return;
      if (!byPos.has(p)) byPos.set(p, []);
      byPos.get(p).push(g);
    });
    return [...byPos.entries()].map(([pos, gs]) => {
      const n = gs.length;
      const wins = gs.filter(g => g.result === 'W').length;
      const s = gs.reduce((a, g) => ({
        pts: a.pts + num(g.pts), reb: a.reb + num(g.reb), ast: a.ast + num(g.ast),
        pm: a.pm + num(g.pm),
        fgm: a.fgm + num(g.fg2m) + num(g.fg3m), fga: a.fga + num(g.fg2a) + num(g.fg3a),
        fg3m: a.fg3m + num(g.fg3m), fg3a: a.fg3a + num(g.fg3a),
      }), { pts: 0, reb: 0, ast: 0, pm: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0 });
      return {
        pos, n, wins, losses: n - wins,
        winPct: n ? (100 * wins / n) : 0,
        ppg: n ? (s.pts / n) : 0,
        rpg: n ? (s.reb / n) : 0,
        apg: n ? (s.ast / n) : 0,
        fgPct: s.fga ? (100 * s.fgm / s.fga) : 0,
        fg3Pct: s.fg3a ? (100 * s.fg3m / s.fg3a) : 0,
        plusMinus: n ? (s.pm / n) : 0,
      };
    }).sort((a, b) => b.n - a.n);
  }

  // ---------------------------------------------------------------------------
  // Self-grade distribution — how the user grades their own outings.
  // ---------------------------------------------------------------------------
  const GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
  function gradeDistribution(games) {
    const dist = {};
    let total = 0;
    (games || []).forEach(g => {
      const grade = String(g.grade || '').trim();
      if (!grade || !GRADE_ORDER.includes(grade)) return;
      dist[grade] = (dist[grade] || 0) + 1;
      total += 1;
    });
    return { dist, total, order: GRADE_ORDER };
  }

  function summary(games) {
    return {
      streaks: streaks(games),
      venue: venueSplit(games),
      margin: marginProfile(games),
      shooting: shootingProfile(games),
      synergy: lineupSynergy(games),
      grades: gradeDistribution(games),
      position: positionSplit(games),
    };
  }

  // ---------------------------------------------------------------------------
  // Render — the Overview "Splits & Tendencies" drawer body.
  // ---------------------------------------------------------------------------
  function renderSplitsDrawer(games, deps) {
    const t = (deps && deps.t) || (s => s);
    const escapeHtml = (deps && deps.escapeHtml) || (s => String(s == null ? '' : s));
    const domId = (deps && deps.domId) || 'lab-splits';
    const open = !!(deps && deps.open);
    const list = games || [];
    if (list.length < 2) return '';

    const data = summary(list);
    const { streaks: st, venue, margin: mg, shooting: sh, synergy, grades, position } = data;

    const streakChip = st.currentType
      ? `<strong class="${st.currentType === 'W' ? 'good' : 'bad'}">${st.currentType}${st.currentLen}</strong>`
      : `<strong>-</strong>`;
    const streakSub = `${t('Best')} ${st.longestWin}W / ${st.longestLoss}L`;

    const closeSub = mg.close.n
      ? `${mg.close.wins}-${mg.close.losses} · ${fix(mg.close.winPct, 0)}%`
      : t('No close games');

    const kpiGrid = `
      <div class="lab-kpi-grid">
        <div class="lab-kpi"><span>${t('Current streak')}</span>${streakChip}<small>${escapeHtml(streakSub)}</small></div>
        <div class="lab-kpi"><span>${t('Clutch (≤5)')}</span><strong class="${mg.close.winPct >= 50 ? 'good' : 'bad'}">${mg.close.n ? fix(mg.close.winPct, 0) + '%' : '-'}</strong><small>${escapeHtml(closeSub)}</small></div>
        <div class="lab-kpi"><span>${t('True Shooting')}</span><strong>${fix(sh.tsPct, 1)}%</strong><small>${fix(sh.efgPct, 1)}% eFG</small></div>
        <div class="lab-kpi"><span>${t('Blowouts')}</span><strong>${mg.blowoutWins}-${mg.blowoutLosses}</strong><small>±${mg.blowMin} ${t('margin')}</small></div>
      </div>`;

    // Venue split rows
    const venueRow = (label, s) => `
      <tr>
        <td style="color:var(--orange);font-weight:700;">${escapeHtml(label)}</td>
        <td>${s.n}</td>
        <td><span class="result-w">${s.wins}W</span> · <span class="result-l">${s.losses}L</span></td>
        <td>${s.n ? fix(s.winPct, 0) + '%' : '-'}</td>
        <td>${fix(s.ppg, 1)}</td>
        <td class="${s.plusMinus >= 0 ? 'pm-pos' : 'pm-neg'}">${s.plusMinus >= 0 ? '+' : ''}${fix(s.plusMinus, 1)}</td>
      </tr>`;
    const venuePanel = (venue.home.n || venue.away.n) ? `
      <div class="lab-panel">
        <div class="lab-panel-title">${t('Home / Away split')}</div>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>${t('Venue')}</th><th>GP</th><th>${t('Record')}</th><th>W%</th><th>PPG</th><th>+/-</th></tr></thead>
            <tbody>
              ${venue.home.n ? venueRow(t('Home'), venue.home) : ''}
              ${venue.away.n ? venueRow(t('Away'), venue.away) : ''}
            </tbody>
          </table>
        </div>
      </div>` : '';

    // Position split — the owner's own per-position averages (game.myPosition).
    // Directly answers "how do I play at each position", not just win%.
    const posRow = r => {
      const tone = r.winPct >= 55 ? 'pm-pos' : r.winPct <= 40 ? 'pm-neg' : '';
      return `
        <tr>
          <td><span class="pp-pos-tag">${escapeHtml(r.pos)}</span></td>
          <td>${r.n}</td>
          <td><span class="result-w">${r.wins}W</span> · <span class="result-l">${r.losses}L</span></td>
          <td class="${tone}">${fix(r.winPct, 0)}%</td>
          <td>${fix(r.ppg, 1)}</td>
          <td>${fix(r.rpg, 1)}</td>
          <td>${fix(r.apg, 1)}</td>
          <td>${fix(r.fgPct, 0)}%</td>
          <td class="${r.plusMinus >= 0 ? 'pm-pos' : 'pm-neg'}">${r.plusMinus >= 0 ? '+' : ''}${fix(r.plusMinus, 1)}</td>
        </tr>`;
    };
    const posPanel = (position && position.length) ? `
      <div class="lab-panel lab-panel-wide">
        <div class="lab-panel-title">${t('By Position')} <small style="color:var(--text-fade);font-weight:500;">${t('your stats per position played')}</small></div>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>${t('Pos')}</th><th>GP</th><th>${t('Record')}</th><th>W%</th><th>PPG</th><th>RPG</th><th>APG</th><th>FG%</th><th>+/-</th></tr></thead>
            <tbody>${position.map(posRow).join('')}</tbody>
          </table>
        </div>
      </div>` : '';

    // Shot diet bars
    const mixBar = (label, pct, color) => `
      <div class="shot-diet-row">
        <span class="shot-diet-label">${escapeHtml(label)}</span>
        <span class="shot-diet-track"><span class="shot-diet-fill" style="width:${Math.max(0, Math.min(100, pct)).toFixed(0)}%;background:${color};"></span></span>
        <span class="shot-diet-val">${fix(pct, 0)}%</span>
      </div>`;
    const shotPanel = sh.ptsTotal ? `
      <div class="lab-panel">
        <div class="lab-panel-title">${t('Scoring diet')}</div>
        ${mixBar(t('From 2PT'), sh.mix.two, '#4da6ff')}
        ${mixBar(t('From 3PT'), sh.mix.three, '#43d968')}
        ${mixBar(t('From FT'), sh.mix.ft, '#f6c638')}
        <div class="shot-diet-foot">${t('3PA rate')} ${fix(sh.threeRate, 0)}% · ${t('FT rate')} ${fix(sh.ftRate, 0)}%</div>
      </div>` : '';

    // Signature games — biggest win and worst loss by margin (was computed but
    // never surfaced). Anchors the splits to concrete film to go review.
    const sigItem = (label, entry, tone) => {
      if (!entry || !entry.game) return '';
      const g = entry.game;
      const m = entry.margin;
      return `
        <div class="lab-kpi">
          <span>${escapeHtml(label)}</span>
          <strong class="${tone}">${m >= 0 ? '+' : ''}${fix(m, 0)}</strong>
          <small>${escapeHtml(`${g.date || '-'} · ${num(g.pts)} ${t('PTS')}`)}</small>
        </div>`;
    };
    const sigPanel = (mg.biggestWin || mg.worstLoss) ? `
      <div class="lab-panel">
        <div class="lab-panel-title">${t('Signature games')}</div>
        <div class="lab-kpi-grid">
          ${sigItem(t('Biggest win'), mg.biggestWin, 'good')}
          ${sigItem(t('Worst loss'), mg.worstLoss, 'bad')}
        </div>
      </div>` : '';

    // Self-grade spread — how the user grades their own outings (was computed
    // in summary() but never rendered). Reuses the shot-diet bar styling.
    const gradeColor = g => g[0] === 'A' ? '#43d968' : g[0] === 'B' ? '#4da6ff' : g[0] === 'C' ? '#f6c638' : '#e21a2f';
    const gradesPresent = (grades && grades.total)
      ? grades.order.filter(g => grades.dist[g]) : [];
    const gradeMax = gradesPresent.reduce((mx, g) => Math.max(mx, grades.dist[g]), 0);
    const modeGrade = gradesPresent.reduce((best, g) => (grades.dist[g] > grades.dist[best] ? g : best), gradesPresent[0]);
    const gradeRows = gradesPresent.map(g => {
      const c = grades.dist[g];
      const w = gradeMax ? (100 * c / gradeMax) : 0;
      return `
        <div class="shot-diet-row">
          <span class="shot-diet-label">${escapeHtml(g)}</span>
          <span class="shot-diet-track"><span class="shot-diet-fill" style="width:${w.toFixed(0)}%;background:${gradeColor(g)};"></span></span>
          <span class="shot-diet-val">${c}</span>
        </div>`;
    }).join('');
    const gradePanel = gradesPresent.length ? `
      <div class="lab-panel">
        <div class="lab-panel-title">${t('Self-grade spread')} <small style="color:var(--text-fade);font-weight:500;">${grades.total} ${t('graded')}</small></div>
        ${gradeRows}
        <div class="shot-diet-foot">${t('Most common')}: ${escapeHtml(modeGrade)}</div>
      </div>` : '';

    // Lineup synergy — best duos, plus the toughest pairings when there are
    // enough distinct pairs that the bottom of the list is its own signal.
    const duoRow = r => `
      <div class="home-row" style="cursor:default;">
        <span class="home-rank" style="color:${r.winPct >= 60 ? '#43d968' : r.winPct >= 45 ? '#f6c638' : '#e21a2f'}">${fix(r.winPct, 0)}%</span>
        <span class="home-row-main">${escapeHtml(r.a)} <span style="color:var(--text-fade);">+</span> ${escapeHtml(r.b)}</span>
        <span class="home-row-sub">${r.n}G · ${r.wins}W-${r.n - r.wins}L</span>
      </div>`;
    const bestKeys = new Set(synergy.best.map(r => [r.a, r.b].join('::')));
    const worstUnique = (synergy.all.length >= 4)
      ? synergy.worst.filter(r => !bestKeys.has([r.a, r.b].join('::'))).slice(0, 3)
      : [];
    const synergyPanel = synergy.best.length ? `
      <div class="lab-panel">
        <div class="lab-panel-title">${t('Best duos')} <small style="color:var(--text-fade);font-weight:500;">${t('≥3 games together')}</small></div>
        <div class="home-list">${synergy.best.map(duoRow).join('')}</div>
        ${worstUnique.length ? `
        <div class="lab-panel-title" style="margin-top:14px;">${t('Toughest duos')}</div>
        <div class="home-list">${worstUnique.map(duoRow).join('')}</div>` : ''}
      </div>` : '';

    const opts = { domId, open, flat: !!(deps && deps.flat) };
    if (!venuePanel && !shotPanel && !synergyPanel && !sigPanel && !gradePanel && !posPanel) {
      // Streaks/clutch alone are still worth showing.
      return wrapDrawer(t, kpiGrid, opts);
    }
    return wrapDrawer(t, `
      ${kpiGrid}
      ${posPanel}
      <div class="lab-section-grid">
        ${venuePanel}
        ${shotPanel}
        ${sigPanel}
        ${gradePanel}
      </div>
      ${synergyPanel}
    `, opts);
  }

  function wrapDrawer(t, inner, opts) {
    const domId = (opts && opts.domId) || 'lab-splits';
    const open = !!(opts && opts.open);
    if (opts && opts.flat) {
      return `
        <section class="performance-lab analysis-flat-lab" id="${domId}">
          <div class="analysis-flat-head">
            <span class="analysis-kicker">${t('DEEP ANALYSIS')}</span>
            <strong>${t('Splits & Tendencies')}</strong>
            <small>${t('Streaks, clutch, home/away, shot diet, and duo synergy')}</small>
          </div>
          ${inner}
        </section>`;
    }
    return `
      <details class="analysis-drawer" id="${domId}"${open ? ' open' : ''}>
        <summary class="analysis-summary">
          <span>
            <span class="analysis-kicker">${t('DEEP ANALYSIS')}</span>
            <strong>${t('Splits & Tendencies')}</strong>
            <small>${t('Streaks, clutch, home/away, shot diet, and duo synergy')}</small>
          </span>
          <span class="analysis-toggle" aria-hidden="true"></span>
        </summary>
        <section class="performance-lab">
          ${inner}
        </section>
      </details>`;
  }

  window.NBA2K26_ADVANCED_ANALYTICS = {
    streaks,
    venueSplit,
    marginProfile,
    shootingProfile,
    lineupSynergy,
    gradeDistribution,
    positionSplit,
    summary,
    renderSplitsDrawer,
  };
})(window);
