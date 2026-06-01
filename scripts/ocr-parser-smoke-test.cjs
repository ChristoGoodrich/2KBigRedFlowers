const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const parserPath = path.join(root, 'nba2k26-ocr-parser.js');
const code = `${fs.readFileSync(parserPath, 'utf8')}\nthis.OCRParser = OCRParser;`;
const context = {};
vm.runInNewContext(code, context, { filename: parserPath });
const parser = context.OCRParser;

function parse(text) {
  return parser.parseAll([{ strategy: 'sample', confidence: 95, text }]);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertDeepNames(players, expected, label) {
  const names = players.map(player => player.name);
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${expected.join(', ')}, got ${names.join(', ')}`);
  }
}

const keyedMain = parse([
  'TEAM TOTAL PTS=99 REB=41 AST=28 STL=8 BLK=4 FLS=10 TO=7 FG=40-75 3PT=15-32 FT=4-6',
  'MY PTS=21 REB=4 AST=10 STL=3 BLK=0 FLS=1 TO=2 PM=+14 FG=8-13 3PT=3-5 FT=2-2 GRADE=A',
  'SCORE=85-71 RESULT=W',
].join('\n'));

assertEqual(keyedMain.values['g-pts'], 21, 'keyed MY PTS beats team total');
assertEqual(keyedMain.values['g-ast'], 10, 'keyed MY AST parsed');
assertEqual(keyedMain.values['g-score-own'], 85, 'keyed score own parsed');
assertEqual(keyedMain.values['g-score-opp'], 71, 'keyed score opponent parsed');
assertEqual(keyedMain.values['g-grade'], 'A', 'keyed grade parsed');

const selfRosterMain = parse([
  'TOTAL PTS=92 REB=34 AST=21 STL=7 BLK=5 FLS=12 TO=9 FG=36-70 3PT=12-29 FT=8-11',
  'SCORE=78-70 RESULT=W',
  'MY TEAM',
  'TM NAME=Jay Hoops POS=SG SELF=1 PTS=24 REB=5 AST=8 STL=2 BLK=1 FLS=2 TO=3 FGM=9 FGA=16 3PM=4 3PA=8 FTM=2 FTA=2 PM=+11 GRADE=A-',
  'TM NAME=Paint Lock POS=C PTS=8 REB=12 AST=1 STL=0 BLK=3 FLS=3 TO=0 FGM=4 FGA=5 3PM=0 3PA=0 FTM=0 FTA=0 PM=+6',
  'Opponent Team',
  'OPP NAME=Rival Guard POS=PG PTS=16 REB=2 AST=9 STL=1 BLK=0 FLS=1 TO=3 FGM=6 FGA=13 3PM=2 3PA=6 FTM=2 FTA=2 PM=-8',
].join('\n'));

assertEqual(selfRosterMain.values['g-pts'], 24, 'SELF teammate row becomes main PTS');
assertEqual(selfRosterMain.values['g-reb'], 5, 'SELF teammate row becomes main REB');
assertEqual(selfRosterMain.values['g-grade'], 'A-', 'SELF teammate grade keeps modifier');
assertDeepNames(selfRosterMain.roster.teammates, ['Jay Hoops', 'Paint Lock'], 'teammate roster names');
assertDeepNames(selfRosterMain.roster.opponents, ['Rival Guard'], 'opponent roster names');
assertEqual(selfRosterMain.roster.teammates[0].self, true, 'SELF flag retained on teammate roster row');

const unkeyedSelfRow = parse([
  'TEAM TOTAL 92 34 21 7 5 12 9 36-70 12-29 8-11',
  'LOSS 68-72',
  'MY 18 4 6 1 0 2 3 7-15 2-5 2-2 -4',
].join('\n'));

assertEqual(unkeyedSelfRow.values['g-pts'], 18, 'unkeyed MY row PTS parsed');
assertEqual(unkeyedSelfRow.values['g-reb'], 4, 'unkeyed MY row REB parsed');
assertEqual(unkeyedSelfRow.values['g-pf'], 2, 'unkeyed MY row FLS parsed');
assertEqual(unkeyedSelfRow.values['g-to'], 3, 'unkeyed MY row TO parsed');
assertEqual(unkeyedSelfRow.values['g-pm'], -4, 'unkeyed MY row plus-minus parsed');
assertEqual(unkeyedSelfRow.values['g-score-own'], 68, 'loss score own side parsed');
assertEqual(unkeyedSelfRow.values['g-score-opp'], 72, 'loss score opponent side parsed');

const sectionRoster = parser.parseRosterTables([
  'MY TEAM',
  'Jay Hoops SG SELF=1 18 4 6 1 0 2 3 7-15 2-5 2-2 -4',
  'Paint Lock C 8 12 1 0 3 3 0 4-5 0-0 0-0 +6',
  'Opponent Team',
  'Rival Guard PG 16 2 9 1 0 1 3 6-13 2-6 2-2 -8',
].join('\n'));

assertDeepNames(sectionRoster.teammates, ['Jay Hoops', 'Paint Lock'], 'unprefixed section teammates');
assertDeepNames(sectionRoster.opponents, ['Rival Guard'], 'unprefixed section opponents');
assertEqual(sectionRoster.teammates[0].pts, 18, 'unprefixed teammate PTS parsed');
assertEqual(sectionRoster.teammates[0].fgm, 7, 'unprefixed teammate FGM parsed');
assertEqual(sectionRoster.teammates[0].pm, -4, 'unprefixed teammate plus-minus parsed');

const badShooting = {
  values: { 'g-fg2m': 8, 'g-fg2a': 7, 'g-ftm': 3, 'g-fta': 2 },
};
const warningText = parser.validateCandidate(badShooting).map(w => w.message).join(' | ');
if (!/FGM cannot be greater than FGA/.test(warningText) || !/FTM cannot be greater than FTA/.test(warningText)) {
  throw new Error(`shooting validation missing expected warnings: ${warningText}`);
}

console.log('ocr parser ok: main player, totals guard, score side, shooting splits, roster sides, SELF rows, and validation warnings');
