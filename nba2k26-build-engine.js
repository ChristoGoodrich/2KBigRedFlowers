// NBA 2K26 build analysis constants and helper functions.
// Kept global for compatibility with the existing classic-script app.
// 2K26 Attribute definitions, grouped
const ATTR_GROUPS = {
  fin: { label: 'FINISHING', zhLabel: '终结', keys: ['closeShot','drivingLayup','drivingDunk','standingDunk','postControl'] },
  sho: { label: 'SHOOTING', zhLabel: '投篮', keys: ['midRange','threePoint','freeThrow'] },
  pla: { label: 'PLAYMAKING', zhLabel: '组织', keys: ['passAccuracy','ballHandle','speedWithBall'] },
  def: { label: 'DEFENSE', zhLabel: '防守', keys: ['interiorDefense','perimeterDefense','steal','block'] },
  reb: { label: 'REBOUNDING', zhLabel: '篮板', keys: ['offensiveRebound','defensiveRebound'] },
  phy: { label: 'PHYSICALS', zhLabel: '身体', keys: ['speed','agility','strength','vertical'] },
};

const ATTR_LABELS = {
  closeShot: ['Close Shot', '近距投篮'],
  drivingLayup: ['Driving Layup', '上篮'],
  drivingDunk: ['Driving Dunk', '移动扣篮'],
  standingDunk: ['Standing Dunk', '站立扣篮'],
  postControl: ['Post Control', '背身单打'],
  midRange: ['Mid-Range', '中距'],
  threePoint: ['Three-Point', '三分'],
  freeThrow: ['Free Throw', '罚球'],
  passAccuracy: ['Pass Accuracy', '传球准度'],
  ballHandle: ['Ball Handle', '控球'],
  speedWithBall: ['Speed With Ball', '带球速度'],
  interiorDefense: ['Interior Defense', '内防'],
  perimeterDefense: ['Perimeter Defense', '外防'],
  steal: ['Steal', '抢断'],
  block: ['Block', '盖帽'],
  offensiveRebound: ['Offensive Rebound', '前板'],
  defensiveRebound: ['Defensive Rebound', '后板'],
  speed: ['Speed', '速度'],
  agility: ['Agility', '敏捷'],
  strength: ['Strength', '力量'],
  vertical: ['Vertical', '弹跳'],
};



// ====================== 2K26 BUILD ANALYSIS ENGINE ======================
// Position-aware attribute weights for OVR calculation
// Based on 2K26 meta: each position values different attribute groups
const POSITION_WEIGHTS = {
  PG: {
    closeShot:0.3, drivingLayup:0.7, drivingDunk:0.5, standingDunk:0.1, postControl:0.2,
    midRange:0.8, threePoint:1.0, freeThrow:0.5,
    passAccuracy:0.9, ballHandle:1.0, speedWithBall:0.9,
    interiorDefense:0.2, perimeterDefense:0.7, steal:0.6, block:0.1,
    offensiveRebound:0.2, defensiveRebound:0.3,
    speed:0.8, agility:0.9, strength:0.3, vertical:0.4
  },
  SG: {
    closeShot:0.4, drivingLayup:0.7, drivingDunk:0.7, standingDunk:0.2, postControl:0.3,
    midRange:0.8, threePoint:0.9, freeThrow:0.5,
    passAccuracy:0.6, ballHandle:0.8, speedWithBall:0.7,
    interiorDefense:0.3, perimeterDefense:0.8, steal:0.6, block:0.2,
    offensiveRebound:0.3, defensiveRebound:0.4,
    speed:0.7, agility:0.8, strength:0.4, vertical:0.5
  },
  SF: {
    closeShot:0.5, drivingLayup:0.6, drivingDunk:0.7, standingDunk:0.4, postControl:0.4,
    midRange:0.7, threePoint:0.7, freeThrow:0.4,
    passAccuracy:0.5, ballHandle:0.6, speedWithBall:0.5,
    interiorDefense:0.5, perimeterDefense:0.7, steal:0.5, block:0.4,
    offensiveRebound:0.4, defensiveRebound:0.5,
    speed:0.6, agility:0.7, strength:0.6, vertical:0.5
  },
  PF: {
    closeShot:0.6, drivingLayup:0.5, drivingDunk:0.6, standingDunk:0.7, postControl:0.6,
    midRange:0.5, threePoint:0.5, freeThrow:0.4,
    passAccuracy:0.4, ballHandle:0.3, speedWithBall:0.3,
    interiorDefense:0.7, perimeterDefense:0.5, steal:0.4, block:0.7,
    offensiveRebound:0.6, defensiveRebound:0.7,
    speed:0.5, agility:0.5, strength:0.8, vertical:0.6
  },
  C: {
    closeShot:0.7, drivingLayup:0.3, drivingDunk:0.4, standingDunk:0.8, postControl:0.7,
    midRange:0.3, threePoint:0.3, freeThrow:0.3,
    passAccuracy:0.3, ballHandle:0.1, speedWithBall:0.1,
    interiorDefense:0.9, perimeterDefense:0.3, steal:0.3, block:0.9,
    offensiveRebound:0.7, defensiveRebound:0.9,
    speed:0.4, agility:0.4, strength:0.9, vertical:0.6
  }
};

// Key animation thresholds in 2K26 — what each number actually means
const ANIM_THRESHOLDS = {
  drivingDunk: [
    { val:84, label:'基础隔扣', en:'Basic Contact Dunks', tier:'bronze' },
    { val:86, label:'标准隔扣包', en:'Standard Contact Dunk Packages', tier:'silver' },
    { val:92, label:'精英隔扣', en:'Elite Contact Dunks', tier:'gold' },
    { val:93, label:'顶级隔扣包', en:'Best Dunk Packages', tier:'hof' },
  ],
  drivingLayup: [
    { val:80, label:'基础终结包', en:'Basic Layup Packages', tier:'bronze' },
    { val:85, label:'高级终结风格', en:'Advanced Layup Styles', tier:'silver' },
    { val:93, label:'精英终结包', en:'Elite Layup Packages', tier:'gold' },
  ],
  threePoint: [
    { val:73, label:'铜 Deadeye', en:'Bronze Deadeye', tier:'bronze' },
    { val:76, label:'稳定绿窗', en:'Consistent Green Window', tier:'bronze' },
    { val:83, label:'铜无限射程', en:'Bronze Limitless Range', tier:'silver' },
    { val:89, label:'银无限射程', en:'Silver Limitless Range', tier:'gold' },
    { val:93, label:'金无限射程', en:'Gold Limitless Range', tier:'hof' },
    { val:96, label:'名人堂无限射程', en:'HOF Limitless Range', tier:'legend' },
  ],
  ballHandle: [
    { val:75, label:'铜脚踝终结', en:'Bronze Ankle Assassin', tier:'bronze' },
    { val:85, label:'速度加成阈值', en:'Speed Boost Threshold', tier:'silver' },
    { val:92, label:'顶级运球动作', en:'Best Dribble Moves', tier:'gold' },
    { val:95, label:'HOF 脚踝终结', en:'HOF Ankle Assassin', tier:'hof' },
  ],
  speedWithBall: [
    { val:68, label:'铜闪电启动', en:'Bronze Lightning Launch', tier:'bronze' },
    { val:75, label:'银闪电启动', en:'Silver Lightning Launch', tier:'silver' },
    { val:86, label:'金闪电启动', en:'Gold Lightning Launch', tier:'gold' },
    { val:91, label:'HOF 闪电启动', en:'HOF Lightning Launch', tier:'hof' },
  ],
  standingDunk: [
    { val:60, label:'基础站扣', en:'Basic Standing Dunks', tier:'bronze' },
    { val:75, label:'银空接奇才', en:'Silver Aerial Wizard', tier:'silver' },
    { val:84, label:'金空接奇才', en:'Gold Aerial Wizard', tier:'gold' },
    { val:92, label:'HOF 空接奇才', en:'HOF Aerial Wizard', tier:'hof' },
  ],
  block: [
    { val:74, label:'基础追帽', en:'Basic Chase-Down Blocks', tier:'bronze' },
    { val:78, label:'有效护框', en:'Effective Rim Protection', tier:'silver' },
    { val:90, label:'精英追帽动画', en:'Elite Chase-Down Animations', tier:'gold' },
  ],
  steal: [
    { val:73, label:'铜拦截/手套', en:'Bronze Interceptor/Glove', tier:'bronze' },
    { val:79, label:'银拦截/手套', en:'Silver Interceptor/Glove', tier:'silver' },
    { val:85, label:'金拦截', en:'Gold Interceptor', tier:'gold' },
    { val:91, label:'HOF 拦截/手套', en:'HOF Interceptor/Glove', tier:'hof' },
  ],
  perimeterDefense: [
    { val:85, label:'竞技锁防门槛', en:'Competitive Lock Threshold', tier:'silver' },
    { val:92, label:'精英外线锁防', en:'Elite Perimeter Lockdown', tier:'gold' },
    { val:94, label:'顶级锁防建模', en:'Top-Tier Lock Build', tier:'hof' },
  ],
  interiorDefense: [
    { val:60, label:'基础油漆区防守', en:'Basic Paint Protection', tier:'bronze' },
    { val:70, label:'有效内线防守', en:'Effective vs Finishers', tier:'silver' },
    { val:85, label:'精英油漆区防守', en:'Elite Paint Protection', tier:'gold' },
  ],
  passAccuracy: [
    { val:55, label:'铜妙传手', en:'Bronze Dimer', tier:'bronze' },
    { val:71, label:'银妙传手', en:'Silver Dimer', tier:'silver' },
    { val:82, label:'金妙传手', en:'Gold Dimer', tier:'gold' },
    { val:92, label:'HOF 妙传手', en:'HOF Dimer', tier:'hof' },
  ],
  offensiveRebound: [
    { val:80, label:'竞技篮板门槛', en:'Competitive Rebound Threshold', tier:'silver' },
    { val:90, label:'精英篮板手', en:'Elite Rebounder', tier:'gold' },
  ],
  defensiveRebound: [
    { val:80, label:'竞技篮板门槛', en:'Competitive Rebound Threshold', tier:'silver' },
    { val:90, label:'精英篮板手', en:'Elite Rebounder', tier:'gold' },
  ],
  closeShot: [
    { val:80, label:'可靠近距离', en:'Reliable Close Shot', tier:'silver' },
    { val:90, label:'精英近距离', en:'Elite Close Shot', tier:'gold' },
  ],
  midRange: [
    { val:80, label:'可靠中投', en:'Reliable Mid-Range', tier:'silver' },
    { val:88, label:'精英中投', en:'Elite Mid-Range', tier:'gold' },
    { val:95, label:'顶级中投', en:'Elite Mid-Range', tier:'hof' },
  ],
  freeThrow: [
    { val:70, label:'Rec/Pro-Am 可靠', en:'Consistent in Rec', tier:'bronze' },
    { val:79, label:'稳定罚球', en:'Reliable Free Throw', tier:'silver' },
    { val:85, label:'非常稳定', en:'Very Consistent', tier:'gold' },
  ],
  strength: [
    { val:70, label:'背身基础', en:'Post Move Foundation', tier:'bronze' },
    { val:80, label:'强力对抗', en:'Strong Physical Play', tier:'silver' },
    { val:90, label:'统治级对抗', en:'Dominant Physical Play', tier:'gold' },
  ],
  vertical: [
    { val:70, label:'基础隔扣垂直要求', en:'Contact Dunk Vertical', tier:'bronze' },
    { val:80, label:'精英弹跳', en:'Elite Vertical', tier:'silver' },
  ],
  speed: [
    { val:80, label:'快速后卫', en:'Fast Guard', tier:'silver' },
    { val:90, label:'极速', en:'Elite Speed', tier:'gold' },
  ],
  agility: [
    { val:80, label:'灵活移动', en:'Agile Movement', tier:'silver' },
    { val:90, label:'顶级敏捷', en:'Elite Agility', tier:'gold' },
  ],
};

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
// ====================== END 2K26 BUILD ANALYSIS ENGINE ======================
