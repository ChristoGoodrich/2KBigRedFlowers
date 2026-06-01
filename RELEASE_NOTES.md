# 2KBigRedFlowers v1.0.0

Initial cross-platform package release for the NBA 2K26 tracker.

## Included

- Windows x64 installer.
- Android debug APK for sideload testing.
- Unsigned macOS internal-test archives for Apple Silicon and Intel Macs.
- SHA-256 checksums for every downloadable artifact.

## Sync

The application remains local-first. To synchronize records across devices,
configure the same Supabase project URL and public anon key in
`Settings > Backup > Cloud Sync > Advanced setup`, then sign in with the same
account.

## Signing Status

- Windows: installer is not commercially code-signed.
- Android: APK uses an Android debug certificate and is intended for sideload
  testing.
- macOS: archives are unsigned internal-test builds. A signed and notarized
  macOS release must be produced on a Mac.
- iOS: the Xcode project is included in the source repository. IPA/TestFlight
  delivery requires Xcode and an Apple Developer signing identity.
