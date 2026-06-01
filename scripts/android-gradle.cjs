const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

function firstExisting(paths) {
  return paths.find(candidate => candidate && fs.existsSync(candidate)) || '';
}

function findWindowsJdk() {
  const microsoftDir = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft');
  const microsoftJdks = fs.existsSync(microsoftDir)
    ? fs.readdirSync(microsoftDir)
      .filter(name => /^jdk-/i.test(name))
      .sort()
      .reverse()
      .map(name => path.join(microsoftDir, name))
    : [];

  return firstExisting([
    process.env.JAVA_HOME,
    ...microsoftJdks,
  ]);
}

function resolveToolchain() {
  const env = { ...process.env };

  if (process.platform === 'win32') {
    env.JAVA_HOME = findWindowsJdk();
    env.ANDROID_HOME = firstExisting([
      env.ANDROID_HOME,
      env.ANDROID_SDK_ROOT,
      path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Android', 'Sdk'),
    ]);
  } else {
    env.ANDROID_HOME = firstExisting([
      env.ANDROID_HOME,
      env.ANDROID_SDK_ROOT,
      path.join(os.homedir(), 'Library', 'Android', 'sdk'),
      path.join(os.homedir(), 'Android', 'Sdk'),
    ]);
  }

  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;

  if (!env.JAVA_HOME || !fs.existsSync(path.join(env.JAVA_HOME, 'bin'))) {
    throw new Error('JDK not found. Install JDK 21 or set JAVA_HOME.');
  }
  if (!env.ANDROID_HOME || !fs.existsSync(env.ANDROID_HOME)) {
    throw new Error('Android SDK not found. Install it or set ANDROID_HOME.');
  }

  env.Path = [
    path.join(env.JAVA_HOME, 'bin'),
    path.join(env.ANDROID_HOME, 'platform-tools'),
    env.Path,
  ].filter(Boolean).join(path.delimiter);

  return env;
}

function main() {
  const env = resolveToolchain();
  const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const args = process.argv.slice(2);

  console.log('android gradle: resolved local JDK and Android SDK toolchain');

  const command = process.platform === 'win32'
    ? (env.ComSpec || 'C:\\Windows\\System32\\cmd.exe')
    : gradle;
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', gradle, ...args]
    : args;

  const result = spawnSync(command, commandArgs, {
    cwd: androidDir,
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  process.exitCode = result.status == null ? 1 : result.status;
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
