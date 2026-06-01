// Service-worker cache-version guard.
//
// The SW CACHE constant must be bumped whenever any cached asset changes, or
// returning visitors keep stale files. Manual bumping is error-prone (we once
// shipped a stale v49 working tree and collided versions). This guard keeps a
// committed lock (sw-cache.lock.json) mapping the current CACHE version to a
// content hash of every STATIC asset, and:
//   - PASSES if the assets are unchanged since the lock,
//   - AUTO-UPDATES the lock (and passes) if the version was correctly bumped
//     alongside the asset change,
//   - FAILS if assets changed but CACHE was NOT bumped (the real mistake).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const swPath = path.join(root, 'sw.js');
const lockPath = path.join(__dirname, 'sw-cache.lock.json');
const HASH_MODE = 'text-lf-v1';
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg']);

const sw = fs.readFileSync(swPath, 'utf8');

const versionMatch = sw.match(/const\s+CACHE\s*=\s*'([^']+)'/);
if (!versionMatch) throw new Error('sw-cache guard: could not find CACHE constant in sw.js');
const version = versionMatch[1];

const staticBlock = sw.slice(sw.indexOf('const STATIC = ['), sw.indexOf('];', sw.indexOf('const STATIC = [')));
const assets = [...staticBlock.matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
if (!assets.length) throw new Error('sw-cache guard: STATIC asset list is empty');

const missing = assets.filter(a => !fs.existsSync(path.join(root, a.replace(/^\.\//, ''))));
if (missing.length) {
  throw new Error('sw-cache guard FAILED — STATIC lists files that do not exist:\n' + missing.join('\n'));
}

const hash = crypto.createHash('sha256');
for (const a of assets) {
  const assetPath = path.join(root, a.replace(/^\.\//, ''));
  const content = fs.readFileSync(assetPath);
  const hashContent = TEXT_EXTENSIONS.has(path.extname(assetPath).toLowerCase())
    ? Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'))
    : content;
  hash.update(a);
  hash.update('\0');
  hash.update(hashContent);
  hash.update('\0');
}
const assetsHash = hash.digest('hex');

let lock = null;
if (fs.existsSync(lockPath)) {
  try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { lock = null; }
}

function writeLock(reason) {
  fs.writeFileSync(lockPath, JSON.stringify({ version, hashMode: HASH_MODE, assetsHash, assetCount: assets.length }, null, 2) + '\n');
  console.log(`sw-cache guard ok: ${reason} — locked ${version} to ${assets.length} assets`);
}

if (!lock) {
  writeLock('bootstrapped lock');
} else if (lock.hashMode !== HASH_MODE) {
  writeLock(`migrated hash mode to ${HASH_MODE}`);
} else if (lock.assetsHash === assetsHash) {
  console.log(`sw-cache guard ok: ${assets.length} cached assets unchanged since ${version}`);
} else if (lock.version !== version) {
  // Assets changed AND the version was bumped — the correct workflow.
  writeLock(`assets changed with a CACHE bump ${lock.version} → ${version}`);
} else {
  throw new Error(
    `sw-cache guard FAILED — cached assets changed but CACHE is still '${version}'.\n` +
    `Bump the CACHE constant in sw.js (e.g. to the next version) so returning visitors fetch the new files, then re-run.`
  );
}
