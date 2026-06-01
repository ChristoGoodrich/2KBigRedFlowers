const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const outputDir = path.join(root, 'out', 'make', 'android');
const output = path.join(outputDir, `${pkg.productName}-${pkg.version}-debug.apk`);

if (!fs.existsSync(source)) {
  throw new Error(`Android debug APK not found: ${source}`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(source, output);

console.log(`android APK copied to ${output}`);
