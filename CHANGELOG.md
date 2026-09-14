# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.1.0] - 2026-09-14

### Added

- Added a game-year data layer: the badge catalog, tier thresholds, attribute
  groups and labels, position weights, animation unlock thresholds, and the
  season calendar now live in per-year datasets (`nba2k-gamedata-2k26.js`,
  `nba2k-gamedata-2k27.js`) behind a registry (`nba2k-gamedata.js`). The newest
  registered year is active unless `localStorage` `gamedata:year` pins another.
- Added an NBA 2K27 dataset covering the six shipped badge disciplines, the 19
  new badge names, and the five badges with published tier thresholds. Entries
  carried over from 2K26 are marked `provisional`, unpublished thresholds are
  `null`, and `meta` records which sections are unverified.
- Added `scripts/gamedata-guard.cjs`, which boots the data layer and pins its
  invariants -- notably that a badge with unknown thresholds can never
  auto-unlock, and that switching years leaves stored records untouched.
- The badge editor now labels badges whose requirements are unpublished or whose
  presence in the current game is unconfirmed, instead of showing an empty
  requirement area that reads as "no requirement".
- English and Simplified Chinese repository documentation.
- GitHub community health files, issue forms, pull request template, Dependabot
  configuration, and CodeQL workflow.

### Changed

- Renamed the 63 `nba2k26-*` sources and the 38 `NBA2K26_*` global namespaces to
  year-neutral `nba2k-*` / `NBA2K_*`, so a new 2K release no longer requires
  renaming every file. The Android and iOS application id, the Supabase table
  name, and the `nba2k26_cloud_config` storage key deliberately keep their
  original names: changing them would orphan installed apps, cloud records, and
  saved cloud credentials. `NBA2K26_SUPABASE_URL` and
  `NBA2K26_SUPABASE_ANON_KEY` are still read as fallbacks for existing CI
  secrets.
- Export metadata, report titles, share-card artwork, and download filenames now
  follow the active game year instead of a hardcoded 2K26 label.

### Fixed

- Fixed the season calendar running out of range: with the 2K26 table ending
  2026-08-06, `dateToSeason()` returned `null` for any later game and
  `currentSeason()` silently presented the finished Season 8 as current. Out of
  range results now carry `stale: true`.
- Fixed `meetsBadgeTier()` treating an empty requirement list as satisfied,
  which would have auto-unlocked every badge with unknown thresholds to Legend.
- `nba2k26-build-tracker.html` is now a redirect stub so PWAs, bookmarks, and
  shortcuts installed before the rename keep opening the app.

## [1.0.5] - 2026-06-02

### Added

- Added an in-app About center with the installed version, manual update check,
  and release-notes link.
- Added package-driven native version synchronization for Android, iOS, and
  staged web builds.

### Changed

- Reworked mobile light mode into a HyperOS-inspired surface system with
  cleaner spacing, softer panels, and consistent high-contrast controls.
- Rebuilt the mobile player directory toolbar and console cards for one-glance
  readability on narrow Android screens.

### Fixed

- Removed stale Android `versionName "1.0.1"` metadata from newer APK builds.
- Reset scroll position when switching mobile pages or restoring a route so
  page titles are not clipped after navigating from longer screens.

## [1.0.4] - 2026-06-02

### Added

- Added a standalone Account Center for sign-in, registration, sync status,
  cloud configuration, and manual recovery tools.
- Added a dedicated mobile presentation layer with compact page titles and
  native-style light-mode surfaces.

### Changed

- Rebuilt the narrow-screen first-run overview into a mobile-first summary,
  action, and onboarding flow.
- Converted narrow-screen game records into readable card-style rows.
- Kept Data Backup focused on import, export, and local-data maintenance.

### Fixed

- Restored clear contrast across mobile light mode.
- Kept mobile modal sheets above the bottom tab bar.

## [1.0.3] - 2026-06-02

### Fixed

- Removed the mobile career overview strip so narrow screens open directly on
  the current page instead of requiring horizontal swipes through summary data.
- Kept the full career overview strip available on desktop screens.

## [1.0.2] - 2026-06-02

### Added

- Replaced the narrow-screen header navigation with a five-item mobile bottom
  tab bar and a More drawer for secondary destinations.
- Added regression guards for the mobile tab bar and overflow menu.

### Fixed

- Removed the fixed mobile brand header so content begins at the top of the
  native app viewport.
- Kept mobile Settings reachable from the More drawer after removing the
  visible header.

## [1.0.1] - 2026-06-01

### Fixed

- Restored readable light-theme colors after the late 2KLab dashboard skin.
- Kept every mobile navigation entry, including Settings, visible on narrow
  Android screens.
- Allowed the mobile Settings dropdown to render outside the header and
  navigation containers.

## [1.0.0] - 2026-06-01

### Added

- Windows x64 preview installer.
- Android debug APK for sideload testing.
- Unsigned macOS internal-test archives for Apple Silicon and Intel Macs.
- Generated iOS Xcode project for signing and distribution from macOS.
- Optional Supabase-backed cross-device sync while preserving local-first
  storage.

[Unreleased]: https://github.com/ChristoGoodrich/2KBigRedFlowers/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.5
[1.0.4]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.4
[1.0.3]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.3
[1.0.2]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.2
[1.0.1]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.1
[1.0.0]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.0
