// NBA 2K27 game-year dataset.
//
// INCOMPLETE ON PURPOSE. Every field below is either corroborated by the
// sources listed in meta.sources or explicitly marked provisional/null. A tier
// whose thresholds are not published is null, never a guessed number: a wrong
// badge threshold silently tells the user to build the wrong player, which is
// worse than showing nothing. Fill the gaps as 2K publishes them.
//
// confidence values used on badge entries:
//   'confirmed'   -- name and discipline both corroborated by a listed source.
//   'provisional' -- carried over from the 2K26 catalog because no source
//                    confirms it was cut. 2K removed six 2K26 badges without
//                    naming them, so some provisional entries are likely gone.
(function (window) {
  'use strict';

  const G = window.NBA2K_GAMEDATA;
  const { req, reqAll, reqAny, tierReq } = G.helpers;

  // Season 1 start is confirmed. The end date has not been published, so the
  // remaining ranges follow the six-week cadence 2K has used since 2K25 and are
  // flagged estimated so the UI can say so.
  const SEASON_WEEKS = 6;
  const seasons = [
    { n: 1, label: 'S1', name: 'Season 1', zh: '第1赛季', from: '2026-08-26', to: '2026-10-15', estimated: true },
  ];
  for (let n = 2; n <= 8; n++) {
    const prev = seasons[n - 2];
    const from = new Date(prev.to + 'T00:00:00Z');
    from.setUTCDate(from.getUTCDate() + 1);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + SEASON_WEEKS * 7 - 1);
    seasons.push({
      n,
      label: 'S' + n,
      name: 'Season ' + n,
      zh: '第' + n + '赛季',
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      estimated: true,
    });
  }

  G.register('2k27', {
    label: 'NBA 2K27',
    subtitle: ['NBA 2K27 // THE CITY ARCHIVE', 'NBA 2K27 // 城市档案'],

    meta: {
      complete: false,
      // 40 badges in 2K26, minus 6 removed, plus 19 new = 53.
      badgeCountOfficial: 53,
      // Bronze/Silver/Gold/HOF are attribute-gated. Legend is no longer earned
      // from attributes -- it comes from Synergy boosts and season progression,
      // so every legend tier below is null by design, not by omission.
      legendViaSynergy: true,
      badgeSlots: 20,
      seasonsVerified: 'season1StartOnly',
      attributesVerified: false,
      positionWeightsVerified: false,
      animThresholdsVerified: false,
      sources: [
        'https://newsroom.2k.com/news/nbar-2k27-season-1-tips-off-with-early-access-on-august-26',
        'https://timesaver.gg/blog/nba-2k27-new-badges-explained',
        'https://www.shacknews.com/article/150389/nba-2k27-all-badges',
        'https://www.nba2klab.com/badge-descriptions',
        'https://2kmyplayer.com/badges/2k27',
      ],
      notes: [
        'Badge disciplines are six in 2K27 (Rebounding and Physicals are separate catalogs); 2K26 merged them into one.',
        'Post Fade Phenom moved from Finishing (2K26) to Shooting (2K27).',
        '2K has not named the six badges removed from the 2K26 set, so entries marked provisional may no longer exist.',
        'Four confirmed new badges have no published discipline yet and are listed in meta.pendingBadges instead of a catalog group.',
        'Published HOF thresholds match 2K26 legend numbers (Posterizer HOF is 99 Driving Dunk / 90 Vertical), so the tier ladder appears compressed by one step.',
        '2K27 links some attributes: raising one can force related minimums up. The build form does not model this yet.',
        'Attributes, attribute groups, position weights, and animation unlock thresholds are carried over from 2K26 and are NOT verified against 2K27.',
      ],
      // Confirmed to exist in 2K27, discipline not yet published.
      pendingBadges: ['Ankle Braces', 'Possession Closer', 'Sync Snatcher', 'Breaker'],
    },

    // Carried over from 2K26 -- see meta.attributesVerified.
    attrGroups: {
      fin: { label: 'FINISHING', zhLabel: '终结', keys: ['closeShot','drivingLayup','drivingDunk','standingDunk','postControl'] },
      sho: { label: 'SHOOTING', zhLabel: '投篮', keys: ['midRange','threePoint','freeThrow'] },
      pla: { label: 'PLAYMAKING', zhLabel: '组织', keys: ['passAccuracy','ballHandle','speedWithBall'] },
      def: { label: 'DEFENSE', zhLabel: '防守', keys: ['interiorDefense','perimeterDefense','steal','block'] },
      reb: { label: 'REBOUNDING', zhLabel: '篮板', keys: ['offensiveRebound','defensiveRebound'] },
      phy: { label: 'PHYSICALS', zhLabel: '身体', keys: ['speed','agility','strength','vertical'] },
    },

    attrLabels: {
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
    },

    // Carried over from 2K26 -- see meta.positionWeightsVerified. The OVR
    // estimate stays directional until 2K27 weights are known.
    positionWeights: {
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
        speed:0.5, agility:0.3, strength:0.9, vertical:0.6
      },
    },

    badgeCategories: [
      { id: 'finishing', label: 'FINISHING / 终结', badges: [
        { id: 'posterizer', name: 'Posterizer', desc: 'Contact dunks and strong finishes / 隔扣与强力终结', confidence: 'confirmed' },
        { id: 'physicalFinisher', name: 'Physical Finisher', desc: 'Finishing through contact / 对抗下完成终结', confidence: 'confirmed' },
        { id: 'aerialWizard', name: 'Aerial Wizard', desc: 'Lobs, putbacks, and aerial finishes / 空接、补扣与空中终结', confidence: 'confirmed' },
        { id: 'hookSpecialist', name: 'Hook Specialist', desc: 'Post hooks near the rim / 低位勾手能力', confidence: 'confirmed' },
        { id: 'postPowerhouse', name: 'Post Powerhouse', desc: 'Power moves from the post / 背身强攻能力', confidence: 'confirmed' },
        { id: 'layupMixmaster', name: 'Layup Mixmaster', desc: 'Creative layup packages / 多样化上篮变化', confidence: 'confirmed' },
        { id: 'riseUp', name: 'Rise Up', desc: 'Standing dunks in traffic / 人群中的原地扣篮', confidence: 'confirmed' },
        { id: 'paintProdigy', name: 'Paint Prodigy', desc: 'Interior touch and paint scoring / 禁区手感与篮下得分', confidence: 'confirmed' },
        { id: 'floatGame', name: 'Float Game', desc: 'Floaters and soft touch / 抛投与柔和手感', confidence: 'confirmed' },
        { id: 'postSpinCatalyst', name: 'Post Spin Catalyst', desc: '', confidence: 'confirmed', isNew: true },
        { id: 'ghostStepper', name: 'Ghost Stepper', desc: '', confidence: 'confirmed', isNew: true },
      ]},
      { id: 'shooting', label: 'SHOOTING / 投篮', badges: [
        { id: 'limitlessRange', name: 'Limitless Range', desc: 'Deep three-point shooting / 超远三分投射', confidence: 'confirmed' },
        { id: 'miniMarksman', name: 'Mini Marksman', desc: 'Shooting boost for smaller guards / 小个后卫投篮加成', confidence: 'confirmed' },
        { id: 'deadeye', name: 'Deadeye', desc: 'Contested jumper resistance / 顶投抗干扰能力', confidence: 'confirmed' },
        // Moved out of the Finishing catalog in 2K27.
        { id: 'postFadePhenom', name: 'Post Fade Phenom', desc: 'Post fades and turnarounds / 背身后仰与转身跳投', confidence: 'confirmed' },
        { id: 'setAndFire', name: 'Set and Fire', desc: '', confidence: 'confirmed', isNew: true },
        { id: 'arcCadence', name: 'Arc Cadence', desc: '', confidence: 'confirmed', isNew: true },
        { id: 'staticMiddy', name: 'Static Middy', desc: '', confidence: 'confirmed', isNew: true },
        { id: 'smoothOperator', name: 'Smooth Operator', desc: '', confidence: 'confirmed', isNew: true },
        { id: 'quickTrigger', name: 'Quick Trigger', desc: '', confidence: 'confirmed', isNew: true },
      ]},
      { id: 'playmaking', label: 'PLAYMAKING / 组织', badges: [
        { id: 'ankleAssassin', name: 'Ankle Assassin', desc: 'Dribble moves that create separation / 运球晃动制造空间', confidence: 'confirmed' },
        { id: 'lightningLaunch', name: 'Lightning Launch', desc: 'Quick first step with the ball / 持球快速启动', confidence: 'confirmed' },
        { id: 'bailOut', name: 'Bail Out', desc: 'Passing out of bad shots or drives / 出手或突破中的救球传球', confidence: 'confirmed' },
        { id: 'unpluckable', name: 'Unpluckable', desc: 'Ball security under pressure / 对抗压力下护球', confidence: 'confirmed' },
        { id: 'versatileVisionary', name: 'Versatile Visionary', desc: 'Advanced passing reads / 高阶传球视野', confidence: 'confirmed' },
        { id: 'strongHandle', name: 'Strong Handle', desc: 'Control through bumps and contact / 对抗中的控球稳定性', confidence: 'confirmed' },
        { id: 'handlesForDays', name: 'Handles for Days', desc: 'Dribble stamina and combo control / 运球体力与连招控制', confidence: 'confirmed' },
        { id: 'breakStarter', name: 'Break Starter', desc: 'Outlet passes after rebounds / 抢板后的快攻长传', confidence: 'confirmed' },
        { id: 'dimer', name: 'Dimer', desc: 'Boosts teammates after passes / 传球后提升队友终结', confidence: 'confirmed' },
        { id: 'pace', name: 'Pace', desc: '', confidence: 'confirmed', isNew: true },
      ]},
      { id: 'defense', label: 'DEFENSE / 防守', badges: [
        { id: 'seatbelt', name: 'Seatbelt', desc: 'Bodies up the drive, pairing perimeter defense with agility / 贴身跟防突破，结合外防与敏捷', confidence: 'confirmed', isNew: true },
        { id: 'wallUp', name: 'Wall Up', desc: 'Hands-up contests in the paint / 禁区举手干扰', confidence: 'confirmed', isNew: true },
        { id: 'challenger', name: 'Challenger', desc: 'Perimeter shot contests / 外线投篮干扰', confidence: 'provisional' },
        { id: 'onBallMenace', name: 'On-Ball Menace', desc: 'On-ball pressure defense / 持球人压迫防守', confidence: 'provisional' },
        { id: 'glove', name: 'Glove', desc: 'Steals and strip attempts / 抢断与掏球', confidence: 'provisional' },
        { id: 'pickDodger', name: 'Pick Dodger', desc: 'Navigating screens / 绕过掩护', confidence: 'provisional' },
        { id: 'interceptor', name: 'Interceptor', desc: 'Passing lane steals / 传球路线拦截', confidence: 'provisional' },
        { id: 'postLockdown', name: 'Post Lockdown', desc: 'Defending post scorers / 低位防守', confidence: 'provisional' },
        { id: 'immovableEnforcer', name: 'Immovable Enforcer', desc: 'Holding ground on defense / 防守端站稳位置', confidence: 'provisional' },
        { id: 'offBallPest', name: 'Off-Ball Pest', desc: 'Denying off-ball movement / 无球纠缠与干扰', confidence: 'provisional' },
        { id: 'paintPatroller', name: 'Paint Patroller', desc: 'Interior deterrence and contests / 禁区威慑与干扰', confidence: 'provisional' },
        { id: 'highFlyingDenier', name: 'High-Flying Denier', desc: 'Chase-downs and vertical blocks / 追帽与高点封盖', confidence: 'provisional' },
      ]},
      { id: 'rebounding', label: 'REBOUNDING / 篮板', badges: [
        { id: 'crasher', name: 'Crasher', desc: 'Attacking the offensive glass / 冲抢前场篮板', confidence: 'confirmed', isNew: true },
        { id: 'boxoutBoss', name: 'Boxout Boss', desc: 'Improves boxouts when you initiate them / 主动卡位时提升卡位效果', confidence: 'confirmed', isNew: true },
        { id: 'workHorse', name: 'Work Horse', desc: 'Speed to loose balls and beating opponents to them / 争抢地板球的速度与抢先能力', confidence: 'confirmed', isNew: true },
        { id: 'boxoutBeast', name: 'Boxout Beast', desc: 'Boxouts and rebounding position / 卡位与篮板位置', confidence: 'provisional' },
        { id: 'reboundChaser', name: 'Rebound Chaser', desc: 'Pursuing loose rebounds / 篮板追逐能力', confidence: 'provisional' },
      ]},
      { id: 'physicals', label: 'PHYSICALS / 身体', badges: [
        { id: 'flash', name: 'Flash', desc: 'Faster off-ball movement in transition, on offense or defense / 转换中无球移动更快，攻防皆可', confidence: 'confirmed', isNew: true },
        { id: 'bruiser', name: 'Bruiser', desc: 'Physical contact drains the opponent\'s energy / 身体对抗消耗对手体力', confidence: 'confirmed', isNew: true },
        { id: 'pogoStick', name: 'Pogo Stick', desc: 'Repeated jumps and blocks / 连续起跳与封盖', confidence: 'provisional' },
        { id: 'brickWall', name: 'Brick Wall', desc: 'Screens and physical contact / 掩护质量与身体对抗', confidence: 'provisional' },
        { id: 'slipperyOffBall', name: 'Slippery Off-Ball', desc: 'Getting open without the ball / 无球摆脱跑位', confidence: 'provisional' },
      ]},
    ],

    tiers: [
      { id: 'bronze', label: 'BR', cls: 'bronze' },
      { id: 'silver', label: 'SI', cls: 'silver' },
      { id: 'gold', label: 'GO', cls: 'gold' },
      { id: 'hof', label: 'HOF', cls: 'hof' },
      // Earned through Synergy and season progression, not attributes.
      { id: 'legend', label: 'LEG', cls: 'legend', viaSynergy: true },
    ],

    // Only published 2K27 thresholds are filled in. null tiers mean "not
    // published yet" and never auto-unlock a badge.
    badgeThresholds: {
      posterizer: {
        height: null,
        attrs: [{k:'drivingDunk'}, {k:'vertical'}],
        tiers: tierReq(
          null,
          null,
          [reqAll(req('drivingDunk',93), req('vertical',80))],
          [reqAll(req('drivingDunk',99), req('vertical',90))],
          null,
        ),
      },
      limitlessRange: {
        height: null,
        attrs: [{k:'threePoint'}],
        tiers: tierReq(null, null, null, [reqAll(req('threePoint',99))], null),
      },
      quickTrigger: {
        height: null,
        attrs: [{k:'midRange'}, {k:'threePoint'}],
        tiers: tierReq(null, null, null, [reqAny(req('midRange',99), req('threePoint',99))], null),
      },
      wallUp: {
        height: null,
        attrs: [{k:'interiorDefense'}, {k:'strength'}],
        tiers: tierReq(null, null, null, [reqAll(req('interiorDefense',99), req('strength',92))], null),
      },
      seatbelt: {
        height: null,
        // Source names the attribute pair but publishes no tier numbers.
        attrs: [{k:'perimeterDefense'}, {k:'agility'}],
        tiers: tierReq(null, null, null, null, null),
      },
    },

    // Carried over from 2K26 and NOT verified against 2K27 -- see
    // meta.animThresholdsVerified.
    animThresholds: {
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
    },

    seasons,
  });
})(window);
