// NBA 2K26 Build Comparison page renderer — enhanced.
(function(window) {
  'use strict';

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmt = (v, d = 1) => num(v).toFixed(d);

  const TIER_RANK  = { legend: 5, hof: 4, gold: 3, silver: 2, bronze: 1 };
  const TIER_STYLE = {
    legend: { bg: '#3B0764', text: '#C084FC', label: 'LEG' },
    hof:    { bg: '#7C2D12', text: '#FB923C', label: 'HOF' },
    gold:   { bg: '#7A5000', text: '#FFD700', label: 'GO'  },
    silver: { bg: '#3A4458', text: '#C8D4E8', label: 'SI'  },
    bronze: { bg: '#6B3F1A', text: '#FFCF9C', label: 'BR'  },
  };

  // Color identity per build slot
  const SLOT_COLORS  = ['#D4001A', '#4da6ff', '#43d968', '#FFD000'];
  const SLOT_ALPHAS  = ['rgba(212,0,26,0.18)', 'rgba(77,166,255,0.18)', 'rgba(67,217,104,0.18)', 'rgba(255,208,0,0.18)'];

  // ── Data helpers ───────────────────────────────────────────────────────────

  function getBadgeName(id) {
    if (typeof BADGE_CATEGORIES === 'undefined') return id;
    for (const cat of BADGE_CATEGORIES) {
      for (const b of cat.badges) { if (b.id === id) return b.name; }
    }
    return id;
  }

  function getEquipped(badges) {
    if (!badges || typeof badges !== 'object') return [];
    const out = [];
    const isV2 = badges._format === 'v2' ||
      Object.keys(badges).some(k => k !== '_format' && TIER_RANK[badges[k]]);
    if (isV2) {
      Object.entries(badges).forEach(([id, tier]) => {
        if (id === '_format' || !TIER_RANK[tier]) return;
        out.push({ id, tier, name: getBadgeName(id) });
      });
      out.sort((a, b) => (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0));
    } else {
      ['legend', 'hof', 'gold', 'silver', 'bronze'].forEach(tier =>
        (Array.isArray(badges[tier]) ? badges[tier] : [])
          .forEach(id => out.push({ id, tier, name: getBadgeName(id) })));
    }
    return out;
  }

  function groupAvgVal(attrs, groupKey) {
    const ATTR_G = window.ATTR_GROUPS || {};
    const g = ATTR_G[groupKey];
    if (!g) return 0;
    const vals = g.keys.map(k => num(attrs?.[k])).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  function effMetrics(games) {
    if (!games.length) return {};
    const T = games.reduce((a, g) => {
      a.pts  += num(g.pts);  a.fg2m += num(g.fg2m); a.fg2a += num(g.fg2a);
      a.fg3m += num(g.fg3m); a.fg3a += num(g.fg3a); a.ftm  += num(g.ftm);
      a.fta  += num(g.fta);  a.ast  += num(g.ast);  a.to   += num(g.to);
      return a;
    }, { pts:0, fg2m:0, fg2a:0, fg3m:0, fg3a:0, ftm:0, fta:0, ast:0, to:0 });
    const n = games.length;
    const fga = T.fg2a + T.fg3a;
    const tsA = fga + 0.44 * T.fta;
    return {
      fg2Pct: T.fg2a > 0 ? parseFloat(fmt(T.fg2m / T.fg2a * 100)) : null,
      fg3Pct: T.fg3a > 0 ? parseFloat(fmt(T.fg3m / T.fg3a * 100)) : null,
      ftPct:  T.fta  > 0 ? parseFloat(fmt(T.ftm  / T.fta  * 100)) : null,
      ts:     tsA    > 0 ? parseFloat(fmt(T.pts   / (2 * tsA) * 100)) : null,
      efg:    fga    > 0 ? parseFloat(fmt((T.fg2m + 1.5 * T.fg3m) / fga * 100)) : null,
      asto:   T.to   > 0 ? parseFloat(fmt(T.ast / T.to, 2)) : null,
    };
  }

  function formDots(games) {
    const last5 = [...games].sort((a, b) => (b.date || '') < (a.date || '') ? -1 : 1).slice(0, 5);
    if (!last5.length) return '';
    const dots = last5.map(g =>
      `<span class="cmp-form-dot cmp-form-${(g.result || '').toLowerCase()}" title="${g.date || ''} ${g.result || '?'}"></span>`
    ).join('');
    return `<div class="cmp-form-row"><div class="cmp-form-wrap">${dots}</div></div>`;
  }

  // ── Radar SVG ──────────────────────────────────────────────────────────────

  function buildRadar(attrs, color) {
    const ATTR_G = window.ATTR_GROUPS || {};
    const groups  = ['fin', 'sho', 'pla', 'def', 'reb', 'phy'];
    const labels  = { fin:'FIN', sho:'SHO', pla:'PLA', def:'DEF', reb:'REB', phy:'PHY' };
    const r = 32, cx = 50, cy = 52;
    const n = groups.length;
    const angles = groups.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i / n));
    const avgs   = groups.map(g => groupAvgVal(attrs || {}, g));
    const hasData = avgs.some(v => v > 0);

    function pts(vals) {
      return vals.map((v, i) => {
        const rad = r * Math.min(v / 99, 1);
        return `${(cx + Math.cos(angles[i]) * rad).toFixed(1)},${(cy + Math.sin(angles[i]) * rad).toFixed(1)}`;
      }).join(' ');
    }
    function ring(f) {
      return `<polygon points="${pts(Array(n).fill(99 * f))}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="0.5"/>`;
    }

    const axisLines = angles.map(a =>
      `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="rgba(255,255,255,0.09)" stroke-width="0.5"/>`
    ).join('');

    const labelEls = groups.map((g, i) => {
      const pad = 11;
      const x   = (cx + Math.cos(angles[i]) * (r + pad)).toFixed(1);
      const y   = (cy + Math.sin(angles[i]) * (r + pad)).toFixed(1);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="6.5" font-family="JetBrains Mono,monospace" fill="rgba(255,255,255,0.35)">${labels[g]}</text>`;
    }).join('');

    const fillAlpha = color.replace(/^#/, '');
    return `<svg class="cmp-radar-svg" viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${ring(1)}${ring(0.75)}${ring(0.5)}${ring(0.25)}
      ${axisLines}
      ${hasData
        ? `<polygon points="${pts(avgs)}" fill="${color}2a" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`
        : `<text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="rgba(255,255,255,0.22)">NO ATTRS</text>`}
      ${labelEls}
    </svg>`;
  }

  // ── Main render ────────────────────────────────────────────────────────────

  function renderCompare(deps) {
    const { state, aggregate, t, escapeHtml } = deps;
    const el = document.getElementById('compare-container');
    if (!el) return;

    const ATTR_G = window.ATTR_GROUPS || {};
    const ATTR_L = window.ATTR_LABELS || {};

    // ── Row builder helpers (closure over escapeHtml) ──────────────────────

    function lc(txt, extraCls) {
      return `<div class="cmp-label-cell${extraCls ? ' ' + extraCls : ''}">${txt}</div>`;
    }

    function section(label) {
      return `<div class="cmp-section-header">${label}</div>`;
    }

    function valueRow(label, vals, { numeric = false, highlight = 'max', unit = '' } = {}) {
      const nums = numeric ? vals.map(v => (v === null || v === undefined) ? NaN : parseFloat(v)) : [];
      const valid = nums.filter(n => !isNaN(n) && isFinite(n));
      const bestNum = valid.length > 1
        ? (highlight === 'max' ? Math.max(...valid) : Math.min(...valid))
        : NaN;
      const cells = vals.map((v, i) => {
        const isWin = numeric && !isNaN(bestNum) && nums[i] === bestNum;
        const display = (v === null || v === undefined) ? '—' : escapeHtml(String(v)) + (unit || '');
        return `<div class="cmp-value-cell${isWin ? ' cmp-winner' : ''}">${display}</div>`;
      });
      return `<div class="cmp-row">${lc(label)}${cells.join('')}</div>`;
    }

    // Win% with sample-size awareness. Shows each build's point win rate plus a
    // 95% Wilson CI, and crowns the leader by the CI *lower bound* — so a 1-2
    // game hot streak (e.g. 1-0, lower≈21%) can't outrank a proven 12-8 build
    // (lower≈39%). Samples with n<5 decisive games are flagged "low confidence".
    function winPctRow(label) {
      const ciFn = window.NBA2K26_VISUALIZATIONS && window.NBA2K26_VISUALIZATIONS.winRateCI;
      const rows = buildData.map(d => {
        const decisive = (Number(d.agg.wins) || 0) + (Number(d.agg.losses) || 0);
        if (!decisive || typeof ciFn !== 'function') return { ci: null, rank: -Infinity };
        return { ci: ciFn(Number(d.agg.wins) || 0, decisive), rank: ciFn(Number(d.agg.wins) || 0, decisive).lower };
      });
      const ranks = rows.map(r => r.rank).filter(r => isFinite(r));
      const bestRank = ranks.length > 1 ? Math.max(...ranks) : NaN;
      const tagTitle = t('Leader ranked by 95% CI lower bound — small samples are discounted');
      const labelHtml = `${label} <span class="cmp-ci-tag" title="${escapeHtml(tagTitle)}">95% CI</span>`;
      const cells = rows.map(r => {
        if (!r.ci) return `<div class="cmp-value-cell">—</div>`;
        const isWin = !isNaN(bestRank) && r.rank === bestRank;
        const sub = r.ci.small
          ? `n=${r.ci.n} · ${t('low confidence')}`
          : `±${r.ci.halfWidth.toFixed(0)}%`;
        const ciTitle = `${t('95% confidence interval')}: ${r.ci.lower.toFixed(0)}–${r.ci.upper.toFixed(0)}%`;
        return `<div class="cmp-value-cell${isWin ? ' cmp-winner' : ''}">
          <div class="cmp-wr">
            <span class="cmp-wr-point${isWin ? ' cmp-winner-text' : ''}">${r.ci.point.toFixed(0)}%</span>
            <span class="cmp-wr-ci" title="${escapeHtml(ciTitle)}">${escapeHtml(sub)}</span>
          </div>
        </div>`;
      });
      return `<div class="cmp-row">${lc(labelHtml)}${cells.join('')}</div>`;
    }

    function pctRow(label, vals, { high = 65, mid = 55, low = 45 } = {}) {
      const nums  = vals.map(v => v !== null && v !== undefined ? parseFloat(v) : NaN);
      const valid = nums.filter(n => !isNaN(n));
      const best  = valid.length > 1 ? Math.max(...valid) : NaN;
      const cap   = high * 1.1;
      const cells = nums.map((n, i) => {
        const isWin = !isNaN(best) && n === best;
        const pct   = !isNaN(n) ? Math.min(100, Math.round((n / cap) * 100)) : 0;
        const color = !isNaN(n)
          ? n >= high ? '#43d968' : n >= mid ? '#4da6ff' : n >= low ? '#FFD000' : 'rgba(255,255,255,0.25)'
          : 'transparent';
        return `<div class="cmp-value-cell${isWin ? ' cmp-winner' : ''}">
          <div class="cmp-attr-row">
            <div class="cmp-bar-wrap"><div class="cmp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="cmp-attr-val${isWin ? ' cmp-winner-text' : ''}" style="flex:0 0 44px;font-size:12px">${isNaN(n) ? '—' : n.toFixed(1) + '%'}</span>
          </div></div>`;
      });
      return `<div class="cmp-row">${lc(label)}${cells.join('')}</div>`;
    }

    function attrRow(label, vals) {
      const nums = vals.map(Number);
      const valid = nums.filter(n => n > 0);
      const maxN  = valid.length > 1 ? Math.max(...valid) : -1;
      const cells = nums.map(n => {
        const isMax = n > 0 && n === maxN;
        const pct   = Math.max(0, Math.round((n / 99) * 100));
        const color = n >= 90 ? '#FFD000' : n >= 80 ? '#43d968' : n >= 70 ? '#4da6ff' : 'rgba(255,255,255,0.14)';
        return `<div class="cmp-value-cell${isMax ? ' cmp-winner' : ''}">
          <div class="cmp-attr-row">
            <div class="cmp-bar-wrap"><div class="cmp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="cmp-attr-val${isMax ? ' cmp-winner-text' : ''}">${n || '—'}</span>
          </div></div>`;
      });
      return `<div class="cmp-row">${lc(`<span class="cmp-attr-label">${label}</span>`)}${cells.join('')}</div>`;
    }

    // ── Normalise slots ──────────────────────────────────────────────────────
    const ids = (state.compareIds || [null, null]).slice();
    const filledCount = ids.filter(Boolean).length;
    const slotCount   = Math.min(4, Math.max(2, filledCount + (filledCount < 4 ? 1 : 0)));
    while (ids.length < slotCount) ids.push(null);
    const slots = ids.slice(0, slotCount);

    // Selector bar
    const selectorHtml = slots.map((id, idx) => {
      const opts = state.builds.map(b =>
        `<option value="${escapeHtml(b.id)}"${b.id === id ? ' selected' : ''}>${escapeHtml(b.name)}</option>`
      ).join('');
      return `<div class="cmp-slot">
        <select class="cmp-selector" onchange="compareSelectBuild(${idx},this.value)">
          <option value="">${t('Select a build...')}</option>${opts}
        </select>
        ${id ? `<button class="cmp-remove-btn" onclick="compareRemoveBuild(${idx})">✕</button>` : ''}
      </div>`;
    }).join('');

    // Build data (preserve original slot index for color assignment)
    const buildData = slots.map((id, slotIdx) => {
      if (!id) return null;
      const build = state.builds.find(b => b.id === id);
      if (!build) return null;
      const games = state.games.filter(g => g.buildId === id);
      return { build, games, agg: aggregate(games), eff: effMetrics(games), slotIdx };
    }).filter(Boolean);

    if (buildData.length === 0) {
      const hasEnoughBuilds = (state.builds || []).length >= 2;
      el.innerHTML = `<div class="cmp-selectors">${selectorHtml}</div>
        <div class="empty-state">
          <div class="empty-state-title">${t('Select two builds to compare')}</div>
          <div class="empty-state-text">${hasEnoughBuilds ? t('Use the selectors above to compare attributes, badges, efficiency, and recent form.') : t('Create at least two builds before this view can show a useful comparison.')}</div>
          <button class="context-action ${hasEnoughBuilds ? '' : 'primary'}" type="button" onclick="${hasEnoughBuilds ? "showPage('builds')" : 'openBuildModal()'}">${hasEnoughBuilds ? t('Open Build Library') : t('Create Build')}</button>
        </div>`;
      if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
      return;
    }

    // ── TABLE ────────────────────────────────────────────────────────────────
    let table = '';

    // ── Header build cards ──────────────────────────────────────────────────
    table += `<div class="cmp-row cmp-header-row">
      ${lc('', 'cmp-label-corner')}
      ${buildData.map(({ build, games, agg, slotIdx }) => {
        const color     = SLOT_COLORS[slotIdx]  || '#D4001A';
        const alphaFill = SLOT_ALPHAS[slotIdx]  || 'rgba(212,0,26,0.18)';
        const ovrNum    = build.ovr ? parseInt(build.ovr) : null;
        const ovrCls    = ovrNum >= 90 ? 'cmp-ovr-elite' : ovrNum >= 80 ? 'cmp-ovr-good' : ovrNum >= 70 ? 'cmp-ovr-avg' : 'cmp-ovr-base';
        const posStr    = [build.position, build.position2].filter(Boolean).join('/') || '—';
        const sizeStr   = [build.height, build.weight ? build.weight + ' lbs' : ''].filter(Boolean).join(' · ');
        const hasGames  = games.length > 0;
        const wrPct     = hasGames ? parseFloat(agg.winPct).toFixed(0) : null;
        const wrColor   = wrPct >= 60 ? '#43d968' : wrPct >= 45 ? color : '#D4001A';
        return `<div class="cmp-value-cell cmp-name-cell" style="border-top:3px solid ${color}">
          <div class="cmp-build-card-top">
            ${ovrNum
              ? `<div class="cmp-ovr-circle ${ovrCls}" style="border-color:${color};color:${color}">${ovrNum}</div>`
              : `<div class="cmp-ovr-circle cmp-ovr-base" style="border-color:rgba(255,255,255,0.2)">—</div>`}
            <div class="cmp-build-info-col">
              <button class="cmp-build-link" onclick="openBuildDetail('${escapeHtml(build.id)}')">${escapeHtml(build.name)}</button>
              <div class="cmp-build-meta">${escapeHtml(posStr)}</div>
              ${build.archetype ? `<div class="cmp-build-meta">${escapeHtml(build.archetype)}</div>` : ''}
              ${sizeStr ? `<div class="cmp-build-meta cmp-build-size">${escapeHtml(sizeStr)}</div>` : ''}
            </div>
          </div>
          ${buildRadar(build.attrs, color)}
          <div class="cmp-stat-strip">
            ${hasGames
              ? `<span class="cmp-stat-chip">${agg.wins}W · ${agg.losses}L</span>
                 <span class="cmp-stat-chip" style="color:${wrColor}">${wrPct}% ${t('WR')}</span>
                 <span class="cmp-stat-chip">${games.length} ${t('games')}</span>`
              : `<span class="cmp-stat-chip cmp-no-games">${t('No games yet')}</span>`}
          </div>
          ${formDots(games)}
        </div>`;
      }).join('')}
    </div>`;

    // ── BUILD INFO ──────────────────────────────────────────────────────────
    table += section(t('BUILD INFO'));
    table += valueRow(t('Position'), buildData.map(d => [d.build.position, d.build.position2].filter(Boolean).join('/') || '—'));
    table += valueRow(t('Height'),   buildData.map(d => d.build.height   || '—'));
    table += valueRow(t('Weight'),   buildData.map(d => d.build.weight   || null), { unit: ' lbs', numeric: true });
    table += valueRow(t('Wingspan'), buildData.map(d => d.build.wingspan || '—'));
    table += valueRow('OVR',         buildData.map(d => d.build.ovr      || null), { numeric: true });

    // ── SHOOTING SPLITS ─────────────────────────────────────────────────────
    table += section(t('SHOOTING'));
    table += pctRow('2PT FG%', buildData.map(d => d.eff.fg2Pct), { high: 58, mid: 50, low: 42 });
    table += pctRow('3PT FG%', buildData.map(d => d.eff.fg3Pct), { high: 43, mid: 36, low: 30 });
    table += pctRow('FT%',     buildData.map(d => d.eff.ftPct),  { high: 88, mid: 78, low: 68 });
    table += pctRow('TS%',     buildData.map(d => d.eff.ts),     { high: 65, mid: 58, low: 50 });
    table += pctRow('eFG%',    buildData.map(d => d.eff.efg),    { high: 58, mid: 52, low: 46 });

    // ── GAME STATS ──────────────────────────────────────────────────────────
    table += section(t('GAME STATS'));
    table += valueRow(t('Record'), buildData.map(d => `${d.agg.wins}W-${d.agg.losses}L`));
    table += valueRow(t('Games'),  buildData.map(d => d.games.length),                                            { numeric: true });
    table += winPctRow(t('Win %'));
    table += valueRow(t('PPG'),    buildData.map(d => d.games.length ? parseFloat(d.agg.ppg)       : null),       { numeric: true });
    table += valueRow(t('RPG'),    buildData.map(d => d.games.length ? parseFloat(d.agg.rpg)       : null),       { numeric: true });
    table += valueRow(t('APG'),    buildData.map(d => d.games.length ? parseFloat(d.agg.apg)       : null),       { numeric: true });
    table += valueRow(t('SPG'),    buildData.map(d => d.games.length ? parseFloat(d.agg.spg)       : null),       { numeric: true });
    table += valueRow(t('BPG'),    buildData.map(d => d.games.length ? parseFloat(d.agg.bpg)       : null),       { numeric: true });
    table += valueRow(t('TOV'),    buildData.map(d => d.games.length ? parseFloat(d.agg.topg)      : null),       { numeric: true, highlight: 'min' });
    table += valueRow(t('AST/TO'), buildData.map(d => d.eff.asto),                                                { numeric: true });
    table += valueRow(t('+/-'),    buildData.map(d => d.games.length ? parseFloat(d.agg.plusMinus) : null),       { numeric: true });

    // ── ATTRIBUTE GROUPS ────────────────────────────────────────────────────
    const groupKeys = Object.keys(ATTR_G);
    groupKeys.forEach(gKey => {
      const group = ATTR_G[gKey];
      table += section(t(group.label));
      group.keys.forEach(key => {
        const lp = ATTR_L[key];
        table += attrRow(lp ? t(lp[0]) : key, buildData.map(d => Number(d.build.attrs?.[key]) || 0));
      });
    });

    // ── EQUIPPED BADGES ─────────────────────────────────────────────────────
    table += section(t('EQUIPPED BADGES'));

    // Tier count summary
    const tierOrder = ['legend', 'hof', 'gold', 'silver', 'bronze'];
    table += `<div class="cmp-row cmp-badge-summary-row">
      ${lc(t('Tiers'))}
      ${buildData.map(d => {
        const eq = getEquipped(d.build.badges || {});
        const chips = tierOrder.map(tier => {
          const c = eq.filter(b => b.tier === tier).length;
          if (!c) return '';
          const s = TIER_STYLE[tier];
          return `<span class="cmp-tier-chip" style="background:${s.bg};color:${s.text}">${s.label}&thinsp;×${c}</span>`;
        }).filter(Boolean).join('');
        return `<div class="cmp-value-cell cmp-badge-summary-cell">${chips || `<span class="cmp-no-badges">${t('None')}</span>`}</div>`;
      }).join('')}
    </div>`;

    // Individual badge pills
    table += `<div class="cmp-row cmp-badges-row">
      ${lc('')}
      ${buildData.map(d => {
        const equipped = getEquipped(d.build.badges || {});
        return `<div class="cmp-value-cell cmp-badges-cell">${equipped.length
          ? equipped.map(badge => {
              const s = TIER_STYLE[badge.tier] || { bg: '#333', text: '#aaa', label: '?' };
              return `<span class="cmp-badge-pill"><span class="cmp-badge-tier" style="background:${s.bg};color:${s.text}">${s.label}</span><span class="cmp-badge-name">${escapeHtml(badge.name)}</span></span>`;
            }).join('')
          : `<span class="cmp-no-badges">${t('None')}</span>`
        }</div>`;
      }).join('')}
    </div>`;

    el.innerHTML = `
      <div class="cmp-selectors">${selectorHtml}</div>
      <div class="cmp-table-wrap"><div class="cmp-table">${table}</div></div>`;

    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  window.NBA2K26_BUILD_COMPARE = { renderCompare };
})(window);
