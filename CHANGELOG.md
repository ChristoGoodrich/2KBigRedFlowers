# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- English and Simplified Chinese repository documentation.
- GitHub community health files, issue forms, pull request template, Dependabot
  configuration, and CodeQL workflow.

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

[Unreleased]: https://github.com/ChristoGoodrich/2KBigRedFlowers/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.2
[1.0.1]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.1
[1.0.0]: https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.0
