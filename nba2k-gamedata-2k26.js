// NBA 2K26 game-year dataset.
// Verified against the shipped NBA 2K26 build: 40 badges in five catalog
// groups, 21 attributes, and the eight official six-week seasons.
// This dataset is frozen -- 2K26 is a finished game. Do not edit it to describe
// a newer game; add a new nba2k-gamedata-<year>.js instead.
(function (window) {
  'use strict';

  const G = window.NBA2K_GAMEDATA;
  const { req, reqAll, reqAny, tierReq } = G.helpers;

  G.register('2k26', {
    label: 'NBA 2K26',
    subtitle: ['NBA 2K26 // THE CITY ARCHIVE', 'NBA 2K26 // 城市档案'],

    meta: {
      complete: true,
      badgeCountOfficial: 40,
      // Legend was attribute-gated in 2K26, so every tier has thresholds.
      legendViaSynergy: false,
      sources: ['https://nba.2k.com/2k26/seasons/'],
      notes: [],
    },

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

    // Position-aware attribute weights for the OVR estimate.
    // Based on 2K26 meta: each position values different attribute groups.
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
        speed:0.4, agility:0.4, strength:0.9, vertical:0.6
      }
    },

    badgeCategories: [
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
    ],

    tiers: [
      { id: 'bronze', label: 'BR', cls: 'bronze' },
      { id: 'silver', label: 'SI', cls: 'silver' },
      { id: 'gold', label: 'GO', cls: 'gold' },
      { id: 'hof', label: 'HOF', cls: 'hof' },
      { id: 'legend', label: 'LEG', cls: 'legend' },
    ],

    // Every group in a tier must pass; within an `any` group one listed
    // attribute path is enough.
    badgeThresholds: {
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
    },

    // Attribute values at which 2K26 unlocks animation packages.
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

    // Official NBA 2K26 season dates -- each season ran exactly six weeks.
    seasons: [
      { n: 1, label: 'S1', name: 'Season 1', zh: '第1赛季', from: '2025-09-05', to: '2025-10-16' },
      { n: 2, label: 'S2', name: 'Season 2', zh: '第2赛季', from: '2025-10-17', to: '2025-11-27' },
      { n: 3, label: 'S3', name: 'Season 3', zh: '第3赛季', from: '2025-11-28', to: '2026-01-08' },
      { n: 4, label: 'S4', name: 'Season 4', zh: '第4赛季', from: '2026-01-09', to: '2026-02-19' },
      { n: 5, label: 'S5', name: 'Season 5', zh: '第5赛季', from: '2026-02-20', to: '2026-04-02' },
      { n: 6, label: 'S6', name: 'Season 6', zh: '第6赛季', from: '2026-04-03', to: '2026-05-14' },
      { n: 7, label: 'S7', name: 'Season 7', zh: '第7赛季', from: '2026-05-15', to: '2026-06-25' },
      { n: 8, label: 'S8', name: 'Season 8', zh: '第8赛季', from: '2026-06-26', to: '2026-08-06' },
    ],
  });
})(window);
