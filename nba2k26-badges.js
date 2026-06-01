// NBA 2K26 badge catalog, tier requirements, and auto-unlock helpers.
// Kept global for compatibility with the existing classic-script app.
// 2K26 Badge catalog - verified from published NBA 2K26 badge requirements.
const BADGE_CATEGORIES = [
  { id: 'finishing', label: 'FINISHING / 终结', badges: [
    { id: 'posterizer', name: 'Posterizer', desc: 'Contact dunks and strong finishes / 隔扣与强力终结' },
    { id: 'physicalFinisher', name: 'Physical Finisher', desc: 'Finishing through contact / 对抗下完成终结' },
    { id: 'aerialWizard', name: 'Aerial Wizard', desc: 'Lobs, putbacks, and aerial finishes / 空接、补扣与空中终结' },
    { id: 'hookSpecialist', name: 'Hook Specialist', desc: 'Post hooks near the rim / 低位勾手能力' },
    { id: 'postPowerhouse', name: 'Post Powerhouse', desc: 'Power moves from the post / 背身强攻能力' },
    { id: 'layupMixmaster', name: 'Layup Mixmaster', desc: 'Creative layup packages / 多样化上篮变化' },
    { id: 'postUpPoet', name: 'Post-Up Poet', desc: 'Post footwork and scoring touch / 低位脚步与手感' },
    { id: 'riseUp', name: 'Rise Up', desc: 'Standing dunks in traffic / 人群中的原地扣篮' },
    { id: 'paintProdigy', name: 'Paint Prodigy', desc: 'Interior touch and paint scoring / 禁区手感与篮下得分' },
    { id: 'floatGame', name: 'Float Game', desc: 'Floaters and soft touch / 抛投与柔和手感' },
    { id: 'postFadePhenom', name: 'Post Fade Phenom', desc: 'Post fades and turnarounds / 背身后仰与转身跳投' },
  ]},
  { id: 'shooting', label: 'SHOOTING / 投篮', badges: [
    { id: 'setShotSpecialist', name: 'Set Shot Specialist', desc: 'Stationary jumpers and spot-ups / 定点跳投与接球投篮' },
    { id: 'limitlessRange', name: 'Limitless Range', desc: 'Deep three-point shooting / 超远三分投射' },
    { id: 'miniMarksman', name: 'Mini Marksman', desc: 'Shooting boost for smaller guards / 小个后卫投篮加成' },
    { id: 'shiftyShooter', name: 'Shifty Shooter', desc: 'Off-dribble and movement shooting / 运球后与移动投篮' },
    { id: 'deadeye', name: 'Deadeye', desc: 'Contested jumper resistance / 顶投抗干扰能力' },
  ]},
  { id: 'playmaking', label: 'PLAYMAKING / 组织', badges: [
    { id: 'ankleAssassin', name: 'Ankle Assassin', desc: 'Dribble moves that create separation / 运球晃动制造空间' },
    { id: 'lightningLaunch', name: 'Lightning Launch', desc: 'Quick first step with the ball / 持球快速启动' },
    { id: 'bailOut', name: 'Bail Out', desc: 'Passing out of bad shots or drives / 出手或突破中的救球传球' },
    { id: 'unpluckable', name: 'Unpluckable', desc: 'Ball security under pressure / 对抗压力下护球' },
    { id: 'versatileVisionary', name: 'Versatile Visionary', desc: 'Advanced passing reads / 高阶传球视野' },
    { id: 'strongHandle', name: 'Strong Handle', desc: 'Control through bumps and contact / 对抗中的控球稳定性' },
    { id: 'handlesForDays', name: 'Handles for Days', desc: 'Dribble stamina and combo control / 运球体力与连招控制' },
    { id: 'breakStarter', name: 'Break Starter', desc: 'Outlet passes after rebounds / 抢板后的快攻长传' },
    { id: 'dimer', name: 'Dimer', desc: 'Boosts teammates after passes / 传球后提升队友终结' },
  ]},
  { id: 'defense', label: 'DEFENSE / 防守', badges: [
    { id: 'challenger', name: 'Challenger', desc: 'Perimeter shot contests / 外线投篮干扰' },
    { id: 'onBallMenace', name: 'On-Ball Menace', desc: 'On-ball pressure defense / 持球人压迫防守' },
    { id: 'glove', name: 'Glove', desc: 'Steals and strip attempts / 抢断与掏球' },
    { id: 'pickDodger', name: 'Pick Dodger', desc: 'Navigating screens / 绕过掩护' },
    { id: 'interceptor', name: 'Interceptor', desc: 'Passing lane steals / 传球路线拦截' },
    { id: 'postLockdown', name: 'Post Lockdown', desc: 'Defending post scorers / 低位防守' },
    { id: 'immovableEnforcer', name: 'Immovable Enforcer', desc: 'Holding ground on defense / 防守端站稳位置' },
    { id: 'offBallPest', name: 'Off-Ball Pest', desc: 'Denying off-ball movement / 无球纠缠与干扰' },
    { id: 'paintPatroller', name: 'Paint Patroller', desc: 'Interior deterrence and contests / 禁区威慑与干扰' },
    { id: 'highFlyingDenier', name: 'High-Flying Denier', desc: 'Chase-downs and vertical blocks / 追帽与高点封盖' },
  ]},
  { id: 'rebGeneral', label: 'REBOUNDING / PHYSICAL / 篮板身体', badges: [
    { id: 'boxoutBeast', name: 'Boxout Beast', desc: 'Boxouts and rebounding position / 卡位与篮板位置' },
    { id: 'reboundChaser', name: 'Rebound Chaser', desc: 'Pursuing loose rebounds / 篮板追逐能力' },
    { id: 'pogoStick', name: 'Pogo Stick', desc: 'Repeated jumps and blocks / 连续起跳与封盖' },
    { id: 'brickWall', name: 'Brick Wall', desc: 'Screens and physical contact / 掩护质量与身体对抗' },
    { id: 'slipperyOffBall', name: 'Slippery Off-Ball', desc: 'Getting open without the ball / 无球摆脱跑位' },
  ]},
];

const TIERS = [
  { id: 'bronze', label: 'BR', cls: 'bronze' },
  { id: 'silver', label: 'SI', cls: 'silver' },
  { id: 'gold', label: 'GO', cls: 'gold' },
  { id: 'hof', label: 'HOF', cls: 'hof' },
  { id: 'legend', label: 'LEG', cls: 'legend' },
];

const TIER_ORDER = { bronze: 1, silver: 2, gold: 3, hof: 4, legend: 5 };
const TIER_KEYS_DESC = ['legend', 'hof', 'gold', 'silver', 'bronze'];

function reqAll(...items) { return { all: items }; }
function reqAny(...items) { return { any: items }; }
function req(k, val) { return { k, val }; }
function tierReq(bronze, silver, gold, hof, legend) { return { bronze, silver, gold, hof, legend }; }

// Badge requirements use real tier thresholds: every group in a tier must pass;
// within an any group, one listed attribute path is enough.
const BADGE_THRESHOLDS = {
  ankleAssassin: { height: "5'9-6'10", attrs: [{k:'ballHandle'}], tiers: tierReq([reqAll(req('ballHandle',75))], [reqAll(req('ballHandle',86))], [reqAll(req('ballHandle',93))], [reqAll(req('ballHandle',95))], [reqAll(req('ballHandle',98))]) },
  lightningLaunch: { height: "5'9-6'11", attrs: [{k:'speedWithBall'}], tiers: tierReq([reqAll(req('speedWithBall',68))], [reqAll(req('speedWithBall',75))], [reqAll(req('speedWithBall',86))], [reqAll(req('speedWithBall',91))], [reqAll(req('speedWithBall',94))]) },
  bailOut: { height: 'All', attrs: [{k:'passAccuracy'}], tiers: tierReq([reqAll(req('passAccuracy',85))], [reqAll(req('passAccuracy',91))], [reqAll(req('passAccuracy',94))], [reqAll(req('passAccuracy',96))], [reqAll(req('passAccuracy',99))]) },
  unpluckable: { height: 'All', attrs: [{k:'ballHandle'}, {k:'postControl'}], tiers: tierReq([reqAny(req('postControl',75), req('ballHandle',70))], [reqAny(req('postControl',86), req('ballHandle',80))], [reqAll(req('ballHandle',96))], [reqAll(req('ballHandle',96))], [reqAll(req('ballHandle',99))]) },
  versatileVisionary: { height: 'All', attrs: [{k:'passAccuracy'}], tiers: tierReq([reqAll(req('passAccuracy',70))], [reqAll(req('passAccuracy',76))], [reqAll(req('passAccuracy',84))], [reqAll(req('passAccuracy',95))], [reqAll(req('passAccuracy',99))]) },
  strongHandle: { height: "5'9-6'11", attrs: [{k:'ballHandle'}, {k:'strength'}], tiers: tierReq([reqAll(req('ballHandle',60), req('strength',60))], [reqAll(req('ballHandle',67), req('strength',65))], [reqAll(req('ballHandle',73), req('strength',73))], [reqAll(req('ballHandle',77), req('strength',84))], [reqAll(req('ballHandle',80), req('strength',93))]) },
  handlesForDays: { height: "5'9-7'0", attrs: [{k:'ballHandle'}], tiers: tierReq([reqAll(req('ballHandle',71))], [reqAll(req('ballHandle',81))], [reqAll(req('ballHandle',90))], [reqAll(req('ballHandle',94))], [reqAll(req('ballHandle',97))]) },
  breakStarter: { height: 'All', attrs: [{k:'passAccuracy'}], tiers: tierReq([reqAll(req('passAccuracy',65))], [reqAll(req('passAccuracy',75))], [reqAll(req('passAccuracy',87))], [reqAll(req('passAccuracy',93))], [reqAll(req('passAccuracy',98))]) },
  dimer: { height: 'All', attrs: [{k:'passAccuracy'}], tiers: tierReq([reqAll(req('passAccuracy',55))], [reqAll(req('passAccuracy',71))], [reqAll(req('passAccuracy',82))], [reqAll(req('passAccuracy',92))], [reqAll(req('passAccuracy',98))]) },

  setShotSpecialist: { height: 'All', attrs: [{k:'midRange'}, {k:'threePoint'}], tiers: tierReq([reqAny(req('midRange',65), req('threePoint',65))], [reqAny(req('midRange',78), req('threePoint',78))], [reqAny(req('midRange',89), req('threePoint',89))], [reqAny(req('midRange',93), req('threePoint',95))], [reqAny(req('midRange',98), req('threePoint',98))]) },
  limitlessRange: { height: 'All', attrs: [{k:'threePoint'}], tiers: tierReq([reqAll(req('threePoint',83))], [reqAll(req('threePoint',89))], [reqAll(req('threePoint',93))], [reqAll(req('threePoint',96))], [reqAll(req('threePoint',99))]) },
  miniMarksman: { height: "5'9-6'3", attrs: [{k:'midRange'}, {k:'threePoint'}], tiers: tierReq([reqAny(req('midRange',71), req('threePoint',71))], [reqAny(req('midRange',82), req('threePoint',82))], [reqAny(req('midRange',94), req('threePoint',94))], [reqAny(req('midRange',97), req('threePoint',99))], [reqAny(req('midRange',99), req('threePoint',99))]) },
  shiftyShooter: { height: "5'9-6'11", attrs: [{k:'midRange'}, {k:'threePoint'}], tiers: tierReq([reqAny(req('midRange',76), req('threePoint',76))], [reqAny(req('midRange',87), req('threePoint',87))], [reqAny(req('midRange',91), req('threePoint',91))], [reqAny(req('midRange',96), req('threePoint',99))], [reqAny(req('midRange',99), req('threePoint',99))]) },
  deadeye: { height: 'All', attrs: [{k:'midRange'}, {k:'threePoint'}], tiers: tierReq([reqAny(req('midRange',73), req('threePoint',73))], [reqAny(req('midRange',85), req('threePoint',85))], [reqAny(req('midRange',92), req('threePoint',92))], [reqAny(req('midRange',95), req('threePoint',99))], [reqAny(req('midRange',99), req('threePoint',99))]) },

  posterizer: { height: 'All', attrs: [{k:'drivingDunk'}, {k:'vertical'}], tiers: tierReq([reqAll(req('drivingDunk',73), req('vertical',65))], [reqAll(req('drivingDunk',87), req('vertical',75))], [reqAll(req('drivingDunk',93), req('vertical',80))], [reqAll(req('drivingDunk',96), req('vertical',85))], [reqAll(req('drivingDunk',99), req('vertical',90))]) },
  physicalFinisher: { height: 'All', attrs: [{k:'strength'}, {k:'drivingLayup'}], tiers: tierReq([reqAll(req('strength',60), req('drivingLayup',70))], [reqAll(req('strength',67), req('drivingLayup',80))], [reqAll(req('strength',75), req('drivingLayup',90))], [reqAll(req('strength',83), req('drivingLayup',96))], [reqAll(req('strength',97), req('drivingLayup',97))]) },
  aerialWizard: { height: 'All', attrs: [{k:'drivingDunk'}, {k:'standingDunk'}], tiers: tierReq([reqAny(req('drivingDunk',64), req('standingDunk',60))], [reqAny(req('drivingDunk',70), req('standingDunk',75))], [reqAny(req('drivingDunk',80), req('standingDunk',84))], [reqAny(req('drivingDunk',89), req('standingDunk',92))], [reqAny(req('drivingDunk',97), req('standingDunk',98))]) },
  hookSpecialist: { height: 'All', attrs: [{k:'closeShot'}, {k:'postControl'}], tiers: tierReq([reqAll(req('closeShot',60), req('postControl',61))], [reqAll(req('closeShot',75), req('postControl',65))], [reqAll(req('closeShot',87), req('postControl',80))], [reqAll(req('closeShot',94), req('postControl',90))], [reqAll(req('closeShot',99), req('postControl',97))]) },
  postPowerhouse: { height: "6'4-7'4", attrs: [{k:'postControl'}, {k:'strength'}], tiers: tierReq([reqAll(req('postControl',64), req('strength',70))], [reqAll(req('postControl',75), req('strength',79))], [reqAll(req('postControl',85), req('strength',86))], [reqAll(req('postControl',93), req('strength',95))], [reqAll(req('postControl',98), req('strength',96))]) },
  layupMixmaster: { height: "5'9-6'11", attrs: [{k:'drivingLayup'}], tiers: tierReq([reqAll(req('drivingLayup',75))], [reqAll(req('drivingLayup',85))], [reqAll(req('drivingLayup',93))], [reqAll(req('drivingLayup',97))], [reqAll(req('drivingLayup',99))]) },
  postUpPoet: { height: 'All', attrs: [{k:'postControl'}], tiers: tierReq([reqAll(req('postControl',67))], [reqAll(req('postControl',77))], [reqAll(req('postControl',87))], [reqAll(req('postControl',95))], [reqAll(req('postControl',99))]) },
  riseUp: { height: "6'6-7'4", attrs: [{k:'standingDunk'}, {k:'vertical'}], tiers: tierReq([reqAll(req('standingDunk',72), req('vertical',60))], [reqAll(req('standingDunk',81), req('vertical',62))], [reqAll(req('standingDunk',90), req('vertical',66))], [reqAll(req('standingDunk',95), req('vertical',69))], [reqAll(req('standingDunk',99), req('vertical',71))]) },
  paintProdigy: { height: 'All', attrs: [{k:'closeShot'}], tiers: tierReq([reqAll(req('closeShot',73))], [reqAll(req('closeShot',84))], [reqAll(req('closeShot',92))], [reqAll(req('closeShot',96))], [reqAll(req('closeShot',99))]) },
  floatGame: { height: 'All', attrs: [{k:'closeShot'}, {k:'drivingLayup'}], tiers: tierReq([reqAny(req('closeShot',68), req('drivingLayup',65))], [reqAny(req('closeShot',78), req('drivingLayup',78))], [reqAny(req('closeShot',86), req('drivingLayup',88))], [reqAny(req('closeShot',92), req('drivingLayup',95))], [reqAny(req('closeShot',99), req('drivingLayup',98))]) },
  postFadePhenom: { height: 'All', attrs: [{k:'postControl'}, {k:'midRange'}], tiers: tierReq([reqAll(req('postControl',60), req('midRange',61))], [reqAll(req('postControl',70), req('midRange',71))], [reqAll(req('postControl',79), req('midRange',80))], [reqAll(req('postControl',84), req('midRange',90))], [reqAll(req('postControl',90), req('midRange',96))]) },

  challenger: { height: "5'9-6'11", attrs: [{k:'perimeterDefense'}], tiers: tierReq([reqAll(req('perimeterDefense',71))], [reqAll(req('perimeterDefense',82))], [reqAll(req('perimeterDefense',92))], [reqAll(req('perimeterDefense',95))], [reqAll(req('perimeterDefense',99))]) },
  onBallMenace: { height: "5'9-6'9", attrs: [{k:'perimeterDefense'}, {k:'agility'}], tiers: tierReq([reqAll(req('perimeterDefense',74), req('agility',70))], [reqAll(req('perimeterDefense',79), req('agility',76))], [reqAll(req('perimeterDefense',91), req('agility',80))], [reqAll(req('perimeterDefense',96), req('agility',84))], [reqAll(req('perimeterDefense',99), req('agility',86))]) },
  glove: { height: "5'9-7'0", attrs: [{k:'steal'}], tiers: tierReq([reqAll(req('steal',67))], [reqAll(req('steal',79))], [reqAll(req('steal',91))], [reqAll(req('steal',96))], [reqAll(req('steal',99))]) },
  pickDodger: { height: "5'9-6'10", attrs: [{k:'perimeterDefense'}, {k:'agility'}], tiers: tierReq([reqAll(req('perimeterDefense',73), req('agility',71))], [reqAll(req('perimeterDefense',83), req('agility',75))], [reqAll(req('perimeterDefense',90), req('agility',79))], [reqAll(req('perimeterDefense',97), req('agility',85))], [reqAll(req('perimeterDefense',99), req('agility',92))]) },
  interceptor: { height: 'All', attrs: [{k:'steal'}], tiers: tierReq([reqAll(req('steal',60))], [reqAll(req('steal',73))], [reqAll(req('steal',85))], [reqAll(req('steal',94))], [reqAll(req('steal',98))]) },
  postLockdown: { height: "6'5-7'4", attrs: [{k:'interiorDefense'}, {k:'strength'}], tiers: tierReq([reqAll(req('interiorDefense',74), req('strength',70))], [reqAll(req('interiorDefense',82), req('strength',78))], [reqAll(req('interiorDefense',88), req('strength',84))], [reqAll(req('interiorDefense',93), req('strength',92))], [reqAll(req('interiorDefense',99), req('strength',97))]) },
  immovableEnforcer: { height: 'All', attrs: [{k:'perimeterDefense'}, {k:'strength'}], tiers: tierReq([reqAll(req('perimeterDefense',62), req('strength',71))], [reqAll(req('perimeterDefense',72), req('strength',82))], [reqAll(req('perimeterDefense',84), req('strength',85))], [reqAll(req('perimeterDefense',89), req('strength',91))], [reqAll(req('perimeterDefense',94), req('strength',92))]) },
  boxoutBeast: { height: "6'3-7'4", attrs: [{k:'defensiveRebound'}, {k:'offensiveRebound'}], tiers: tierReq([reqAny(req('defensiveRebound',55), req('offensiveRebound',55))], [reqAny(req('defensiveRebound',70), req('offensiveRebound',70))], [reqAny(req('defensiveRebound',85), req('offensiveRebound',85))], [reqAny(req('defensiveRebound',94), req('offensiveRebound',94))], [reqAny(req('defensiveRebound',98), req('offensiveRebound',98))]) },
  reboundChaser: { height: 'All', attrs: [{k:'defensiveRebound'}, {k:'offensiveRebound'}], tiers: tierReq([reqAny(req('defensiveRebound',60), req('offensiveRebound',60))], [reqAny(req('defensiveRebound',70), req('offensiveRebound',70))], [reqAny(req('defensiveRebound',82), req('offensiveRebound',82))], [reqAny(req('defensiveRebound',94), req('offensiveRebound',94))], [reqAny(req('defensiveRebound',98), req('offensiveRebound',98))]) },
  offBallPest: { height: 'All', attrs: [{k:'interiorDefense'}, {k:'perimeterDefense'}], tiers: tierReq([reqAny(req('interiorDefense',69), req('perimeterDefense',58))], [reqAny(req('interiorDefense',76), req('perimeterDefense',68))], [reqAny(req('interiorDefense',85), req('perimeterDefense',80))], [reqAny(req('interiorDefense',92), req('perimeterDefense',87))], [reqAny(req('interiorDefense',97), req('perimeterDefense',98))]) },
  paintPatroller: { height: "6'6-7'4", attrs: [{k:'interiorDefense'}, {k:'block'}], tiers: tierReq([reqAll(req('interiorDefense',60), req('block',74))], [reqAll(req('interiorDefense',70), req('block',84))], [reqAll(req('interiorDefense',84), req('block',93))], [reqAll(req('interiorDefense',94), req('block',97))], [reqAll(req('interiorDefense',99), req('block',99))]) },
  highFlyingDenier: { height: "6'3-7'4", attrs: [{k:'block'}, {k:'vertical'}], tiers: tierReq([reqAll(req('block',68), req('vertical',60))], [reqAll(req('block',78), req('vertical',74))], [reqAll(req('block',88), req('vertical',80))], [reqAll(req('block',92), req('vertical',88))], [reqAll(req('block',99), req('vertical',85))]) },
  pogoStick: { height: "6'4-7'4", attrs: [{k:'vertical'}], tiers: tierReq([reqAll(req('vertical',63))], [reqAll(req('vertical',70))], [reqAll(req('vertical',77))], [reqAll(req('vertical',83))], [reqAll(req('vertical',88))]) },
  brickWall: { height: "6'5-7'4", attrs: [{k:'strength'}], tiers: tierReq([reqAll(req('strength',72))], [reqAll(req('strength',83))], [reqAll(req('strength',91))], [reqAll(req('strength',95))], [reqAll(req('strength',99))]) },
  slipperyOffBall: { height: "5'9-6'9", attrs: [{k:'speed'}, {k:'agility'}], tiers: tierReq([reqAll(req('speed',57), req('agility',57))], [reqAll(req('speed',73), req('agility',65))], [reqAll(req('speed',85), req('agility',77))], [reqAll(req('speed',92), req('agility',88))], [reqAll(req('speed',99), req('agility',96))]) },
};

function getAttrValue(attrs, key) { return Number(attrs && attrs[key] != null ? attrs[key] : 0) || 0; }
function meetsReqItem(attrs, item) { return getAttrValue(attrs, item.k) >= item.val; }
function meetsReqGroup(attrs, group) {
  if (group.all) return group.all.every(item => meetsReqItem(attrs, item));
  if (group.any) return group.any.some(item => meetsReqItem(attrs, item));
  return false;
}
function meetsBadgeTier(attrs, tierGroups) { return (tierGroups || []).every(group => meetsReqGroup(attrs, group)); }
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
