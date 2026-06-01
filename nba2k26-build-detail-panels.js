// NBA 2K26 build detail subpanels.
// Owns attribute radar/cards and badge detail breakdown rendering.
(function(window) {
  'use strict';

  const TIERS = [
    { key: 'legend', label: 'LEGEND', cls: 'legend' },
    { key: 'hof', label: 'HOF', cls: 'hof' },
    { key: 'gold', label: 'GOLD', cls: 'gold' },
    { key: 'silver', label: 'SILVER', cls: 'silver' },
    { key: 'bronze', label: 'BRONZE', cls: 'bronze' },
  ];

  function tierOrderKeys() {
    return ['bronze', 'silver', 'gold', 'hof', 'legend'];
  }

  function renderAttrsPanel(attrs, deps) {
    const { ATTR_GROUPS, ATTR_LABELS, groupAvg, t, escapeHtml } = deps;
    const groupAvgs = {};
    Object.keys(ATTR_GROUPS).forEach(group => {
      groupAvgs[group] = groupAvg(attrs, group);
    });

    const labels = Object.keys(ATTR_GROUPS).map(group => t(ATTR_GROUPS[group].label));
    const values = Object.keys(ATTR_GROUPS).map(group => groupAvgs[group] ?? 0);
    const svg = buildRadarSVG(labels, values, { escapeHtml });

    const groupCards = Object.keys(ATTR_GROUPS).map(group => {
      const info = ATTR_GROUPS[group];
      const avg = groupAvgs[group];
      const avgClass = avg >= 85 ? 'hot' : avg >= 70 ? '' : '';
      const avgStyle = avg >= 85
        ? 'color:var(--orange);'
        : avg >= 70
          ? 'color:var(--yellow);'
          : 'color:var(--text-dim);';

      return `
        <div class="attr-detail-card">
          <div class="attr-detail-header">
            <div class="attr-detail-name">${t(info.label)}</div>
            <div class="attr-detail-avg ${avgClass}" style="${avgStyle}">${avg ?? '-'}</div>
          </div>
          <div class="attr-detail-list">
            ${info.keys.map(key => {
              const value = attrs[key];
              if (value == null) return '';
              const cls = value >= 85 ? 'high' : value >= 70 ? 'mid' : '';
              const label = ATTR_LABELS[key]?.[0] || key;
              return `<div class="attr-detail-item"><span>${escapeHtml(t(label))}</span><span class="val ${cls}">${value}</span></div>`;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="radar-wrap">
        <div class="radar-title">${t('ATTRIBUTES')}</div>
        <div class="radar-grid">
          <div>${svg}</div>
          <div class="radar-bars">
            ${Object.keys(ATTR_GROUPS).map(group => {
              const value = groupAvgs[group] ?? 0;
              const pct = Math.max(0, Math.min(100, ((value - 25) / 74) * 100));
              const color = value >= 85 ? 'var(--orange)' : value >= 70 ? 'var(--yellow)' : 'var(--text-dim)';
              return `
                <div class="radar-bar-row">
                  <div class="radar-bar-label">${t(ATTR_GROUPS[group].label)}</div>
                  <div class="radar-bar-track"><div class="radar-bar-fill" style="width:${pct}%;background:${color};"></div></div>
                  <div class="radar-bar-value">${value || '-'}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="attrs-detail-grid" style="margin-bottom:32px;">${groupCards}</div>
    `;
  }

  function buildRadarSVG(labels, values, deps) {
    const { escapeHtml } = deps;
    const size = 260;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 95;
    const count = labels.length || 1;
    const angleOf = index => (Math.PI * 2 * index) / count - Math.PI / 2;

    const ringPolys = [0.25, 0.5, 0.75, 1].map(scale => {
      const points = [];
      for (let i = 0; i < count; i++) {
        const angle = angleOf(i);
        points.push(`${cx + Math.cos(angle) * radius * scale},${cy + Math.sin(angle) * radius * scale}`);
      }
      return `<polygon points="${points.join(' ')}" fill="none" stroke="rgba(128,128,128,0.2)" />`;
    }).join('');

    const axes = [];
    for (let i = 0; i < count; i++) {
      const angle = angleOf(i);
      axes.push(`<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * radius}" y2="${cy + Math.sin(angle) * radius}" stroke="rgba(128,128,128,0.2)" />`);
    }

    const dataPoints = [];
    for (let i = 0; i < count; i++) {
      const angle = angleOf(i);
      const value = Math.max(25, Math.min(99, values[i] || 25));
      const r = ((value - 25) / 74) * radius;
      dataPoints.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
    }

    const labelEls = labels.map((label, index) => {
      const angle = angleOf(index);
      const x = cx + Math.cos(angle) * (radius + 18);
      const y = cy + Math.sin(angle) * (radius + 18);
      const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
      return `<text x="${x}" y="${y}" fill="rgba(128,128,128,0.9)" font-family="JetBrains Mono, monospace" font-size="9" text-anchor="${anchor}" dominant-baseline="middle" letter-spacing="1">${escapeHtml(String(label).slice(0, 4))}</text>`;
    }).join('');

    return `
      <svg class="radar-svg" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        ${ringPolys}
        ${axes.join('')}
        <polygon points="${dataPoints.join(' ')}" fill="rgba(212,0,26,0.22)" stroke="#D4001A" stroke-width="2" stroke-linejoin="round" />
        ${dataPoints.map(point => {
          const [x, y] = point.split(',');
          return `<circle cx="${x}" cy="${y}" r="3" fill="#D4001A" />`;
        }).join('')}
        ${labelEls}
      </svg>
    `;
  }

  function badgeLookup(BADGE_CATEGORIES) {
    const lookup = {};
    BADGE_CATEGORIES.forEach(category => {
      category.badges.forEach(badge => {
        lookup[badge.id] = { ...badge, category: category.label };
      });
    });
    return lookup;
  }

  function equippedBadges(badges, deps) {
    const { BADGE_CATEGORIES, TIER_ORDER } = deps;
    const lookup = badgeLookup(BADGE_CATEGORIES);
    const isV2 = badges._format === 'v2' ||
      (typeof badges === 'object' && Object.keys(badges).some(key => TIER_ORDER[badges[key]] && key !== '_format'));
    const equipped = [];

    if (isV2) {
      Object.keys(badges).forEach(id => {
        if (id === '_format') return;
        const tier = badges[id];
        if (!TIER_ORDER[tier]) return;
        const meta = lookup[id];
        if (meta) equipped.push({ id, name: meta.name, tier, category: meta.category });
      });
      return { equipped, lookup };
    }

    TIERS.forEach(tier => {
      const items = (badges[tier.key] || '').split(/[,，;；]/).map(item => item.trim()).filter(Boolean);
      items.forEach(name => {
        const entry = Object.entries(lookup).find(([, badge]) => badge.name.toLowerCase() === name.toLowerCase());
        const id = entry?.[0] || name;
        const meta = entry?.[1];
        equipped.push({ id, name, tier: tier.key, category: meta?.category || 'OTHER' });
      });
    });

    return { equipped, lookup };
  }

  function renderNextTierHints(autoOnly, attrs, lookup, deps) {
    const { BADGE_THRESHOLDS, getBadgeTierScoreGap, escapeHtml } = deps;
    const nextTierName = { bronze: 'SILVER', silver: 'GOLD', gold: 'HOF', hof: 'LEGEND', legend: null };
    const keys = tierOrderKeys();
    const hints = [];

    Object.keys(autoOnly).forEach(badgeId => {
      const currentTier = autoOnly[badgeId];
      const currentIndex = keys.indexOf(currentTier);
      if (currentIndex < 0 || currentIndex >= keys.length - 1) return;
      const nextTier = keys[currentIndex + 1];
      if (!BADGE_THRESHOLDS[badgeId]) return;
      const gap = getBadgeTierScoreGap(attrs, badgeId, nextTier);
      if (gap && gap.gap > 0) {
        const name = lookup[badgeId]?.name || badgeId;
        hints.push(`${name} -> ${nextTierName[currentTier]} (${gap.label}, +${gap.gap})`);
      }
    });

    if (!hints.length) return '';
    const tr = typeof window.t === 'function' ? window.t : v => v;
    return `<div style="margin-top:10px;padding:8px 14px;background:rgba(0,200,150,0.06);border:1px dashed rgba(0,200,150,0.3);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-fade);">${tr('Next tier')}: ${escapeHtml(hints.slice(0, 5).join(' | '))}${hints.length > 5 ? ' ...' : ''}</div>`;
  }

  function getBadgeRecommendations(attrs, badges, deps) {
    const { BADGE_CATEGORIES, BADGE_THRESHOLDS, TIER_ORDER, getBadgeTierScoreGap } = deps;
    if (!attrs || typeof attrs !== 'object' || Object.keys(attrs).length === 0) return [];
    const lookup = badgeLookup(BADGE_CATEGORIES);
    const tierKeys = tierOrderKeys();
    const targetLabel = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD', hof: 'HOF', legend: 'LEGEND' };
    const rows = [];

    Object.keys(BADGE_THRESHOLDS || {}).forEach(badgeId => {
      const meta = lookup[badgeId];
      if (!meta) return;
      const currentTier = badges && TIER_ORDER[badges[badgeId]] ? badges[badgeId] : null;
      const currentIndex = currentTier ? tierKeys.indexOf(currentTier) : -1;
      if (currentIndex >= tierKeys.length - 1) return;
      const targetTier = tierKeys[currentIndex + 1] || 'bronze';
      const gap = getBadgeTierScoreGap(attrs, badgeId, targetTier);
      if (!gap || gap.gap <= 0) return;
      rows.push({
        badgeId,
        name: meta.name,
        category: meta.category,
        currentTier,
        targetTier,
        targetLabel: targetLabel[targetTier] || targetTier.toUpperCase(),
        attr: gap.attr,
        attrLabel: gap.label,
        currentValue: gap.val,
        targetValue: gap.target,
        gap: gap.gap,
      });
    });

    return rows
      .sort((a, b) => a.gap - b.gap || TIER_ORDER[b.targetTier] - TIER_ORDER[a.targetTier] || a.name.localeCompare(b.name))
      .slice(0, 6);
  }

  function renderBadgeRecommendations(attrs, badges, deps) {
    const { t, escapeHtml } = deps;
    const recommendations = getBadgeRecommendations(attrs, badges, deps);
    if (!recommendations.length) {
      return `
        <div class="badge-rec-panel empty">
          <div class="badge-rec-kicker">${t('BADGE RECOMMENDATIONS')}</div>
          <div class="badge-rec-empty">${t('No near-term badge upgrades found from current attributes.')}</div>
        </div>
      `;
    }

    return `
      <div class="badge-rec-panel">
        <div class="badge-rec-head">
          <div>
            <div class="badge-rec-kicker">${t('BADGE RECOMMENDATIONS')}</div>
            <div class="badge-rec-title">${t('Closest upgrade paths')}</div>
          </div>
          <button class="context-action" onclick='setDetailTab("build")'>${t('Review Attributes')}</button>
        </div>
        <div class="badge-rec-grid">
          ${recommendations.slice(0, 4).map(item => `
            <article class="badge-rec-card">
              <span>${escapeHtml(item.currentTier ? `${item.currentTier.toUpperCase()} -> ${item.targetLabel}` : item.targetLabel)}</span>
              <strong>${escapeHtml(t(item.name))}</strong>
              <small>${escapeHtml(item.attrLabel)} · ${t('needs')} +${item.gap}</small>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderBadgesPanel(badges, autoOnly, attrs, deps) {
    const { t, escapeHtml } = deps;
    const { equipped, lookup } = equippedBadges(badges, deps);
    const recommendations = renderBadgeRecommendations(attrs || {}, badges || {}, deps);
    if (!equipped.length) return recommendations;

    const autoCount = Object.keys(autoOnly || {}).length;
    const manualCount = Math.max(0, equipped.length - autoCount);
    const tr = typeof window.t === 'function' ? window.t : v => v;
    const autoSummary = autoCount > 0
      ? `<div class="auto-badge-summary">${tr('Auto unlocked')}: <span>${autoCount}</span> &nbsp;|&nbsp; ${tr('Manual equipped')}: <span>${manualCount}</span></div>`
      : '';
    const nextHints = renderNextTierHints(autoOnly || {}, attrs || {}, lookup, deps);
    const byTier = {};
    TIERS.forEach(tier => { byTier[tier.key] = []; });
    equipped.forEach(item => { byTier[item.tier].push(item); });

    const rows = TIERS.filter(tier => byTier[tier.key].length > 0).map(tier => `
      <div style="display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--border);">
        <div style="font-family:'Archivo Black',sans-serif;font-size:10px;letter-spacing:2px;display:flex;align-items:center;gap:8px;padding-top:6px;">
          <span class="tier-dot tier-${tier.cls}"></span>${tier.label}
          <span style="color:var(--text-fade);font-family:'JetBrains Mono',monospace;letter-spacing:1px;">x${byTier[tier.key].length}</span>
        </div>
        <div>
          ${byTier[tier.key].map(item => {
            const isAuto = !!autoOnly?.[item.id];
            return `<span class="badge-chip ${tier.cls} ${isAuto ? 'auto-unlocked' : ''}" title="${isAuto ? t('autoUnlocked') : t('manualEquipped')}">${escapeHtml(t(item.name))}</span>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div class="radar-wrap" style="margin-bottom:32px;">
        <div class="radar-title">${tr('BADGES')} <span style="color:var(--text-fade);font-size:13px;font-family:'JetBrains Mono',monospace;letter-spacing:2px;margin-left:12px;">${equipped.length} ${tr('equipped')}</span></div>
        ${autoSummary}
        ${nextHints}
        ${recommendations}
        <div>${rows}</div>
      </div>
    `;
  }

  window.NBA2K26_BUILD_DETAIL_PANELS = {
    renderAttrsPanel,
    buildRadarSVG,
    getBadgeRecommendations,
    renderBadgeRecommendations,
    renderBadgesPanel,
  };
})(window);
