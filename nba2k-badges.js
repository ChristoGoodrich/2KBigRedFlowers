// Badge catalog, tier requirements, and auto-unlock helpers.
// Kept global for compatibility with the existing classic-script app.
// The catalog and thresholds come from the active game-year dataset.
const BADGE_CATEGORIES = GAME_DATA.badgeCategories;

const TIERS = GAME_DATA.tiers;

const TIER_ORDER = { bronze: 1, silver: 2, gold: 3, hof: 4, legend: 5 };
const TIER_KEYS_DESC = ['legend', 'hof', 'gold', 'silver', 'bronze'];

// Tier requirements for the active game year. Every group in a tier must
// pass; within an `any` group one listed attribute path is enough. A tier may
// be null when the game's thresholds are not published yet.
const BADGE_THRESHOLDS = GAME_DATA.badgeThresholds;

function getAttrValue(attrs, key) { return Number(attrs && attrs[key] != null ? attrs[key] : 0) || 0; }
function meetsReqItem(attrs, item) { return getAttrValue(attrs, item.k) >= item.val; }
function meetsReqGroup(attrs, group) {
  if (group.all) return group.all.every(item => meetsReqItem(attrs, item));
  if (group.any) return group.any.some(item => meetsReqItem(attrs, item));
  return false;
}
function meetsBadgeTier(attrs, tierGroups) {
  // An unknown tier (null) or an empty group list is not a met tier.
  if (!Array.isArray(tierGroups) || tierGroups.length === 0) return false;
  return tierGroups.every(group => meetsReqGroup(attrs, group));
}
function formatReqItem(item) {
  const label = (ATTR_LABELS[item.k] && (currentLang === 'zh' ? ATTR_LABELS[item.k][1] : ATTR_LABELS[item.k][0])) || item.k;
  return label + ' ' + item.val;
}
function formatReqGroup(group) {
  if (group.all) return group.all.map(formatReqItem).join(' + ');
  if (group.any) return group.any.map(formatReqItem).join(' / ');
  return '';
}
function formatBadgeTierReq(badgeId, tier) {
  const def = BADGE_THRESHOLDS[badgeId];
  if (!def || !def.tiers || !def.tiers[tier]) return '';
  return def.tiers[tier].map(formatReqGroup).filter(Boolean).join(' | ');
}
function getBadgeTierScoreGap(attrs, badgeId, tier) {
  const def = BADGE_THRESHOLDS[badgeId];
  const groups = def && def.tiers && def.tiers[tier];
  if (!groups) return null;
  let best = null;
  groups.forEach(group => {
    const candidates = group.all || group.any || [];
    candidates.forEach(item => {
      const val = getAttrValue(attrs, item.k);
      const gap = Math.max(0, item.val - val);
      const row = { attr: item.k, val, target: item.val, gap, label: formatReqItem(item) };
      if (!best || row.gap < best.gap) best = row;
    });
  });
  return best;
}
function computeAutoBadges(attrs) {
  if (!attrs || typeof attrs !== 'object') return {};
  const result = {};
  Object.keys(BADGE_THRESHOLDS).forEach(badgeId => {
    const def = BADGE_THRESHOLDS[badgeId];
    if (!def || !def.tiers) return;
    for (const tier of TIER_KEYS_DESC) {
      if (meetsBadgeTier(attrs, def.tiers[tier])) { result[badgeId] = tier; break; }
    }
  });
  return result;
}

function mergeBadges(manualBadges, attrs) {
  const auto = computeAutoBadges(attrs);
  const merged = { ...auto };
  const autoOnly = {};
  if (manualBadges) {
    Object.keys(manualBadges).forEach(k => {
      if (k === '_format') return;
      if (TIER_ORDER[manualBadges[k]]) merged[k] = manualBadges[k];
    });
  }
  Object.keys(auto).forEach(k => {
    if (!manualBadges || !manualBadges[k] || !TIER_ORDER[manualBadges[k]]) autoOnly[k] = auto[k];
  });
  return { merged, autoOnly };
}

function updateBadgePreview() {
  const previewEl = document.getElementById('badge-preview-content');
  if (!previewEl) return;
  const attrs = {};
  document.querySelectorAll('.attr-input[data-group]').forEach(inp => {
    const row = inp.closest('.attr-row');
    if (row) {
      const key = row.dataset.attr;
      const v = parseInt(inp.value);
      if (key && !isNaN(v)) attrs[key] = v;
    }
  });
  if (Object.keys(attrs).length === 0) {
    previewEl.innerHTML = `<span style="color:var(--text-fade);">${t('Auto-calculates after attributes are entered...')}</span>`;
    return;
  }
  const auto = computeAutoBadges(attrs);
  const autoKeys = Object.keys(auto);
  if (autoKeys.length === 0) {
    previewEl.innerHTML = `<span style="color:var(--text-fade);">${t('Current attributes do not meet any badge thresholds')}</span>`;
    return;
  }
  const badgeLookup = {};
  BADGE_CATEGORIES.forEach(cat => {
    cat.badges.forEach(b => { badgeLookup[b.id] = { ...b, category: cat.label }; });
  });
  const tierOrder = ['legend','hof','gold','silver','bronze'];
  const tierLabels = { legend:'LEGEND', hof:'HOF', gold:'GOLD', silver:'SILVER', bronze:'BRONZE' };
  const tierCls = { legend:'legend', hof:'hof', gold:'gold', silver:'silver', bronze:'bronze' };
  const byTier = {};
  tierOrder.forEach(t => byTier[t] = []);
  autoKeys.forEach(id => {
    const tier = auto[id];
    const meta = badgeLookup[id];
    if (meta && byTier[tier]) byTier[tier].push(meta.name);
  });
  let html = '';
  tierOrder.forEach(t => {
    if (byTier[t].length === 0) return;
    html += '<div style="margin-bottom:6px;"><span class="tier-dot tier-' + tierCls[t] + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;"></span><span style="color:var(--text-fade);font-size:10px;letter-spacing:1px;">' + tierLabels[t] + '</span> <span style="color:var(--text-fade);">×' + byTier[t].length + '</span></div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
    byTier[t].forEach(name => {
      html += '<span class="badge-chip ' + tierCls[t] + ' auto-unlocked" style="font-size:9px;padding:2px 7px;">' + escapeHtml(name) + '</span>';
    });
    html += '</div>';
  });
  previewEl.innerHTML = html;
}

document.addEventListener('input', function(e) {
  if (e.target.classList && e.target.classList.contains('attr-input')) {
    updateBadgePreview();
  }
});
