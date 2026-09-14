// Build analysis constants and helper functions.
// Kept global for compatibility with the existing classic-script app.
// Attribute definitions and position weights come from the active game-year
// dataset (nba2k-gamedata.js), so a new 2K release is a data change here.
const GAME_DATA = window.NBA2K_GAMEDATA.active;

const ATTR_GROUPS = GAME_DATA.attrGroups;

const ATTR_LABELS = GAME_DATA.attrLabels;


// ====================== BUILD ANALYSIS ENGINE ======================
// Position-aware attribute weights for the OVR estimate, per game year.
const POSITION_WEIGHTS = GAME_DATA.positionWeights;

// Animation unlock thresholds for the active game year — what each number
// actually unlocks.
const ANIM_THRESHOLDS = GAME_DATA.animThresholds;

// Build archetype detection — what kind of build is this?
function detectArchetype(b, attrs) {
  const pos = b.position || 'SF';
  const three = attrs.threePoint || 0;
  const dunk = attrs.drivingDunk || 0;
  const stDunk = attrs.standingDunk || 0;
  const handle = attrs.ballHandle || 0;
  const pass = attrs.passAccuracy || 0;
  const perDef = attrs.perimeterDefense || 0;
  const intDef = attrs.interiorDefense || 0;
  const steal = attrs.steal || 0;
  const block = attrs.block || 0;
  const reb = Math.max(attrs.offensiveRebound||0, attrs.defensiveRebound||0);
  const str = attrs.strength || 0;
  const post = attrs.postControl || 0;
  const mid = attrs.midRange || 0;

  // Defensive builds
  if (perDef >= 90 && steal >= 85) return { type:'Lockdown Defender', zh:'锁防者', desc:'精英外线防守者，抢断能力顶级，是对手外线的噩梦' };
  if (perDef >= 85 && block >= 80) return { type:'Two-Way', zh:'双向球员', desc:'攻防兼备，外线防守强硬，同时具备护框能力' };
  if (intDef >= 85 && block >= 85 && reb >= 80) return { type:'Paint Beast', zh:'油漆区野兽', desc:'油漆区统治者，护框+篮板能力顶级，内线防守铁闸' };

  // Shooting builds
  if (three >= 93 && mid >= 85) return { type:'Shot Creator', zh:'投篮创造者', desc:'三威胁投篮精英，中远距离无解，投篮创造能力顶级' };
  if (three >= 89 && handle >= 85) return { type:'Scoring Machine', zh:'得分机器', desc:'外线得分能力爆炸，运球投三分是主要武器' };
  if (three >= 85 && (pos==='PF'||pos==='C') && stDunk >= 70) return { type:'Stretch Big', zh:'空间型内线', desc:'能投三分的内线球员，拉开空间能力出色' };

  // Finishing builds
  if (dunk >= 92 && str >= 80) return { type:'Slasher', zh:'突破手', desc:'暴力突破型球员，隔扣是主要得分手段，身体对抗强悍' };
  if (dunk >= 86 && handle >= 85) return { type:'Slashing Playmaker', zh:'突破型组织者', desc:'能突能传，突破分球能力出色，进攻节奏掌控者' };
  if (stDunk >= 85 && str >= 80 && (pos==='PF'||pos==='C')) return { type:'Interior Finisher', zh:'内线终结者', desc:'油漆区统治力极强，站扣+背身是主要武器' };

  // Playmaking builds
  if (handle >= 92 && pass >= 88) return { type:'Playmaker', zh:'组织核心', desc:'顶级组织者，传球视野开阔，能为队友创造大量机会' };
  if (handle >= 85 && pass >= 82 && three >= 75) return { type:'Offensive Threat', zh:'进攻威胁', desc:'三威胁俱佳，能投能突能传，进攻端全面' };

  // Post builds
  if (post >= 85 && str >= 80) return { type:'Post Scorer', zh:'背身得分手', desc:'低位技术精湛，背身单打是主要得分手段' };

  // Rebounding builds
  if (reb >= 90 && (intDef >= 75 || block >= 75)) return { type:'Glass Cleaner', zh:'篮板收割者', desc:'篮板能力顶级，二次进攻机会制造者' };

  // Balanced builds
  const avg = Object.values(attrs).reduce((s,v)=>s+v,0) / Object.keys(attrs).length;
  if (avg >= 80) return { type:'All-Around', zh:'全能型', desc:'属性分布均衡，没有明显短板，适应多种比赛场景' };

  return { type:'Hybrid', zh:'混合型', desc:'独特的属性组合，打法灵活多变' };
}

// Position-specific OVR calculation
function calcPositionOVR(attrs, position) {
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.SF;
  let totalWeight = 0, weightedSum = 0;
  for (const [attr, weight] of Object.entries(weights)) {
    if (attrs[attr] !== undefined && weight > 0) {
      weightedSum += attrs[attr] * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// Find unlocked animation milestones for a build
function findMilestones(attrs) {
  const milestones = [];
  for (const [attr, thresholds] of Object.entries(ANIM_THRESHOLDS)) {
    const val = attrs[attr] || 0;
    for (const t of thresholds) {
      if (val >= t.val) {
        milestones.push({ attr, val, ...t });
      }
    }
  }
  return milestones;
}

// Find missed thresholds — close to unlocking but not there yet
function findNearMisses(attrs) {
  const near = [];
  for (const [attr, thresholds] of Object.entries(ANIM_THRESHOLDS)) {
    const val = attrs[attr] || 0;
    for (const t of thresholds) {
      if (val >= t.val - 4 && val < t.val) {
        near.push({ attr, val, gap: t.val - val, ...t });
      }
    }
  }
  return near.sort((a,b) => a.gap - b.gap);
}
// ====================== END BUILD ANALYSIS ENGINE ======================
