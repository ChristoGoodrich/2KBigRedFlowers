// NBA 2K26 OCR text parsing and confidence scoring helpers.
// This module is intentionally DOM-free so OCR engine swaps do not affect import parsing.
const OCRParser = {
  // 2K stat field definitions with expected ranges for validation
  FIELDS: {
    'g-pts':      { label: 'PTS', range: [0, 81], type: 'int' },
    'g-reb':      { label: 'REB', range: [0, 40], type: 'int' },
    'g-ast':      { label: 'AST', range: [0, 30], type: 'int' },
    'g-stl':      { label: 'STL', range: [0, 12], type: 'int' },
    'g-blk':      { label: 'BLK', range: [0, 12], type: 'int' },
    'g-pf':       { label: 'FLS', range: [0, 6], type: 'int' },
    'g-to':       { label: 'TO',  range: [0, 15], type: 'int' },
    'g-pm':       { label: '+/-', range: [-50, 50], type: 'int' },
    'g-fg2m':     { label: 'FGM', range: [0, 40], type: 'int' },
    'g-fg2a':     { label: 'FGA', range: [0, 60], type: 'int' },
    'g-fg3m':     { label: '3PM', range: [0, 15], type: 'int' },
    'g-fg3a':     { label: '3PA', range: [0, 25], type: 'int' },
    'g-ftm':      { label: 'FTM', range: [0, 20], type: 'int' },
    'g-fta':      { label: 'FTA', range: [0, 25], type: 'int' },
    'g-score-own':{ label: '己方分', range: [0, 200], type: 'int' },
    'g-score-opp':{ label: '对方分', range: [0, 200], type: 'int' },
  },
  ROSTER_NUMBER_FIELDS: ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'pm'],
  ROSTER_FIELD_ALIASES: {
    pts: 'pts', points: 'pts',
    reb: 'reb', rebounds: 'reb',
    ast: 'ast', assists: 'ast',
    stl: 'stl', steals: 'stl',
    blk: 'blk', blocks: 'blk',
    to: 'to', tov: 'to', turnovers: 'to',
    pf: 'pf', fls: 'pf', fouls: 'pf',
    fgm: 'fgm', fga: 'fga',
    fg3m: 'fg3m', '3pm': 'fg3m', '3p': 'fg3m',
    fg3a: 'fg3a', '3pa': 'fg3a',
    ftm: 'ftm', fta: 'fta',
    pm: 'pm', plusminus: 'pm', plus_minus: 'pm', '+/-': 'pm',
    grade: 'grade', pos: 'position', position: 'position',
    name: 'name', player: 'name',
  },
  ROSTER_SELF_RE: /\b(SELF|MY|ME|USER|YOU|CONTROLLED|MYPLAYER|MY_PLAYER|主控|本人|我的)\b\s*[:=]?\s*(1|Y|YES|TRUE|ME|SELF|USER|PLAYER)?\b/i,

  // ─── Enhanced parsing with multi-strategy + confidence scoring ───
  parseAll(results) {
    const candidates = [];

    for (const r of results) {
      const roster = this.parseRosterTables(r.text);
      // Strategy 0: strict key-value parsing from model-structured output.
      const keyValue = this.parseKeyValue(r.text);
      if (keyValue.fields.length >= 5 || this.rosterCount(roster) > 0) {
        candidates.push({
          ...keyValue,
          roster,
          strategy: r.strategy + '+kv',
          baseConfidence: r.confidence,
        });
      }

      // Strategy A: Structured box score parsing
      const structured = this.parseStructured(r.text);
      if (structured.fields.length >= 5) {
        candidates.push({
          ...structured,
          roster,
          strategy: r.strategy + '+structured',
          baseConfidence: r.confidence,
        });
      }

      // Strategy B: Line-by-line number extraction
      const lineBased = this.parseLineByLine(r.text);
      if (lineBased.fields.length >= 5) {
        candidates.push({
          ...lineBased,
          roster,
          strategy: r.strategy + '+lineparse',
          baseConfidence: r.confidence,
        });
      }

      // Strategy C: Keyword-aware parsing (find PTS/REB/AST labels)
      const keywordBased = this.parseWithKeywords(r.text);
      if (keywordBased.fields.length >= 3) {
        candidates.push({
          ...keywordBased,
          roster,
          strategy: r.strategy + '+keyword',
          baseConfidence: r.confidence,
        });
      }
    }

    if (candidates.length === 0) {
      // Fallback: try the best-confidence raw text with basic parsing
      const best = results.sort((a, b) => b.confidence - a.confidence)[0];
      if (best) {
        const fallback = this.parseFallback(best.text);
        candidates.push({
          ...fallback,
          roster: this.parseRosterTables(best.text),
          strategy: best.strategy + '+fallback',
          baseConfidence: best.confidence,
        });
      }
    }

    // Score and rank candidates
    candidates.forEach(c => {
      c.warnings = this.validateCandidate(c);
      c.score = this.scoreCandidate(c);
    });
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] || { values: {}, fields: [], roster: { teammates: [], opponents: [] }, strategy: 'none', score: 0, rawText: results[0]?.text || '' };
  },

  rosterCount(roster) {
    return (roster?.teammates?.length || 0) + (roster?.opponents?.length || 0);
  },

  parseRosterTables(text) {
    const roster = { teammates: [], opponents: [] };
    let currentSide = null;
    const lines = String(text || '')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    for (const rawLine of lines) {
      const line = rawLine.replace(/[|]+/g, ' | ').replace(/\s+/g, ' ').trim();
      const headerSide = this.detectRosterSide(line, null);
      if (headerSide && this.isRosterSectionLine(line)) currentSide = headerSide;

      const explicitSide = this.detectRosterSide(line, currentSide);
      if (!explicitSide) continue;
      const player = this.parseRosterLine(line);
      if (!player || !player.name || !this.isUsefulRosterPlayer(player)) continue;
      roster[explicitSide].push(player);
    }

    roster.teammates = this.dedupeRosterRows(roster.teammates);
    roster.opponents = this.dedupeRosterRows(roster.opponents);
    return roster;
  },

  detectRosterSide(line, fallbackSide) {
    const upper = String(line || '').toUpperCase().replace(/[|[\]().]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!upper) return fallbackSide;

    if (/^(TM|T M|TEAMMATES?|TEAMMATE|ALLY|ALLIES|MY TEAM|OUR TEAM|USER TEAM|HOME TEAM|FRIENDLY TEAM|队友|我方)\b/.test(upper)) return 'teammates';
    if (/^(OPP|OPPONENTS?|ENEMY|ENEMIES|RIVAL|RIVALS|OTHER TEAM|AWAY TEAM|VISITOR TEAM|VISITING TEAM|对手|敌方)\b/.test(upper)) return 'opponents';

    const sideMatch = upper.match(/\b(?:SIDE|TEAM SIDE|ROSTER SIDE)\s*[:=]\s*(TM|TEAMMATE|TEAMMATES|MY|OUR|OPP|OPPONENT|OPPONENTS|ENEMY|ENEMIES)\b/);
    if (sideMatch) return /^(TM|TEAMMATE|TEAMMATES|MY|OUR)$/.test(sideMatch[1]) ? 'teammates' : 'opponents';

    return fallbackSide;
  },

  isRosterSectionLine(line) {
    const cleaned = String(line || '')
      .replace(/^(TM|T M|TEAMMATES?|TEAMMATE|ALLY|ALLIES|MY TEAM|OUR TEAM|USER TEAM|HOME TEAM|FRIENDLY TEAM|队友|我方|OPPONENTS?|OPPONENT|OPP|ENEMY|ENEMIES|OTHER TEAM|AWAY TEAM|VISITOR TEAM|VISITING TEAM|对手|敌方)\s*[:=#-]?\s*/i, '')
      .trim();
    if (!cleaned) return true;
    if (/^(ROSTER|PLAYERS?|BOX SCORE|STATS?|TABLE|LINEUP)$/i.test(cleaned)) return true;
    return !/\b(NAME|PLAYER|POS|POSITION|PTS|POINTS|REB|AST|STL|BLK|TO|TOV|PF|FLS|FGM|FGA|3PM|3PA|FTM|FTA|PM|\+\/-|GRADE)\b\s*[:=]/i.test(cleaned)
      && !/\d/.test(cleaned);
  },

  parseRosterLine(line) {
    const cleanedLine = line
      .replace(/^(TM|T M|TEAMMATES?|TEAMMATE|ALLY|ALLIES|MY TEAM|OUR TEAM|USER TEAM|HOME TEAM|FRIENDLY TEAM|队友|我方|OPPONENTS?|OPPONENT|OPP|ENEMY|ENEMIES|OTHER TEAM|AWAY TEAM|VISITOR TEAM|VISITING TEAM|对手|敌方)\s*[:=#-]?\s*/i, '')
      .trim();
    if (!cleanedLine || /^(PLAYER\s+NAME|NAME\s+POS|NAME\s+PTS)\b/i.test(cleanedLine)) return null;

    const player = {};
    if (this.ROSTER_SELF_RE.test(cleanedLine)) player.self = true;
    const kvRe = /\b(NAME|PLAYER|POS|POSITION|SELF|MY|USER|PTS|POINTS|REB|REBOUNDS|AST|ASSISTS|STL|STEALS|BLK|BLOCKS|TO|TOV|TURNOVERS|PF|FLS|FOULS|FGM|FGA|3PM|3PA|FG3M|FG3A|FTM|FTA|PM|\+\/-|PLUSMINUS|PLUS_MINUS|GRADE)\b\s*[:=]\s*([A-Z]{1,2}[+-]?|[+-]?\d{1,3}|[^|,;]+?)(?=\s+\b(?:NAME|PLAYER|POS|POSITION|SELF|MY|USER|PTS|POINTS|REB|REBOUNDS|AST|ASSISTS|STL|STEALS|BLK|BLOCKS|TO|TOV|TURNOVERS|PF|FLS|FOULS|FGM|FGA|3PM|3PA|FG3M|FG3A|FTM|FTA|PM|\+\/-|PLUSMINUS|PLUS_MINUS|GRADE)\b\s*[:=]|[|,;]|$)/gi;
    let match;
    while ((match = kvRe.exec(cleanedLine))) {
      const key = this.ROSTER_FIELD_ALIASES[match[1].toLowerCase()];
      const value = match[2].trim();
      if (!key && /^(SELF|MY|USER)$/i.test(match[1])) {
        if (/^(1|Y|YES|TRUE|ME|SELF|USER|PLAYER)$/i.test(value)) player.self = true;
        continue;
      }
      if (!key) continue;
      if (key === 'name') player.name = this.cleanRosterName(value);
      else if (key === 'position') player.position = this.cleanPosition(value);
      else if (key === 'grade') player.grade = this.cleanGrade(value);
      else player[key] = this.parseRosterInt(value);
    }

    if (!player.name) {
      const firstStat = cleanedLine.search(/\b(?:PTS|POINTS|REB|AST|STL|BLK|TO|TOV|PF|FLS|FGM|FGA|3PM|3PA|FTM|FTA|PM|\+\/-|GRADE)\b\s*[:=]|\d{1,2}\s*[-/]\s*\d{1,2}|\s[+-]?\d{1,3}\b/i);
      const namePart = firstStat > 0 ? cleanedLine.slice(0, firstStat) : cleanedLine;
      player.name = this.cleanRosterName(namePart.replace(/[|,;:-]+$/g, ''));
    }

    this.applyRosterFractions(cleanedLine, player);
    this.applyRosterPositionalNumbers(cleanedLine, player);

    player.name = this.cleanRosterName(player.name);
    if (!player.position) {
      const positionMatch = player.name.match(/\b(PG|SG|SF|PF|C)$/i);
      if (positionMatch) {
        player.position = positionMatch[1].toUpperCase();
        player.name = player.name.replace(/\b(PG|SG|SF|PF|C)$/i, '').trim();
      }
    }
    if (!player.name || this.isRosterHeaderName(player.name)) return null;
    return player;
  },

  applyRosterFractions(line, player) {
    const fracs = [...line.matchAll(/(\d{1,2})\s*[-/]\s*(\d{1,2})/g)].map(m => [parseInt(m[1], 10), parseInt(m[2], 10)]);
    if (fracs.length >= 1 && player.fgm === undefined && player.fga === undefined) {
      player.fgm = fracs[0][0]; player.fga = fracs[0][1];
    }
    if (fracs.length >= 2 && player.fg3m === undefined && player.fg3a === undefined) {
      player.fg3m = fracs[1][0]; player.fg3a = fracs[1][1];
    }
    if (fracs.length >= 3 && player.ftm === undefined && player.fta === undefined) {
      player.ftm = fracs[2][0]; player.fta = fracs[2][1];
    }
  },

  applyRosterPositionalNumbers(line, player) {
    const tail = line
      .replace(player.name || '', ' ')
      .replace(/\b(SELF|MY|USER)\b\s*[:=]?\s*(?:1|Y|YES|TRUE|ME|SELF|USER|PLAYER)?/ig, ' ');
    const numberList = value => (String(value || '').match(/[+-]?\d{1,3}/g) || [])
      .map(Number)
      .filter(Number.isFinite);
    const fracs = [...tail.matchAll(/\d{1,2}\s*[-/]\s*\d{1,2}/g)];

    if (fracs.length) {
      const firstFrac = fracs[0];
      const lastFrac = fracs[fracs.length - 1];
      const beforeNums = numberList(tail.slice(0, firstFrac.index));
      ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to'].forEach((field, index) => {
        if (player[field] === undefined && Number.isFinite(beforeNums[index])) player[field] = beforeNums[index];
      });

      const afterNums = numberList(tail.slice(lastFrac.index + lastFrac[0].length));
      if (player.to === undefined && Number.isFinite(afterNums[0]) && afterNums[0] >= 0 && afterNums[0] <= 15) {
        player.to = afterNums[0];
        if (player.pm === undefined && Number.isFinite(afterNums[1])) player.pm = afterNums[1];
      } else if (player.pm === undefined && Number.isFinite(afterNums[0])) {
        player.pm = afterNums[0];
      }
      return;
    }

    const nums = numberList(tail);
    if (nums.length < 3) return;
    this.ROSTER_NUMBER_FIELDS.forEach((field, index) => {
      if (player[field] === undefined && Number.isFinite(nums[index])) player[field] = nums[index];
    });
  },

  hasAnyRosterNumber(player) {
    return this.ROSTER_NUMBER_FIELDS.some(field => Number.isFinite(player[field]));
  },

  isUsefulRosterPlayer(player) {
    return !!player.name && (this.hasAnyRosterNumber(player) || player.position || player.grade);
  },

  cleanRosterName(value) {
    return String(value || '')
      .replace(/\b(NAME|PLAYER|TEAMMATE|OPPONENT|TEAM|OPP|TM|SELF|MY|USER)\b\s*[:=]?\s*(?:1|Y|YES|TRUE|ME|SELF|USER|PLAYER)?/gi, '')
      .replace(/\b(POS|POSITION|PTS|REB|AST|STL|BLK|TO|TOV|PF|FLS|FOULS|FGM|FGA|3PM|3PA|FTM|FTA|PM|GRADE)\b.*$/i, '')
      .replace(/[|,;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  },

  cleanPosition(value) {
    const match = String(value || '').toUpperCase().match(/\b(PG|SG|SF|PF|C)\b/);
    return match ? match[1] : '';
  },

  cleanGrade(value) {
    const match = String(value || '').toUpperCase().match(/(?:^|\s)(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F)(?=\s|$|[|,;])/);
    return match ? match[1] : '';
  },

  parseRosterInt(value) {
    const n = parseInt(String(value).replace(/[^\d+-]/g, ''), 10);
    return Number.isFinite(n) ? n : undefined;
  },

  isRosterHeaderName(name) {
    return /^(PLAYER|NAME|PTS|REB|AST|TEAMMATES?|OPPONENTS?|BOX SCORE)$/i.test(String(name || '').trim());
  },

  dedupeRosterRows(players) {
    const seen = new Set();
    const out = [];
    for (const player of players) {
      const key = player.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(player);
    }
    return out;
  },

  stripRosterLines(text) {
    let currentSide = null;
    const kept = [];
    const lines = String(text || '')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim());

    for (const rawLine of lines) {
      if (!rawLine) {
        kept.push(rawLine);
        continue;
      }
      const line = rawLine.replace(/[|]+/g, ' | ').replace(/\s+/g, ' ').trim();
      const headerSide = this.detectRosterSide(line, null);
      if (headerSide && this.isRosterSectionLine(line)) {
        currentSide = headerSide;
        continue;
      }
      const side = this.detectRosterSide(line, currentSide);
      if (side) {
        const player = this.parseRosterLine(line);
        if (player && player.name && this.isUsefulRosterPlayer(player)) continue;
      }
      kept.push(rawLine);
    }

    return kept.join('\n');
  },

  hasStatShape(line) {
    const text = String(line || '');
    const numCount = (text.match(/[+-]?\d{1,3}/g) || []).length;
    const fracCount = (text.match(/\d{1,2}\s*[-/]\s*\d{1,2}/g) || []).length;
    return numCount >= 5 || fracCount >= 2;
  },

  hasMainStatToken(line) {
    return /\b(PTS|POINTS|REB|REBOUNDS|AST|ASSISTS|STL|STEALS|BLK|BLOCKS|PF|FLS|FOULS|TO|TOV|TURNOVERS|PM|\+\/-|FG|FGA|FGM|3PT|3P|3PM|3PA|FT|FTM|FTA|GRADE)\b/i.test(String(line || ''))
      || this.hasStatShape(line);
  },

  isTotalStatLine(line) {
    const upper = String(line || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!upper || !this.hasMainStatToken(upper)) return false;
    return /\b(TOTALS?|TEAM TOTALS?|TEAM STATS?|ALL PLAYERS?|COMBINED|BOX SCORE TOTAL|合计|总计|全队|团队总计)\b/.test(upper)
      || /^(TOTALS?|TEAM)\b/.test(upper);
  },

  isControlledPlayerLine(line) {
    const upper = String(line || '').toUpperCase().replace(/[|[\]().]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!upper || !this.hasMainStatToken(upper)) return false;
    if (this.isTotalStatLine(upper)) return false;
    return /^(MY|ME|MYPLAYER|MY PLAYER|USER|YOU|SELF|PLAYER|CONTROLLED PLAYER|MAIN PLAYER|主控|本人|我的|我方球员)\b/.test(upper)
      || /\b(?:SIDE|ROLE|TYPE)\s*[:=]\s*(MY|ME|USER|SELF|PLAYER)\b/.test(upper);
  },

  stripMainPlayerPrefix(line) {
    return String(line || '')
      .replace(/^(MY|ME|MYPLAYER|MY PLAYER|USER|YOU|SELF|PLAYER|CONTROLLED PLAYER|MAIN PLAYER|主控|本人|我的|我方球员)\s*[:=#-]?\s*/i, '')
      .replace(/\b(?:SIDE|ROLE|TYPE)\s*[:=]\s*(MY|ME|USER|SELF|PLAYER)\b/ig, '')
      .trim();
  },

  playerToMainStatLine(player) {
    if (!player) return '';
    const parts = [];
    const add = (key, label) => {
      if (Number.isFinite(player[key])) parts.push(`${label}=${player[key]}`);
    };
    add('pts', 'PTS');
    add('reb', 'REB');
    add('ast', 'AST');
    add('stl', 'STL');
    add('blk', 'BLK');
    add('pf', 'FLS');
    add('to', 'TO');
    add('pm', 'PM');
    if (Number.isFinite(player.fgm) && Number.isFinite(player.fga)) parts.push(`FG=${player.fgm}-${player.fga}`);
    if (Number.isFinite(player.fg3m) && Number.isFinite(player.fg3a)) parts.push(`3PT=${player.fg3m}-${player.fg3a}`);
    if (Number.isFinite(player.ftm) && Number.isFinite(player.fta)) parts.push(`FT=${player.ftm}-${player.fta}`);
    if (player.grade) parts.push(`GRADE=${player.grade}`);
    return parts.join(' ');
  },

  controlledRosterStatText(text) {
    const roster = this.parseRosterTables(text);
    const selfRows = (roster.teammates || []).filter(player => player.self && this.hasAnyRosterNumber(player));
    if (!selfRows.length) return '';
    selfRows.sort((a, b) => Object.keys(b).length - Object.keys(a).length);
    return this.playerToMainStatLine(selfRows[0]);
  },

  mainStatsText(text) {
    const controlledRosterText = this.controlledRosterStatText(text);
    const withoutRoster = this.stripRosterLines(text);
    const kept = [];
    const playerLines = [];
    const contextLines = [];
    const lines = String(withoutRoster || '').replace(/\r/g, '\n').split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        kept.push(rawLine);
        continue;
      }
      if (this.isTotalStatLine(line)) continue;
      if (this.isControlledPlayerLine(line)) {
        playerLines.push(this.stripMainPlayerPrefix(line));
        continue;
      }
      if ((/\b(SCORE|RESULT|GRADE|WIN|LOSS)\b/i.test(line) || /\b\d{2,3}\s*[-–:]\s*\d{2,3}\b/.test(line)) && !this.isTotalStatLine(line)) {
        contextLines.push(line);
      }
      kept.push(rawLine);
    }

    if (playerLines.length) return playerLines.concat(contextLines).join('\n');
    if (controlledRosterText) return [controlledRosterText].concat(contextLines).join('\n');
    return kept.join('\n');
  },

  // Strategy 0: structured KEY=VALUE lines from vision models.
  parseKeyValue(text) {
    const fields = [];
    const values = {};
    const mainText = this.mainStatsText(text);
    const stage = (id, value, label) => {
      if (value === undefined || value === null || value === '' || Number.isNaN(value)) return;
      values[id] = value;
      fields.push(label);
    };
    const parseIntSafe = value => {
      const n = parseInt(String(value).replace(/[^\d+-]/g, ''), 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const parseSplit = value => {
      const match = String(value).match(/(\d{1,2})\s*[-/]\s*(\d{1,2})/);
      if (!match) return null;
      return { made: parseInt(match[1], 10), att: parseInt(match[2], 10) };
    };
    const entries = {};
    const pairRe = /\b(PTS|POINTS|REB|REBOUNDS|AST|ASSISTS|STL|STEALS|BLK|BLOCKS|PF|FLS|FOULS|TO|TOV|TURNOVERS|PM|\+\/-|PLUSMINUS|PLUS_MINUS|FG|FGA|FGM|3PT|3P|3PM|3PA|FT|FTM|FTA|GRADE|RESULT|SCORE|OWN|OPP)\b\s*[:=]\s*([A-F][+-]?|[WL]|[+-]?\d{1,3}\s*[-/]\s*[+-]?\d{1,3}|[+-]?\d{1,3})/gi;
    let match;
    while ((match = pairRe.exec(mainText))) {
      entries[match[1].toUpperCase()] = match[2].trim();
    }

    stage('g-pts', parseIntSafe(entries.PTS || entries.POINTS), `PTS=${entries.PTS || entries.POINTS}`);
    stage('g-reb', parseIntSafe(entries.REB || entries.REBOUNDS), `REB=${entries.REB || entries.REBOUNDS}`);
    stage('g-ast', parseIntSafe(entries.AST || entries.ASSISTS), `AST=${entries.AST || entries.ASSISTS}`);
    stage('g-stl', parseIntSafe(entries.STL || entries.STEALS), `STL=${entries.STL || entries.STEALS}`);
    stage('g-blk', parseIntSafe(entries.BLK || entries.BLOCKS), `BLK=${entries.BLK || entries.BLOCKS}`);
    stage('g-pf', parseIntSafe(entries.PF || entries.FLS || entries.FOULS), `FLS=${entries.PF || entries.FLS || entries.FOULS}`);
    stage('g-to', parseIntSafe(entries.TO || entries.TOV || entries.TURNOVERS), `TO=${entries.TO || entries.TOV || entries.TURNOVERS}`);
    stage('g-pm', parseIntSafe(entries.PM || entries['+/-'] || entries.PLUSMINUS || entries.PLUS_MINUS), `+/-=${entries.PM || entries['+/-'] || entries.PLUSMINUS || entries.PLUS_MINUS}`);

    const fg = parseSplit(entries.FG);
    const fg3 = parseSplit(entries['3PT'] || entries['3P']);
    const ft = parseSplit(entries.FT);
    const fgm = parseIntSafe(entries.FGM);
    const fga = parseIntSafe(entries.FGA);
    const fg3m = parseIntSafe(entries['3PM']);
    const fg3a = parseIntSafe(entries['3PA']);
    const ftm = parseIntSafe(entries.FTM);
    const fta = parseIntSafe(entries.FTA);

    const totalFgm = fg?.made ?? fgm;
    const totalFga = fg?.att ?? fga;
    const made3 = fg3?.made ?? fg3m;
    const att3 = fg3?.att ?? fg3a;
    stage('g-fg2m', totalFgm, `FGM=${totalFgm}`);
    stage('g-fg2a', totalFga, `FGA=${totalFga}`);
    stage('g-fg3m', made3, `3PM=${made3}`);
    stage('g-fg3a', att3, `3PA=${att3}`);
    stage('g-ftm', ft?.made ?? ftm, `FTM=${ft?.made ?? ftm}`);
    stage('g-fta', ft?.att ?? fta, `FTA=${ft?.att ?? fta}`);

    const score = parseSplit(entries.SCORE);
    if (score) {
      stage('g-score-own', score.made, `SCORE=${score.made}-${score.att}`);
      stage('g-score-opp', score.att, `OPP=${score.att}`);
    } else {
      stage('g-score-own', parseIntSafe(entries.OWN), `OWN=${entries.OWN}`);
      stage('g-score-opp', parseIntSafe(entries.OPP), `OPP=${entries.OPP}`);
    }

    const grade = entries.GRADE;
    if (grade && /^[ABCDF][+-]?$/.test(grade)) stage('g-grade', grade, `GRADE=${grade}`);
    const result = entries.RESULT;
    if (result && /^[WL]$/i.test(result)) stage('g-result', result.toUpperCase(), `RESULT=${result.toUpperCase()}`);

    return { fields, values, rawText: text };
  },

  // Strategy A: Structured box score (find stat row by fraction pattern)
  parseStructured(text) {
    const fields = [];
    const values = {};
    const stage = (id, value, label) => { values[id] = value; fields.push(label); };
    const mainText = this.mainStatsText(text);

    // Detect grade
    const gradeMatch = mainText.match(/\b([ABCDF][+\-]?)\b/g);
    if (gradeMatch) {
      const candidate = gradeMatch.find(g => /^[ABCDF][+\-]?$/.test(g));
      const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
      if (candidate && validGrades.includes(candidate)) {
        stage('g-grade', candidate, `评分=${candidate}`);
      }
    }

    // Detect W/L
    const upper = mainText.toUpperCase();
    if (/\bWIN\b|\bW\b\s*[\-–]|VICTORY/.test(upper) && !/LOSS|DEFEAT/.test(upper)) {
      stage('g-result', 'W', '结果=W');
    } else if (/\bLOSS\b|\bL\b\s*[\-–]|DEFEAT/.test(upper) && !/\bWIN\b|VICTORY/.test(upper)) {
      stage('g-result', 'L', '结果=L');
    }

    // Score detection
    const scoreMatch = mainText.match(/(\d{2,3})\s*[\-–:]\s*(\d{2,3})/);
    if (scoreMatch) {
      const a = parseInt(scoreMatch[1]), b = parseInt(scoreMatch[2]);
      if (a >= 20 && a <= 200 && b >= 20 && b <= 200) {
        const result = values['g-result'];
        const own = result === 'W' ? Math.max(a, b) : result === 'L' ? Math.min(a, b) : a;
        const opp = result === 'W' ? Math.min(a, b) : result === 'L' ? Math.max(a, b) : b;
        stage('g-score-own', own, `SCORE=${own}-${opp}`);
        stage('g-score-opp', opp, `OPP=${opp}`);
      }
    }

    // Find stat row: line with 3+ fraction-like tokens (FGM-FGA, 3PM-3PA, FTM-FTA)
    const lines = mainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let bestLine = null, bestScore = 0;
    for (const line of lines) {
      const tokens = line.split(/\s+/);
      const fracTokens = tokens.filter(t => /^\d{1,2}[\-\/]\d{1,2}$/.test(t));
      const numTokens = tokens.filter(t => /^-?\d{1,3}$/.test(t));
      const score = fracTokens.length * 3 + numTokens.length;
      if (fracTokens.length >= 2 && score > bestScore) {
        bestScore = score;
        bestLine = line;
      }
    }

    if (bestLine) {
      const tokens = bestLine.split(/\s+/).filter(t =>
        /^\d{1,3}$/.test(t) || /^-?\d{1,3}$/.test(t) || /^\d{1,2}[\-\/]\d{1,2}$/.test(t)
      );
      const fracIdxs = [];
      tokens.forEach((t, i) => { if (/^\d{1,2}[\-\/]\d{1,2}$/.test(t)) fracIdxs.push(i); });

      if (fracIdxs.length >= 2) {
        const fgIdx = fracIdxs[0];
        const fg3Idx = fracIdxs[1];
        const ftIdx = fracIdxs.length >= 3 ? fracIdxs[2] : null;
        const parseFrac = s => { const [m, a] = s.split(/[\-\/]/).map(Number); return { m, a }; };
        const fg = parseFrac(tokens[fgIdx]);
        const fg3 = parseFrac(tokens[fg3Idx]);
        stage('g-fg2m', fg.m, `FGM=${fg.m}`);
        stage('g-fg2a', fg.a, `FGA=${fg.a}`);
        stage('g-fg3m', fg3.m, `3PM=${fg3.m}`);
        stage('g-fg3a', fg3.a, `3PA=${fg3.a}`);
        if (ftIdx !== null) {
          const ft = parseFrac(tokens[ftIdx]);
          stage('g-ftm', ft.m, `FTM=${ft.m}`);
          stage('g-fta', ft.a, `FTA=${ft.a}`);
        }

        // PTS REB AST STL BLK FLS TO before fractions. Keep the last full stat window
        // so leading jersey numbers or row indexes do not shift the box score.
        const preTokens = tokens.slice(0, fgIdx).filter(t => /^-?\d{1,3}$/.test(t));
        const basicStart = preTokens.length >= 7 ? preTokens.length - 7 : Math.max(0, preTokens.length - 5);
        const ids = ['g-pts', 'g-reb', 'g-ast', 'g-stl', 'g-blk'];
        const labels = ['PTS', 'REB', 'AST', 'STL', 'BLK'];
        for (let i = 0; i < 5 && (basicStart + i) < preTokens.length; i++) {
          const v = parseInt(preTokens[basicStart + i]);
          if (!isNaN(v)) stage(ids[i], v, `${labels[i]}=${v}`);
        }
        if (preTokens.length >= basicStart + 6) {
          const pf = parseInt(preTokens[basicStart + 5]);
          if (!isNaN(pf) && pf >= 0 && pf <= 6) stage('g-pf', pf, `FLS=${pf}`);
        }
        if (preTokens.length >= basicStart + 7) {
          const to = parseInt(preTokens[basicStart + 6]);
          if (!isNaN(to) && to >= 0 && to <= 15) stage('g-to', to, `TO=${to}`);
        }

        // TO +/- after last fraction
        const lastFracIdx = fracIdxs[fracIdxs.length - 1];
        const postTokens = tokens.slice(lastFracIdx + 1).filter(t => /^-?\d{1,3}$/.test(t));
        if (postTokens.length >= 1 && values['g-to'] === undefined) {
          const to = parseInt(postTokens[0]);
          if (!isNaN(to) && to >= 0 && to <= 15) stage('g-to', to, `TO=${to}`);
        }
        if (postTokens.length >= 2) {
          const pm = parseInt(postTokens[1]);
          if (!isNaN(pm)) stage('g-pm', pm, `+/-=${pm}`);
        } else if (postTokens.length >= 1 && (values['g-to'] !== undefined || Number(postTokens[0]) < 0)) {
          const pm = parseInt(postTokens[0]);
          if (!isNaN(pm)) stage('g-pm', pm, `+/-=${pm}`);
        }
      }
    }

    return { fields, values, rawText: text };
  },

  // Strategy B: Line-by-line — find each stat by its own pattern
  parseLineByLine(text) {
    const fields = [];
    const values = {};
    const stage = (id, value, label) => { values[id] = value; fields.push(label); };

    const lines = this.mainStatsText(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const allText = lines.join(' ');

    // Try to find PTS anywhere
    const ptsMatch = allText.match(/(?:PTS|POINTS?|得分)[:\s]*(\d{1,3})/i);
    if (ptsMatch) stage('g-pts', parseInt(ptsMatch[1]), `PTS=${ptsMatch[1]}`);

    const rebMatch = allText.match(/(?:REB|REBOUNDS?|篮板)[:\s]*(\d{1,3})/i);
    if (rebMatch) stage('g-reb', parseInt(rebMatch[1]), `REB=${rebMatch[1]}`);

    const astMatch = allText.match(/(?:AST|ASSISTS?|助攻)[:\s]*(\d{1,3})/i);
    if (astMatch) stage('g-ast', parseInt(astMatch[1]), `AST=${astMatch[1]}`);

    const stlMatch = allText.match(/(?:STL|STEALS?|抢断)[:\s]*(\d{1,3})/i);
    if (stlMatch) stage('g-stl', parseInt(stlMatch[1]), `STL=${stlMatch[1]}`);

    const blkMatch = allText.match(/(?:BLK|BLOCKS?|盖帽)[:\s]*(\d{1,3})/i);
    if (blkMatch) stage('g-blk', parseInt(blkMatch[1]), `BLK=${blkMatch[1]}`);

    const pfMatch = allText.match(/(?:FLS|FOULS?|犯规)[:\s]*(\d{1,3})/i);
    if (pfMatch) stage('g-pf', parseInt(pfMatch[1]), `FLS=${pfMatch[1]}`);

    const toMatch = allText.match(/(?:TO|TOS?|TURNOVERS?|失误)[:\s]*(\d{1,3})/i);
    if (toMatch) stage('g-to', parseInt(toMatch[1]), `TO=${toMatch[1]}`);

    const pmMatch = allText.match(/(?:PM|\+\/-|PLUS.?MINUS|PLUS_MINUS|正负值)\s*[:=]?\s*([+-]?\d{1,3})/i);
    if (pmMatch) stage('g-pm', parseInt(pmMatch[1]), `+/-=${pmMatch[1]}`);

    // Fractions
    const fgMatch = allText.match(/(\d{1,2})[\-\/](\d{1,2}).*?(\d{1,2})[\-\/](\d{1,2}).*?(\d{1,2})[\-\/](\d{1,2})/);
    if (fgMatch) {
      const fg = { m: parseInt(fgMatch[1]), a: parseInt(fgMatch[2]) };
      const fg3 = { m: parseInt(fgMatch[3]), a: parseInt(fgMatch[4]) };
      const ft = { m: parseInt(fgMatch[5]), a: parseInt(fgMatch[6]) };
      stage('g-fg2m', fg.m, `FGM=${fg.m}`);
      stage('g-fg2a', fg.a, `FGA=${fg.a}`);
      stage('g-fg3m', fg3.m, `3PM=${fg3.m}`);
      stage('g-fg3a', fg3.a, `3PA=${fg3.a}`);
      stage('g-ftm', ft.m, `FTM=${ft.m}`);
      stage('g-fta', ft.a, `FTA=${ft.a}`);
    } else {
      // Fallback: 2 fractions only (FG + 3PT, no FT attempted or not visible)
      const twoFracMatch = allText.match(/(\d{1,2})[\-\/](\d{1,2}).*?(\d{1,2})[\-\/](\d{1,2})/);
      if (twoFracMatch) {
        stage('g-fg2m', parseInt(twoFracMatch[1]), `FGM=${twoFracMatch[1]}`);
        stage('g-fg2a', parseInt(twoFracMatch[2]), `FGA=${twoFracMatch[2]}`);
        stage('g-fg3m', parseInt(twoFracMatch[3]), `3PM=${twoFracMatch[3]}`);
        stage('g-fg3a', parseInt(twoFracMatch[4]), `3PA=${twoFracMatch[4]}`);
      }
    }

    return { fields, values, rawText: text };
  },

  // Strategy C: Keyword-aware — find stat labels then grab nearby numbers
  parseWithKeywords(text) {
    const fields = [];
    const values = {};
    const stage = (id, value, label) => { values[id] = value; fields.push(label); };

    // Normalize text: collapse whitespace, unify separators
    const norm = this.mainStatsText(text).replace(/\s+/g, ' ').replace(/[–—]/g, '-');

    // For each field, try to find a number near its keyword
    const patterns = [
      { id: 'g-pts', keywords: ['PTS', 'POINTS', '得分'], re: /(\d{1,3})/ },
      { id: 'g-reb', keywords: ['REB', 'REBOUNDS', '篮板'], re: /(\d{1,3})/ },
      { id: 'g-ast', keywords: ['AST', 'ASSISTS', '助攻'], re: /(\d{1,3})/ },
      { id: 'g-stl', keywords: ['STL', 'STEALS', '抢断'], re: /(\d{1,3})/ },
      { id: 'g-blk', keywords: ['BLK', 'BLOCKS', '盖帽'], re: /(\d{1,3})/ },
      { id: 'g-pf',  keywords: ['FLS', 'FOULS', '犯规'], re: /(\d{1,3})/ },
      { id: 'g-to',  keywords: ['TO', 'TURNOVERS', '失误'], re: /(\d{1,3})/ },
    ];

    for (const p of patterns) {
      for (const kw of p.keywords) {
        const idx = norm.toUpperCase().indexOf(kw);
        if (idx === -1) continue;
        const after = norm.slice(idx + kw.length, idx + kw.length + 20);
        const m = after.match(p.re);
        if (m) {
          const v = parseInt(m[1]);
          const meta = this.FIELDS[p.id];
          if (v >= meta.range[0] && v <= meta.range[1]) {
            stage(p.id, v, `${meta.label}=${v}`);
            break;
          }
        }
      }
    }

    return { fields, values, rawText: text };
  },

  // Fallback: just grab all numbers and map by position
  parseFallback(text) {
    const fields = [];
    const values = {};
    const stage = (id, value, label) => { values[id] = value; fields.push(label); };

    const nums = this.mainStatsText(text).match(/-?\d{1,3}/g) || [];
    const cleanNums = nums.map(Number).filter(n => n >= -50 && n <= 200);

    // Common 2K box score order: PTS REB AST STL BLK ... FGM-FGA 3PM-3PA FTM-FTA TO +/- 
    const basicIds = ['g-pts', 'g-reb', 'g-ast', 'g-stl', 'g-blk'];
    const basicLabels = ['PTS', 'REB', 'AST', 'STL', 'BLK'];

    // Take first 5 reasonable numbers as basic stats
    let idx = 0;
    for (let i = 0; i < basicIds.length && idx < cleanNums.length; idx++) {
      const v = cleanNums[idx];
      if (v >= 0 && v <= 81) {
        stage(basicIds[i], v, `${basicLabels[i]}=${v}`);
        i++;
      }
    }

    return { fields, values, rawText: text };
  },

  // Score a candidate result
  scoreCandidate(c) {
    let score = c.baseConfidence || 50;

    // More fields = better
    score += c.fields.length * 5;

    // Validate field ranges
    let validCount = 0;
    Object.keys(c.values).forEach(id => {
      const meta = this.FIELDS[id];
      if (meta && c.values[id] >= meta.range[0] && c.values[id] <= meta.range[1]) {
        validCount++;
      }
    });
    score += validCount * 3;

    // Penalty for suspicious values (e.g., PTS > 81)
    Object.keys(c.values).forEach(id => {
      const meta = this.FIELDS[id];
      if (meta && (c.values[id] < meta.range[0] || c.values[id] > meta.range[1])) {
        score -= 10;
      }
    });

    // Bonus for having shooting splits
    if (c.values['g-fg3m'] !== undefined && c.values['g-ftm'] !== undefined) score += 10;

    // Bonus for having W/L and score
    if (c.values['g-result']) score += 5;
    if (c.values['g-score-own']) score += 5;
    score += Math.min(40, this.rosterCount(c.roster) * 4);
    if (c.strategy && c.strategy.includes('+kv')) score += 8;
    if (c.warnings?.length) score -= Math.min(20, c.warnings.length * 5);

    return score;
  },

  validateCandidate(c) {
    const values = c.values || {};
    const warnings = [];
    const has = id => values[id] !== undefined && values[id] !== '';
    const num = id => Number(values[id]);
    const warn = (fieldIds, message) => warnings.push({ fieldIds, message });

    Object.keys(values).forEach(id => {
      const meta = this.FIELDS[id];
      if (!meta || typeof values[id] !== 'number') return;
      if (values[id] < meta.range[0] || values[id] > meta.range[1]) {
        warn([id], `${meta.label} is outside expected range ${meta.range[0]}-${meta.range[1]}`);
      }
    });

    if (has('g-fg3m') && has('g-fg3a') && num('g-fg3m') > num('g-fg3a')) {
      warn(['g-fg3m', 'g-fg3a'], '3PM cannot be greater than 3PA');
    }
    if (has('g-ftm') && has('g-fta') && num('g-ftm') > num('g-fta')) {
      warn(['g-ftm', 'g-fta'], 'FTM cannot be greater than FTA');
    }
    if (has('g-fg2m') && has('g-fg2a') && num('g-fg2m') > num('g-fg2a')) {
      warn(['g-fg2m', 'g-fg2a'], 'FGM cannot be greater than FGA');
    }
    if (has('g-fg3m') && has('g-fg2m') && num('g-fg3m') > num('g-fg2m')) {
      warn(['g-fg3m', 'g-fg2m'], '3PM cannot be greater than total FGM');
    }
    if (has('g-fg3a') && has('g-fg2a') && num('g-fg3a') > num('g-fg2a')) {
      warn(['g-fg3a', 'g-fg2a'], '3PA cannot be greater than total FGA');
    }

    if (has('g-pts') && has('g-fg2m') && has('g-fg3m') && has('g-ftm')) {
      const fg2m = Math.max(0, num('g-fg2m') - num('g-fg3m'));
      const expectedPts = fg2m * 2 + num('g-fg3m') * 3 + num('g-ftm');
      if (Math.abs(num('g-pts') - expectedPts) > 2) {
        warn(['g-pts', 'g-fg2m', 'g-fg3m', 'g-ftm'], `PTS does not match shooting totals (${expectedPts})`);
      }
    }

    if (has('g-score-own') && has('g-score-opp') && num('g-score-own') === num('g-score-opp')) {
      warn(['g-score-own', 'g-score-opp'], 'Final score is tied; verify scoreboard');
    }

    return warnings;
  },

};
