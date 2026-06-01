# 2KBigRedFlowers

NBA 2K26 build management, game tracking, player scouting, OCR-assisted game
logging, and performance analytics in a local-first application.

The web app is the source of truth. Electron packages it for Windows and macOS.
Capacitor packages the same app for Android and iOS.

## Downloads

Installable and internal-test packages are published on the
[GitHub Releases](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases)
page.

The first `v1.0.0` release includes:

- Windows x64 installer.
- Android debug APK for direct sideloading.
- Unsigned macOS internal-test archives for Apple Silicon and Intel Macs.
- SHA-256 checksum manifest.

The Android APK is a debug build. The Windows installer and macOS archives are
not commercially code-signed. iOS delivery requires a Mac, Xcode, and an Apple
Developer signing identity.

## Cloud Sync

Data stays local by default. Optional Supabase sync mirrors build, game, and
player records between devices.

1. Run [`supabase-cloud-sync.sql`](./supabase-cloud-sync.sql) once in the
   Supabase SQL Editor.
2. Open `Settings > Backup > Cloud Sync > Advanced setup`.
3. Enter the Supabase project URL and public anon key.
4. Sign in with the same account on each device.

Never use a Supabase service-role key in the application.

## Development

Use Node 22 LTS:

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
release requirements.

## Architecture

The project intentionally keeps the existing classic-script web shell and
sidecar modules. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for module ownership
and validation rules.
