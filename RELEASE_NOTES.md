# 2KBigRedFlowers v1.0.0 Preview

[English](#english) | [简体中文](#简体中文)

## 简体中文

这是 2KBigRedFlowers 的首个跨平台预览版本。

### 下载内容

- Windows x64 安装器。
- 用于侧载测试的 Android debug APK。
- 适用于 Apple Silicon 和 Intel Mac 的未签名内部测试压缩包。
- 所有下载文件的 SHA-256 校验清单。

### 多端同步

应用默认将数据保存在本地。如需同步，请在
`Settings > Backup > Cloud Sync > Advanced setup` 中配置相同的 Supabase
项目 URL 和公开 anon key，并在每台设备上登录同一个账号。

### 签名状态

- Windows：安装器尚未使用商业证书签名。
- Android：APK 使用 Android debug 证书，仅用于侧载测试。
- macOS：压缩包为未签名内部测试版本。签名和公证版本需要在 Mac 上生成。
- iOS：源码仓库中已包含 Xcode 工程。IPA 或 TestFlight 发布需要 Xcode 和
  Apple Developer 签名身份。

## English

This is the first cross-platform preview release of 2KBigRedFlowers.

### Downloads

- Windows x64 installer.
- Android debug APK for sideload testing.
- Unsigned macOS internal-test archives for Apple Silicon and Intel Macs.
- SHA-256 checksums for every downloadable artifact.

### Cross-Device Sync

The application remains local-first. To synchronize records across devices,
configure the same Supabase project URL and public anon key in
`Settings > Backup > Cloud Sync > Advanced setup`, then sign in with the same
account on each device.

### Signing Status

- Windows: the installer is not commercially code-signed.
- Android: the APK uses an Android debug certificate and is intended for
  sideload testing.
- macOS: the archives are unsigned internal-test builds. A signed and notarized
  macOS release must be produced on a Mac.
- iOS: the Xcode project is included in the source repository. IPA or
  TestFlight delivery requires Xcode and an Apple Developer signing identity.
