// NBA 2K26 player profile system.
// Full independent player pages with position/mode/grade breakdowns and achievement badges.
(function(window) {
  'use strict';

  const PLAYER_CORE = window.NBA2K26_PLAYER_PROFILE_CORE;
  if (!PLAYER_CORE) {
    throw new Error('nba2k26-player-profile-core.js must load before nba2k26-player-profiles.js');
  }
  const {
    GRADE_ORDER,
    GRADE_VAL,
    GRADE_COLOR,
    genId,
    norm,
    esc,
    f1,
    getLang,
    avatarColor,
    findByName,
    createProfile,
  } = PLAYER_CORE;

  /* ─────────────────────────────────────────────────────────────
     TINY HELPERS
  ───────────────────────────────────────────────────────────── */
  // Tiny helpers now live in NBA2K26_PLAYER_PROFILE_CORE.

  /* ─────────────────────────────────────────────────────────────
     GRADE SCALE
  ───────────────────────────────────────────────────────────── */
  // Grade scale constants now live in NBA2K26_PLAYER_PROFILE_CORE.

  /* ─────────────────────────────────────────────────────────────
     PROFILE CRUD
  ───────────────────────────────────────────────────────────── */
  // Profile CRUD helpers now live in NBA2K26_PLAYER_PROFILE_CORE.

  /* ─────────────────────────────────────────────────────────────
     CORE AGGREGATE
  ───────────────────────────────────────────────────────────── */
  function getStats(profile, allGames) {
    const aliases = new Set(profile.aliases.map(norm));
    const asTeammate = [], asOpponent = [];
    allGames.forEach(game => {
      const r = game.roster || {};
      (r.teammates || []).forEach(p => {
        if (p.name && aliases.has(norm(p.name))) asTeammate.push({ game, player: p });
      });
      (r.opponents || []).forEach(p => {
        if (p.name && aliases.has(norm(p.name))) asOpponent.push({ game, player: p });
      });
    });
    return { asTeammate, asOpponent };
  }

  function aggEntries(entries, options = {}) {
    if (!entries.length) return null;
    const resultForEntry = typeof options.resultForEntry === 'function'
      ? options.resultForEntry
      : entry => entry.game.result;
    const n   = entries.length;
    const sum = f => entries.reduce((s, e) => s + (Number(e.player[f]) || 0), 0);
    const wins = entries.filter(e => resultForEntry(e) === 'W').length;
    const fgm = sum('fgm'), fga = sum('fga');
    const fg3m = sum('fg3m'), fg3a = sum('fg3a');
    const ftm  = sum('ftm'),  fta  = sum('fta');
    const validGrades = entries.map(e => e.player.grade).filter(g => GRADE_VAL[g] !== undefined);
    const avgGradeIdx = validGrades.length
      ? Math.round(validGrades.reduce((s, g) => s + GRADE_VAL[g], 0) / validGrades.length)
      : null;
    return {
      n, wins, losses: n - wins,
      winPct: Math.round(wins / n * 100),
      ppg:  f1(sum('pts')  / n),
      rpg:  f1(sum('reb')  / n),
      apg:  f1(sum('ast')  / n),
      spg:  f1(sum('stl')  / n),
      bpg:  f1(sum('blk')  / n),
      topg: f1(sum('to')   / n),
      fgm, fga, fg3m, fg3a, ftm, fta,
      fgPct:  fga  ? Math.round(fgm  / fga  * 100) + '%' : '--',
      fg3Pct: fg3a ? Math.round(fg3m / fg3a * 100) + '%' : '--',
      ftPct:  fta  ? Math.round(ftm  / fta  * 100) + '%' : '--',
      dcGames: entries.filter(e => e.player.disconnected).length,
      aiGames: entries.filter(e => e.player.isAI).length,
      avgGrade: avgGradeIdx !== null ? GRADE_ORDER[avgGradeIdx] : '--',
    };
  }

  function getCareerHighs(entries) {
    if (!entries.length) return null;
    const max = field => entries.reduce((best, e) => Math.max(best, Number(e.player[field]) || 0), 0);
    const validGrades  = entries.map(e => e.player.grade).filter(g => GRADE_VAL[g] !== undefined);
    const bestGradeIdx = validGrades.length
      ? validGrades.reduce((best, g) => Math.max(best, GRADE_VAL[g]), 0)
      : null;
    return {
      pts:  max('pts'),
      reb:  max('reb'),
      ast:  max('ast'),
      stl:  max('stl'),
      blk:  max('blk'),
      to:   max('to'),
      fg3m: max('fg3m'),
      bestGrade: bestGradeIdx !== null ? GRADE_ORDER[bestGradeIdx] : null,
    };
  }

  function playerPerspectiveResult(entry) {
    if (!entry || !entry.game) return '';
    if (entry.side !== 'opp') return entry.game.result;
    if (entry.game.result === 'W') return 'L';
    if (entry.game.result === 'L') return 'W';
    return entry.game.result;
  }

  function uniqueRosterPlayers(game, side) {
    const roster = game && game.roster && Array.isArray(game.roster[side]) ? game.roster[side] : [];
    const seen = new Map();
    roster.forEach(player => {
      const name = String(player?.name || '').trim();
      if (!name) return;
      const key = norm(name);
      if (!seen.has(key)) seen.set(key, { ...player, name, key });
    });
    return [...seen.values()];
  }

  function buildPlayerRelationshipMap(profile, allGames) {
    const aliases = new Set((profile.aliases || []).map(norm));
    const num = value => Number(value) || 0;
    const subjectMatches = player => aliases.has(norm(player?.name));
    const rowsToRanked = (rows, type) => [...rows.values()].map(row => {
      const winPct = row.games ? Math.round(row.wins / row.games * 100) : 0;
      const plusMinus = row.games ? row.pm / row.games : 0;
      const ppg = row.games ? row.pts / row.games : 0;
      const apg = row.games ? row.ast / row.games : 0;
      const sample = Math.min(row.games, 8);
      const score = type === 'matchup'
        ? ((100 - winPct) * 0.8) + (ppg * 0.55) + (plusMinus * 3) + (sample * 3)
        : (winPct * 0.65) + (plusMinus * 3) + (ppg * 0.2) + (sample * 4);
      return { ...row, winPct, plusMinus, ppg, apg, score };
    }).sort((a, b) => b.score - a.score || b.games - a.games || b.winPct - a.winPct || a.name.localeCompare(b.name));

    const allies = new Map();
    const matchups = new Map();
    allGames.forEach(game => {
      const teammates = uniqueRosterPlayers(game, 'teammates');
      const opponents = uniqueRosterPlayers(game, 'opponents');
      const appearances = [
        ...teammates.filter(subjectMatches).map(player => ({
          game,
          player,
          side: 'tm',
          sameSide: teammates,
          oppositeSide: opponents,
          result: game.result,
        })),
        ...opponents.filter(subjectMatches).map(player => ({
          game,
          player,
          side: 'opp',
          sameSide: opponents,
          oppositeSide: teammates,
          result: playerPerspectiveResult({ game, player, side: 'opp' }),
        })),
      ];

      appearances.forEach(entry => {
        entry.sameSide.forEach(partner => {
          if (subjectMatches(partner)) return;
          const key = partner.key;
          const row = allies.get(key) || {
            name: partner.name,
            games: 0,
            wins: 0,
            pts: 0,
            ast: 0,
            pm: 0,
            asTeammate: 0,
            asOpponentSide: 0,
          };
          row.games += 1;
          if (entry.result === 'W') row.wins += 1;
          row.pts += num(partner.pts);
          row.ast += num(partner.ast);
          row.pm += (num(entry.player.pm) + num(partner.pm)) / 2;
          if (entry.side === 'tm') row.asTeammate += 1;
          else row.asOpponentSide += 1;
          allies.set(key, row);
        });

        entry.oppositeSide.forEach(opponent => {
          const key = opponent.key;
          const row = matchups.get(key) || {
            name: opponent.name,
            games: 0,
            wins: 0,
            pts: 0,
            ast: 0,
            pm: 0,
            fromTeammateGames: 0,
            fromOpponentGames: 0,
          };
          row.games += 1;
          if (entry.result === 'W') row.wins += 1;
          row.pts += num(opponent.pts);
          row.ast += num(opponent.ast);
          row.pm += num(opponent.pm);
          if (entry.side === 'tm') row.fromTeammateGames += 1;
          else row.fromOpponentGames += 1;
          matchups.set(key, row);
        });
      });
    });

    return {
      allies: rowsToRanked(allies, 'ally'),
      matchups: rowsToRanked(matchups, 'matchup'),
    };
  }

  /* ─────────────────────────────────────────────────────────────
     POSITION BREAKDOWN
  ───────────────────────────────────────────────────────────── */
  function getPositionStats(profile, allGames) {
    const aliases = new Set(profile.aliases.map(norm));
    const byPos = {};
    allGames.forEach(game => {
      const r = game.roster || {};
      [['teammates', 'tm'], ['opponents', 'opp']].forEach(([key, side]) => {
        (r[key] || []).forEach(p => {
          if (!p.name || !aliases.has(norm(p.name))) return;
          const pos = (p.position || '').trim() || '—';
          if (!byPos[pos]) byPos[pos] = [];
          byPos[pos].push({ game, player: p, side });
        });
      });
    });
    return Object.entries(byPos).map(([pos, entries]) => {
      const agg = aggEntries(entries, { resultForEntry: playerPerspectiveResult });
      return {
        pos, ...agg,
        asTm:  entries.filter(e => e.side === 'tm').length,
        asOpp: entries.filter(e => e.side === 'opp').length,
      };
    }).sort((a, b) => b.n - a.n);
  }

  /* ─────────────────────────────────────────────────────────────
     MODE BREAKDOWN
  ───────────────────────────────────────────────────────────── */
  function getModeStats(profile, allGames) {
    const aliases = new Set(profile.aliases.map(norm));
    const byMode = {};
    allGames.forEach(game => {
      const r = game.roster || {};
      [['teammates', 'tm'], ['opponents', 'opp']].forEach(([key, side]) => {
        (r[key] || []).forEach(p => {
          if (!p.name || !aliases.has(norm(p.name))) return;
          const m = game.mode || 'Unknown';
          if (!byMode[m]) byMode[m] = [];
          byMode[m].push({ game, player: p, side });
        });
      });
    });
    return Object.entries(byMode)
      .map(([mode, entries]) => ({ mode, ...aggEntries(entries, { resultForEntry: playerPerspectiveResult }) }))
      .sort((a, b) => b.n - a.n);
  }

  /* ─────────────────────────────────────────────────────────────
     GRADE DISTRIBUTION
  ───────────────────────────────────────────────────────────── */
  function getGradeDistribution(entries) {
    const dist = {};
    GRADE_ORDER.forEach(g => { dist[g] = 0; });
    entries.forEach(e => {
      const g = e.player ? e.player.grade : e.grade;
      if (g && dist[g] !== undefined) dist[g]++;
    });
    return dist;
  }

  /* ─────────────────────────────────────────────────────────────
     RECENT FORM (last N appearances)
  ───────────────────────────────────────────────────────────── */
  function getRecentForm(profile, allGames, n) {
    n = n || 8;
    const aliases = new Set(profile.aliases.map(norm));
    const entries = [];
    const sorted  = [...allGames].sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);
    for (const game of sorted) {
      if (entries.length >= n) break;
      const r = game.roster || {};
      let hit = null;
      for (const p of (r.teammates || [])) {
        if (p.name && aliases.has(norm(p.name))) { hit = { game, player: p, side: 'tm' }; break; }
      }
      if (!hit) for (const p of (r.opponents || [])) {
        if (p.name && aliases.has(norm(p.name))) { hit = { game, player: p, side: 'opp' }; break; }
      }
      if (hit) entries.push(hit);
    }
    return entries;
  }

  /* ─────────────────────────────────────────────────────────────
     BADGE TOOLTIP DESCRIPTIONS
  ───────────────────────────────────────────────────────────── */
  const BADGE_DESCS = {
    // ── Volume ──
    'Hall of Fame':     { en: '150+ total appearances — hall of fame status',         zh: '出场150次以上的殿堂级传奇' },
    'Legend':           { en: '100+ total appearances',                               zh: '出场100次以上，资历深厚' },
    'Veteran':          { en: '50+ total appearances',                                zh: '出场50次以上的经验老将' },
    'Regular':          { en: '20+ total appearances',                                zh: '出场20次以上的熟面孔' },
    'Familiar Face':    { en: '10+ total appearances — becoming familiar',            zh: '出场10次以上，开始熟悉' },
    'Newcomer':         { en: '3 or fewer appearances — just getting started',        zh: '出场仅3次以内的新人' },
    // ── Chemistry & Rivalry (teammate) ──
    'Win Magnet':       { en: '80%+ teammate win rate over 20+ games',               zh: '队友局20场以上，胜率高达80%+' },
    'Dream Partner':    { en: '80%+ teammate win rate over 10+ games',               zh: '队友局10场以上，胜率高达80%+' },
    'Great Ally':       { en: '65%+ teammate win rate over 5+ games',                zh: '队友局5场以上，胜率超过65%' },
    'Solid Teammate':   { en: '50–65% teammate win rate over 8+ games',              zh: '队友局8场以上，胜率稳定在50-65%' },
    'Bad Chemistry':    { en: '≤35% teammate win rate over 5+ games',                zh: '队友局5场以上，胜率不足35%' },
    'Cursed Duo':       { en: '≤25% teammate win rate over 10+ games — a curse',     zh: '队友局10场以上，胜率低于25%的魔咒组合' },
    'Low Usage MVP':    { en: '<10 PPG but team wins 70%+ — the invisible force',    zh: '场均不足10分，却带来70%+队友胜率的隐形英雄' },
    'Stat Padder':      { en: '20+ PPG but team wins ≤40% — selfish scorer',         zh: '场均20分以上，但队友局胜率仅40%以下的数据刷子' },
    // ── Chemistry & Rivalry (opponent) ──
    'Unstoppable':      { en: 'We win ≤15% facing them — almost unbeatable',         zh: '作为对手时，我方胜率仅15%以下，几乎无法战胜' },
    'Our Nemesis':      { en: 'We win ≤25% facing them as opponent',                 zh: '作为对手时，我方胜率仅25%以下的天敌克星' },
    'Tough Rival':      { en: 'We win ≤35% facing them as opponent',                 zh: '作为对手时，我方胜率仅35%以下的强劲对手' },
    'Free Win':         { en: 'We win 90%+ facing them — free points',               zh: '作为对手时，我方胜率高达90%以上的送分童子' },
    'Punching Bag':     { en: 'We win 85%+ facing them as opponent',                 zh: '作为对手时，我方胜率高达85%以上' },
    'Easy Match':       { en: 'We win 70%+ facing them as opponent',                 zh: '作为对手时，我方胜率高达70%以上的软柿子' },
    'Arch Rival':       { en: 'Even matchup over 10+ opponent games (40–60% win rate)', zh: '10场以上胜负各半，针锋相对的老对手' },
    // ── Both sides ──
    'Frenemies':        { en: '5+ games as both teammate and opponent',              zh: '作为队友和对手各出场5次以上，亦敌亦友' },
    'Split History':    { en: '3+ games on both sides of the court',                 zh: '曾以队友和对手身份各出场3次以上' },
    // ── 3-point shooting ──
    'Sniper':           { en: '45%+ 3P% on 30+ attempts — elite long-range threat',  zh: '三分出手30次以上，命中率45%以上的神枪手' },
    'Sharpshooter':     { en: '40%+ 3P% on 15+ attempts',                            zh: '三分出手15次以上，命中率40%以上的神射手' },
    '3P Threat':        { en: '35–40% 3P% on 15+ attempts — respectable range',      zh: '三分命中率35-40%，具备一定的三分威胁' },
    '3P Rusher':        { en: '<28% 3P% on 15+ attempts — keep it inside',           zh: '三分出手15次以上，命中率不足28%，建议减少出手' },
    // ── FG% shooting ──
    'Can\'t Miss':      { en: '60%+ FG% on 30+ attempts — elite efficiency',         zh: '整体命中率高达60%以上，近乎完美的高效' },
    'Surgical':         { en: '55%+ FG% on 30+ attempts',                            zh: '整体命中率55%以上，精准如外科手术' },
    'Efficient':        { en: '48%+ FG% on 30+ attempts',                            zh: '整体命中率48%以上的高效射手' },
    'Brick Layer':      { en: '<35% FG% on 30+ attempts — shots not falling',        zh: '整体命中率不足35%，频繁贡献铁砖' },
    'Iron Brick':       { en: '<28% FG% — bricks for days',                          zh: '整体命中率低于28%，严重低效' },
    // ── Free throws ──
    'Perfect FT':       { en: '95%+ FT% on 20+ attempts — flawless',                 zh: '罚球出手20次以上，命中率高达95%，近乎完美' },
    'FT Machine':       { en: '90%+ FT% on 20+ attempts',                            zh: '罚球出手20次以上，命中率90%以上的罚球机器' },
    'FT Specialist':    { en: '82%+ FT% on 20+ attempts',                            zh: '罚球命中率82%以上的罚球专家' },
    'FT Nightmare':     { en: '<50% FT% — bonus points for the other team',          zh: '罚球命中率不足50%，对方的额外福利' },
    'FT Struggle':      { en: '<65% FT% on 20+ attempts — a notable weakness',       zh: '罚球命中率不足65%，罚球是明显软肋' },
    // ── Shot volume ──
    'Chucker':          { en: '20+ FGA/game but <38% FG% — shoot less, shoot better', zh: '场均出手20次以上，但命中率不足38%的出手狂' },
    'Volume Shooter':   { en: '18+ FGA/game with sub-42% efficiency',                zh: '场均出手18次以上，效率偏低的投篮疯子' },
    'Shot Hunter':      { en: '15+ FGA/game — never afraid to fire',                 zh: '场均出手15次以上，从不畏惧出手的大户' },
    // ── Scoring volume ──
    'God Mode':         { en: '35+ PPG — other-worldly scoring output',              zh: '场均35分以上，超凡入圣的得分能力' },
    'Scoring Machine':  { en: '30+ PPG as teammate',                                 zh: '场均30分以上的得分机器' },
    'Bucket Getter':    { en: '25+ PPG with 50%+ FG% — scoring efficiently',         zh: '场均25分以上且命中率50%+的高效猎手' },
    'Go-To Scorer':     { en: '20+ PPG as teammate — the primary option',            zh: '场均20分以上，团队主要得分点' },
    'Secondary Option': { en: '15+ PPG as teammate',                                 zh: '场均15分以上的第二得分选项' },
    'Role Player':      { en: '<8 PPG over 8+ games — small but important role',     zh: '8场以上场均不足8分的角色型球员' },
    'Microwave':        { en: '18+ PPG but <2 APG — pure scorer, no vision',         zh: '场均18分以上但助攻不足2次，纯得分型微波炉' },
    'Clutch Player':    { en: '20+ PPG with 65%+ teammate win rate over 8+ games',   zh: '场均20分以上且队友局胜率65%+的关键先生' },
    // ── Defense (combined) ──
    'Defensive God':    { en: '5+ combined STL+BLK per game — elite on-ball defense', zh: '场均抢断+封盖合计5次以上的防守神人' },
    'Lockdown':         { en: '4+ combined STL+BLK per game',                        zh: '场均抢断+封盖合计4次以上的铁闸' },
    'Disruptor':        { en: '2.5+ combined STL+BLK per game',                      zh: '场均抢断+封盖合计2.5次以上的防守干扰者' },
    'Pest':             { en: '1.5+ combined STL+BLK — always in the passing lanes', zh: '场均抢断+封盖合计1.5次以上的小烦恼' },
    // ── Blocks ──
    'Swat King':        { en: '4+ BPG — nothing gets through',                       zh: '场均封盖4次以上，禁区无人可过' },
    'Shot Blocker':     { en: '3+ BPG',                                              zh: '场均封盖3次以上的封盖之王' },
    'Rim Deterrent':    { en: '1.5+ BPG — makes attackers think twice',              zh: '场均封盖1.5次以上，让对手不敢轻易入禁区' },
    // ── Steals ──
    'Pickpocket Pro':   { en: '3+ SPG — elite ball hawk',                            zh: '场均抢断3次以上的顶级抢断大师' },
    'Ball Hawk':        { en: '2+ SPG',                                              zh: '场均抢断2次以上的抢断王' },
    'Pickpocket':       { en: '1.3+ SPG — active hands on defense',                  zh: '场均抢断1.3次以上，防守端积极出手' },
    // ── Rebounds ──
    'Rebound God':      { en: '15+ RPG — the boards belong to them',                zh: '场均篮板15次以上，篮板归属此人' },
    'Board Dominator':  { en: '12+ RPG',                                             zh: '场均篮板12次以上的篮板霸主' },
    'Glass Eater':      { en: '8+ RPG',                                              zh: '场均篮板8次以上的篮板机器' },
    'Board Crasher':    { en: '5+ RPG — always crashing the glass',                  zh: '场均篮板5次以上，积极冲抢篮板' },
    // ── Interior combos ──
    'Rim Guardian':     { en: '2+ BPG and 7+ RPG — interior dominance',              zh: '场均封盖2次以上且篮板7次以上的禁区守护者' },
    'Post Monster':     { en: '10+ RPG, 2.5+ BPG, and 15+ PPG — dominant big',      zh: '场均10板+2.5帽+15分的低位全能内线巨兽' },
    // ── Playmaking (assists) ──
    'Pass God':         { en: '12+ APG — dimes on demand',                           zh: '场均助攻12次以上的传球之神' },
    'Floor General':    { en: '8+ APG — runs the offense',                           zh: '场均助攻8次以上，掌控全队进攻' },
    'Playmaker':        { en: '5+ APG',                                              zh: '场均助攻5次以上的核心组织者' },
    'Pass First':       { en: '3+ APG — always looking to set up teammates',         zh: '场均助攻3次以上，以传球为优先' },
    // ── Assist efficiency ──
    'Traffic Director': { en: '5+ APG with 5:1+ assist-to-turnover ratio',           zh: '场均5助且助失比高达5:1的精准传球指挥' },
    'Elite Distributor':{ en: '5+ APG with 3.5:1+ assist-to-turnover ratio',         zh: '场均5助且助失比3.5:1的传球精英' },
    'Clean Handler':    { en: '3+ APG with 4:1+ ast/to — ball security matters',     zh: '场均3助且助失比4:1+，控球干净稳健' },
    // ── Combo scoring+playmaking ──
    'Point God':        { en: '20+ PPG and 8+ APG — the complete guard package',     zh: '场均20分8助的顶级控卫风范' },
    'Scorer-Passer':    { en: '15+ PPG and 6+ APG',                                  zh: '场均15分6助的得分+组织双优型' },
    // ── Turnovers ──
    'TO Machine':       { en: '5+ TOPG — costly mistakes every game',                zh: '场均失误5次以上，代价高昂的失误机器' },
    'Turnover Prone':   { en: '3.5+ TOPG',                                           zh: '场均失误3.5次以上的失误大王' },
    'Careless':         { en: '2.5+ TOPG — too loose with the ball',                 zh: '场均失误2.5次以上，控球粗心大意' },
    // ── All-around ──
    'Triple Threat':    { en: '20+ PPG, 10+ RPG, and 8+ APG — true all-rounder',    zh: '场均20分10板8助的三项全能球员' },
    'Stat Stuffer':     { en: '15+ PPG, 7+ RPG, and 5+ APG',                        zh: '场均15分7板5助，各项数据全面' },
    'Well Rounded':     { en: '10+ PPG, 5+ RPG, and 4+ APG',                        zh: '场均10分5板4助的全面型球员' },
    'Double-Double':    { en: '10+ PPG and 10+ RPG average — consistent DD',         zh: '场均得分与篮板均超10次的双双常客' },
    'Dimes & Buckets':  { en: '10+ PPG and 10+ APG average',                        zh: '场均得分与助攻均超10次的分助双双' },
    'Two-Way Monster':  { en: '2+ STL, 2+ BLK, 7+ RPG — elite two-way force',       zh: '场均2抢断+2封盖+7篮板的顶级双向球员' },
    'Two-Way Beast':    { en: '1.5+ STL, 1.5+ BLK, and 5+ RPG',                     zh: '场均1.5抢断+1.5封盖+5篮板的攻守兼备型' },
    'Point Guard DNA':  { en: '10+ PPG, 6+ APG, 1.5+ SPG, <4 RPG — pure guard',    zh: '高分高助高抢断，篮板少于4次的标准控卫基因' },
    'Big Man Energy':   { en: '8+ RPG, 1.5+ BPG, <12 PPG — traditional big',        zh: '高篮板高封盖、得分不高的传统内线气质' },
    'Swiss Knife':      { en: 'Contributes across all 5 stat categories',            zh: '五项数据均有贡献的万能型球员' },
    'Sixth Man':        { en: '10–18 PPG with solid support stats over 15+ games',   zh: '15场以上场均10-18分并提供稳定辅助的重要替补' },
    'Glue Guy':         { en: 'Modest stats but 60%+ teammate win rate — the glue',  zh: '数据平凡却让团队胜率60%+的团队粘合剂' },
    // ── Reliability ──
    'Always There':     { en: '30+ games with zero disconnects and zero AI',         zh: '30场以上，从未掉线、从未AI的完美出勤记录' },
    'Perfect Record':   { en: '20+ games with zero disconnects and zero AI',         zh: '20场以上，零掉线、零AI的全勤模范' },
    'Iron Man':         { en: '10+ games with zero disconnects',                     zh: '10场以上从未掉线的铁人' },
    'DC Champion':      { en: 'Disconnected in 50%+ of appearances',                 zh: '超过50%的对局中发生掉线的掉线冠军' },
    'Serial DC':        { en: 'Disconnected in 40%+ of appearances',                 zh: '40%以上对局中掉线的掉线惯犯' },
    'DC Prone':         { en: 'Disconnected in 30%+ of appearances',                 zh: '30%以上对局中掉线的不稳定玩家' },
    'Ghost Player':     { en: 'Appears as AI in 60%+ of games',                     zh: '60%以上出场为AI模式，几乎是幽灵般的存在' },
    'AI Magnet':        { en: '5+ AI appearances on record',                         zh: '已有5次以上AI模式出场记录' },
    'AI Regular':       { en: '3+ AI appearances on record',                         zh: '已有3次以上AI模式出场记录' },
    // ── Grade / Consistency ──
    'Valedictorian':    { en: 'A+ average grade across 10+ graded games',            zh: '10场以上，场均成绩A+的状元级球员' },
    'A-Lister':         { en: 'A or better average grade',                           zh: '场均成绩在A以上的优秀球员' },
    'Class Act':        { en: 'A- or better average grade',                          zh: '场均成绩在A-以上的优等生' },
    'Underachiever':    { en: 'D or worse average grade',                            zh: '场均成绩在D以下的差等生' },
    'Low Output':       { en: 'C or worse average grade',                            zh: '场均成绩在C以下的低产出球员' },
    'Metronome':        { en: 'Extremely consistent grades (variance ≤0.5) — clockwork', zh: '8场以上成绩方差极低≤0.5，如节拍器般稳定' },
    'Consistent':       { en: 'Solid grade consistency (variance ≤1.5) over 8+ games', zh: '8场以上成绩波动小，稳定可靠' },
    'Wild Card':        { en: 'Wildly inconsistent grades (variance ≥10) — feast or famine', zh: '成绩方差高达10以上，极度不可预测' },
    'Unpredictable':    { en: 'High grade variance (≥6) — hard to know what you get', zh: '成绩波动较大，方差6以上，难以预测' },
    'Glow Up':          { en: 'Grade improved 4+ levels from early to recent games', zh: '后期比前期成绩提升4个等级以上的巨大逆袭' },
    'Comeback Player':  { en: 'Grade improved 2.5+ levels from early to recent games', zh: '后期成绩比前期提升2.5个等级以上的逆袭者' },
    'Fallen Star':      { en: 'Grade dropped 4+ levels from early to recent games',  zh: '后期成绩比前期下降4个等级以上，跌落神坛' },
    'Declining':        { en: 'Grade dropped 2.5+ levels — past their prime',        zh: '后期成绩比前期下降2.5个等级，巅峰已过' },
    // ── Recent form ──
    'On Fire':          { en: 'Won all 5 most recent teammate games',                zh: '最近5场队友局全部获胜，状态正热' },
    'Hot Streak':       { en: 'Won 4 of the last 5 teammate games',                  zh: '最近5场队友局赢了4场，连胜势头强劲' },
    'In A Slump':       { en: 'Lost all 5 most recent teammate games',               zh: '最近5场队友局全部落败，深陷低迷' },
    'Cold Spell':       { en: 'Won 1 or fewer of the last 5 teammate games',         zh: '最近5场队友局仅赢1场以下，连败势头' },
    'Invincible':       { en: 'Won all 10 most recent teammate games',               zh: '最近10场队友局全部获胜，所向披靡' },
    'Win Machine':      { en: 'Won 8+ of the last 10 teammate games',                zh: '最近10场队友局赢了8场以上的胜利机器' },
    'Meltdown':         { en: 'Won 1 or fewer of the last 10 teammate games',        zh: '最近10场队友局仅赢1场以下，彻底崩溃' },
    'Drought':          { en: 'Won 2 or fewer of the last 10 teammate games',        zh: '最近10场队友局仅赢2场以下，胜利干旱' },
    // ── Versatility ──
    'Anywhere':         { en: 'Appeared in 5+ different positions',                  zh: '曾出场5个以上不同位置，真正的全能球员' },
    'Swiss Army':       { en: 'Appeared in 4 different positions',                   zh: '曾出场4个不同位置的瑞士军刀' },
    'Versatile':        { en: 'Appeared in 3 different positions',                   zh: '曾出场3个不同位置的多面手' },
    // ── Mode ──
    'Mode Nomad':       { en: 'Appeared in 5+ different game modes',                 zh: '在5种以上不同模式中均有出场的游击战士' },
    'Mode Tourist':     { en: 'Appeared in 4 different game modes',                  zh: '在4种不同模式中出场的模式旅行者' },
    'Park Legend':      { en: '15+ games in Park mode',                              zh: '公园模式出场15次以上的公园传奇' },
    'Pro-Am Elite':     { en: '15+ games in Pro-Am mode',                            zh: 'Pro-Am模式出场15次以上的联赛精英' },
    'Rec Veteran':      { en: '15+ games in Rec mode',                               zh: 'Rec模式出场15次以上的娱乐老兵' },
    'Park Rat':         { en: '8+ games in Park mode',                               zh: '公园模式出场8次以上的公园常客' },
    'Pro-Am Regular':   { en: '8+ games in Pro-Am mode',                             zh: 'Pro-Am模式出场8次以上的联赛常客' },
    'Rec Regular':      { en: '8+ games in Rec mode',                                zh: 'Rec模式出场8次以上的娱乐常客' },
    'Street Player':    { en: '8+ games in street court mode',                       zh: '街球场模式出场8次以上的街球手' },
    'Mode Master':      { en: '10+ games in one mode with 75%+ win rate',            zh: '某模式10场以上且胜率达75%以上的模式霸主' },
    // ── Special situations ──
    'Old Reliable':     { en: '30+ games, 45–65% win rate as tm, zero disconnects',  zh: '30场以上，胜率稳定且从未掉线的老可靠' },
    'Grinder':          { en: '40+ games with B+ or better average grade',           zh: '40场以上且场均成绩B+以上的拼命三郎' },
    'Gifted Mess':      { en: '20+ PPG but 4+ TOPG — brilliance wrapped in chaos',   zh: '场均20分以上但失误4次以上，天才与混乱并存' },
    'Silent Assassin':  { en: '<15 PPG but 70%+ win rate and B+ avg grade',          zh: '得分不高却胜率70%+、均分B+以上的隐形刺客' },
    // ── New badges ──
    'Paint Dominator':  { en: '60%+ 2P% on 20+ two-point attempts and 7+ 2PPG — unstoppable inside', zh: '两分命中率60%以上且场均7+两分，禁区难以阻挡' },
    'Carry':            { en: '25+ PPG as teammate but ≤35% win rate — lone hero without support',    zh: '场均25+分却只有35%以下胜率，独力难支的孤胆英雄' },
    'Passenger':        { en: '<5 PPG as teammate but 75%+ win rate — pure coattail rider',            zh: '场均不足5分却胜率75%+，完美蹭车的顺风球员' },
    'Tough Customer':   { en: 'Scores 18+ PPG against us AND we win ≤30% — genuinely dangerous',      zh: '对阵时得分18+且我方胜率仅30%以下，名副其实的硬骨头' },
    'Paper Tiger':      { en: 'Scores 18+ PPG as opponent but we win 70%+ — all bark, no bite',        zh: '对阵时得分18+但我方胜率70%以上，场面好看却常输' },
    'Championship DNA': { en: '70%+ overall win rate across 20+ appearances — born to win',            zh: '20场以上综合胜率70%+，天生赢家基因' },
    'Always Losing':    { en: '≤25% overall win rate across 10+ appearances — loses constantly',        zh: '10场以上综合胜率仅25%以下，常败将军' },
    'S-Tier Talent':    { en: 'Earned A+ grade in 3+ graded games — ceiling is elite',                zh: '3次以上获得A+评级，上限极高的顶级天才' },
    'Highlight Reel':   { en: 'Has a single game with 40+ points on record — monster performance',     zh: '记录中存在单场40分以上的炸裂表现，高光球星' },
    'All Gas':          { en: '18+ PPG with 3.5+ TOPG and <3 APG — fearless scorer, zero filter',      zh: '场均18+分但失误3.5次以上且助攻不足3次，莽撞得分王' },
    'Safe Hands':       { en: '<1.5 TOPG with 3+ APG over 8+ games — secure and creative',            zh: '8场以上场均失误不足1.5次且助攻3+，稳健又有组织力' },
    '3P Merchant':      { en: '70%+ of field goal attempts are three-pointers — lives beyond the arc',  zh: '70%以上出手都是三分球，完全生活在弧线之外的三分商人' },
    'FT Hunter':        { en: 'Scores more points from free throws than field goals — a walking foul magnet', zh: '罚球得分多于投篮得分，让对手不停犯规的上篮大师' },
    'Undefeated Together': { en: '10+ games as teammate with a perfect win rate — unstoppable duo',   zh: '队友局10场以上且保持100%胜率，合体战绩完美无瑕' },
    'Zero Club':        { en: '8+ teammate games without a single win — historically cursed',          zh: '队友局8场以上从未赢过一场，史诗级的魔咒搭档' },
    'Grade A Opponent': { en: 'Consistently earns A- or better grade when facing us — elite caliber', zh: '对阵时场场获得A-以上评级，实力毋庸置疑的顶级对手' },
    'Jinx':             { en: 'We lose with them but beat them as opponents — bad luck magnet',        zh: '以队友身份输多赢少，以对手身份却常被我们击败' },
    'Unicorn':          { en: '20+ PPG, 2.5+ STL+BLK, 8+ RPG — a positional impossibility',          zh: '场均20分+2.5综合防守+8篮板的超级全能，独角兽级别存在' },
    'Hot Hand':         { en: 'Last 3 games scoring 60%+ above career average — currently on fire',    zh: '最近3场得分超出生涯均值60%以上，手感正热如火如荼' },
    'One Mode Wonder':  { en: '15+ games but appears in only one game mode — a true specialist',       zh: '15场以上却只出现在同一个模式，深耕一亩三分地的专才' },
    '50 Club':          { en: 'Has scored 50+ points in a single game — elite individual performance', zh: '记录中存在单场50分以上的神级表现，五十分俱乐部成员' },
    'Block Party':      { en: 'Single-game record of 6+ blocks — turned the paint into a no-fly zone', zh: '单场封盖6次以上的记录，把禁区变成无人飞行区' },
    'Dime Drop':        { en: 'Single-game record of 12+ assists — ran the offense like a maestro',    zh: '单场助攻12次以上的记录，一场球指挥了整支球队' },
  };

  /* ─────────────────────────────────────────────────────────────
     ACHIEVEMENT BADGES
  ───────────────────────────────────────────────────────────── */
  function getPlayerBadges(tmEntries, oppEntries) {
    const allEntries = [
      ...tmEntries.map(e => ({ ...e, side: 'tm' })),
      ...oppEntries.map(e => ({ ...e, side: 'opp' })),
    ];
    const n = allEntries.length;
    const badges = [];
    if (!n) return badges;

    const tmAgg  = aggEntries(tmEntries);
    const oppAgg = aggEntries(oppEntries);

    // ── 1. VOLUME 出场次数 ──────────────────────────────────────
    if (n >= 150)      badges.push({ label: 'Hall of Fame',  zh: '名人堂',   icon: '🏛️', cls: 'bdg-gold'   });
    else if (n >= 100) badges.push({ label: 'Legend',        zh: '传奇',     icon: '👑', cls: 'bdg-gold'   });
    else if (n >= 50)  badges.push({ label: 'Veteran',       zh: '老兵',     icon: '⭐', cls: 'bdg-gold'   });
    else if (n >= 20)  badges.push({ label: 'Regular',       zh: '常客',     icon: '📋', cls: 'bdg-blue'   });
    else if (n >= 10)  badges.push({ label: 'Familiar Face', zh: '熟面孔',   icon: '👋', cls: 'bdg-teal'   });
    else if (n <= 3)   badges.push({ label: 'Newcomer',      zh: '新人',     icon: '🌱', cls: 'bdg-gray'   });

    // ── 2. CHEMISTRY & RIVALRY 化学反应与对立 ──────────────────
    // As teammate — tiered positive
    if (tmAgg && tmAgg.n >= 20 && tmAgg.winPct >= 80)
      badges.push({ label: 'Win Magnet',      zh: '胜利磁石',   icon: '🧲', cls: 'bdg-gold'   });
    else if (tmAgg && tmAgg.n >= 10 && tmAgg.winPct >= 80)
      badges.push({ label: 'Dream Partner',   zh: '绝配搭档',   icon: '💫', cls: 'bdg-gold'   });
    else if (tmAgg && tmAgg.n >= 5 && tmAgg.winPct >= 65)
      badges.push({ label: 'Great Ally',      zh: '默契搭档',   icon: '🤝', cls: 'bdg-green'  });
    if (tmAgg && tmAgg.n >= 8 && tmAgg.winPct >= 50 && tmAgg.winPct < 65)
      badges.push({ label: 'Solid Teammate',  zh: '稳定队友',   icon: '🤜', cls: 'bdg-blue'   });
    // Perfect / winless record as teammates
    if (tmAgg && tmAgg.n >= 10 && tmAgg.wins === tmAgg.n)
      badges.push({ label: 'Undefeated Together', zh: '合体无敌', icon: '⚜️', cls: 'bdg-gold'  });
    // Negative teammate
    if (tmAgg && tmAgg.n >= 5 && tmAgg.winPct <= 35)
      badges.push({ label: 'Bad Chemistry',   zh: '化学差',     icon: '💔', cls: 'bdg-red'    });
    if (tmAgg && tmAgg.n >= 10 && tmAgg.winPct <= 25)
      badges.push({ label: 'Cursed Duo',      zh: '魔咒组合',   icon: '🪄', cls: 'bdg-red'    });
    if (tmAgg && tmAgg.n >= 8 && tmAgg.wins === 0)
      badges.push({ label: 'Zero Club',       zh: '0胜传说',    icon: '🕳️', cls: 'bdg-gray'  });
    // Contextual
    if (tmAgg && tmAgg.n >= 8 && tmAgg.winPct >= 70 && parseFloat(tmAgg.ppg) < 10)
      badges.push({ label: 'Low Usage MVP',   zh: '隐形功臣',   icon: '🕵️', cls: 'bdg-purple' });
    if (tmAgg && tmAgg.n >= 8 && tmAgg.winPct <= 40 && parseFloat(tmAgg.ppg) >= 20)
      badges.push({ label: 'Stat Padder',     zh: '数据刷子',   icon: '📊', cls: 'bdg-orange' });

    // As opponent — oppAgg.winPct = OUR win rate vs them
    if (oppAgg && oppAgg.n >= 8 && oppAgg.winPct <= 15)
      badges.push({ label: 'Unstoppable',     zh: '无可阻挡',   icon: '💀', cls: 'bdg-red'    });
    else if (oppAgg && oppAgg.n >= 5 && oppAgg.winPct <= 25)
      badges.push({ label: 'Our Nemesis',     zh: '克星',       icon: '☠️', cls: 'bdg-red'   });
    else if (oppAgg && oppAgg.n >= 3 && oppAgg.winPct <= 35)
      badges.push({ label: 'Tough Rival',     zh: '强敌',       icon: '⚔️', cls: 'bdg-red'   });
    if (oppAgg && oppAgg.n >= 8 && oppAgg.winPct >= 90)
      badges.push({ label: 'Free Win',        zh: '送分童子',   icon: '🎁', cls: 'bdg-gray'   });
    else if (oppAgg && oppAgg.n >= 5 && oppAgg.winPct >= 85)
      badges.push({ label: 'Punching Bag',    zh: '挨打专业户', icon: '🥊', cls: 'bdg-gray'   });
    else if (oppAgg && oppAgg.n >= 3 && oppAgg.winPct >= 70)
      badges.push({ label: 'Easy Match',      zh: '软柿子',     icon: '🎈', cls: 'bdg-gray'   });
    if (oppAgg && oppAgg.n >= 10 && oppAgg.winPct >= 40 && oppAgg.winPct <= 60)
      badges.push({ label: 'Arch Rival',      zh: '老对手',     icon: '🔥', cls: 'bdg-purple' });
    // Opponent stats context: do they put up big numbers / elite grades?
    if (oppAgg && oppAgg.n >= 5) {
      const oppPPG = parseFloat(oppAgg.ppg) || 0;
      if (oppPPG >= 18 && oppAgg.winPct <= 30)
        badges.push({ label: 'Tough Customer', zh: '硬骨头',    icon: '😤', cls: 'bdg-red'    });
      else if (oppPPG >= 18 && oppAgg.winPct >= 70)
        badges.push({ label: 'Paper Tiger',    zh: '纸老虎',    icon: '🐯', cls: 'bdg-orange' });
      // Elite grade as opponent — consistently performs at a high level against us
      const oppGradeVal = GRADE_VAL[oppAgg.avgGrade];
      if (oppGradeVal !== undefined && oppGradeVal >= GRADE_VAL['A-'])
        badges.push({ label: 'Grade A Opponent', zh: 'A级劲敌', icon: '🌟', cls: 'bdg-yellow' });
    }
    // Seen on both sides
    if (tmEntries.length >= 5 && oppEntries.length >= 5)
      badges.push({ label: 'Frenemies',       zh: '亦敌亦友',   icon: '🔄', cls: 'bdg-purple' });
    else if (tmEntries.length >= 3 && oppEntries.length >= 3)
      badges.push({ label: 'Split History',   zh: '双面接触',   icon: '⚖️', cls: 'bdg-gray'  });
    // Jinx: we lose when they're our teammate, but we beat them as opponents
    if (tmAgg && tmAgg.n >= 5 && tmAgg.winPct <= 35 &&
        oppAgg && oppAgg.n >= 5 && oppAgg.winPct >= 65)
      badges.push({ label: 'Jinx',            zh: '克队友',     icon: '🫣', cls: 'bdg-purple' });

    // ── 3. SHOOTING EFFICIENCY 投篮效率 ───────────────────────
    const fgm  = allEntries.reduce((s, e) => s + (Number(e.player.fgm)  || 0), 0);
    const fga  = allEntries.reduce((s, e) => s + (Number(e.player.fga)  || 0), 0);
    const fg3m = allEntries.reduce((s, e) => s + (Number(e.player.fg3m) || 0), 0);
    const fg3a = allEntries.reduce((s, e) => s + (Number(e.player.fg3a) || 0), 0);
    const ftm  = allEntries.reduce((s, e) => s + (Number(e.player.ftm)  || 0), 0);
    const fta  = allEntries.reduce((s, e) => s + (Number(e.player.fta)  || 0), 0);
    const fgPct  = fga  > 0 ? fgm  / fga  : 0;
    const fg3Pct = fg3a > 0 ? fg3m / fg3a : 0;
    const ftPct  = fta  > 0 ? ftm  / fta  : 0;

    // 3-point tiers
    if (fg3a >= 30 && fg3Pct >= 0.45)
      badges.push({ label: 'Sniper',          zh: '神枪手',   icon: '🎯', cls: 'bdg-gold'   });
    else if (fg3a >= 15 && fg3Pct >= 0.40)
      badges.push({ label: 'Sharpshooter',    zh: '神射手',   icon: '🔥', cls: 'bdg-yellow' });
    else if (fg3a >= 15 && fg3Pct >= 0.35)
      badges.push({ label: '3P Threat',       zh: '三分威胁', icon: '💥', cls: 'bdg-orange' });
    else if (fg3a >= 15 && fg3Pct < 0.28)
      badges.push({ label: '3P Rusher',       zh: '三分砖',   icon: '🧱', cls: 'bdg-gray'   });
    // Three-point shot selection: 70%+ of all FGA are threes
    if (fga >= 20 && fg3a / fga >= 0.70)
      badges.push({ label: '3P Merchant',     zh: '三分商人', icon: '🏪', cls: 'bdg-teal'   });

    // Overall FG% tiers (check worst first so Iron Brick can actually fire)
    if (fga >= 30 && fgPct >= 0.60)
      badges.push({ label: 'Can\'t Miss',     zh: '百发百中', icon: '🎖️', cls: 'bdg-gold'  });
    else if (fga >= 30 && fgPct >= 0.55)
      badges.push({ label: 'Surgical',        zh: '手术刀',   icon: '⚡', cls: 'bdg-gold'   });
    else if (fga >= 30 && fgPct >= 0.48)
      badges.push({ label: 'Efficient',       zh: '高效射手', icon: '✅', cls: 'bdg-orange' });
    else if (fga >= 30 && fgPct < 0.28)
      badges.push({ label: 'Iron Brick',      zh: '铁砖厂',   icon: '🪨', cls: 'bdg-gray'   });
    else if (fga >= 30 && fgPct < 0.35)
      badges.push({ label: 'Brick Layer',     zh: '砖厂工人', icon: '🏗️', cls: 'bdg-gray'  });

    // Paint dominance: 60%+ 2P% on meaningful 2P volume
    const twoPm  = fgm - fg3m;
    const twoPA  = fga - fg3a;
    const twoPct = twoPA > 0 ? twoPm / twoPA : 0;
    if (twoPA >= 20 && twoPct >= 0.60 && n > 0 && twoPm / n >= 7)
      badges.push({ label: 'Paint Dominator', zh: '禁区终结者', icon: '🗜️', cls: 'bdg-red' });

    // Free throw tiers
    if (fta >= 20 && ftPct >= 0.95)
      badges.push({ label: 'Perfect FT',      zh: '罚球完美', icon: '💎', cls: 'bdg-gold'   });
    else if (fta >= 20 && ftPct >= 0.90)
      badges.push({ label: 'FT Machine',      zh: '罚球机器', icon: '💎', cls: 'bdg-gold'   });
    else if (fta >= 20 && ftPct >= 0.82)
      badges.push({ label: 'FT Specialist',   zh: '罚球专家', icon: '🏹', cls: 'bdg-teal'   });
    else if (fta >= 20 && ftPct < 0.50)
      badges.push({ label: 'FT Nightmare',    zh: '罚球黑洞', icon: '😱', cls: 'bdg-gray'   });
    else if (fta >= 20 && ftPct < 0.65)
      badges.push({ label: 'FT Struggle',     zh: '罚球苦手', icon: '🤕', cls: 'bdg-gray'   });

    // FT Hunter: scores more points via FT than FG — a drawing-fouls specialist
    if (fta >= 20 && fgm > 0 && ftm > fgm)
      badges.push({ label: 'FT Hunter',       zh: '罚球猎手', icon: '🦶', cls: 'bdg-teal'   });

    // Shot volume & selection
    if (n >= 5 && fga > 0) {
      const fgaPerGame = fga / n;
      if (fgaPerGame >= 20 && fga >= 40 && fgPct < 0.38)
        badges.push({ label: 'Chucker',        zh: '出手狂',   icon: '🎰', cls: 'bdg-red'    });
      else if (fgaPerGame >= 18 && fgPct < 0.42)
        badges.push({ label: 'Volume Shooter', zh: '投篮疯子', icon: '🎰', cls: 'bdg-orange' });
      else if (fgaPerGame >= 15)
        badges.push({ label: 'Shot Hunter',    zh: '出手大户', icon: '🎯', cls: 'bdg-blue'   });
    }

    // ── 4. SCORING VOLUME 得分量 ───────────────────────────────
    if (tmAgg) {
      const ppg = parseFloat(tmAgg.ppg) || 0;
      const apg = parseFloat(tmAgg.apg) || 0;

      if (ppg >= 35)
        badges.push({ label: 'God Mode',        zh: '神级得分', icon: '🌌', cls: 'bdg-gold'   });
      else if (ppg >= 30)
        badges.push({ label: 'Scoring Machine', zh: '砍分机器', icon: '🔥', cls: 'bdg-gold'   });
      else if (ppg >= 25 && fga >= 30 && fgPct >= 0.50)
        badges.push({ label: 'Bucket Getter',   zh: '高效猎手', icon: '🏹', cls: 'bdg-gold'   });
      else if (ppg >= 20)
        badges.push({ label: 'Go-To Scorer',    zh: '得分点',   icon: '🏀', cls: 'bdg-orange' });
      else if (ppg >= 15)
        badges.push({ label: 'Secondary Option', zh: '次得分点', icon: '📊', cls: 'bdg-blue'  });
      else if (tmAgg.n >= 8 && ppg < 8)
        badges.push({ label: 'Role Player',     zh: '角色球员', icon: '🔩', cls: 'bdg-gray'   });

      // Microwave: pure scorer, rarely passes — and low assists
      if (ppg >= 18 && apg < 2 && tmAgg.n >= 5)
        badges.push({ label: 'Microwave',       zh: '微波炉',   icon: '🔥', cls: 'bdg-orange' });
      // Clutch: very high ppg + great win rate
      if (ppg >= 20 && tmAgg.winPct >= 65 && tmAgg.n >= 8)
        badges.push({ label: 'Clutch Player',   zh: '关键先生', icon: '🫀', cls: 'bdg-gold'   });
      // Carry: elite scorer but team still loses — carrying an uphill battle
      if (tmAgg.n >= 10 && ppg >= 25 && tmAgg.winPct <= 35)
        badges.push({ label: 'Carry',           zh: '孤胆英雄', icon: '🏋️', cls: 'bdg-orange' });
      // Passenger: barely scores but always on the winning side
      if (tmAgg.n >= 8 && ppg < 5 && tmAgg.winPct >= 75)
        badges.push({ label: 'Passenger',       zh: '蹭车党',   icon: '🎫', cls: 'bdg-silver' });
    }

    // ── 5. DEFENSE & REBOUNDS 防守与篮板 ──────────────────────
    if (tmAgg) {
      const spg = parseFloat(tmAgg.spg) || 0;
      const bpg = parseFloat(tmAgg.bpg) || 0;
      const rpg = parseFloat(tmAgg.rpg) || 0;
      const ppg = parseFloat(tmAgg.ppg) || 0;

      // Combined D tier
      if (spg + bpg >= 5)
        badges.push({ label: 'Defensive God',  zh: '防守之神', icon: '🔒', cls: 'bdg-gold'   });
      else if (spg + bpg >= 4)
        badges.push({ label: 'Lockdown',       zh: '锁人王',   icon: '🔒', cls: 'bdg-blue'   });
      else if (spg + bpg >= 2.5)
        badges.push({ label: 'Disruptor',      zh: '干扰者',   icon: '🛑', cls: 'bdg-blue'   });
      else if (spg + bpg >= 1.5)
        badges.push({ label: 'Pest',           zh: '搅局者',   icon: '🐝', cls: 'bdg-teal'   });

      // Block tiers
      if (bpg >= 4)
        badges.push({ label: 'Swat King',      zh: '盖帽之王', icon: '👋', cls: 'bdg-gold'   });
      else if (bpg >= 3)
        badges.push({ label: 'Shot Blocker',   zh: '封盖王',   icon: '✋', cls: 'bdg-purple'  });
      else if (bpg >= 1.5)
        badges.push({ label: 'Rim Deterrent',  zh: '护筐神',   icon: '🏯', cls: 'bdg-purple'  });

      // Steal tiers
      if (spg >= 3)
        badges.push({ label: 'Pickpocket Pro', zh: '抢断大师', icon: '🦅', cls: 'bdg-gold'   });
      else if (spg >= 2)
        badges.push({ label: 'Ball Hawk',      zh: '抢断王',   icon: '🦅', cls: 'bdg-purple'  });
      else if (spg >= 1.3)
        badges.push({ label: 'Pickpocket',     zh: '小偷',     icon: '🤏', cls: 'bdg-teal'    });

      // Rebound tiers
      if (rpg >= 15)
        badges.push({ label: 'Rebound God',    zh: '篮板之神', icon: '💪', cls: 'bdg-gold'   });
      else if (rpg >= 12)
        badges.push({ label: 'Board Dominator', zh: '篮板霸主', icon: '💪', cls: 'bdg-gold'  });
      else if (rpg >= 8)
        badges.push({ label: 'Glass Eater',    zh: '篮板机器', icon: '💪', cls: 'bdg-green'   });
      else if (rpg >= 5)
        badges.push({ label: 'Board Crasher',  zh: '篮板悍将', icon: '🏋️', cls: 'bdg-green'  });

      // Interior combos
      if (bpg >= 2 && rpg >= 7)
        badges.push({ label: 'Rim Guardian',   zh: '禁区卫士', icon: '🛡️', cls: 'bdg-silver'  });
      if (rpg >= 10 && bpg >= 2.5 && ppg >= 15)
        badges.push({ label: 'Post Monster',   zh: '低位怪兽', icon: '🦣', cls: 'bdg-gold'    });
    }

    // ── 6. PLAYMAKING 组织 ────────────────────────────────────
    if (tmAgg) {
      const apg  = parseFloat(tmAgg.apg)  || 0;
      const topg = parseFloat(tmAgg.topg) || 0;
      const ppg  = parseFloat(tmAgg.ppg)  || 0;

      // Assist tiers
      if (apg >= 12)
        badges.push({ label: 'Pass God',         zh: '传球之神', icon: '👁️', cls: 'bdg-gold'  });
      else if (apg >= 8)
        badges.push({ label: 'Floor General',    zh: '传球大师', icon: '🎮', cls: 'bdg-gold'   });
      else if (apg >= 5)
        badges.push({ label: 'Playmaker',        zh: '组织核心', icon: '👁️', cls: 'bdg-blue'  });
      else if (apg >= 3)
        badges.push({ label: 'Pass First',       zh: '传球优先', icon: '🎯', cls: 'bdg-teal'   });

      // Assist efficiency (ast-to-turnover ratio)
      if (apg >= 5 && topg > 0 && apg / topg >= 5)
        badges.push({ label: 'Traffic Director', zh: '球场指挥', icon: '🚦', cls: 'bdg-gold'   });
      else if (apg >= 5 && topg > 0 && apg / topg >= 3.5)
        badges.push({ label: 'Elite Distributor', zh: '传球精英', icon: '🎯', cls: 'bdg-teal'  });
      else if (apg >= 3 && topg > 0 && apg / topg >= 4)
        badges.push({ label: 'Clean Handler',    zh: '安全运球', icon: '🔐', cls: 'bdg-teal'   });

      // Combined scoring + playmaking
      if (ppg >= 20 && apg >= 8)
        badges.push({ label: 'Point God',        zh: '控卫王者', icon: '🌠', cls: 'bdg-gold'   });
      else if (ppg >= 15 && apg >= 6)
        badges.push({ label: 'Scorer-Passer',    zh: '双枪将',   icon: '⚡', cls: 'bdg-purple' });

      // Turnover tiers
      if (topg >= 5)
        badges.push({ label: 'TO Machine',       zh: '失误专家', icon: '💸', cls: 'bdg-red'    });
      else if (topg >= 3.5)
        badges.push({ label: 'Turnover Prone',   zh: '失误大王', icon: '💥', cls: 'bdg-red'    });
      else if (topg >= 2.5)
        badges.push({ label: 'Careless',         zh: '毛手毛脚', icon: '🤦', cls: 'bdg-orange' });
      // Safe Hands: very few turnovers while actively creating
      if (tmAgg.n >= 8 && topg < 1.5 && apg >= 3)
        badges.push({ label: 'Safe Hands',       zh: '稳健先生', icon: '🫳', cls: 'bdg-teal'   });
      // All Gas: high scorer, lots of TOs, rarely passes — pure fireworks
      if (tmAgg.n >= 5 && ppg >= 18 && topg >= 3.5 && apg < 3)
        badges.push({ label: 'All Gas',          zh: '莽撞猛将', icon: '💨', cls: 'bdg-orange' });
    }

    // ── 7. ALL-AROUND 全能型 ──────────────────────────────────
    if (tmAgg) {
      const pts = parseFloat(tmAgg.ppg) || 0;
      const reb = parseFloat(tmAgg.rpg) || 0;
      const ast = parseFloat(tmAgg.apg) || 0;
      const stl = parseFloat(tmAgg.spg) || 0;
      const blk = parseFloat(tmAgg.bpg) || 0;

      // Multi-stat excellence
      if (pts >= 20 && reb >= 10 && ast >= 8)
        badges.push({ label: 'Triple Threat',   zh: '全能三威', icon: '🔱', cls: 'bdg-gold'    });
      else if (pts >= 15 && reb >= 7 && ast >= 5)
        badges.push({ label: 'Stat Stuffer',    zh: '数据全能', icon: '🌟', cls: 'bdg-gold'    });
      else if (pts >= 10 && reb >= 5 && ast >= 4)
        badges.push({ label: 'Well Rounded',    zh: '全面球员', icon: '⚙️', cls: 'bdg-purple'  });

      // Double-double types
      if (pts >= 10 && reb >= 10 && tmAgg.n >= 5)
        badges.push({ label: 'Double-Double',   zh: '双双机器', icon: '✌️', cls: 'bdg-gold'   });
      if (pts >= 10 && ast >= 10 && tmAgg.n >= 5)
        badges.push({ label: 'Dimes & Buckets', zh: '分助双双', icon: '🎯', cls: 'bdg-gold'   });

      // Unicorn: elite scorer AND defender AND rebounder — a statistical impossibility
      if (pts >= 20 && (stl + blk) >= 2.5 && reb >= 8)
        badges.push({ label: 'Unicorn',         zh: '独角兽',   icon: '🦄', cls: 'bdg-gold'   });

      // Two-way tiers
      if (stl >= 2 && blk >= 2 && reb >= 7)
        badges.push({ label: 'Two-Way Monster', zh: '双向怪兽', icon: '⚡', cls: 'bdg-gold'   });
      else if (stl >= 1.5 && blk >= 1.5 && reb >= 5)
        badges.push({ label: 'Two-Way Beast',   zh: '双向猛兽', icon: '⚡', cls: 'bdg-purple'  });

      // Position archetypes
      if (pts >= 10 && ast >= 6 && stl >= 1.5 && reb < 4)
        badges.push({ label: 'Point Guard DNA', zh: '控卫血脉', icon: '🎯', cls: 'bdg-blue'   });
      if (reb >= 8 && blk >= 1.5 && pts < 12)
        badges.push({ label: 'Big Man Energy',  zh: '大个子气质', icon: '🦣', cls: 'bdg-green' });
      if (pts >= 5 && stl >= 2 && ast >= 3 && reb >= 3)
        badges.push({ label: 'Swiss Knife',     zh: '万能胶',   icon: '🔑', cls: 'bdg-teal'   });

      // Support roles
      if (tmAgg.n >= 15 && pts >= 10 && pts < 18 && (ast >= 4 || reb >= 5) && tmAgg.winPct >= 55)
        badges.push({ label: 'Sixth Man',       zh: '第六人',   icon: '6️⃣', cls: 'bdg-teal'  });
      // Glue guy: low stats but team wins
      if (tmAgg.n >= 10 && pts < 12 && reb >= 4 && ast >= 3 && stl >= 1 && tmAgg.winPct >= 60)
        badges.push({ label: 'Glue Guy',        zh: '粘合剂',   icon: '🫧', cls: 'bdg-green'  });
    }

    // Overall player win rate (player-perspective: tm wins + opp losses)
    const _playerWins   = tmEntries.filter(e => e.game.result === 'W').length
                        + oppEntries.filter(e => e.game.result === 'L').length;
    const _playerWinPct = n > 0 ? Math.round(_playerWins / n * 100) : 0;
    if (n >= 20 && _playerWinPct >= 70)
      badges.push({ label: 'Championship DNA', zh: '冠军血脉', icon: '🏆', cls: 'bdg-gold'   });
    else if (n >= 10 && _playerWinPct <= 25)
      badges.push({ label: 'Always Losing',    zh: '常败将军', icon: '🥀', cls: 'bdg-gray'   });

    // ── 8. RELIABILITY 可靠性 ─────────────────────────────────
    const dcCount = allEntries.filter(e => e.player.disconnected).length;
    const aiCount = allEntries.filter(e => e.player.isAI).length;

    if (n >= 30 && dcCount === 0 && aiCount === 0)
      badges.push({ label: 'Always There',    zh: '从不缺席',  icon: '🏅', cls: 'bdg-gold'   });
    else if (n >= 20 && dcCount === 0 && aiCount === 0)
      badges.push({ label: 'Perfect Record',  zh: '全勤模范',  icon: '🏅', cls: 'bdg-gold'   });
    else if (n >= 10 && dcCount === 0)
      badges.push({ label: 'Iron Man',        zh: '铁人',      icon: '🛡️', cls: 'bdg-silver' });
    if (n >= 5 && dcCount / n >= 0.5)
      badges.push({ label: 'DC Champion',     zh: '掉线冠军',  icon: '📵', cls: 'bdg-red'    });
    else if (n >= 5 && dcCount / n >= 0.4)
      badges.push({ label: 'Serial DC',       zh: '掉线惯犯',  icon: '📵', cls: 'bdg-red'    });
    else if (n >= 5 && dcCount / n >= 0.3)
      badges.push({ label: 'DC Prone',        zh: '掉线大王',  icon: '📵', cls: 'bdg-gray'   });
    if (n >= 8 && aiCount / n >= 0.6)
      badges.push({ label: 'Ghost Player',    zh: '幽灵队友',  icon: '👻', cls: 'bdg-gray'   });
    else if (aiCount >= 5)
      badges.push({ label: 'AI Magnet',       zh: 'AI常客',    icon: '🤖', cls: 'bdg-gray'   });
    else if (aiCount >= 3)
      badges.push({ label: 'AI Regular',      zh: '常驻AI',    icon: '🤖', cls: 'bdg-gray'   });

    // ── 9. GRADE / CONSISTENCY 等级与稳定性 ──────────────────
    const validGrades = allEntries.map(e => e.player.grade).filter(g => GRADE_VAL[g] !== undefined);
    if (validGrades.length >= 5) {
      const avgIdx = Math.min(
        Math.round(validGrades.reduce((s, g) => s + GRADE_VAL[g], 0) / validGrades.length),
        GRADE_ORDER.length - 1
      );

      if (validGrades.length >= 10 && avgIdx >= GRADE_VAL['A+'])
        badges.push({ label: 'Valedictorian',  zh: '状元',     icon: '🎓', cls: 'bdg-gold'   });
      else if (avgIdx >= GRADE_VAL['A'])
        badges.push({ label: 'A-Lister',       zh: 'A级常客',  icon: '📖', cls: 'bdg-yellow' });
      else if (avgIdx >= GRADE_VAL['A-'])
        badges.push({ label: 'Class Act',       zh: '优等生',   icon: '✏️', cls: 'bdg-yellow' });
      else if (avgIdx <= GRADE_VAL['D'])
        badges.push({ label: 'Underachiever',   zh: '差等生',   icon: '📉', cls: 'bdg-gray'   });
      else if (avgIdx <= GRADE_VAL['C'])
        badges.push({ label: 'Low Output',      zh: '低产出',   icon: '🔻', cls: 'bdg-gray'   });

      // Ceiling check: has earned elite grades regardless of average
      const aPlusCount = validGrades.filter(g => g === 'A+').length;
      if (aPlusCount >= 3 && validGrades.length >= 8)
        badges.push({ label: 'S-Tier Talent',  zh: 'S级天才',  icon: '💯', cls: 'bdg-gold'   });

      if (validGrades.length >= 8) {
        const variance = validGrades.reduce((s, g) => s + Math.pow(GRADE_VAL[g] - avgIdx, 2), 0) / validGrades.length;
        if (variance <= 0.5)
          badges.push({ label: 'Metronome',     zh: '节拍器',   icon: '🎼', cls: 'bdg-gold'   });
        else if (variance <= 1.5)
          badges.push({ label: 'Consistent',    zh: '稳如老狗', icon: '📐', cls: 'bdg-teal'   });
        else if (variance >= 10)
          badges.push({ label: 'Wild Card',     zh: '大起大落', icon: '🎲', cls: 'bdg-red'    });
        else if (variance >= 6)
          badges.push({ label: 'Unpredictable', zh: '飘忽不定', icon: '🎲', cls: 'bdg-orange' });
      }

      // Grade trajectory: compare earliest 5 vs latest 5 graded games
      const gradesByDate = [...allEntries]
        .filter(e => GRADE_VAL[e.player.grade] !== undefined)
        .sort((a, b) => window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a.game, b.game, 'asc'));
      if (gradesByDate.length >= 10) {
        const avgFirst = gradesByDate.slice(0, 5).reduce((s, e) => s + GRADE_VAL[e.player.grade], 0) / 5;
        const avgLast  = gradesByDate.slice(-5).reduce((s, e)  => s + GRADE_VAL[e.player.grade], 0) / 5;
        if (avgLast - avgFirst >= 4)
          badges.push({ label: 'Glow Up',       zh: '大幅逆袭', icon: '🚀', cls: 'bdg-gold'   });
        else if (avgLast - avgFirst >= 2.5)
          badges.push({ label: 'Comeback Player', zh: '逆袭者', icon: '📈', cls: 'bdg-green'  });
        else if (avgFirst - avgLast >= 4)
          badges.push({ label: 'Fallen Star',   zh: '跌落神坛', icon: '💫', cls: 'bdg-gray'   });
        else if (avgFirst - avgLast >= 2.5)
          badges.push({ label: 'Declining',     zh: '巅峰已过', icon: '📉', cls: 'bdg-gray'   });
      }
    }

    // ── 10. RECENT FORM 近况（队友局） ────────────────────────
    const tmSorted = [...tmEntries].sort((a, b) =>
      window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a.game, b.game)
    );
    if (tmSorted.length >= 5) {
      const last5  = tmSorted.slice(0, 5).map(e => e.game.result);
      const last5W = last5.filter(r => r === 'W').length;
      if (last5W === 5)
        badges.push({ label: 'On Fire',      zh: '热手状态', icon: '🔥', cls: 'bdg-orange' });
      else if (last5W >= 4)
        badges.push({ label: 'Hot Streak',   zh: '连胜势头', icon: '📈', cls: 'bdg-orange' });
      else if (last5W === 0)
        badges.push({ label: 'In A Slump',   zh: '低迷状态', icon: '❄️', cls: 'bdg-gray'  });
      else if (last5W <= 1)
        badges.push({ label: 'Cold Spell',   zh: '连败势头', icon: '📉', cls: 'bdg-gray'   });
    }
    if (tmSorted.length >= 10) {
      const last10W = tmSorted.slice(0, 10).filter(e => e.game.result === 'W').length;
      if (last10W >= 10)
        badges.push({ label: 'Invincible',   zh: '所向披靡', icon: '👑', cls: 'bdg-gold'   });
      else if (last10W >= 8)
        badges.push({ label: 'Win Machine',  zh: '胜利机器', icon: '⚙️', cls: 'bdg-gold'   });
      else if (last10W <= 1)
        badges.push({ label: 'Meltdown',     zh: '崩溃模式', icon: '💀', cls: 'bdg-red'    });
      else if (last10W <= 2)
        badges.push({ label: 'Drought',      zh: '旱灾模式', icon: '🌵', cls: 'bdg-gray'   });
    }
    // Hot Hand: recent 3 games PPG is 60%+ above career average
    if (tmSorted.length >= 6 && tmAgg) {
      const recentPPG  = tmSorted.slice(0, 3).reduce((s, e) => s + (Number(e.player.pts) || 0), 0) / 3;
      const careerPPG  = parseFloat(tmAgg.ppg) || 0;
      if (careerPPG >= 8 && recentPPG >= careerPPG * 1.6 && recentPPG >= 20)
        badges.push({ label: 'Hot Hand',     zh: '手感火热', icon: '🌡️', cls: 'bdg-orange' });
    }

    // ── 11. VERSATILITY 多位置 ────────────────────────────────
    const positions = new Set(allEntries.map(e => (e.player.position || '').trim()).filter(Boolean));
    if (positions.size >= 5)
      badges.push({ label: 'Anywhere',     zh: '全位置',  icon: '🔧', cls: 'bdg-gold'   });
    else if (positions.size >= 4)
      badges.push({ label: 'Swiss Army',   zh: '瑞士军刀', icon: '🔧', cls: 'bdg-purple' });
    else if (positions.size >= 3)
      badges.push({ label: 'Versatile',    zh: '多面手',  icon: '🌟', cls: 'bdg-purple' });

    // ── 12. MODE SPECIALIST 模式专精 ──────────────────────────
    const modeCount = {};
    allEntries.forEach(e => {
      const m = String(e.game.mode || '').trim();
      if (m) modeCount[m] = (modeCount[m] || 0) + 1;
    });
    const modeKeys = Object.keys(modeCount);
    if (modeKeys.length >= 5)
      badges.push({ label: 'Mode Nomad',    zh: '游击战士', icon: '🗺️', cls: 'bdg-purple' });
    else if (modeKeys.length >= 4)
      badges.push({ label: 'Mode Tourist',  zh: '模式旅行者', icon: '🧳', cls: 'bdg-blue' });
    const modeWinPct = {};
    modeKeys.forEach(mode => {
      const mEntries = allEntries.filter(e => String(e.game.mode || '').trim() === mode);
      const mWins = mEntries.filter(e => e.game.result === 'W').length;
      modeWinPct[mode] = mEntries.length > 0 ? Math.round(mWins / mEntries.length * 100) : 0;
    });
    modeKeys.forEach(mode => {
      const cnt = modeCount[mode];
      const ml = mode.toLowerCase();
      if (cnt >= 15) {
        if (ml.includes('park'))
          badges.push({ label: 'Park Legend',    zh: '公园传奇', icon: '🌳', cls: 'bdg-gold'   });
        else if (ml.includes('pro') || ml.includes(' am'))
          badges.push({ label: 'Pro-Am Elite',   zh: '联赛精英', icon: '🏆', cls: 'bdg-gold'   });
        else if (ml.includes('rec'))
          badges.push({ label: 'Rec Veteran',    zh: '娱乐老兵', icon: '🎮', cls: 'bdg-gold'   });
      } else if (cnt >= 8) {
        if (ml.includes('park'))
          badges.push({ label: 'Park Rat',       zh: '公园常客', icon: '🌳', cls: 'bdg-green'  });
        else if (ml.includes('pro') || ml.includes(' am'))
          badges.push({ label: 'Pro-Am Regular', zh: '联赛常客', icon: '🏀', cls: 'bdg-blue'   });
        else if (ml.includes('rec'))
          badges.push({ label: 'Rec Regular',    zh: '娱乐常客', icon: '🎮', cls: 'bdg-blue'   });
        else if (ml.includes('court') || ml.includes('street'))
          badges.push({ label: 'Street Player',  zh: '街球手',   icon: '🛹', cls: 'bdg-orange' });
      }
      // Mode dominator: 10+ games in one mode, 75%+ win rate
      if (cnt >= 10 && modeWinPct[mode] >= 75)
        badges.push({ label: 'Mode Master',      zh: '模式霸主', icon: '🎖️', cls: 'bdg-gold'  });
    });
    // One Mode Wonder: exclusively plays one game mode, 15+ games — a true specialist
    if (modeKeys.length === 1 && modeCount[modeKeys[0]] >= 15)
      badges.push({ label: 'One Mode Wonder', zh: '单模精专', icon: '🎯', cls: 'bdg-blue' });

    // ── 13. SPECIAL SITUATIONS 特殊情境 ──────────────────────
    // Old Reliable: 30+ games, balanced win rate, never DC'd
    if (n >= 30 && dcCount === 0 && tmAgg && tmAgg.winPct >= 45 && tmAgg.winPct <= 65)
      badges.push({ label: 'Old Reliable',  zh: '老可靠',   icon: '🤙', cls: 'bdg-silver'  });
    // Grinder: 40+ games, average grade B+ or better
    if (n >= 40 && validGrades.length >= 20) {
      const grindAvg = validGrades.reduce((s, g) => s + GRADE_VAL[g], 0) / validGrades.length;
      if (grindAvg >= GRADE_VAL['B+'])
        badges.push({ label: 'Grinder',     zh: '拼命三郎', icon: '⛏️', cls: 'bdg-silver' });
    }
    // Walking Paradox: high pts (≥20) but high TO (≥4) — gifted but messy
    if (tmAgg && parseFloat(tmAgg.ppg) >= 20 && parseFloat(tmAgg.topg) >= 4 && tmAgg.n >= 5)
      badges.push({ label: 'Gifted Mess',   zh: '天才乱局', icon: '🌀', cls: 'bdg-orange'  });
    // Silent Assassin: high win rate, top grade, but modest stats
    if (tmAgg && tmAgg.n >= 10 && tmAgg.winPct >= 70 && validGrades.length >= 6) {
      const silAvg = validGrades.reduce((s, g) => s + GRADE_VAL[g], 0) / validGrades.length;
      if (silAvg >= GRADE_VAL['B+'] && parseFloat(tmAgg.ppg) < 15)
        badges.push({ label: 'Silent Assassin', zh: '隐形刺客', icon: '🗡️', cls: 'bdg-purple' });
    }
    // Highlight Reel / 50 Club: best single-game scoring performance
    const _maxPts = allEntries.reduce((m, e) => Math.max(m, Number(e.player.pts) || 0), 0);
    const _maxBlk = allEntries.reduce((m, e) => Math.max(m, Number(e.player.blk) || 0), 0);
    const _maxAst = allEntries.reduce((m, e) => Math.max(m, Number(e.player.ast) || 0), 0);
    if (n >= 5 && _maxPts >= 50)
      badges.push({ label: '50 Club',         zh: '五十分俱乐部', icon: '5️⃣0️⃣', cls: 'bdg-gold' });
    else if (n >= 5 && _maxPts >= 40)
      badges.push({ label: 'Highlight Reel',  zh: '高光球星',     icon: '🎬',     cls: 'bdg-gold' });
    // Block Party: dominant shot-blocker (6+ blocks in a single game)
    if (n >= 5 && _maxBlk >= 6)
      badges.push({ label: 'Block Party',     zh: '盖帽狂宴',     icon: '🚫',     cls: 'bdg-blue' });
    // Dime Drop: elite playmaker (12+ assists in a single game)
    if (n >= 5 && _maxAst >= 12)
      badges.push({ label: 'Dime Drop',       zh: '助攻炸弹',     icon: '💣',     cls: 'bdg-purple' });

    return badges;
  }

  /* ─────────────────────────────────────────────────────────────
     SYNC / ALIAS MAP / FOR-GAMES / MERGE
  ───────────────────────────────────────────────────────────── */
  function syncFromGame(game, statePlayers) {
    const created = [];
    const r = game.roster || {};
    const names = [
      ...(r.teammates || []).map(p => p.name),
      ...(r.opponents || []).map(p => p.name),
    ].filter(n => n && String(n).trim());
    names.forEach(rawName => {
      const name = String(rawName).trim();
      if (!findByName(statePlayers, name)) {
        const profile = createProfile(name);
        statePlayers.push(profile);
        created.push(profile);
      }
    });
    return created;
  }

  function buildAliasMap(players) {
    const map = new Map();
    players.forEach(p => p.aliases.forEach(a => {
      if (!map.has(norm(a))) map.set(norm(a), p);
    }));
    return map;
  }

  function forGames(players, games) {
    const aliasMap = buildAliasMap(players);
    const ids = new Set();
    games.forEach(game => {
      const r = game.roster || {};
      [...(r.teammates || []), ...(r.opponents || [])].forEach(p => {
        if (!p.name) return;
        const prof = aliasMap.get(norm(p.name));
        if (prof) ids.add(prof.id);
      });
    });
    return players.filter(p => ids.has(p.id));
  }

  function mergePlayers(profileA, profileB) {
    const merged = { ...profileA };
    const seen = new Set(merged.aliases.map(norm));
    profileB.aliases.forEach(alias => {
      if (!seen.has(norm(alias))) { merged.aliases.push(alias); seen.add(norm(alias)); }
    });
    return merged;
  }

  /* ─────────────────────────────────────────────────────────────
     DATALIST
  ───────────────────────────────────────────────────────────── */
  function updateDatalist(players) {
    let dl = document.getElementById('player-names-list');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'player-names-list';
      document.body.appendChild(dl);
    }
    const names = new Set();
    players.forEach(p => p.aliases.forEach(a => { if (a.trim()) names.add(a.trim()); }));
    dl.innerHTML = [...names].sort((a, b) => a.localeCompare(b))
      .map(n => `<option value="${esc(n)}"></option>`).join('');
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: PLAYERS PANEL (directory tab inside build detail)
  ───────────────────────────────────────────────────────────── */
  function renderPlayersPanel(players, games, deps) {
    const { escapeHtml: eh, t, onCardClick = 'openPlayerCard' } = deps;

    if (!games.length) {
      return `<div class="empty-state"><div class="empty-state-text">${t('// record games with roster entries to build a player directory')}</div></div>`;
    }
    const encountered = forGames(players, games);
    if (!encountered.length) {
      return `<div class="empty-state"><div class="empty-state-text">${t('// no players logged yet — add names to teammate/opponent rows')}</div></div>`;
    }

    const enriched = encountered.map(profile => {
      const { asTeammate, asOpponent } = getStats(profile, games);
      const teammateEntries = asTeammate.map(e => ({ ...e, side: 'tm' }));
      const opponentEntries = asOpponent.map(e => ({ ...e, side: 'opp' }));
      const allE = [...teammateEntries, ...opponentEntries];
      const posFreq = {};
      allE.forEach(e => { const p = e.player.position; if (p) posFreq[p] = (posFreq[p] || 0) + 1; });
      const topPos = Object.keys(posFreq).sort((a, b) => posFreq[b] - posFreq[a])[0] || '';
      const tmAgg  = aggEntries(asTeammate);
      const allAgg = aggEntries(allE, { resultForEntry: playerPerspectiveResult });
      const highs  = getCareerHighs(allE);
      const dcCount = allE.filter(e => e.player.disconnected).length;
      const aiCount = allE.filter(e => e.player.isAI).length;
      const tmW  = asTeammate.filter(e => e.game.result === 'W').length;
      const oppW = opponentEntries.filter(e => playerPerspectiveResult(e) === 'W').length;
      const total = allE.length;
      return { profile, asTeammate, asOpponent, tmAgg, allAgg, highs, topPos, dcCount, aiCount, total, tmW, oppW };
    }).sort((a, b) => b.total - a.total);

    const cards = enriched.map(({ profile, asTeammate, asOpponent, tmAgg, allAgg, highs, topPos, dcCount, aiCount, total, tmW, oppW }) => {
      const aliasChips = profile.aliases
        .filter(a => norm(a) !== norm(profile.primaryName))
        .slice(0, 3)
        .map(a => `<span class="player-alias-chip">${eh(a)}</span>`)
        .join('');
      const tmWinPct = asTeammate.length ? Math.round(tmW / asTeammate.length * 100) : null;
      const barColor = tmWinPct === null ? '' : tmWinPct >= 65 ? '#43d968' : tmWinPct >= 50 ? '#f6c638' : '#e21a2f';
      const winPct = allAgg ? allAgg.winPct : null;
      const ringTone = winPct === null ? 'neutral' : winPct >= 65 ? 'good' : winPct >= 50 ? 'warn' : 'risk';
      const fgText = allAgg ? allAgg.fgPct : '--';
      const tmRecord = asTeammate.length ? `${tmW}-${asTeammate.length - tmW}` : '-';
      const oppRecord = asOpponent.length ? `${oppW}-${asOpponent.length - oppW}` : '-';
      const highCells = highs ? `
        <div class="player-console-highs">
          <span>${t('Career Highs')}</span>
          <b>${highs.pts}<i>${t('PTS')}</i></b>
          <b>${highs.reb}<i>${t('REB')}</i></b>
          <b>${highs.ast}<i>${t('AST')}</i></b>
          <b>${highs.stl}<i>${t('STL')}</i></b>
          <b>${highs.blk}<i>${t('BLK')}</i></b>
        </div>` : '';

      return `
        <div class="player-card console-player-card ${ringTone}"
             data-name="${esc(norm(profile.primaryName))}"
             data-aliases="${esc(profile.aliases.map(norm).join('|'))}"
             data-dc="${dcCount > 0 ? 1 : 0}"
             data-ai="${aiCount > 0 ? 1 : 0}"
             data-tm="${asTeammate.length > 0 ? 1 : 0}"
             data-opp="${asOpponent.length > 0 ? 1 : 0}"
             data-total="${total}"
             onclick="${onCardClick}('${esc(profile.id)}')"
             onkeydown="if(event.key==='Enter'||event.key===' ')${onCardClick}('${esc(profile.id)}')"
             role="button" tabindex="0">
          <div class="player-console-top">
            <div class="player-card-avatar" style="background:${avatarColor(profile.primaryName)};">
              ${eh(profile.primaryName.charAt(0).toUpperCase())}
            </div>
            <div class="player-console-id">
              <div class="player-card-name">
                ${eh(profile.primaryName)}
                ${topPos ? `<span class="player-card-pos">${eh(topPos)}</span>` : ''}
              </div>
              <div class="player-console-sub">${total} ${t('GP')} / ${profile.aliases.length} ${t('Aliases')}</div>
            </div>
            <div class="player-console-ring" style="--player-win:${winPct !== null ? winPct : 0}%">
              <strong>${winPct !== null ? winPct + '%' : '-'}</strong>
              <span>${t('WIN %')}</span>
            </div>
          </div>
          ${aliasChips ? `<div class="player-card-aliases">${aliasChips}</div>` : ''}
          <div class="player-card-meta">
            ${asTeammate.length ? `<span class="player-meta-pill teammate">${t('Teammate')} ${asTeammate.length}${t('GP')} ${tmRecord}</span>` : ''}
            ${asOpponent.length ? `<span class="player-meta-pill opponent">${t('Opponent')} ${asOpponent.length}${t('GP')} ${oppRecord}</span>` : ''}
            ${dcCount ? `<span class="player-meta-pill dc">${t('DC')} x${dcCount}</span>` : ''}
            ${aiCount ? `<span class="player-meta-pill ai">${t('AI')} x${aiCount}</span>` : ''}
          </div>
          <div class="player-console-stat-grid">
            <span><b>${allAgg ? allAgg.ppg : '-'}</b><i>${t('PPG')}</i></span>
            <span><b>${allAgg ? allAgg.rpg : '-'}</b><i>${t('RPG')}</i></span>
            <span><b>${allAgg ? allAgg.apg : '-'}</b><i>${t('APG')}</i></span>
            <span><b>${fgText}</b><i>${t('FG')}</i></span>
          </div>
          <div class="player-console-split">
            <span><i>${t('Teammate')}</i><b>${asTeammate.length || 0}${t('GP')}</b><em>${tmRecord}</em></span>
            <span><i>${t('Opponent')}</i><b>${asOpponent.length || 0}${t('GP')}</b><em>${oppRecord}</em></span>
          </div>
          ${highCells}
        </div>`;

      return `
        <div class="player-card"
             data-name="${esc(norm(profile.primaryName))}"
             data-aliases="${esc(profile.aliases.map(norm).join('|'))}"
             data-dc="${dcCount > 0 ? 1 : 0}"
             data-ai="${aiCount > 0 ? 1 : 0}"
             data-tm="${asTeammate.length > 0 ? 1 : 0}"
             data-opp="${asOpponent.length > 0 ? 1 : 0}"
             data-total="${total}"
             onclick="${onCardClick}('${esc(profile.id)}')"
             onkeydown="if(event.key==='Enter'||event.key===' ')${onCardClick}('${esc(profile.id)}')"
             role="button" tabindex="0">
          <div class="player-card-avatar" style="background:${avatarColor(profile.primaryName)};">
            ${eh(profile.primaryName.charAt(0).toUpperCase())}
          </div>
          <div class="player-card-body">
            <div class="player-card-name">
              ${eh(profile.primaryName)}
              ${topPos ? `<span class="player-card-pos">${eh(topPos)}</span>` : ''}
            </div>
            ${aliasChips ? `<div class="player-card-aliases">${aliasChips}</div>` : ''}
            <div class="player-card-meta">
              ${asTeammate.length ? `<span class="player-meta-pill teammate">${t('Tm')} ${asTeammate.length}G · ${tmW}W</span>` : ''}
              ${asOpponent.length ? `<span class="player-meta-pill opponent">${t('Opp')} ${asOpponent.length}G · ${oppW}W</span>` : ''}
              ${dcCount ? `<span class="player-meta-pill dc">${t('DC')} ×${dcCount}</span>` : ''}
              ${aiCount ? `<span class="player-meta-pill ai">${t('AI')} ×${aiCount}</span>` : ''}
            </div>
            ${tmWinPct !== null ? `
            <div class="player-winpct-bar" title="${tmWinPct}% ${t('win rate as teammate')}">
              <div class="player-winpct-fill" style="width:${tmWinPct}%;background:${barColor};"></div>
            </div>` : ''}
            ${tmAgg ? `<div class="player-card-stats">${tmAgg.ppg} PTS · ${tmAgg.rpg} REB · ${tmAgg.apg} AST · ${tmAgg.fgPct} FG</div>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="players-panel">
        <div class="players-panel-toolbar">
          <input class="players-search-input" id="players-search-input" type="search"
                 placeholder="${t('Search players...')}" oninput="filterPlayersPanel()" autocomplete="off">
          <button class="players-filter-btn active" onclick="setPlayersFilter(this,'all')">${t('All')} <span class="pp-filter-cnt">${encountered.length}</span></button>
          <button class="players-filter-btn" onclick="setPlayersFilter(this,'tm')">${t('Teammate')}</button>
          <button class="players-filter-btn" onclick="setPlayersFilter(this,'opp')">${t('Opponent')}</button>
          <button class="players-filter-btn" onclick="setPlayersFilter(this,'dc')">${t('DC Players')}</button>
          <button class="players-filter-btn" onclick="setPlayersFilter(this,'ai')">${t('AI Players')}</button>
        </div>
        <div class="player-card-grid" id="player-card-grid">${cards}</div>
        <div class="player-card-empty" id="players-empty-msg" style="display:none;">
          <div class="players-empty-icon">🔍</div>
          <div class="players-empty-text">${t('No players found.')}</div>
        </div>
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: FULL PLAYER PAGE (independent page overlay)
  ───────────────────────────────────────────────────────────── */
  function renderPlayerCard(profileId, players, allGames, deps) {
    const { escapeHtml: eh, t, mode = 'overlay' } = deps;
    const profile = players.find(p => p.id === profileId);
    if (!profile) return;

    const { asTeammate, asOpponent } = getStats(profile, allGames);
    const allEntries = [
      ...asTeammate.map(e => ({ ...e, side: 'tm' })),
      ...asOpponent.map(e => ({ ...e, side: 'opp' })),
    ];
    const tmAgg   = aggEntries(asTeammate);
    const oppAgg  = aggEntries(asOpponent);
    const oppPlayerAgg = aggEntries(asOpponent.map(e => ({ ...e, side: 'opp' })), { resultForEntry: playerPerspectiveResult });
    const allAgg  = aggEntries(allEntries, { resultForEntry: playerPerspectiveResult });
    const badges  = getPlayerBadges(asTeammate, asOpponent);
    const recentForm  = getRecentForm(profile, allGames, 8);
    const posStats    = getPositionStats(profile, allGames);
    const modeStats   = getModeStats(profile, allGames);
    const gradeDist   = getGradeDistribution(allEntries);
    const highs       = getCareerHighs(allEntries);
    const sortedLog   = [...allEntries].sort((a, b) =>
      window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology(a.game, b.game)
    );
    const relationshipMap = buildPlayerRelationshipMap(profile, allGames);

    // ── Season breakdown (uses NBA2K26_SEASONS from nba2k26-app-globals.js) ──
    const seasonBreakdown = (typeof NBA2K26_SEASONS !== 'undefined' ? NBA2K26_SEASONS : []).reduce((acc, s) => {
      const sEntries = allEntries.filter(e => {
        const d = e.game.date || '';
        return d >= s.from && d <= s.to;
      });
      if (!sEntries.length) return acc;
      const sAgg = aggEntries(sEntries, { resultForEntry: playerPerspectiveResult });
      acc.push({ season: s, agg: sAgg, n: sEntries.length });
      return acc;
    }, []);

    // ── Trends data for Canvas charts ──
    const chronoEntries = [...allEntries].sort((a, b) => {
      const da = a.game.date || '', db = b.game.date || '';
      return da < db ? -1 : da > db ? 1 : 0;
    });
    const trendPoints = chronoEntries.slice(-25).map(e => ({
      date:   e.game.date || '',
      pts:    Number(e.player.pts)   || 0,
      result: playerPerspectiveResult(e),
      gradeI: GRADE_VAL[e.player.grade] !== undefined ? GRADE_VAL[e.player.grade] : null,
    }));
    const trendsDataJson = JSON.stringify({
      points:     trendPoints,
      gradeOrder: GRADE_ORDER,
      gradeColor: GRADE_COLOR,
      profileName: profile.primaryName,
    });

    const totalApps   = allEntries.length;
    const totalWins   = allEntries.filter(e => playerPerspectiveResult(e) === 'W').length;
    const totalWinPct = totalApps ? Math.round(totalWins / totalApps * 100) : null;
    const chemScore   = tmAgg  ? tmAgg.winPct  : null;
    const threatScore = oppPlayerAgg ? oppPlayerAgg.winPct : null;
    const lang = getLang();

    /* ── HEADER ─────────────────────────────────────────────── */
    const aliasTagsHtml = profile.aliases
      .filter(a => norm(a) !== norm(profile.primaryName))
      .slice(0, 4)
      .map(a => `<span class="pp-alias-tag">${eh(a)}</span>`)
      .join('');

    const quickStatsHtml = `
      <div class="pp-quick-stats">
        <div class="pp-stat-chip">
          <span class="pp-stat-num">${totalApps}</span>
          <span class="pp-stat-lbl">${t('Games')}</span>
        </div>
        ${asTeammate.length ? `
        <div class="pp-stat-chip">
          <span class="pp-stat-num pp-chip-tm">${asTeammate.length}</span>
          <span class="pp-stat-lbl">${t('Tm Games')}</span>
        </div>` : ''}
        ${asOpponent.length ? `
        <div class="pp-stat-chip">
          <span class="pp-stat-num pp-chip-opp">${asOpponent.length}</span>
          <span class="pp-stat-lbl">${t('vs Games')}</span>
        </div>` : ''}
        ${totalWinPct !== null ? `
        <div class="pp-stat-chip">
          <span class="pp-stat-num" style="color:${totalWinPct >= 50 ? '#43d968' : '#ff5a5a'}">${totalWinPct}%</span>
          <span class="pp-stat-lbl">${t('Overall Win%')}</span>
        </div>` : ''}
        ${chemScore !== null && asTeammate.length >= 2 ? `
        <div class="pp-stat-chip" title="${t('Win rate as teammate')}">
          <span class="pp-stat-num" style="color:${chemScore >= 65 ? '#43d968' : chemScore >= 50 ? '#f6c638' : '#ff5a5a'}">${chemScore}%</span>
          <span class="pp-stat-lbl">${t('Chemistry')}</span>
        </div>` : ''}
        ${threatScore !== null && asOpponent.length >= 2 ? `
        <div class="pp-stat-chip" title="${t('How hard they are to beat as an opponent')}">
          <span class="pp-stat-num" style="color:${threatScore >= 65 ? '#e21a2f' : threatScore >= 50 ? '#f6c638' : '#43d968'}">${threatScore}%</span>
          <span class="pp-stat-lbl">${t('Threat')}</span>
        </div>` : ''}
      </div>`;

    const badgesHtml = badges.length
      ? `<div class="pp-badges">${badges.map(b => {
          const tipData = BADGE_DESCS[b.label];
          const tip = tipData ? esc(lang === 'zh' ? tipData.zh : tipData.en) : '';
          return `<span class="pp-badge ${b.cls}"${tip ? ` data-tip="${tip}"` : ''}>${b.icon} <span class="pp-badge-txt">${esc(lang === 'zh' ? b.zh : b.label)}</span></span>`;
        }).join('')}</div>`
      : '';

    const backBtn = mode === 'page'
      ? `<button class="pp-back-btn" onclick="showPage('players')"><span class="pp-back-arrow">←</span> ${t('Players')}</button>`
      : `<button class="pp-back-btn" onclick="closePlayerCard()"><span class="pp-back-arrow">←</span> ${t('Player Directory')}</button>`;

    const headerHtml = `
      <div class="pp-header">
        ${backBtn}
        <div class="pp-hero">
          <div class="pp-avatar" style="background:${avatarColor(profile.primaryName)};">
            ${eh(profile.primaryName.charAt(0).toUpperCase())}
          </div>
          <div class="pp-hero-info">
            <div class="pp-name">${eh(profile.primaryName)}</div>
            <div class="pp-sub">
              ${aliasTagsHtml}
              <span class="pp-created-lbl">${t('Created')} ${esc(profile.createdAt || '')}</span>
            </div>
            ${badgesHtml}
          </div>
        </div>
        ${quickStatsHtml}
      </div>`;

    /* ── TAB NAV ────────────────────────────────────────────── */
    const tabNavHtml = `
      <div class="pp-tab-nav" id="pp-tab-nav">
        <button class="pp-tab-btn active" onclick="switchPlayerTab('overview')"  data-tab="overview">${t('Overview')}</button>
        <button class="pp-tab-btn"        onclick="switchPlayerTab('log')"       data-tab="log">${t('Game Log')}</button>
        <button class="pp-tab-btn"        onclick="switchPlayerTab('identity')"  data-tab="identity">${t('Identity & Aliases')}</button>
      </div>`;

    /* ── OVERVIEW TAB ───────────────────────────────────────── */
    const statRow3 = (lbl, all, tm, opp) => `
      <tr>
        <td class="pp-st-label">${esc(lbl)}</td>
        <td class="pp-st-all">${esc(String(all != null ? all : '--'))}</td>
        <td class="pp-st-tm">${esc(String(tm  != null ? tm  : '--'))}</td>
        <td class="pp-st-opp">${esc(String(opp != null ? opp : '--'))}</td>
      </tr>`;

    const compTableHtml = `
      <div class="table-wrap pp-table-wrap">
        <table class="pp-stat-table">
          <thead>
            <tr>
              <th style="text-align:left;"></th>
              <th>${t('Combined')}</th>
              <th class="pp-th-tm">${t('Teammate')}</th>
              <th class="pp-th-opp">${t('Opponent')}</th>
            </tr>
          </thead>
          <tbody>
            ${statRow3(t('Games'),   totalApps, asTeammate.length, asOpponent.length)}
            ${allAgg || tmAgg || oppAgg ? `
            ${statRow3('W–L',
              allAgg  ? `${allAgg.wins}W–${allAgg.losses}L`  : '--',
              tmAgg   ? `${tmAgg.wins}W–${tmAgg.losses}L`    : '--',
              oppPlayerAgg  ? `${oppPlayerAgg.wins}W–${oppPlayerAgg.losses}L`  : '--')}
            ${statRow3('Win%',
              allAgg  ? allAgg.winPct  + '%' : '--',
              tmAgg   ? tmAgg.winPct   + '%' : '--',
              oppPlayerAgg  ? oppPlayerAgg.winPct  + '%' : '--')}
            ${statRow3('PTS',  allAgg?.ppg,  tmAgg?.ppg,  oppPlayerAgg?.ppg)}
            ${statRow3('REB',  allAgg?.rpg,  tmAgg?.rpg,  oppPlayerAgg?.rpg)}
            ${statRow3('AST',  allAgg?.apg,  tmAgg?.apg,  oppPlayerAgg?.apg)}
            ${statRow3('STL',  allAgg?.spg,  tmAgg?.spg,  oppPlayerAgg?.spg)}
            ${statRow3('BLK',  allAgg?.bpg,  tmAgg?.bpg,  oppPlayerAgg?.bpg)}
            ${statRow3('TO',   allAgg?.topg, tmAgg?.topg, oppPlayerAgg?.topg)}
            ${statRow3('FG%',  allAgg?.fgPct,  tmAgg?.fgPct,  oppPlayerAgg?.fgPct)}
            ${statRow3('3P%',  allAgg?.fg3Pct, tmAgg?.fg3Pct, oppPlayerAgg?.fg3Pct)}
            ${statRow3('FT%',  allAgg?.ftPct,  tmAgg?.ftPct,  oppPlayerAgg?.ftPct)}
            ${statRow3(t('Avg Grade'), allAgg?.avgGrade, tmAgg?.avgGrade, oppPlayerAgg?.avgGrade)}
            ` : ''}
          </tbody>
        </table>
      </div>`;

    const relationshipLabel = row => {
      if (!row) return '';
      if (row.games >= 3 && row.winPct >= 70 && row.plusMinus >= 3) return t('Core Duo');
      if (row.winPct >= 60 && row.plusMinus >= 0) return t('Hot Pair');
      if (row.winPct < 45 || row.plusMinus < -3) return t('Needs Review');
      return t('Stable Pair');
    };
    const matchupLabel = row => {
      if (!row) return '';
      if (row.games >= 2 && row.winPct <= 40 && row.plusMinus >= 1) return t('Tough matchup');
      if (row.winPct >= 60 && row.plusMinus <= 0) return t('Favorable matchup');
      return t('Even Rival');
    };
    const signedOne = value => {
      const n = Number(value) || 0;
      return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
    };
    const one = value => (Number(value) || 0).toFixed(1);
    const allies = relationshipMap.allies;
    const matchups = relationshipMap.matchups;
    const reliableAllies = allies.filter(row => row.games >= 2);
    const bestAlly = reliableAllies[0] || allies[0];
    const riskAlly = (reliableAllies.length ? [...reliableAllies] : [...allies])
      .sort((a, b) => a.winPct - b.winPct || a.plusMinus - b.plusMinus || b.games - a.games)[0];
    const toughMatchup = matchups[0];
    const favorableMatchup = [...matchups].sort((a, b) =>
      b.winPct - a.winPct ||
      a.plusMinus - b.plusMinus ||
      b.games - a.games
    )[0];
    const relationshipMeta = (row, emptyText, labelFn) => row
      ? `${row.games} GP &middot; ${row.winPct}% ${t('Player win rate')} &middot; ${signedOne(row.plusMinus)} +/-${labelFn ? ` &middot; ${labelFn(row)}` : ''}`
      : esc(t(emptyText));
    const relationSummaryCards = [
      {
        label: t('Best partner'),
        name: bestAlly?.name || '-',
        meta: relationshipMeta(bestAlly, 'No partner data yet.', relationshipLabel),
        tone: 'good',
      },
      {
        label: t('Risk pairing'),
        name: riskAlly?.name || '-',
        meta: relationshipMeta(riskAlly, 'No partner data yet.', relationshipLabel),
        tone: 'warn',
      },
      {
        label: t('Toughest matchup'),
        name: toughMatchup?.name || '-',
        meta: relationshipMeta(toughMatchup, 'No matchup data yet.', matchupLabel),
        tone: 'bad',
      },
      {
        label: t('Favorable matchup'),
        name: favorableMatchup?.name || '-',
        meta: relationshipMeta(favorableMatchup, 'No matchup data yet.', matchupLabel),
        tone: 'good',
      },
    ].map(card => `
      <article class="pp-relation-card ${card.tone}">
        <span>${eh(card.label)}</span>
        <strong>${eh(card.name)}</strong>
        <small>${card.meta}</small>
      </article>
    `).join('');
    const relationRows = allies.length ? allies.slice(0, 6).map(row => `
      <article class="pp-relation-row ${row.winPct >= 60 && row.plusMinus >= 0 ? 'good' : row.winPct < 45 || row.plusMinus < -3 ? 'bad' : ''}">
        <div class="pp-relation-main">
          <strong>${eh(row.name)}</strong>
          <span>${row.games} GP &middot; ${row.winPct}% ${t('Player win rate')} &middot; ${signedOne(row.plusMinus)} +/-</span>
        </div>
        <div class="pp-relation-stats">
          <span>${one(row.ppg)} ${t('PPG')}</span>
          <span>${one(row.apg)} ${t('APG')}</span>
          <b>${eh(relationshipLabel(row))}</b>
        </div>
      </article>
    `).join('') : `<div class="pp-relation-empty">${t('Track more roster rows with this player to unlock relationship reads.')}</div>`;
    const matchupRows = matchups.length ? matchups.slice(0, 6).map(row => `
      <article class="pp-relation-row ${row.winPct >= 60 && row.plusMinus <= 0 ? 'good' : row.winPct <= 40 && row.plusMinus >= 1 ? 'bad' : ''}">
        <div class="pp-relation-main">
          <strong>${eh(row.name)}</strong>
          <span>${row.games} GP &middot; ${row.winPct}% ${t('Player win rate')} &middot; ${signedOne(row.plusMinus)} +/-</span>
        </div>
        <div class="pp-relation-stats">
          <span>${one(row.ppg)} ${t('PPG')}</span>
          <span>${one(row.apg)} ${t('APG')}</span>
          <b>${eh(matchupLabel(row))}</b>
        </div>
      </article>
    `).join('') : `<div class="pp-relation-empty">${t('No matchup data yet.')}</div>`;
    const recNum = value => Number(value) || 0;
    const confidence = row => row.games >= 5 ? t('High confidence') : row.games >= 3 ? t('Medium confidence') : t('Small sample');
    const recMeta = row => `${row.games} GP / ${Math.round(recNum(row.winPct))}% ${t('Player win rate')} / ${signedOne(row.plusMinus)} +/-`;
    const allyScore = row =>
      recNum(row.winPct) * 0.6 +
      recNum(row.plusMinus) * 5 +
      recNum(row.ppg) * 0.25 +
      recNum(row.apg) * 1.1 +
      Math.min(row.games, 8) * 3;
    const allyRiskScore = row =>
      (100 - recNum(row.winPct)) * 0.6 +
      Math.max(0, -recNum(row.plusMinus)) * 7 +
      Math.min(row.games, 8) * 2.5;
    const recommendedAllies = [...allies]
      .map(row => ({
        tone: 'good',
        name: row.name,
        tag: t('Play with'),
        score: allyScore(row),
        confidence: confidence(row),
        meta: recMeta(row),
        reason: recNum(row.winPct) >= 60
          ? t('This partner raises the player win rate.')
          : recNum(row.plusMinus) >= 2
            ? t('This partner usually keeps the player impact positive.')
            : t('Keep testing this partner fit.'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const cautionAllies = [...allies]
      .filter(row => row.games >= 2 && (recNum(row.winPct) < 48 || recNum(row.plusMinus) < -2.5))
      .map(row => ({
        tone: 'warn',
        name: row.name,
        tag: t('Use caution'),
        score: allyRiskScore(row),
        confidence: confidence(row),
        meta: recMeta(row),
        reason: recNum(row.plusMinus) < -2.5
          ? t('This partner fit keeps producing negative plus-minus.')
          : t('This partner fit has not converted into wins yet.'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const avoidMatchups = matchups
      .filter(row => row.games >= 1)
      .slice(0, 4)
      .map(row => ({
        tone: recNum(row.winPct) <= 45 || recNum(row.plusMinus) >= 2 ? 'bad' : 'warn',
        name: row.name,
        tag: t('Prepare for'),
        confidence: confidence(row),
        meta: recMeta(row),
        reason: recNum(row.winPct) <= 45
          ? t('This matchup has held this player down.')
          : recNum(row.plusMinus) >= 2
            ? t('This opponent-side impact needs a plan.')
            : t('Respect the matchup; difficulty score is high.'),
      }));
    const attackMatchups = [...matchups]
      .filter(row => row.games >= 1)
      .sort((a, b) =>
        recNum(b.winPct) - recNum(a.winPct) ||
        recNum(a.plusMinus) - recNum(b.plusMinus) ||
        b.games - a.games
      )
      .slice(0, 4)
      .map(row => ({
        tone: 'good',
        name: row.name,
        tag: t('Attack'),
        confidence: confidence(row),
        meta: recMeta(row),
        reason: recNum(row.winPct) >= 60
          ? t('This player has controlled the matchup so far.')
          : t('This looks like a softer matchup for this player.'),
      }));
    const renderPlayerAdvisorList = (title, subtitle, rows, emptyText) => `
      <section class="pp-lineup-list">
        <div class="pp-lineup-list-head">
          <strong>${eh(title)}</strong>
          <small>${eh(subtitle)}</small>
        </div>
        <div class="pp-lineup-rows">
          ${rows.length ? rows.map(row => `
            <article class="pp-lineup-row ${row.tone}">
              <div class="pp-lineup-main">
                <span>${eh(row.tag)}</span>
                <strong>${eh(row.name)}</strong>
                <small>${eh(row.reason)}</small>
              </div>
              <div class="pp-lineup-meta">
                <b>${eh(row.confidence)}</b>
                <em>${eh(row.meta)}</em>
              </div>
            </article>
          `).join('') : `<div class="pp-relation-empty">${eh(emptyText)}</div>`}
        </div>
      </section>
    `;
    const playerLineupAdvisorHtml = `
      <section class="pp-lineup-advisor">
        <div class="pp-lineup-advisor-head">
          <div>
            <span>${t('PLAYER LINEUP ADVISOR')}</span>
            <strong>${t('Recommendation and avoid list')}</strong>
          </div>
          <small>${t('Player-centric recommendations from same-side partners and matchup history.')}</small>
        </div>
        <div class="pp-lineup-advisor-grid">
          ${renderPlayerAdvisorList(t('Recommended partners'), t('Use these partners when this player is in the run.'), recommendedAllies, t('Need partner rows before recommendations are reliable.'))}
          ${renderPlayerAdvisorList(t('Caution partners'), t('Review role, side, and mode before trusting this partner fit.'), cautionAllies, t('No partner avoid flags yet.'))}
          ${renderPlayerAdvisorList(t('Avoid / prepare matchups'), t('Hard matchups for this player.'), avoidMatchups, t('No matchup avoid flags yet.'))}
          ${renderPlayerAdvisorList(t('Attackable matchups'), t('Matchups this player has handled well.'), attackMatchups, t('No attackable matchup data yet.'))}
        </div>
      </section>
    `;
    const relationshipPanelHtml = (allies.length || matchups.length) ? `
      <section class="pp-relationship-board">
        <div class="pp-section-title">
          ${t('PLAYER RELATIONSHIPS')}
          <span class="pp-section-hint">${t('Chemistry reads use this player perspective.')}</span>
        </div>
        <div class="pp-relation-summary-grid">${relationSummaryCards}</div>
        ${playerLineupAdvisorHtml}
        <div class="pp-relation-grid">
          <div class="pp-relation-column">
            <div class="pp-relation-head">
              <span>${t('Lineup partners')}</span>
              <small>${t('This player same-side partners across teammate and opponent games.')}</small>
            </div>
            <div class="pp-relation-list">${relationRows}</div>
          </div>
          <div class="pp-relation-column">
            <div class="pp-relation-head">
              <span>${t('Matchup map')}</span>
              <small>${t('Opposite-side players this profile has faced in tracked games.')}</small>
            </div>
            <div class="pp-relation-list">${matchupRows}</div>
          </div>
        </div>
      </section>
    ` : '';

    // Recent form dots
    const recentFormHtml = recentForm.length ? `
      <div class="pp-recent-form">
          ${[...recentForm].reverse().map(({ game, player, side }) => {
            const playerResult = playerPerspectiveResult({ game, player, side });
            const isW = playerResult === 'W';
            const sideIcon = side === 'tm' ? '🤝' : '⚔️';
            const tooltip = `${game.date || ''} | ${playerResult || '-'} | ${side === 'tm' ? t('Teammate') : t('Opponent')} | ${player.pts || 0} PTS`;
            return `<div class="pp-form-dot ${isW ? 'rf-win' : 'rf-loss'}" title="${esc(tooltip)}">
              <span class="pp-form-result">${playerResult || '-'}</span>
              <span class="pp-form-side">${sideIcon}</span>
            </div>`;
          }).join('')}
      </div>` : '';

    // Grade distribution bars
    const totalGraded = GRADE_ORDER.reduce((s, g) => s + gradeDist[g], 0);
    const gradeBarHtml = totalGraded > 0 ? `
      <div class="pp-grade-bars">
        ${[...GRADE_ORDER].reverse().map(g => {
          const count = gradeDist[g];
          const barW  = totalGraded ? Math.round(count / totalGraded * 100) : 0;
          const color = GRADE_COLOR[g] || '#888';
          return `<div class="pp-grade-row${count === 0 ? ' pp-grade-zero' : ''}">
            <span class="pp-grade-lbl" style="color:${color};">${g}</span>
            <div class="pp-grade-track">
              <div class="pp-grade-fill" style="width:${barW}%;background:${color};"></div>
            </div>
            <span class="pp-grade-count">${count || ''}</span>
          </div>`;
        }).join('')}
      </div>` : '';

    // Advanced shooting efficiency (eFG% / TS%)
    let efgPct = '--', tsPct = '--';
    if (allAgg) {
      if (allAgg.fga) {
        efgPct = Math.round((allAgg.fgm + 0.5 * allAgg.fg3m) / allAgg.fga * 100) + '%';
      }
      const totPts = (Number(allAgg.ppg) || 0) * allAgg.n;
      const tsDenom = 2 * (allAgg.fga + 0.44 * allAgg.fta);
      if (tsDenom > 0) tsPct = Math.round(totPts / tsDenom * 100) + '%';
    }

    const shootingInner = allAgg ? `
            <div class="pp-shooting-grid">
              <div class="pp-shooting-item">
                <div class="pp-shooting-pct" style="color:${allAgg.fgPct !== '--' && parseInt(allAgg.fgPct) >= 48 ? '#43d968' : 'var(--text-primary)'};">${allAgg.fgPct}</div>
                <div class="pp-shooting-lbl">FG%</div>
                <div class="pp-shooting-sub">${allAgg.fgm}/${allAgg.fga}</div>
              </div>
              <div class="pp-shooting-item">
                <div class="pp-shooting-pct" style="color:${allAgg.fg3Pct !== '--' && parseInt(allAgg.fg3Pct) >= 38 ? '#43d968' : 'var(--text-primary)'};">${allAgg.fg3Pct}</div>
                <div class="pp-shooting-lbl">3P%</div>
                <div class="pp-shooting-sub">${allAgg.fg3m}/${allAgg.fg3a}</div>
              </div>
              <div class="pp-shooting-item">
                <div class="pp-shooting-pct" style="color:${allAgg.ftPct !== '--' && parseInt(allAgg.ftPct) >= 80 ? '#43d968' : 'var(--text-primary)'};">${allAgg.ftPct}</div>
                <div class="pp-shooting-lbl">FT%</div>
                <div class="pp-shooting-sub">${allAgg.ftm}/${allAgg.fta}</div>
              </div>
              <div class="pp-shooting-item" title="${t('Effective field goal %')}">
                <div class="pp-shooting-pct" style="color:${efgPct !== '--' && parseInt(efgPct) >= 52 ? '#43d968' : 'var(--text-primary)'};">${efgPct}</div>
                <div class="pp-shooting-lbl">eFG%</div>
                <div class="pp-shooting-sub">${one(allAgg.ppg ? allAgg.fga / allAgg.n : 0)} ${t('FGA')}</div>
              </div>
              <div class="pp-shooting-item" title="${t('True shooting %')}">
                <div class="pp-shooting-pct" style="color:${tsPct !== '--' && parseInt(tsPct) >= 56 ? '#43d968' : 'var(--text-primary)'};">${tsPct}</div>
                <div class="pp-shooting-lbl">TS%</div>
                <div class="pp-shooting-sub">${allAgg.ppg} ${t('PPG')}</div>
              </div>
            </div>` : '';

    const winrateInner = (tmAgg || oppPlayerAgg) ? `
            <div class="pp-winrate-grid">
              ${tmAgg ? `
              <div class="pp-winrate-item">
                <div class="pp-winrate-ring" style="--wr-pct:${tmAgg.winPct};--wr-color:${tmAgg.winPct >= 50 ? '#43d968' : '#e21a2f'};">
                  <span class="pp-winrate-val">${tmAgg.winPct}%</span>
                </div>
                <div class="pp-winrate-lbl pp-chip-tm">${t('As Teammate')}</div>
                <div class="pp-winrate-sub">${tmAgg.wins}W ${tmAgg.losses}L</div>
              </div>` : ''}
              ${oppPlayerAgg ? `
              <div class="pp-winrate-item">
                <div class="pp-winrate-ring" style="--wr-pct:${oppPlayerAgg.winPct};--wr-color:${oppPlayerAgg.winPct >= 65 ? '#e21a2f' : oppPlayerAgg.winPct >= 50 ? '#f6c638' : '#43d968'};">
                  <span class="pp-winrate-val">${oppPlayerAgg.winPct}%</span>
                </div>
                <div class="pp-winrate-lbl pp-chip-opp">${t('As Opponent')}</div>
                <div class="pp-winrate-sub">${oppPlayerAgg.wins}W ${oppPlayerAgg.losses}L</div>
              </div>` : ''}
            </div>` : '';

    const highsInner = highs ? `
            <div class="pp-highs-grid">
              <div class="pp-high-chip" title="${t('Career-high points in a single game')}">
                <span class="pp-high-num" style="color:#f6c638;">${highs.pts}</span>
                <span class="pp-high-lbl">PTS</span>
              </div>
              <div class="pp-high-chip" title="${t('Career-high rebounds in a single game')}">
                <span class="pp-high-num">${highs.reb}</span>
                <span class="pp-high-lbl">REB</span>
              </div>
              <div class="pp-high-chip" title="${t('Career-high assists in a single game')}">
                <span class="pp-high-num">${highs.ast}</span>
                <span class="pp-high-lbl">AST</span>
              </div>
              <div class="pp-high-chip" title="${t('Career-high steals in a single game')}">
                <span class="pp-high-num" style="color:#43d968;">${highs.stl}</span>
                <span class="pp-high-lbl">STL</span>
              </div>
              <div class="pp-high-chip" title="${t('Career-high blocks in a single game')}">
                <span class="pp-high-num" style="color:#4da6ff;">${highs.blk}</span>
                <span class="pp-high-lbl">BLK</span>
              </div>
              ${highs.fg3m > 0 ? `
              <div class="pp-high-chip" title="${t('Career-high three-pointers made in a single game')}">
                <span class="pp-high-num" style="color:#c084fc;">${highs.fg3m}</span>
                <span class="pp-high-lbl">3PM</span>
              </div>` : ''}
              ${highs.to > 0 ? `
              <div class="pp-high-chip" title="${t('Career-high turnovers in a single game')}">
                <span class="pp-high-num" style="color:#ff5a5a;">${highs.to}</span>
                <span class="pp-high-lbl">TO</span>
              </div>` : ''}
              ${highs.bestGrade ? `
              <div class="pp-high-chip" title="${t('Best letter grade received')}">
                <span class="pp-high-num" style="color:${GRADE_COLOR[highs.bestGrade] || 'var(--text-primary)'};">${highs.bestGrade}</span>
                <span class="pp-high-lbl">${t('Grade')}</span>
              </div>` : ''}
            </div>` : '';

    const seasonInner = seasonBreakdown.length >= 2 ? `
            <div class="table-wrap pp-table-wrap">
              <table class="pp-season-table">
                <thead>
                  <tr>
                    <th style="text-align:left;">${lang === 'zh' ? '赛季' : 'Ssn'}</th>
                    <th>G</th><th>Win%</th><th>PTS</th><th>REB</th><th>AST</th>
                    <th>${lang === 'zh' ? '评级' : 'Grade'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${seasonBreakdown.map(({ season, agg, n }) => {
                    const isActive = (typeof currentSeason === 'function') &&
                                     currentSeason().n === season.n;
                    return `<tr class="${isActive ? 'pp-season-current' : ''}">
                      <td><span class="pp-season-tag"${isActive ? ' style="color:#f6c638;font-weight:800;"' : ''}>${lang === 'zh' ? season.zh : season.label}</span></td>
                      <td>${n}</td>
                      <td style="color:${agg.winPct >= 50 ? '#43d968' : '#ff5a5a'};font-weight:700;">${agg.winPct}%</td>
                      <td>${agg.ppg}</td><td>${agg.rpg}</td><td>${agg.apg}</td>
                      <td style="color:${GRADE_COLOR[agg.avgGrade] || 'var(--text-dim)'};">${esc(agg.avgGrade || '–')}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '';

    const seasonTitle = lang === 'zh' ? '逐季对比' : 'Season by Season';

    // Trends charts — folded into the Overview (no longer a separate tab)
    const trendsSection = `
      <section class="pp-trends-section">
        <div class="pp-section-title">${lang === 'zh' ? '走势' : 'Trends'}</div>
        <script type="application/json" id="pp-trends-json">${trendsDataJson}<\/script>
        ${trendPoints.length < 3
          ? `<div class="pp-empty" style="padding:24px;text-align:center;">
               <div style="font-size:28px;margin-bottom:8px;">📊</div>
               <div style="color:var(--text-dim);font-size:12px;">${lang === 'zh' ? '至少需要 3 场记录才能显示走势图' : 'Need at least 3 games to show trend charts'}</div>
             </div>`
          : `<div class="pp-trends-grid">
               <div class="pp-trend-card">
                 <div class="pp-section-title">${lang === 'zh' ? '得分走势（近25场）' : 'Scoring Trend (last 25 games)'}</div>
                 <div class="pp-section-hint" style="margin-bottom:8px;">${lang === 'zh' ? '🟢 胜场 / 🔴 败场' : '🟢 Win / 🔴 Loss'}</div>
                 <canvas id="pp-canvas-pts" class="pp-trend-canvas" width="560" height="200"></canvas>
               </div>
               <div class="pp-trend-card">
                 <div class="pp-section-title">${lang === 'zh' ? '近期胜率（5场滚动窗口）' : 'Rolling Win Rate (5-game window)'}</div>
                 <div class="pp-section-hint" style="margin-bottom:8px;">${lang === 'zh' ? '灰色虚线 = 50% 基准' : 'Grey dashed = 50% baseline'}</div>
                 <canvas id="pp-canvas-wr" class="pp-trend-canvas" width="560" height="200"></canvas>
               </div>
               <div class="pp-trend-card">
                 <div class="pp-section-title">${lang === 'zh' ? '评级分布' : 'Grade Distribution'}</div>
                 <canvas id="pp-canvas-grade" class="pp-trend-canvas" width="560" height="220"></canvas>
               </div>
             </div>`
        }
      </section>`;

    // ── By Position / By Mode — full-width detailed tables (every column shows,
    //    no truncation) placed below the masonry. ──
    const posTableFull = posStats.length ? `
      <section class="pp-splits-section">
        <div class="pp-section-title">${t('By Position')}</div>
        <div class="table-wrap pp-table-wrap">
          <table class="pp-stat-table">
            <thead><tr>
              <th style="text-align:left;">${t('Position')}</th>
              <th>G</th><th>W–L</th><th>Win%</th>
              <th class="pp-th-tm">${t('Tm')}</th><th class="pp-th-opp">${t('Opp')}</th>
              <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th>
              <th>FG%</th><th>3P%</th><th>${t('Grade')}</th>
            </tr></thead>
            <tbody>${posStats.map(row => `<tr>
              <td><span class="pp-pos-tag">${esc(row.pos)}</span></td>
              <td>${row.n}</td><td>${row.wins}W–${row.losses}L</td>
              <td style="color:${row.winPct >= 50 ? '#43d968' : '#ff5a5a'};font-weight:700;">${row.winPct}%</td>
              <td class="pp-st-tm">${row.asTm}</td><td class="pp-st-opp">${row.asOpp}</td>
              <td>${row.ppg}</td><td>${row.rpg}</td><td>${row.apg}</td><td>${row.spg}</td><td>${row.bpg}</td>
              <td>${row.fgPct}</td><td>${row.fg3Pct}</td>
              <td style="color:${GRADE_COLOR[row.avgGrade] || 'var(--text-dim)'};font-weight:700;">${esc(row.avgGrade)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </section>` : '';

    const modeTableFull = modeStats.length ? `
      <section class="pp-splits-section">
        <div class="pp-section-title">${t('By Mode')}</div>
        <div class="table-wrap pp-table-wrap">
          <table class="pp-stat-table">
            <thead><tr>
              <th style="text-align:left;">${t('Mode')}</th>
              <th>G</th><th>W–L</th><th>Win%</th>
              <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th>
              <th>FG%</th><th>3P%</th><th>${t('Grade')}</th>
            </tr></thead>
            <tbody>${modeStats.map(row => `<tr>
              <td><span class="pp-mode-tag">${esc(row.mode)}</span></td>
              <td>${row.n}</td><td>${row.wins}W–${row.losses}L</td>
              <td style="color:${row.winPct >= 50 ? '#43d968' : '#ff5a5a'};font-weight:700;">${row.winPct}%</td>
              <td>${row.ppg}</td><td>${row.rpg}</td><td>${row.apg}</td><td>${row.spg}</td><td>${row.bpg}</td>
              <td>${row.fgPct}</td><td>${row.fg3Pct}</td>
              <td style="color:${GRADE_COLOR[row.avgGrade] || 'var(--text-dim)'};font-weight:700;">${esc(row.avgGrade)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </section>` : '';

    const maxPosFreqN = posStats.length ? posStats[0].n : 1;
    const posFreqInner = posStats.length > 1 ? `
            <div class="pp-pos-freq">
              ${posStats.map((row, i) => {
                const barPct = Math.round(row.n / maxPosFreqN * 100);
                const barColor = i === 0 ? '#4da6ff' : i === 1 ? '#43d968' : i === 2 ? '#f6c638' : '#c084fc';
                return `<div class="pp-pos-freq-row">
                  <span class="pp-pos-tag" style="min-width:34px;">${esc(row.pos)}</span>
                  <div class="pp-grade-track" style="flex:1;"><div class="pp-grade-fill" style="width:${barPct}%;background:${barColor};opacity:0.85;"></div></div>
                  <span style="font-size:11px;color:var(--text-dim);min-width:26px;text-align:right;">${row.n}G</span>
                </div>`;
              }).join('')}
            </div>` : '';

    const shotBreakInner = (() => {
      if (!allAgg || !allAgg.fga) return '';
      const fga = Number(allAgg.fga) || 0, fgm = Number(allAgg.fgm) || 0;
      const fg3a = Number(allAgg.fg3a) || 0, fg3m = Number(allAgg.fg3m) || 0;
      const fta = Number(allAgg.fta) || 0, ftm = Number(allAgg.ftm) || 0;
      const pt2a = fga - fg3a, pt2m = fgm - fg3m;
      if (fga + fta === 0) return '';
      const pct = (m, a) => a > 0 ? (m / a * 100).toFixed(1) : '--';
      const rows = [
        { lbl: lang === 'zh' ? '两分球' : '2-Pointer',  icon: '🏀', m: pt2m, a: pt2a, color: '#4da6ff' },
        { lbl: lang === 'zh' ? '三分球' : '3-Pointer',  icon: '🎯', m: fg3m, a: fg3a, color: '#c084fc' },
        { lbl: lang === 'zh' ? '罚球'   : 'Free Throw', icon: '🦶', m: ftm,  a: fta,  color: '#f6c638' },
      ].filter(r => r.a > 0);
      const maxA = Math.max(...rows.map(r => r.a));
      const bar = (a, color) => `<div class="pp-shot-track"><div class="pp-shot-fill" style="width:${maxA > 0 ? Math.round(a / maxA * 100) : 0}%;background:${color};"></div></div>`;
      return `<div class="pp-shot-breakdown">${rows.map(r => `
        <div class="pp-shot-row"><span class="pp-shot-lbl">${r.icon} ${r.lbl}</span>${bar(r.a, r.color)}<span class="pp-shot-pct" style="color:${r.color};">${pct(r.m, r.a)}%</span><span class="pp-shot-attempts">${r.m}/${r.a}</span></div>`).join('')}</div>`;
    })();

    const overviewTab = `
      <div class="pp-panel" id="pp-panel-overview">
        <div class="pp-dash">
          <section class="pp-card pp-card--stats">
            <div class="pp-section-title">${t('Stats Comparison')}</div>
            ${compTableHtml}
          </section>
          ${shootingInner ? `
          <section class="pp-card pp-card--shooting">
            <div class="pp-section-title">${t('Shooting')}</div>
            ${shootingInner}
          </section>` : ''}
          ${winrateInner ? `
          <section class="pp-card pp-card--winrate">
            <div class="pp-section-title">${t('Win Rate')}</div>
            ${winrateInner}
          </section>` : ''}
          ${highsInner ? `
          <section class="pp-card pp-card--highs">
            <div class="pp-section-title">${t('Career Highs')}</div>
            ${highsInner}
          </section>` : ''}
          ${recentFormHtml ? `
          <section class="pp-card pp-card--form">
            <div class="pp-section-title">${t('Recent Form')} <span class="pp-section-hint">(${t('latest right')})</span></div>
            ${recentFormHtml}
          </section>` : ''}
          ${gradeBarHtml ? `
          <section class="pp-card pp-card--grades">
            <div class="pp-section-title">${t('Grade Distribution')} <span class="pp-section-hint">${totalGraded} ${t('graded')}</span></div>
            ${gradeBarHtml}
          </section>` : ''}
          ${seasonInner ? `
          <section class="pp-card pp-card--season">
            <div class="pp-section-title">${seasonTitle}</div>
            ${seasonInner}
          </section>` : ''}
          ${posFreqInner ? `
          <section class="pp-card pp-card--posfreq">
            <div class="pp-section-title">${t('Position Frequency')}</div>
            ${posFreqInner}
          </section>` : ''}
          ${shotBreakInner ? `
          <section class="pp-card pp-card--shotbk">
            <div class="pp-section-title">${lang === 'zh' ? '投篮结构' : 'Shot Breakdown'}</div>
            ${shotBreakInner}
          </section>` : ''}
        </div>
        <div class="pp-splits-grid">
          ${posTableFull}
          ${modeTableFull}
        </div>
        ${relationshipPanelHtml}
      </div>`;


    /* ── GAME LOG TAB ───────────────────────────────────────── */
    const logRows = sortedLog.map(({ game, player, side }) => {
      const sidePill  = side === 'tm'
        ? `<span class="player-meta-pill teammate">${t('Tm')}</span>`
        : `<span class="player-meta-pill opponent">${t('Opp')}</span>`;
      const dcPill = player.disconnected ? `<span class="player-meta-pill dc">${t('DC')}</span>` : '';
      const aiPill = player.isAI        ? `<span class="player-meta-pill ai">${t('AI')}</span>` : '';
      const posBadge = player.position
        ? `<span class="pp-pos-tag" style="font-size:9px;padding:1px 5px;">${esc(player.position)}</span>` : '';
      const playerResult = playerPerspectiveResult({ game, player, side });
      const rCls = playerResult === 'W' ? 'result-w' : 'result-l';
      const gradeColor = GRADE_COLOR[player.grade] || 'var(--text-dim)';
      const fgStr  = (player.fgm  || 0) + '/' + (player.fga  || 0);
      const fg3Str = (player.fg3m || 0) + '/' + (player.fg3a || 0);
      const gameSeason = (typeof dateToSeason === 'function') ? (dateToSeason(game.date) || '') : '';
      return `<tr data-side="${side}" data-result="${playerResult}" data-mode="${esc(game.mode || '')}" data-season="${gameSeason}">
        <td class="pp-log-date">${esc(game.date || '–')}</td>
        <td>${esc(game.mode || '–')}</td>
        <td class="${rCls}" style="text-align:center;font-weight:800;">${playerResult}</td>
        <td style="white-space:nowrap;">${sidePill}${dcPill}${aiPill}${posBadge}</td>
        <td style="text-align:center;">${player.pts  || 0}</td>
        <td style="text-align:center;">${player.reb  || 0}</td>
        <td style="text-align:center;">${player.ast  || 0}</td>
        <td style="text-align:center;">${player.stl  || 0}</td>
        <td style="text-align:center;">${player.blk  || 0}</td>
        <td style="text-align:center;">${player.to   || 0}</td>
        <td style="text-align:center;font-size:11px;">${fgStr}</td>
        <td style="text-align:center;font-size:11px;">${fg3Str}</td>
        <td style="text-align:center;color:${gradeColor};font-weight:700;">${esc(player.grade || '–')}</td>
      </tr>`;
    }).join('');

    const logTab = `
      <div class="pp-panel" id="pp-panel-log" style="display:none;">
        <div class="pp-log-filters">
          <div class="pp-filter-group">
            <span class="pp-filter-lbl">${t('Role')}:</span>
            <button class="pp-filter-btn active" data-log-filter="side" data-log-value="all" onclick="filterGameLog(this,'side','all')">${t('All')}</button>
            <button class="pp-filter-btn" data-log-filter="side" data-log-value="tm" onclick="filterGameLog(this,'side','tm')">${t('Teammate')}</button>
            <button class="pp-filter-btn" data-log-filter="side" data-log-value="opp" onclick="filterGameLog(this,'side','opp')">${t('Opponent')}</button>
          </div>
          <div class="pp-filter-group">
            <span class="pp-filter-lbl">W/L:</span>
            <button class="pp-filter-btn active" data-log-filter="result" data-log-value="all" onclick="filterGameLog(this,'result','all')">${t('All')}</button>
            <button class="pp-filter-btn" data-log-filter="result" data-log-value="W" onclick="filterGameLog(this,'result','W')">${t('Win')}</button>
            <button class="pp-filter-btn" data-log-filter="result" data-log-value="L" onclick="filterGameLog(this,'result','L')">${t('Loss')}</button>
          </div>
          <div class="pp-filter-group pp-filter-group-season">
            <span class="pp-filter-lbl">${lang === 'zh' ? '赛季' : 'Season'}:</span>
            <button class="pp-filter-btn active" data-log-filter="season" data-log-value="all" onclick="filterGameLog(this,'season','all')">${lang === 'zh' ? '全部' : 'All'}</button>
            ${(typeof NBA2K26_SEASONS !== 'undefined' ? NBA2K26_SEASONS : []).map(s =>
              `<button class="pp-filter-btn pp-season-btn" data-log-filter="season"
                data-log-value="${s.n}"
                onclick="filterGameLog(this,'season','${s.n}')"
                title="${s.from} – ${s.to}">${lang === 'zh' ? s.zh : s.label}</button>`
            ).join('')}
          </div>
        </div>
        <div class="table-wrap pp-table-wrap" style="max-height:520px;overflow-y:auto;">
          <table class="pp-log-table" id="pp-log-table">
            <thead>
              <tr>
                <th>${t('Date')}</th>
                <th>${t('Mode')}</th>
                <th>W/L</th>
                <th>${t('Role')}</th>
                <th>PTS</th><th>REB</th><th>AST</th>
                <th>STL</th><th>BLK</th><th>TO</th>
                <th>FGM-A</th><th>3PM-A</th>
                <th>${t('Grade')}</th>
              </tr>
            </thead>
            <tbody id="pp-log-tbody">
              ${logRows || `<tr><td colspan="13" style="text-align:center;color:var(--text-dim);padding:24px;">${t('No game data')}</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pp-log-count" id="pp-log-count">${sortedLog.length} ${t('appearances')} ${t('total')}</div>
      </div>`;

    /* ── IDENTITY TAB ───────────────────────────────────────── */
    const aliasItems = profile.aliases.map(a => {
      const isPrimary = norm(a) === norm(profile.primaryName);
      return `
        <div class="player-alias-item">
          <span class="player-alias-name${isPrimary ? ' primary' : ''}">${eh(a)}</span>
          ${isPrimary
            ? `<span class="player-alias-badge">${t('Primary')}</span>`
            : `<button class="player-alias-set-primary" onclick="setPlayerPrimary(${esc(JSON.stringify(profileId))},${esc(JSON.stringify(a))})">${t('Set Primary')}</button>`}
          ${!isPrimary && profile.aliases.length > 1
            ? `<button class="player-alias-remove" onclick="removePlayerAlias(${esc(JSON.stringify(profileId))},${esc(JSON.stringify(a))})" title="${t('Remove alias')}">×</button>`
            : ''}
        </div>`;
    }).join('');

    const identityTab = `
      <div class="pp-panel" id="pp-panel-identity" style="display:none;">
        <div class="pp-identity-grid">

          <div class="pp-identity-col">
            <div class="pp-section-title">${t('Identity & Aliases')}</div>
            <div class="player-aliases-list">${aliasItems}</div>
            <div class="player-alias-row" style="margin-top:14px;">
              <input id="new-alias-input" class="player-alias-input" type="text"
                     placeholder="${t('Add alias...')}" list="player-names-list" autocomplete="off">
              <button class="btn-ghost btn" onclick="addPlayerAlias(${esc(JSON.stringify(profileId))})">${t('Add Alias')}</button>
            </div>

            <div class="pp-section-title" style="margin-top:28px;">${t('Notes')}</div>
            <textarea class="player-notes-input" id="player-notes-input" rows="5"
                      placeholder="${t('Player notes...')}">${eh(profile.notes || '')}</textarea>
            <button class="btn-ghost btn" style="margin-top:8px;width:100%;"
                    onclick="savePlayerNotes(${esc(JSON.stringify(profileId))})">${t('Save Notes')}</button>
          </div>

          <div class="pp-identity-col">
            <div class="pp-section-title">${t('Merge With Another Player')}</div>
            <p class="player-merge-hint">${t('Merging combines all aliases and history. The other player profile will be deleted.')}</p>
            <div class="player-alias-row" style="margin-top:10px;">
              <input id="merge-player-input" class="player-alias-input" type="text"
                     placeholder="${t('Search player name...')}" list="player-names-list" autocomplete="off">
              <button class="btn-ghost btn" onclick="mergePlayerByName(${esc(JSON.stringify(profileId))})">${t('Merge')}</button>
            </div>

            <div class="pp-section-title" style="margin-top:28px;">${t('Profile Info')}</div>
            <div class="pp-profile-meta">
              <div class="pp-meta-row">
                <span>${t('Created')}</span><span>${esc(profile.createdAt || '')}</span>
              </div>
              <div class="pp-meta-row">
                <span>${t('Total appearances')}</span><span>${totalApps}</span>
              </div>
              <div class="pp-meta-row">
                <span>${t('Aliases')}</span><span>${profile.aliases.length}</span>
              </div>
              <div class="pp-meta-row">
                <span>${t('DC games')}</span>
                <span>${allEntries.filter(e => e.player.disconnected).length}</span>
              </div>
              <div class="pp-meta-row">
                <span>${t('AI games')}</span>
                <span>${allEntries.filter(e => e.player.isAI).length}</span>
              </div>
            </div>

            <div class="pp-section-title" style="margin-top:28px;">${lang === 'zh' ? '导出数据' : 'Export'}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
              <button class="btn-ghost btn pp-export-btn"
                      onclick="exportPlayerData(${esc(JSON.stringify(profileId))})"
                      title="${lang === 'zh' ? '下载球员全部统计为 JSON 文件' : 'Download all player stats as JSON'}">
                ⬇️ ${lang === 'zh' ? '导出 JSON' : 'Export JSON'}
              </button>
              <button class="btn-ghost btn pp-export-btn"
                      onclick="downloadPlayerCard(${esc(JSON.stringify(profileId))})"
                      title="${lang === 'zh' ? '生成球员名片图片并下载' : 'Generate and download player card image'}">
                🖼️ ${lang === 'zh' ? '名片图片' : 'Card Image'}
              </button>
            </div>

            <div class="pp-section-title" style="margin-top:28px;color:#e21a2f;">${t('Danger Zone')}</div>
            <button class="btn-ghost btn btn-danger" style="width:100%;margin-top:8px;"
                    onclick="deletePlayerProfile(${esc(JSON.stringify(profileId))})">${t('Delete Profile')}</button>
            <p style="font-size:11px;color:var(--text-dim);margin-top:6px;line-height:1.5;">
              ${t('Game records are not affected.')}
            </p>
          </div>

        </div>
      </div>`;

    /* ── ASSEMBLE ───────────────────────────────────────────── */
    const innerHtml = `
      ${headerHtml}
      ${tabNavHtml}
      <div class="pp-body">
        ${overviewTab}
        ${logTab}
        ${identityTab}
      </div>`;
    const overlayPreviewHtml = `
      ${headerHtml}
      <div class="pp-overlay-preview">
        <div class="pp-overlay-preview-head">
          <div>
            <div class="pp-section-title">${t('Quick Preview')}</div>
            <p>${t('Review the essentials here, then open the full profile for logs, trends, and identity tools.')}</p>
          </div>
          <button class="context-action primary" type="button"
                  onclick="closePlayerCard();openPlayerPage(${esc(JSON.stringify(profileId))})">${t('Open Full Profile')}</button>
        </div>
        <div class="pp-overlay-preview-grid">
          <section class="pp-card pp-card--stats">
            <div class="pp-section-title">${t('Stats Comparison')}</div>
            ${compTableHtml}
          </section>
          ${recentFormHtml ? `
          <section class="pp-card pp-card--form">
            <div class="pp-section-title">${t('Recent Form')} <span class="pp-section-hint">(${t('latest right')})</span></div>
            ${recentFormHtml}
          </section>` : ''}
        </div>
      </div>`;

    // Position/mode/shot blocks are now masonry dash cards; only Trends is appended full-width.
    const overviewExtras = trendsSection;

    if (mode === 'page') {
      const container = document.getElementById('player-page-container');
      if (!container) return;
      container.innerHTML = innerHtml;
      const ovPanel = container.querySelector('#pp-panel-overview');
      if (ovPanel) ovPanel.insertAdjacentHTML('beforeend', overviewExtras);
      // Sticky tab nav on window scroll
      const nav = container.querySelector('.pp-tab-nav');
      const header = container.querySelector('.pp-header');
      if (nav) {
        const threshold = (header ? header.offsetHeight : 120);
        const onScroll = () => {
          nav.classList.toggle('pp-tab-nav-stuck', window.scrollY > threshold);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        container._ppScrollCleanup = () => window.removeEventListener('scroll', onScroll);
      }
    } else {
      const html = `
        <div class="pp-overlay" id="player-card-overlay">
          <div class="pp-page pp-page--preview">
            ${overlayPreviewHtml}
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      // Trends live inside the Overview now — draw once the overlay is in the DOM.
    }
  }

  /* ─────────────────────────────────────────────────────────────
     EXPORT
  ───────────────────────────────────────────────────────────── */
  window.NBA2K26_PLAYER_PROFILES = {
    genId, norm, esc,
    findByName, createProfile,
    getStats, aggEntries,
    getPositionStats, getModeStats,
    getGradeDistribution, getRecentForm,
    getCareerHighs, getPlayerBadges,
    syncFromGame, buildAliasMap, forGames,
    mergePlayers,
    updateDatalist,
    renderPlayersPanel,
    renderPlayerCard,
  };
})(window);
