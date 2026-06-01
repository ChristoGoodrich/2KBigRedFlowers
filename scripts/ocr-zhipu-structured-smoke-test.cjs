const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const parserPath = path.join(root, 'nba2k26-ocr-parser.js');
const ocrPath = path.join(root, 'nba2k26-ocr.js');

const fetchCalls = [];
const zhipuPayload = {
  controlledPlayer: {
    name: 'TEAM TOTAL',
    position: null,
    self: false,
    pts: 88,
    reb: 32,
    ast: 21,
    stl: 5,
    blk: 2,
    pf: 0,
    to: 8,
    fgm: 33,
    fga: 61,
    fg3m: 9,
    fg3a: 22,
    ftm: 13,
    fta: 16,
    pm: null,
    grade: null,
    confidence: 70,
    evidence: 'summary row',
  },
  score: { own: 88, opp: 74, result: 'w', evidence: 'scoreboard' },
  teammates: [
    {
      name: 'Jay Hoops',
      position: 'SG',
      self: 'true',
      pts: 21,
      reb: 4,
      ast: 7,
      stl: 2,
      blk: 0,
      pf: 2,
      to: 3,
      fgm: 8,
      fga: 16,
      fg3m: 3,
      fg3a: 8,
      ftm: 2,
      fta: 2,
      pm: 9,
      grade: 'A-',
      confidence: 96,
      evidence: 'highlighted user row',
    },
  ],
  opponents: [
    {
      name: 'Rival Guard',
      position: 'PG',
      self: 'false',
      pts: 18,
      reb: 2,
      ast: 8,
      stl: 1,
      blk: 0,
      pf: 1,
      to: 2,
      fgm: 7,
      fga: 14,
      fg3m: 2,
      fg3a: 5,
      ftm: 2,
      fta: 2,
      pm: -9,
      grade: 'B+',
      confidence: 90,
      evidence: 'opponent row',
    },
  ],
  warnings: ['The summary row was visible and ignored for the controlled player.'],
};

const context = {
  console,
  window: {},
  document: {
    getElementById: () => null,
    addEventListener() {},
    querySelectorAll: () => [],
    createElement: () => ({
      className: '',
      dataset: {},
      style: {},
      appendChild() {},
      querySelector: () => null,
      querySelectorAll: () => [],
    }),
    head: { appendChild() {} },
  },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { hostname: '127.0.0.1', protocol: 'http:' },
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  Image: function Image() {},
  t: value => value,
  escapeHtml: value => String(value ?? ''),
  toast() {},
  customConfirm: async () => true,
  setTimeout,
  fetch: async (url, options) => {
    fetchCalls.push({ url, body: JSON.parse(options.body) });
    if (String(url).includes('/layout_parsing')) {
      return {
        ok: true,
        json: async () => ({
          model: 'GLM-OCR',
          md_results: [
            'MY TEAM',
            '| Player | POS | PTS | REB | AST | STL | BLK | FLS | TO | FG | 3PT | FT | +/- | GRADE |',
            '| Jay Hoops | SG | 21 | 4 | 7 | 2 | 0 | 2 | 3 | 8-16 | 3-8 | 2-2 | +9 | A- |',
            'OPPONENTS',
            '| Rival Guard | PG | 18 | 2 | 8 | 1 | 0 | 1 | 2 | 7-14 | 2-5 | 2-2 | -9 | B+ |',
          ].join('\n'),
          layout_details: [],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: `<think>ignore this</think>\n\`\`\`json\n${JSON.stringify(zhipuPayload)}\n\`\`\``,
          },
        }],
      }),
    };
  },
};
context.window = context;

vm.runInNewContext(`${fs.readFileSync(parserPath, 'utf8')}\nthis.OCRParser = OCRParser;`, context, { filename: parserPath });
const ocrCode = fs.readFileSync(ocrPath, 'utf8').replace(/\nOCR\.init\(\);\s*$/, '\nthis.OCR = OCR;\n');
vm.runInNewContext(ocrCode, context, { filename: ocrPath });

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

(async () => {
  assertEqual(context.OCR.currentEngine, 'zhipu', 'Zhipu is the default OCR engine');
  assertEqual(context.OCR.zhipuModel, 'glm-4.6v-flash', 'Zhipu free vision model is default');

  context.OCR.zhipuApiKey = 'test-key';
  const extracted = await context.OCR.runZhipuVision('base64-image');
  assertEqual(extracted.strategy, 'zhipu-glm-ocr+glm-4.7-flash-json', 'Zhipu OCR-first structured strategy');
  assertEqual(fetchCalls[0].body.model, 'glm-ocr', 'Zhipu first pass uses GLM-OCR');
  assertEqual(fetchCalls[1].body.model, 'glm-4.7-flash', 'Zhipu second pass uses free text model');
  assertEqual(fetchCalls[1].body.response_format.type, 'json_object', 'Zhipu text extraction JSON mode');

  const candidate = context.OCR.normalizeVisionExtraction(extracted.data, extracted.strategy, extracted.rawText);
  candidate.warnings = [...(candidate.warnings || []), ...context.OCR.validateCandidate(candidate)];
  candidate.score = context.OCR.scoreCandidate(candidate);

  assertEqual(candidate.values['g-pts'], 21, 'SELF teammate row replaces total row PTS');
  assertEqual(candidate.values['g-result'], 'W', 'Lowercase result normalized');
  assertEqual(candidate.roster.teammates[0].self, true, 'String true SELF normalized');
  assertEqual(candidate.roster.opponents[0].self, false, 'String false SELF normalized');
  if (!candidate.warnings.some(w => /total row|summary row/i.test(w.message))) {
    throw new Error('Expected warning for ignored total/summary row');
  }
  if (candidate.score < 80) throw new Error(`Zhipu structured candidate score too low: ${candidate.score}`);

  const looseShape = {
    controlled_player: {
      player_name: 'Jay Hoops',
      pos: 'SG',
      is_self: true,
      points: '19',
      rebounds: '4',
      assists: '6',
      steals: '2',
      blocks: '0',
      fouls: '2',
      turnovers: '1',
      field_goals: '7/13',
      three_pointers: '3-6',
      free_throws: '2-2',
      plus_minus: '+11',
      grade: 'A-',
    },
    score: '82-74',
    result: 'win',
    my_team: [
      { player: 'Jay Hoops', self: true, points: 19, rebounds: 4, assists: 6, field_goals: '7-13', three_pointers: '3-6', free_throws: '2-2', plus_minus: 11 },
    ],
    opponent_team: [
      { player: 'Rival Guard', pos: 'PG', points: 17, rebounds: 2, assists: 8, field_goals: '6-12', three_pointers: '2-5', free_throws: '3-4', plus_minus: -11 },
    ],
  };
  const looseCandidate = context.OCR.normalizeVisionExtraction(looseShape, 'zhipu-loose-json', JSON.stringify(looseShape));
  assertEqual(looseCandidate.values['g-pts'], 19, 'Loose JSON points alias normalized');
  assertEqual(looseCandidate.values['g-fg2m'], 7, 'Loose JSON field goal pair normalized');
  assertEqual(looseCandidate.values['g-fg3a'], 6, 'Loose JSON three-point pair normalized');
  assertEqual(looseCandidate.values['g-score-own'], 82, 'Loose JSON score string own side normalized');
  assertEqual(looseCandidate.values['g-score-opp'], 74, 'Loose JSON score string opponent side normalized');
  assertEqual(looseCandidate.values['g-result'], 'W', 'Loose JSON win alias normalized');
  assertEqual(looseCandidate.roster.teammates[0].name, 'Jay Hoops', 'Loose JSON my_team roster normalized');
  assertEqual(looseCandidate.roster.opponents[0].name, 'Rival Guard', 'Loose JSON opponent_team roster normalized');

  console.log('ocr zhipu structured ok: GLM-OCR first pass, free text extraction, loose JSON aliases, total-row guard, SELF row fallback, and warnings');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
