// Badge editor UI helpers.
// Owns the editable badge selection state used by the build modal.
(function(window) {
  'use strict';

  let currentBadges = {}; // { badgeId: tierId }
  let badgeSearch = '';
  let equippedOnly = false;
  let lastDeps = null;

  function getCurrentBadges() {
    return currentBadges;
  }

  function setCurrentBadges(value) {
    currentBadges = value || {};
    badgeSearch = '';
    equippedOnly = false;
  }

  // A badge the active game-year dataset cannot fully describe is flagged in the
  // list, so an empty requirement area never reads as "no requirement".
  function dataCaveats(badge, thresholds, t) {
    const notes = [];
    const def = thresholds && thresholds[badge.id];
    const hasTier = def && def.tiers && Object.values(def.tiers).some(Boolean);
    if (!hasTier) notes.push(t('requirements not published yet'));
    if (badge.confidence === 'provisional') notes.push(t('not yet confirmed for this game'));
    return notes;
  }

  function renderBadgeList(deps = lastDeps) {
    if (!deps) return;
    lastDeps = deps;
    const { BADGE_CATEGORIES, BADGE_THRESHOLDS, TIERS, t, escapeHtml } = deps;
    const container = document.getElementById('badge-list-container');
    if (!container) return;
    const query = badgeSearch.trim().toLowerCase();

    const categoriesHtml = BADGE_CATEGORIES.map(cat => {
      const equippedCount = cat.badges.filter(b => currentBadges[b.id]).length;
      const visibleBadges = cat.badges.filter(b => {
        if (equippedOnly && !currentBadges[b.id]) return false;
        if (!query) return true;
        return `${b.id} ${t(b.name)} ${t(b.desc)}`.toLowerCase().includes(query);
      });
      if (!visibleBadges.length) return '';
      return `
        <details class="badge-cat"${query || equippedOnly || equippedCount ? ' open' : ''}>
          <summary class="badge-cat-header">
            <div class="badge-cat-title">${t(cat.label)}</div>
            <div class="badge-cat-count">${equippedCount} / ${cat.badges.length}</div>
          </summary>
          <div class="badge-cat-body">
          ${visibleBadges.map(b => {
            const tier = currentBadges[b.id];
            const caveats = dataCaveats(b, BADGE_THRESHOLDS, t);
            const caveatHtml = caveats.length
              ? `<span class="badge-row-caveat">${escapeHtml(caveats.join(' \u00b7 '))}</span>`
              : '';
            return `
              <div class="badge-row ${tier ? 'has-tier' : ''}" data-badge="${b.id}">
                <div class="badge-row-name">
                  ${t(b.name)}
                  <span class="badge-row-sub">${t(b.desc)}</span>
                  ${caveatHtml}
                </div>
                <div class="tier-picker">
                  ${tier ? `<button type="button" class="tier-btn clear" onclick="setBadgeTier('${escapeHtml(b.id)}', null)" title="${t('Clear')}">x</button>` : ''}
                  ${TIERS.map(tr => `
                    <button type="button" class="tier-btn ${tr.cls} ${tier === tr.id ? 'active' : ''}" onclick="setBadgeTier('${escapeHtml(b.id)}', '${tr.id}')">${t(tr.label)}</button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
          </div>
        </details>
      `;
    }).join('');
    container.innerHTML = `
      <div class="badge-editor-toolbar">
        <label>
          <span>${t('Search')}</span>
          <input type="search" value="${escapeHtml(badgeSearch)}" placeholder="${t('Search badges...')}" oninput="searchBadgeList(this.value)">
        </label>
        <button class="badge-equipped-filter${equippedOnly ? ' active' : ''}" type="button" onclick="toggleEquippedBadgesOnly()">${t('Only equipped')}</button>
      </div>
      ${categoriesHtml || `<div class="badge-summary-empty">${t('// no matching badges')}</div>`}
    `;

    renderBadgeSummary(deps);
  }

  function renderBadgeSummary(deps) {
    const { BADGE_CATEGORIES, TIER_ORDER, t, escapeHtml } = deps;
    const sum = document.getElementById('badge-summary');
    if (!sum) return;

    const equipped = [];
    BADGE_CATEGORIES.forEach(cat => {
      cat.badges.forEach(b => {
        if (currentBadges[b.id]) equipped.push({ ...b, tier: currentBadges[b.id] });
      });
    });

    equipped.sort((a, b) => (TIER_ORDER[b.tier] || 0) - (TIER_ORDER[a.tier] || 0));

    if (equipped.length === 0) {
      sum.innerHTML = `<span class="badge-summary-empty">${t('// no equipped badges')}</span>`;
      return;
    }

    sum.innerHTML = `<span class="badge-summary-label">${t('Equipped')} ${equipped.length}</span>` +
      equipped.map(b => `<span class="badge-chip ${b.tier}">${escapeHtml(t(b.name))}</span>`).join('');
  }

  function setBadgeTier(badgeId, tier, deps) {
    if (tier === null) {
      delete currentBadges[badgeId];
    } else {
      currentBadges[badgeId] = tier;
    }
    renderBadgeList(deps);
  }

  function setBadgeSearch(value) {
    badgeSearch = value || '';
    renderBadgeList();
  }

  function toggleEquippedOnly() {
    equippedOnly = !equippedOnly;
    renderBadgeList();
  }

  window.NBA2K_BADGE_EDITOR = {
    getCurrentBadges,
    setCurrentBadges,
    renderBadgeList,
    renderBadgeSummary,
    setBadgeTier,
    setBadgeSearch,
    toggleEquippedOnly,
  };
})(window);
