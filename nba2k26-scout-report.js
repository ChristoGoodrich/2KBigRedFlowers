// NBA 2K26 scout report rendering, scoring, and player comparison helpers.
// Kept global for compatibility with the existing classic-script app.
// ====================== SCOUT REPORT ======================
function getAttrGrade(val) {
  if (val >= 95) return { grade: 'S+', cls: 'grade-elite', label: scoutCopy('精英', 'ELITE') };
  if (val >= 90) return { grade: 'A+', cls: 'grade-elite', label: scoutCopy('精英', 'ELITE') };
  if (val >= 85) return { grade: 'A', cls: 'grade-great', label: scoutCopy('出色', 'GREAT') };
  if (val >= 80) return { grade: 'A-', cls: 'grade-great', label: scoutCopy('出色', 'GREAT') };
  if (val >= 76) return { grade: 'B+', cls: 'grade-good', label: scoutCopy('优秀', 'GOOD') };
  if (val >= 70) return { grade: 'B', cls: 'grade-good', label: scoutCopy('优秀', 'GOOD') };
  if (val >= 65) return { grade: 'B-', cls: 'grade-avg', label: scoutCopy('一般', 'AVERAGE') };
  if (val >= 60) return { grade: 'C+', cls: 'grade-avg', label: scoutCopy('一般', 'AVERAGE') };
  if (val >= 55) return { grade: 'C', cls: 'grade-below', label: scoutCopy('偏弱', 'BELOW AVG') };
  return { grade: 'D', cls: 'grade-below', label: scoutCopy('弱', 'WEAK') };
}

// Get the highest unlocked milestone for an attribute
function getAttrMilestone(attrKey, val) {
  const thresholds = ANIM_THRESHOLDS[attrKey];
  if (!thresholds) return null;
  let best = null;
  for (const t of thresholds) {
    if (val >= t.val) best = t;
  }
  return best;
}

function getAttrBarColor(val) {
  if (val >= 90) return 'var(--orange)';
  if (val >= 80) return '#00c850';
  if (val >= 70) return '#4da6ff';
  if (val >= 60) return 'var(--text-dim)';
  return '#ff6b6b';
}
function getOverallGrade(attrs, position) {
  const vals = Object.values(attrs).map(Number).filter(Number.isFinite);
  if (!vals.length) return { grade: 'N/A', score: 0, desc: 'Insufficient data' };

  const pos = position || 'SF';
  const posOVR = calcPositionOVR(attrs, pos);
  const rawAvg = vals.reduce((sum, value) => sum + value, 0) / vals.length;
  const eliteCount = vals.filter(value => value >= 90).length;
  const weakCount = vals.filter(value => value < 60).length;
  const milestones = typeof findMilestones === 'function' ? findMilestones(attrs) : [];

  let grade = 'C';
  if (posOVR >= 88 && weakCount <= 2) grade = 'S';
  else if (posOVR >= 83 && weakCount <= 3) grade = 'A+';
  else if (posOVR >= 78) grade = 'A';
  else if (posOVR >= 73) grade = 'B+';
  else if (posOVR >= 68) grade = 'B';
  else if (posOVR >= 63) grade = 'C+';

  const desc = scoutCopy(
    `${grade} ${pos} 适配，角色综合分 ${Math.round(posOVR)}，${eliteCount} 个精英属性，${weakCount} 个风险项，${milestones.length} 个动作解锁。`,
    `${grade} ${pos} fit with ${Math.round(posOVR)} role OVR, ${eliteCount} elite attributes, ${weakCount} risk flags, and ${milestones.length} animation milestones.`
  );
  return { grade, score: Math.round(posOVR), desc, posOVR, rawAvg, milestoneCount: milestones.length };
}

function generateScoutNotes(b, attrs) {
  const notes = [];
  const pos = b.position || 'SF';
  const arch = typeof detectArchetype === 'function' ? detectArchetype(b, attrs) : { type: b.archetype || pos, desc: '' };
  const posOVR = typeof calcPositionOVR === 'function' ? calcPositionOVR(attrs, pos) : 0;
  const values = Object.values(attrs).map(Number).filter(Number.isFinite);
  const rawAvg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const labelFor = key => scoutAttrLabel(key);

  notes.push(`[Archetype] ${arch.type}${arch.desc ? ` - ${arch.desc}` : ''}`);
  notes.push(`[Fit] Position-weighted OVR ${Math.round(posOVR)} vs raw average ${Math.round(rawAvg)} for ${pos}.`);

  const milestones = typeof findMilestones === 'function' ? findMilestones(attrs) : [];
  const keyMilestones = milestones.filter(item => ['gold', 'hof', 'legend'].includes(item.tier));
  if (keyMilestones.length) {
    notes.push(`[Animations] Key unlocks: ${keyMilestones.slice(0, 5).map(item => item.en || item.label).join(', ')}.`);
  }

  const nearMisses = typeof findNearMisses === 'function' ? findNearMisses(attrs).slice(0, 3) : [];
  if (nearMisses.length) {
    notes.push(`[Upgrade ROI] Near thresholds: ${nearMisses.map(item => `${labelFor(item.attr)} +${item.gap}`).join(', ')}.`);
  }

  const sorted = Object.entries(attrs).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (sorted.length) {
    notes.push(`[Strengths] ${sorted.slice(0, 4).map(([key, value]) => `${labelFor(key)} ${value}`).join(', ')}.`);
    notes.push(`[Risks] ${sorted.slice(-3).map(([key, value]) => `${labelFor(key)} ${value}`).join(', ')}.`);
  }

  const badgeProfile = scoutNormalizeBadges(b.badges || {});
  if (badgeProfile.equipped.length) {
    notes.push(`[Badges] ${badgeProfile.equipped.length} equipped badges, including ${badgeProfile.equipped.slice(0, 4).map(item => `${item.name} ${item.tier.toUpperCase()}`).join(', ')}.`);
  }

  notes.push(`[Playstyle] ${getPlaystyleTip(b, attrs, false)}`);
  return notes.join('\n\n');
}

function getTakeoverSynergy(b, attrs) {
  const tk = String(b.takeover1 || '').toLowerCase();
  if (!tk) return 'not configured';
  if (tk.includes('sharp') || tk.includes('shoot')) return (attrs.threePoint || 0) >= 85 ? 'excellent shooting fit' : 'limited by shooting rating';
  if (tk.includes('slasher') || tk.includes('finish')) return (attrs.drivingDunk || attrs.drivingLayup || 0) >= 85 ? 'excellent finishing fit' : 'limited by finishing rating';
  if (tk.includes('lock') || tk.includes('def')) return Math.max(attrs.perimeterDefense || 0, attrs.interiorDefense || 0) >= 85 ? 'excellent defensive fit' : 'limited by defensive rating';
  if (tk.includes('play') || tk.includes('shot')) return Math.max(attrs.ballHandle || 0, attrs.passAccuracy || 0) >= 85 ? 'strong creator fit' : 'limited by creation rating';
  if (tk.includes('glass') || tk.includes('rebound')) return Math.max(attrs.offensiveRebound || 0, attrs.defensiveRebound || 0) >= 85 ? 'excellent rebounding fit' : 'limited by rebounding rating';
  return 'reasonable fit';
}

function getPlaystyleTip(b, attrs, isZh) {
  const arch = typeof detectArchetype === 'function' ? detectArchetype(b, attrs) : { type: '' };
  const type = String(arch.type || '').toLowerCase();
  if (type.includes('lock')) return 'Lean into primary matchup defense and convert stops into transition chances.';
  if (type.includes('slash')) return 'Attack gaps early, keep spacing clean, and use rim pressure to bend help defense.';
  if (type.includes('shot') || type.includes('scor')) return 'Build possessions around clean shot creation and selective off-ball movement.';
  if (type.includes('play')) return 'Use passing windows first, then score when defenders overhelp.';
  if (type.includes('post')) return 'Use strength and post control to force doubles before kicking to shooters.';
  if (type.includes('paint') || type.includes('interior')) return 'Control the paint with rebounding, rim protection, and simple finishing.';
  if (type.includes('stretch')) return 'Stay spaced, punish late closeouts, and open driving lanes for teammates.';
  return 'Keep the role flexible and let the strongest rating groups drive shot diet and defensive assignment.';
}
// ====================== PRO SCOUT REPORT OVERRIDE ======================
function scoutIsZh() {
  return currentLang !== 'en';
}

function scoutCopy(zh, en) {
  return scoutIsZh() ? (zh || en) : (en || zh);
}

function scoutNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function scoutFixed(v, digits = 1) {
  return scoutNum(v, 0).toFixed(digits);
}

function scoutAttrLabel(k) {
  const label = ATTR_LABELS[k] || [];
  return scoutIsZh() ? (label[1] || label[0] || k) : (label[0] || k);
}

function scoutScoreLabel(score) {
  if (score >= 90) return { grade: 'S', text: scoutCopy('核心球员', 'Franchise Core') };
  if (score >= 82) return { grade: 'A', text: scoutCopy('竞争基石', 'Competitive Anchor') };
  if (score >= 74) return { grade: 'B+', text: scoutCopy('强力轮换', 'Strong Rotation Build') };
  if (score >= 66) return { grade: 'B', text: scoutCopy('有用但有局限', 'Useful With Clear Limits') };
  if (score >= 58) return { grade: 'C+', text: scoutCopy('需定向升级', 'Needs Targeted Upgrades') };
  return { grade: 'C', text: scoutCopy('培育项目', 'Development Project') };
}

function scoutGroupAverages(attrs) {
  return Object.keys(ATTR_GROUPS).map(key => {
    const def = ATTR_GROUPS[key];
    const values = (def.keys || []).map(attr => scoutNum(attrs[attr], NaN)).filter(Number.isFinite);
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { key, label: t(def.label) || def.label || key, avg: Math.round(avg), count: values.length };
  }).filter(row => row.count).sort((a, b) => b.avg - a.avg);
}

function scoutNormalizeBadges(badges = {}) {
  const lookup = {};
  Object.values(BADGE_CATEGORIES || {}).flat().forEach(badge => {
    lookup[badge.id] = badge;
  });
  const tierWeight = { legend: 5, hof: 4, gold: 3, silver: 2, bronze: 1 };
  const equipped = [];
  const isV2 = badges._format === 'v2' || Object.keys(badges).some(key => key !== '_format' && TIER_ORDER[badges[key]]);

  if (isV2) {
    Object.entries(badges).forEach(([id, tier]) => {
      if (id === '_format' || !tierWeight[tier]) return;
      const meta = lookup[id] || { name: id, category: 'OTHER' };
      equipped.push({ id, name: meta.name, category: meta.category, tier, weight: tierWeight[tier] });
    });
  } else {
    Object.entries(badges).forEach(([name, active]) => {
      if (!active) return;
      const id = Object.keys(lookup).find(key => lookup[key].name.toLowerCase() === String(name).toLowerCase());
      const meta = id ? lookup[id] : { name, category: 'OTHER' };
      equipped.push({ id: id || name, name: meta.name, category: meta.category, tier: 'gold', weight: tierWeight.gold });
    });
  }

  const byTier = equipped.reduce((acc, item) => {
    acc[item.tier] = (acc[item.tier] || 0) + 1;
    return acc;
  }, {});
  const byCategory = equipped.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const score = equipped.reduce((sum, item) => sum + item.weight, 0);
  return { equipped, byTier, byCategory, score };
}

function scoutGameProfile(games) {
  const sorted = [...games].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
  const agg = aggregate(sorted);
  const recent = sorted.slice(0, 5);
  const recentAgg = recent.length ? aggregate(recent) : null;
  const modeMap = {};
  sorted.forEach(game => {
    const mode = game.mode || 'Unknown';
    if (!modeMap[mode]) modeMap[mode] = [];
    modeMap[mode].push(game);
  });
  const modes = Object.keys(modeMap).map(mode => {
    const a = aggregate(modeMap[mode]);
    return { mode, games: modeMap[mode].length, agg: a };
  }).sort((a, b) => b.games - a.games);
  const efficiency = (parseFloat(agg.fgPct) || 0) * 0.45 + (parseFloat(agg.fg3Pct) || 0) * 0.35 + (parseFloat(agg.ftPct) || 0) * 0.2;
  const winning = Math.max(0, Math.min(100, (parseFloat(agg.winPct) || 0) + scoutNum(agg.plusMinus, 0) * 1.8));
  const production = Math.min(100, scoutNum(agg.ppg) * 1.45 + scoutNum(agg.rpg) * 2.1 + scoutNum(agg.apg) * 2.3 + scoutNum(agg.spg) * 5 + scoutNum(agg.bpg) * 4 - scoutNum(agg.topg) * 3);
  return { count: sorted.length, sorted, agg, recentAgg, modes, efficiency: Math.round(efficiency), winning: Math.round(winning), production: Math.round(production) };
}

function scoutTopWeightedAttrs(attrs, position, take = 5, reverse = false) {
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.SF || {};
  return Object.entries(attrs).map(([key, value]) => ({
    key,
    val: scoutNum(value),
    weighted: scoutNum(value) * (weights[key] || 0.35)
  })).sort((a, b) => reverse ? a.weighted - b.weighted : b.weighted - a.weighted).slice(0, take);
}

function scoutBuildScores(b, attrs, games) {
  const hasAttrs = Object.keys(attrs).length > 0;
  const gameProfile = scoutGameProfile(games);
  const posScore = hasAttrs ? calcPositionOVR(attrs, b.position || 'SF') : 0;
  const badgeProfile = scoutNormalizeBadges(b.badges || {});
  const badgeScore = Math.min(100, badgeProfile.score * 4.5);
  const gameScore = gameProfile.count ? (gameProfile.production * 0.45 + gameProfile.efficiency * 0.25 + gameProfile.winning * 0.3) : 0;
  const readiness = hasAttrs
    ? posScore * 0.58 + badgeScore * 0.18 + (gameProfile.count ? gameScore * 0.24 : 8)
    : (gameProfile.count ? gameScore : 0);
  return {
    score: Math.max(0, Math.min(99, Math.round(readiness))),
    posScore: Math.round(posScore),
    badgeScore: Math.round(badgeScore),
    gameScore: Math.round(gameScore),
    efficiency: gameProfile.efficiency,
    gameProfile,
    badgeProfile
  };
}

function scoutRoleTags(b, attrs, groupRows) {
  const tags = [];
  const arch = Object.keys(attrs).length && typeof detectArchetype === 'function' ? detectArchetype(b, attrs) : null;
  if (arch?.type) tags.push(arch.type);
  if (b.position) tags.push(b.position);
  if (groupRows[0]) tags.push(groupRows[0].label);
  if ((attrs.threePoint || 0) >= 85) tags.push(scoutCopy('射手威胁', 'Shooting threat'));
  if ((attrs.perimeterDefense || attrs.interiorDefense || 0) >= 85) tags.push(scoutCopy('防守价值', 'Defensive value'));
  return [...new Set(tags)].slice(0, 5);
}

function scoutPriorityPlan(b, attrs, badgeProfile) {
  const priorities = [];
  const near = typeof findNearMisses === 'function' ? findNearMisses(attrs).slice(0, 4) : [];
  near.forEach(item => priorities.push({
    title: `${scoutAttrLabel(item.attr)} +${item.gap}`,
    body: scoutCopy(`解锁或提升 ${item.en || item.label || '关键阈值'}`, `Unlock or improve ${item.en || item.label || 'a key threshold'}.`)
  }));
  scoutTopWeightedAttrs(attrs, b.position || 'SF', 4, true).forEach(item => {
    if (item.val < 70) priorities.push({
      title: scoutCopy(`修复 ${scoutAttrLabel(item.key)}`, `Patch ${scoutAttrLabel(item.key)}`),
      body: scoutCopy(`按位置加权后这是薄弱环节，当前值 ${item.val}`, `This is a role-weighted weak spot at ${item.val}.`)
    });
  });
  if (!badgeProfile.equipped.length) priorities.push({
    title: scoutCopy('配置徽章', 'Configure badges'),
    body: scoutCopy('手动设置徽章将改善报告质量和阵容规划', 'Manual badge setup will improve the report and build planning.')
  });
  return priorities.slice(0, 6);
}

function scoutGamePlan(b, attrs, scores, groupRows) {
  const top = groupRows[0]?.key || '';
  const plan = [];
  const OFF = scoutCopy('进攻', 'Offense');
  const DEF = scoutCopy('防守', 'Defense');
  if (top === 'shooting') plan.push({ h: OFF, b: scoutCopy('优先利用拉开空间、跑位接球的机会出手', 'Use early spacing, relocation, and clean catch-and-shoot windows.') });
  else if (top === 'finishing') plan.push({ h: OFF, b: scoutCopy('先施加篮下压力迫使协防，再传球给空位队友', 'Apply rim pressure first and force help before kicking out.') });
  else if (top === 'playmaking') plan.push({ h: OFF, b: scoutCopy('先制造内线接触和传球角度，再考虑自己出手', 'Create paint touches and passing angles before hunting your own shot.') });
  else if (top === 'defense') plan.push({ h: DEF, b: scoutCopy('承担最难的防守对位，将防守转化为反击机会', 'Take the hardest matchup and turn stops into transition chances.') });
  else plan.push({ h: OFF, b: scoutCopy('让最强属性组决定出手结构', 'Let the strongest attribute group decide the shot diet.') });

  if (Math.max(attrs.perimeterDefense || 0, attrs.interiorDefense || 0, attrs.block || 0) >= 80) {
    plan.push({ h: DEF, b: scoutCopy('积极发挥防守属性，但避免过多赌博性站位', 'Use defensive ratings aggressively, but avoid gamble-heavy rotations.') });
  } else {
    plan.push({ h: DEF, b: scoutCopy('保持站位，在防守属性提升前减少不必要的协防', 'Stay positional and reduce unnecessary help until defensive ratings improve.') });
  }

  if (scores.gameProfile.count) {
    const a = scores.gameProfile.agg;
    const tone = parseFloat(a.winPct) >= 55
      ? scoutCopy('比赛样本支持当前定位，扩大样本量以确认上限', 'The game sample supports this role; expand the sample to confirm ceiling.')
      : scoutCopy('胜率尚未完全体现属性价值，先优化出手结构和失误率', 'The win rate has not fully converted the attribute value yet; tune shot diet and turnovers first.');
    plan.push({ h: scoutCopy('样本解读', 'Sample Read'), b: tone });
  }
  return plan;
}

function renderScoutReport(buildId) {
  const b = state.builds.find(x => x.id === buildId);
  if (!b) return;

  const attrs = b.attrs || {};
  const games = state.games.filter(g => g.buildId === b.id);
  const hasAttrs = Object.keys(attrs).length > 0;
  const groupRows = hasAttrs ? scoutGroupAverages(attrs) : [];
  const scores = scoutBuildScores(b, attrs, games);
  const verdict = scoutScoreLabel(scores.score);
  const overall = hasAttrs ? getOverallGrade(attrs, b.position || 'SF') : { grade: verdict.grade, desc: scoutCopy('属性不足，报告主要基于比赛样本', 'Insufficient attributes; report is based mainly on game sample.') };
  const comps = hasAttrs ? getPlayerComp({ ...attrs, _position: b.position || '' }).slice(0, 3) : [];
  const roleTags = scoutRoleTags(b, attrs, groupRows);
  const priorities = hasAttrs ? scoutPriorityPlan(b, attrs, scores.badgeProfile) : [];
  const gamePlan = hasAttrs ? scoutGamePlan(b, attrs, scores, groupRows) : [];
  const strengths = hasAttrs ? scoutTopWeightedAttrs(attrs, b.position || 'SF', 5, false) : [];
  const weaknesses = hasAttrs ? scoutTopWeightedAttrs(attrs, b.position || 'SF', 4, true) : [];
  const highBadges = scores.badgeProfile.equipped.filter(item => ['legend', 'hof', 'gold'].includes(item.tier)).sort((a, b) => b.weight - a.weight).slice(0, 8);

  const groupCards = groupRows.map(row => `
    <div class="scout-grade-card">
      <div class="scout-grade-top"><span>${escapeHtml(row.label)}</span><strong>${row.avg}</strong></div>
      <div class="scout-grade-meter"><span style="width:${Math.max(0, Math.min(100, row.avg))}%;"></span></div>
    </div>
  `).join('');

  const modeRows = scores.gameProfile.modes.map(row => `
    <tr><td>${escapeHtml(row.mode)}</td><td>${row.games}</td><td>${row.agg.winPct}%</td><td>${row.agg.ppg}</td><td>${row.agg.rpg}</td><td>${row.agg.apg}</td><td>${row.agg.fgPct}%</td><td>${row.agg.fg3Pct}%</td><td>${row.agg.plusMinus}</td></tr>
  `).join('');

  const priorityHtml = priorities.length ? priorities.map((p, i) => `
    <div class="scout-priority"><div class="scout-priority-rank">${i + 1}</div><div><strong>${escapeHtml(p.title)}</strong><p>${escapeHtml(p.body)}</p></div></div>
  `).join('') : `<div class="scout-empty">${scoutCopy('未检测到紧急升级优先级', 'No urgent upgrade priorities detected.')}</div>`;

  const compHtml = comps.length ? comps.map((c, i) => `
    <div class="scout-comp" style="margin-bottom:8px;border-left:3px solid ${i === 0 ? 'var(--orange)' : i === 1 ? 'var(--yellow)' : 'var(--blue)'};">
      <div class="scout-comp-avatar">${escapeHtml((c.name || '?').charAt(0))}</div>
      <div class="scout-comp-info"><div class="scout-comp-name">${escapeHtml(c.name)} <span style="font-size:10px;color:var(--text-fade);font-weight:400;">${escapeHtml(c.position || '')} ${escapeHtml(String(c.era || ''))}</span></div><div class="scout-comp-desc">${escapeHtml(c.desc || '')}</div></div>
    </div>
  `).join('') : `<div class="scout-empty">${scoutCopy('添加属性以解锁球员参考', 'Add attributes to unlock player comparisons.')}</div>`;

  const planHtml = gamePlan.length ? gamePlan.map(item => `
    <div class="scout-bullet"><div class="scout-bullet-mark">+</div><div><strong>${escapeHtml(item.h)}:</strong> ${escapeHtml(item.b)}</div></div>
  `).join('') : `<div class="scout-empty">${scoutCopy('需要属性数据才能生成战术建议', 'Attributes are needed to generate a game plan.')}</div>`;

  const html = `
    <div class="scout-overlay" onclick="if(event.target===this)this.remove()">
      <div class="scout-report pro">
        <div class="scout-header">
          <div class="scout-header-top"><div class="scout-badge">${scoutCopy('职业球探报告', 'PRO SCOUT REPORT')}</div><button class="scout-close" onclick="this.closest('.scout-overlay').remove()">x</button></div>
          <div class="scout-player-name">${escapeHtml(b.name)}</div>
          <div class="scout-player-archetype">${escapeHtml(b.archetype || b.position || 'Untitled Build')}</div>
          <div class="scout-meta-row">
            <div class="scout-meta-item">POS <span>${escapeHtml(b.position || '-')}</span></div>
            ${b.position2 ? `<div class="scout-meta-item">ALT <span>${escapeHtml(b.position2)}</span></div>` : ''}
            <div class="scout-meta-item">OVR <span>${escapeHtml(b.ovr || '-')}</span></div>
            <div class="scout-meta-item">GAMES <span>${games.length}</span></div>
            ${b.takeover1 ? `<div class="scout-meta-item">TAKEOVER <span style="color:var(--orange);">${escapeHtml(b.takeover1)}</span></div>` : ''}
          </div>
          <div class="scout-hero-score">
            <div class="scout-score-ring" style="--score:${scores.score};"><div class="scout-score-value">${scores.score}</div></div>
            <div class="scout-score-meta"><div class="scout-verdict">${verdict.grade} / ${escapeHtml(verdict.text)}</div><div class="scout-verdict-sub">${escapeHtml(overall.desc || scoutCopy('综合评估结合了角色适配、属性、徽章和比赛样本', 'Evaluation blends role fit, attributes, badges, and game sample.'))}</div><div class="scout-chip-row">${roleTags.map((tag, i) => `<span class="scout-chip ${i === 0 ? 'hot' : ''}">${escapeHtml(tag)}</span>`).join('')}</div></div>
          </div>
        </div>
        <div class="scout-body">
          <div class="scout-main-col">
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('得分分解', 'Score Breakdown')}</div><div class="scout-kpi-grid"><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('角色综合', 'Role OVR')}</div><div class="scout-kpi-value">${scores.posScore || '-'}</div><div class="scout-kpi-sub">${scoutCopy('位置加权', 'position weighted')}</div></div><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('比赛影响力', 'Game Impact')}</div><div class="scout-kpi-value">${scores.gameProfile.count ? scores.gameScore : '-'}</div><div class="scout-kpi-sub">${scores.gameProfile.count ? `${scores.gameProfile.agg.winPct}% W / ${scores.gameProfile.agg.ppg} PPG` : scoutCopy('无样本', 'no sample')}</div></div><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('效率', 'Efficiency')}</div><div class="scout-kpi-value">${scores.gameProfile.count ? scores.efficiency : '-'}</div><div class="scout-kpi-sub">${scores.gameProfile.count ? `${scores.gameProfile.agg.fgPct}% FG / ${scores.gameProfile.agg.fg3Pct}% 3P` : scoutCopy('无样本', 'no sample')}</div></div><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('徽章价值', 'Badge Value')}</div><div class="scout-kpi-value">${scores.badgeProfile.equipped.length}</div><div class="scout-kpi-sub">${highBadges.length ? highBadges.map(x => x.tier.toUpperCase()).slice(0, 3).join(' / ') : scoutCopy('未设置', 'not set')}</div></div></div></div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('属性概览', 'Attribute Board')}</div>${hasAttrs ? `<div class="scout-grade-grid">${groupCards}</div>` : `<div class="scout-empty">${scoutCopy('暂无属性数据', 'No attribute data yet.')}</div>`}</div>
            <div class="scout-section scout-split"><div><div class="scout-section-title" style="color:var(--green);">${scoutCopy('可靠优势', 'Bankable Strengths')}</div><div class="scout-bullet-list">${strengths.map(item => `<div class="scout-bullet"><div class="scout-bullet-mark">+</div><div><strong>${escapeHtml(scoutAttrLabel(item.key))}</strong> ${item.val} / ${escapeHtml(getAttrGrade(item.val).label)}</div></div>`).join('') || `<div class="scout-empty">${scoutCopy('无属性样本', 'No attribute sample.')}</div>`}</div></div><div><div class="scout-section-title" style="color:var(--red);">${scoutCopy('风险标记', 'Risk Flags')}</div><div class="scout-bullet-list">${weaknesses.map(item => `<div class="scout-bullet"><div class="scout-bullet-mark">!</div><div><strong>${escapeHtml(scoutAttrLabel(item.key))}</strong> ${item.val} / ${escapeHtml(getAttrGrade(item.val).label)}</div></div>`).join('') || `<div class="scout-empty">${scoutCopy('无属性样本', 'No attribute sample.')}</div>`}</div></div></div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('模式分析', 'Mode Splits')}</div>${modeRows ? `<table class="scout-table"><thead><tr><th>${scoutCopy('模式', 'Mode')}</th><th>G</th><th>W%</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3P</th><th>+/-</th></tr></thead><tbody>${modeRows}</tbody></table>` : `<div class="scout-empty">${scoutCopy('记录比赛以按模式分析数据', 'Log games to split results by mode.')}</div>`}</div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('升级优先级', 'Upgrade Priorities')}</div><div class="scout-priority-list">${priorityHtml}</div></div>
          </div>
          <div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('体型数据', 'Physical Profile')}</div><div class="scout-physical"><div class="scout-phys-item"><div class="scout-phys-val">${escapeHtml(b.height || '-')}</div><div class="scout-phys-label">${scoutCopy('身高', 'Height')}</div></div><div class="scout-phys-item"><div class="scout-phys-val">${b.weight ? `${escapeHtml(b.weight)} ${scoutCopy('磅', 'lbs')}` : '-'}</div><div class="scout-phys-label">${scoutCopy('体重', 'Weight')}</div></div><div class="scout-phys-item"><div class="scout-phys-val">${escapeHtml(b.wingspan || '-')}</div><div class="scout-phys-label">${scoutCopy('臂展', 'Wingspan')}</div></div><div class="scout-phys-item"><div class="scout-phys-val">${escapeHtml(b.bodyType || '-')}</div><div class="scout-phys-label">${scoutCopy('体型', 'Body')}</div></div></div></div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('战术建议', 'Game Plan')}</div><div class="scout-bullet-list">${planHtml}</div></div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('徽章 / 动作', 'Badges / Animations')}</div><div class="scout-kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px;"><div class="scout-kpi"><div class="scout-kpi-label">HOF+</div><div class="scout-kpi-value">${(scores.badgeProfile.byTier.legend || 0) + (scores.badgeProfile.byTier.hof || 0)}</div></div><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('金徽章', 'Gold')}</div><div class="scout-kpi-value">${scores.badgeProfile.byTier.gold || 0}</div></div><div class="scout-kpi"><div class="scout-kpi-label">${scoutCopy('动作', 'Anim')}</div><div class="scout-kpi-value">${hasAttrs && typeof findMilestones === 'function' ? findMilestones(attrs).length : '-'}</div></div></div>${highBadges.length ? `<div class="scout-chip-row">${highBadges.map(item => `<span class="scout-chip hot">${escapeHtml(item.name)} / ${item.tier.toUpperCase()}</span>`).join('')}</div>` : `<div class="scout-empty">${scoutCopy('暂无高阶徽章', 'No high-tier badges yet.')}</div>`}</div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('参考球员', 'Player Comps')}</div>${compHtml}</div>
            <div class="scout-section"><div class="scout-section-title">${scoutCopy('球探总结', 'Scout Summary')}</div><div class="scout-notes">${hasAttrs ? generateScoutNotes(b, attrs).split('\n\n').slice(0, 5).map(escapeHtml).join('<br><br>') : scoutCopy('属性不足，请填写评分并使用比赛记录来校准报告', 'Insufficient attributes. Fill build ratings and use game logs to calibrate the report.')}</div></div>
          </div>
        </div>
        <div class="scout-toolbar"><button class="scout-print-btn" onclick="window.print()">${scoutCopy('打印 / 导出PDF', 'Print / Export PDF')}</button><button class="scout-print-btn" onclick="this.closest('.scout-overlay').remove()">${scoutCopy('关闭', 'Close')}</button></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

const PRO_SCOUT_TEMPLATE_LIBRARY = (window.NBA2K26_SCOUT_DATA && window.NBA2K26_SCOUT_DATA.PRO_SCOUT_TEMPLATE_LIBRARY) || [];

function getPlayerComp(attrs) {
  const userPos = String(attrs._position || 'SF').toUpperCase();
  const dims = Object.keys(ATTR_LABELS);
  const profile = {};
  dims.forEach(key => { profile[key] = scoutNum(attrs[key], 0); });

  const styleHints = [];
  if (profile.threePoint >= 85) styleHints.push('shooter');
  if (profile.midRange >= 86) styleHints.push('mid-range');
  if (profile.drivingDunk >= 85 || profile.drivingLayup >= 90) styleHints.push('slasher');
  if (profile.passAccuracy >= 85) styleHints.push('playmaker');
  if (profile.ballHandle >= 88) styleHints.push('ball-handler');
  if (profile.perimeterDefense >= 85 || profile.steal >= 85) styleHints.push('defender');
  if (profile.interiorDefense >= 85 || profile.block >= 85) styleHints.push('rim-protector');
  if (profile.offensiveRebound >= 85 || profile.defensiveRebound >= 85) styleHints.push('rebounder');
  if (profile.postControl >= 85) styleHints.push('post');
  if (profile.strength >= 88) styleHints.push('power');
  if (profile.speed >= 88 || profile.vertical >= 90) styleHints.push('athletic');

  const dimWeights = { closeShot:0.8, drivingLayup:1.05, drivingDunk:1.1, standingDunk:0.85, postControl:1, midRange:1.05, threePoint:1.2, freeThrow:0.45, passAccuracy:1.2, ballHandle:1.1, speedWithBall:0.95, interiorDefense:1.1, perimeterDefense:1.15, steal:0.9, block:1.05, offensiveRebound:0.8, defensiveRebound:0.9, speed:0.85, agility:0.8, strength:0.85, vertical:0.75 };
  const adjacent = { PG:['SG'], SG:['PG','SF'], SF:['SG','PF'], PF:['SF','C'], C:['PF'] };

  function vectorScore(template) {
    let dist = 0;
    let total = 0;
    let identityBonus = 0;
    dims.forEach(key => {
      const uv = profile[key] || 0;
      const tv = scoutNum(template.a?.[key], 55);
      if (uv <= 0) return;
      const w = dimWeights[key] || 1;
      dist += Math.abs(uv - tv) * w;
      total += w;
      if (uv >= 85 && tv >= 85) identityBonus += 1.2 * w;
      if (uv <= 60 && tv <= 60) identityBonus += 0.35 * w;
    });
    if (!total) return 0;
    return Math.max(0, 100 - dist / total) + Math.min(12, identityBonus);
  }

  function styleScore(template) {
    const set = new Set((template.s || []).map(item => String(item).toLowerCase()));
    return styleHints.reduce((sum, hint) => sum + (set.has(hint) ? 3.5 : 0), 0);
  }

  const ranked = PRO_SCOUT_TEMPLATE_LIBRARY.map(player => {
    const pos = String(player.p || '').toUpperCase();
    let posBonus = 0;
    if (pos === userPos) posBonus = 8;
    else if ((adjacent[userPos] || []).includes(pos)) posBonus = 3.5;
    const score = vectorScore(player) + styleScore(player) + posBonus;
    return { ...player, score };
  }).sort((a, b) => b.score - a.score);

  return ranked.slice(0, 5).map(player => {
    const style = (player.s || []).slice(0, 4).join(' / ');
    const sim = Math.max(1, Math.min(99, Math.round(player.score)));
    return { name: player.n, zhName: player.z, desc: `${style} | Template match ${sim}%`, score: sim, era: player.e, position: player.p };
  });
}
