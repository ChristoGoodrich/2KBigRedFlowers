const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const makeDir = path.join(root, 'out', 'make');
const productVersion = `${pkg.productName}-${pkg.version}`;
const files = [
  path.join(makeDir, 'squirrel.windows', 'x64', `${productVersion} Setup.exe`),
  path.join(makeDir, 'android', `${productVersion}-debug.apk`),
  path.join(makeDir, 'tar.gz', 'darwin', 'arm64', `${pkg.productName}-darwin-arm64-${pkg.version}-unsigned.tar.gz`),
  path.join(makeDir, 'tar.gz', 'darwin', 'x64', `${pkg.productName}-darwin-x64-${pkg.version}-unsigned.tar.gz`),
].filter(file => fs.existsSync(file));

if (!files.length) {
  throw new Error('No release artifacts found below out/make');
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

fs.mkdirSync(makeDir, { recursive: true });

const lines = files
  .map(file => `${sha256(file)}  ${path.relative(makeDir, file).replace(/\\/g, '/')}`)
  .join('\n') + '\n';

const output = path.join(makeDir, 'SHA256SUMS.txt');
fs.writeFileSync(output, lines);

console.log(`artifact checksums written: ${output}`);
