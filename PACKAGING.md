# Cross-Platform Packaging

The existing web app remains the source of truth. Capacitor wraps the staged
static site for Android and iOS. Electron Forge wraps the same staged site for
Windows and macOS.

## One-Time Setup

Install JavaScript dependencies:

```powershell
npm install
```

Use Node 22 LTS for local development. Desktop scripts also invoke Node 22
explicitly because the current Electron Forge packager does not complete
correctly under Node 24.

To ship a preconfigured Cloud Sync connection, set the public Supabase values
before staging or packaging. Never use a service-role key.

```powershell
$env:NBA2K26_SUPABASE_URL = 'https://your-project.supabase.co'
$env:NBA2K26_SUPABASE_ANON_KEY = 'your-public-anon-key'
```

Run `supabase-cloud-sync.sql` once in the Supabase SQL Editor. On every device,
open `Settings > Backup > Cloud Sync` and sign in to the same account.

## Windows

Build the Windows x64 installer on Windows:

```powershell
npm run desktop:make:win
```

The distributable is written below `out/make/squirrel.windows/x64`.

## Android

Install Android Studio and an Android SDK, then add the native project once:

```powershell
npm run android:add
```

Build a local debug APK:

```powershell
npm run android:apk
```

The Gradle helper auto-detects the standard Windows JDK and Android SDK
locations when a newly opened terminal has not loaded `JAVA_HOME` yet.

The APK is copied to `out/make/android/2KBigRedFlowers-<version>-debug.apk`.
For Play Store delivery, open `android/` in Android Studio and create a signed
release App Bundle.

## iOS

iOS builds require macOS with Xcode. On a Mac, install dependencies and add the
native project once:

```bash
npm install
npm run ios:add
npm run ios:sync
npx cap open ios
```

Use Xcode signing and Archive to deliver the app to TestFlight or the App Store.

## macOS

Build the desktop DMG and ZIP on macOS:

```bash
npm install
npm run desktop:make:mac
```

The distributables are written below `out/make`.

On Windows, unsigned internal-test `.app` archives can still be created for
both Apple Silicon and Intel Macs:

```powershell
npm run desktop:make:mac:unsigned
```

These `tar.gz` archives preserve macOS framework symlinks. They are not a
substitute for a signed and notarized macOS release built on a Mac.

Available deliverables are indexed in `out/make/SHA256SUMS.txt`.

## Updating Web Assets

After changing the website, refresh both native projects:

```powershell
npm run mobile:sync
```

Desktop packaging stages the latest web assets automatically.

Native icon assets can be refreshed from `assets/logo.svg` with:

```powershell
npm run icons:native
```
