const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const versionParts = String(pkg.version).split('.').map(Number);

if (versionParts.length !== 3 || versionParts.some(part => !Number.isInteger(part) || part < 0 || part > 99)) {
  throw new Error(`Expected a three-part package version below 100 per part, got ${pkg.version}`);
}

const versionCode = (versionParts[0] * 10000) + (versionParts[1] * 100) + versionParts[2];
const iosProject = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (fs.existsSync(iosProject)) {
  const source = fs.readFileSync(iosProject, 'utf8');
  const updated = source
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${pkg.version};`);

  if (updated === source && !source.includes(`MARKETING_VERSION = ${pkg.version};`)) {
    throw new Error('Could not update iOS MARKETING_VERSION');
  }
  fs.writeFileSync(iosProject, updated);
}

console.log(`native versions synced: ${pkg.version} (${versionCode})`);
