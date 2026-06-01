const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const parserPath = path.join(root, 'nba2k26-ocr-parser.js');
const ocrPath = path.join(root, 'nba2k26-ocr.js');

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
};
context.window = context;

vm.runInNewContext(`${fs.readFileSync(parserPath, 'utf8')}\nthis.OCRParser = OCRParser;`, context, { filename: parserPath });
const ocrCode = fs.readFileSync(ocrPath, 'utf8').replace(/\nOCR\.init\(\);\s*$/, '\nthis.OCR = OCR;\n');
vm.runInNewContext(ocrCode, context, { filename: ocrPath });

const sample = {
  controlledPlayer: {
    name: 'Jay Hoops',
    position: 'SG',
    self: true,
    pts: 27,
    reb: 5,
    ast: 9,
    stl: 2,
    blk: 1,
    pf: 2,
    to: 3,
    fgm: 10,
    fga: 18,
    fg3m: 4,
    fg3a: 9,
    ftm: 3,
    fta: 3,
    pm: 12,
    grade: 'A-',
    confidence: 96,
    evidence: 'highlighted MyPLAYER row',
  },
  score: { own: 84, opp: 76, result: 'W', evidence: 'scoreboard' },
  teammates: [
    {
      name: 'Jay Hoops',
      position: 'SG',
      self: true,
      pts: 27,
      reb: 5,
      ast: 9,
      stl: 2,
      blk: 1,
      pf: 2,
      to: 3,
      fgm: 10,
      fga: 18,
      fg3m: 4,
      fg3a: 9,
      ftm: 3,
      fta: 3,
      pm: 12,
      grade: 'A-',
      confidence: 96,
      evidence: 'same row',
    },
  ],
  opponents: [
    {
      name: 'Rival Guard',
      position: 'PG',
      self: false,
      pts: 19,
      reb: 2,
      ast: 8,
      stl: 1,
      blk: 0,
      pf: 1,
      to: 2,
      fgm: 7,
      fga: 14,
      fg3m: 3,
      fg3a: 6,
      ftm: 2,
      fta: 2,
      pm: -8,
      grade: 'B+',
      confidence: 90,
      evidence: 'opponent row',
    },
  ],
  warnings: [],
};

const candidate = context.OCR.normalizeVisionExtraction(sample, 'openai-vision-json', JSON.stringify(sample));
candidate.warnings = context.OCR.validateCandidate(candidate);
candidate.score = context.OCR.scoreCandidate(candidate);

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

assertEqual(candidate.values['g-pts'], 27, 'OpenAI JSON PTS normalized');
assertEqual(candidate.values['g-ast'], 9, 'OpenAI JSON AST normalized');
assertEqual(candidate.values['g-score-own'], 84, 'OpenAI JSON own score normalized');
assertEqual(candidate.values['g-score-opp'], 76, 'OpenAI JSON opponent score normalized');
assertEqual(candidate.values['g-grade'], 'A-', 'OpenAI JSON grade normalized');
assertEqual(candidate.values['g-result'], 'W', 'OpenAI JSON result normalized');
assertEqual(candidate.roster.teammates[0].self, true, 'OpenAI JSON SELF roster flag normalized');
assertEqual(candidate.roster.opponents[0].name, 'Rival Guard', 'OpenAI JSON opponent name normalized');
if (candidate.warnings.length) throw new Error(`OpenAI JSON candidate produced unexpected warnings: ${candidate.warnings.map(w => w.message).join(' | ')}`);
if (candidate.score < 80) throw new Error(`OpenAI JSON candidate score too low: ${candidate.score}`);

console.log('ocr openai normalizer ok: structured JSON maps into form fields, roster rows, result, score, and validation');
