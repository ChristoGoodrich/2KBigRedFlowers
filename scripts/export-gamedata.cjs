// Export the registered game-year datasets to JSON.
//
// During the migration to a Rust core the datasets must not fork: the JS app
// and the Rust crate read the same numbers, or the two badge catalogs drift
// apart and the app starts disagreeing with itself. The JS dataset files stay
// the source of truth (they are what a contributor edits); this script derives
// the JSON that Rust consumes.
//
// `scripts/gamedata-export-guard.cjs` fails the suite if the committed JSON no
// longer matches, so the two can never silently diverge.
//
// Usage: node scripts/export-gamedata.cjs [--check]
//   --check  print what would change and exit non-zero instead of writing.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'game-data');

const DATASET_SCRIPTS = [
  'nba2k-gamedata.js',
  'nba2k-gamedata-2k26.js',
  'nba2k-gamedata-2k27.js',
];

function loadRegistry() {
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    // The registry reads a stored year preference; export must not depend on
    // whatever a browser happened to have set.
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of DATASET_SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  if (!sandbox.NBA2K_GAMEDATA) throw new Error('dataset scripts did not register a game data registry');
  return sandbox.NBA2K_GAMEDATA;
}

// Key order has to be stable or the guard reports drift on every run.
function sortedDeep(value) {
  if (Array.isArray(value)) return value.map(sortedDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortedDeep(value[key]);
    return out;
  }
  return value;
}

function serialize(dataset) {
  return JSON.stringify(sortedDeep(dataset), null, 2) + '\n';
}

function build() {
  const registry = loadRegistry();
  const files = new Map();
  for (const year of registry.years()) {
    files.set(path.join(outDir, `${year}.json`), serialize(registry.get(year)));
  }
  return files;
}

function main() {
  const check = process.argv.includes('--check');
  const files = build();
  const drifted = [];

  for (const [file, contents] of files) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === contents) continue;
    drifted.push(path.relative(root, file));
    if (!check) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
    }
  }

  // A year removed from the JS datasets must not leave a stale JSON behind.
  const expected = new Set([...files.keys()].map(f => path.basename(f)));
  const orphans = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter(f => f.endsWith('.json') && !expected.has(f))
    : [];
  for (const orphan of orphans) {
    drifted.push(`${path.relative(root, outDir)}/${orphan} (no longer registered)`);
    if (!check) fs.rmSync(path.join(outDir, orphan));
  }

  if (check) {
    if (drifted.length) {
      throw new Error(
        `game data JSON is out of date:\n  ${drifted.join('\n  ')}\n` +
        'Run `node scripts/export-gamedata.cjs` and commit the result.',
      );
    }
    console.log(`game data export ok: ${files.size} year(s) match the JS datasets`);
    return;
  }

  console.log(
    drifted.length
      ? `exported ${files.size} year(s); updated: ${drifted.join(', ')}`
      : `exported ${files.size} year(s); already up to date`,
  );
}

if (require.main === module) main();
module.exports = { build, serialize };
