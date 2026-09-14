// Fails when the committed game-data JSON no longer matches the JS datasets.
//
// The Rust core reads game-data/*.json; the JS app reads nba2k-gamedata-*.js.
// Without this guard someone edits a badge threshold in the JS dataset, ships
// it, and the Rust side keeps evaluating the old number -- the two stacks
// disagree and nothing complains.
require('./export-gamedata.cjs');
const { build } = require('./export-gamedata.cjs');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = build();
const drifted = [];

for (const [file, contents] of files) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current !== contents) drifted.push(path.relative(root, file));
}

const expected = new Set([...files.keys()].map(f => path.basename(f)));
const outDir = path.join(root, 'game-data');
if (fs.existsSync(outDir)) {
  for (const entry of fs.readdirSync(outDir)) {
    if (entry.endsWith('.json') && !expected.has(entry)) {
      drifted.push(`game-data/${entry} (no longer a registered year)`);
    }
  }
}

if (drifted.length) {
  throw new Error(
    'game data export guard FAILED -- committed JSON differs from the JS datasets:\n  ' +
    drifted.join('\n  ') +
    '\nRun `node scripts/export-gamedata.cjs` and commit the result.',
  );
}

const years = [...files.keys()].map(f => path.basename(f, '.json')).sort().reverse();
const bytes = [...files.values()].reduce((n, c) => n + Buffer.byteLength(c), 0);
console.log(
  `game data export guard ok: ${files.size} year(s) in sync (${years.join(', ')}), ${bytes} bytes of JSON`,
);
