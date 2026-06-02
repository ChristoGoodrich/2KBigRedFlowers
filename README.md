<div align="center">
  <img src="./assets/logo.svg" alt="2KBigRedFlowers logo" width="120">
  <h1>2KBigRedFlowers</h1>
  <p>Local-first NBA 2K26 build management, game tracking, scouting, OCR-assisted logging, and performance analytics.</p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="https://github.com/ChristoGoodrich/2KBigRedFlowers/actions/workflows/ci.yml"><img src="https://github.com/ChristoGoodrich/2KBigRedFlowers/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/ChristoGoodrich/2KBigRedFlowers/releases"><img src="https://img.shields.io/github/v/release/ChristoGoodrich/2KBigRedFlowers?include_prereleases&label=release" alt="Release"></a>
    <a href="./LICENSE.md"><img src="https://img.shields.io/badge/license-all%20rights%20reserved-lightgrey" alt="License: all rights reserved"></a>
  </p>
</div>

## Overview

2KBigRedFlowers is an unofficial companion tool for managing NBA 2K26 builds
and game records across Windows, Android, iOS, macOS, and the web. The web app
is the source of truth. Electron packages it for desktop platforms, while
Capacitor packages the same app for mobile platforms.

Data stays local by default. Optional Supabase sync can mirror records between
your devices after you configure your own Supabase project.

## Downloads

The current multi-platform baseline is
[`v1.0.0 Preview`](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.0).
Android users should install the
[`v1.0.4 Android Preview`](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.4)
mobile light-mode and account-center update.

| Platform | Package | Status |
| --- | --- | --- |
| Windows x64 | [Download installer](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-1.0.0.Setup.exe) | Unsigned preview installer |
| Android | [Download debug APK](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.4/2KBigRedFlowers-1.0.4-debug.apk) | Latest debug-signed sideload preview |
| macOS Apple Silicon | [Download internal-test archive](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-darwin-arm64-1.0.0-unsigned.tar.gz) | Unsigned archive |
| macOS Intel | [Download internal-test archive](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-darwin-x64-1.0.0-unsigned.tar.gz) | Unsigned archive |
| iOS | [Open the Xcode project](./ios/App/App.xcodeproj) | Build on macOS with Xcode and Apple Developer signing |
| Android checksums | [Download Android SHA-256 manifest](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.4/SHA256SUMS.txt) | Verify the Android preview APK |
| Baseline checksums | [Download v1.0.0 SHA-256 manifest](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/SHA256SUMS.txt) | Verify the Windows and macOS preview assets |

The preview packages are intended for testing. The Windows and macOS packages
are not commercially code-signed, and the Android APK uses a debug certificate.

## Features

- Build management with attributes, badges, and OVR estimation.
- Game logging with teammate and opponent records.
- OCR-assisted stat entry for screenshots.
- Player scouting, comparison, performance analytics, and data-quality checks.
- Export and import tools for local backups.
- Optional Supabase-backed cross-device sync.

## Cloud Sync

1. Run [`supabase-cloud-sync.sql`](./supabase-cloud-sync.sql) once in your
   Supabase SQL Editor.
2. Open `Settings > Account > Advanced setup`.
3. Enter your Supabase project URL and public anon key.
4. Sign in with the same account on each device.

Never use a Supabase service-role key in the application.

## Development

Use Node.js 22 LTS:

```powershell
npm install
npm test
```

Common packaging commands:

```powershell
npm run desktop:make:win
npm run android:apk
npm run desktop:make:mac:unsigned
npm run ios:sync
```

See [`PACKAGING.md`](./PACKAGING.md) for platform-specific setup and Apple
release requirements. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for module
ownership and validation rules.

## Contributing And Support

- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request.
- Use the [issue forms](https://github.com/ChristoGoodrich/2KBigRedFlowers/issues/new/choose)
  for bug reports, feature requests, and setup questions.
- Read [`SUPPORT.md`](./SUPPORT.md) for troubleshooting guidance.
- Report vulnerabilities privately as described in [`SECURITY.md`](./SECURITY.md).
- Review release history in [`CHANGELOG.md`](./CHANGELOG.md).

## License And Disclaimer

This repository is source-available, but it is not distributed under an
open-source license. See [`LICENSE.md`](./LICENSE.md).

2KBigRedFlowers is an unofficial fan-made tool. It is not affiliated with,
endorsed by, or sponsored by 2K, Visual Concepts, the NBA, or the NBPA. Product
names, logos, and trademarks belong to their respective owners.
