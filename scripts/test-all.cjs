// Unified test/guard runner.
//
// Auto-discovers every `scripts/*-test.cjs` and `scripts/*-guard.cjs` (so new
// guards are picked up without editing this file), runs each in its own process
// so one failure cannot abort the rest, prints a pass/fail summary, and exits
// non-zero if anything failed — suitable for a git pre-commit hook or CI step.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptsDir = __dirname;
const self = path.basename(__filename);

// Run the broad structural/behaviour checks first, then the focused guards.
// Anything not named here but matching the suffixes still runs (alphabetically,
// after the priority list) so a newly added guard is never silently skipped.
const PRIORITY = [
  'smoke-test.cjs',
  'upgrade-guard-test.cjs',
  'flow-smoke-test.cjs',
];

const discovered = fs.readdirSync(scriptsDir)
  .filter(f => /(?:-test|-guard)\.cjs$/.test(f) && f !== self);

const ordered = [
  ...PRIORITY.filter(f => discovered.includes(f)),
  ...discovered.filter(f => !PRIORITY.includes(f)).sort(),
];

if (!ordered.length) {
  console.error('test-all: no *-test.cjs / *-guard.cjs scripts found');
  process.exit(1);
}

const results = [];
const pad = Math.max(...ordered.map(f => f.length));

for (const file of ordered) {
  const out = spawnSync(process.execPath, [path.join(scriptsDir, file)], { encoding: 'utf8' });
  const ok = out.status === 0;
  // Surface the script's own one-line summary (its `ok:` line) or its error.
  const stdout = (out.stdout || '').trim();
  const stderr = (out.stderr || '').trim();
  const errLines = stderr.split('\n');
  const summary = ok
    ? (stdout.split('\n').pop() || '(no output)')
    : (errLines.find(l => /^Error:/.test(l)) || errLines.find(l => /Error|FAILED/.test(l)) || errLines[0] || '(failed)').replace(/^Error:\s*/, '');
  results.push({ file, ok, summary, stderr, stdout });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file.padEnd(pad)}  ${summary}`);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);

if (failed.length) {
  console.log('\n──────── failure detail ────────');
  for (const r of failed) {
    console.log(`\n### ${r.file}`);
    console.log((r.stderr || r.stdout || '(no output)').split('\n').slice(0, 20).join('\n'));
  }
  process.exit(1);
}
