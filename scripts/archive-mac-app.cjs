const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const appName = `${pkg.productName}.app`;

for (const arch of ['arm64', 'x64']) {
  const sourceDir = path.join(root, 'out', `${pkg.productName}-darwin-${arch}`);
  const sourceApp = path.join(sourceDir, appName);
  const outputDir = path.join(root, 'out', 'make', 'tar.gz', 'darwin', arch);
  const output = path.join(outputDir, `${pkg.productName}-darwin-${arch}-${pkg.version}-unsigned.tar.gz`);

  if (!fs.existsSync(sourceApp)) {
    throw new Error(`Packaged macOS app not found: ${sourceApp}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(output, { force: true });

  const result = spawnSync('tar', ['-czf', output, '-C', sourceDir, appName], {
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`tar failed for ${arch}: ${result.status}`);

  console.log(`unsigned macOS ${arch} archive: ${output}`);
}
