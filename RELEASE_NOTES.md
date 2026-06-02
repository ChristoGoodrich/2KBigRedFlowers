# 2KBigRedFlowers v1.0.5 Android Preview

## 简体中文

这是面向 Android 侧载测试的 HyperOS 风格移动端重构与版本规范更新。

### 主要变化

- 统一移动端浅色模式：使用清晰白底、冷灰分区、柔和圆角与高对比文字。
- 重构球员目录：移除浅色模式下残留的深色筛选区，修复球员卡白底白字。
- 新增“关于应用”：显示当前安装版本，并提供“检查更新”和发布说明入口。
- 修复 Android 原生版本号长期停留在 `1.0.1` 的问题。
- 将网页端、Android 和 iOS 原生版本统一绑定到 `package.json`。
- 修复从长页面切换底部 Tab 后新页面标题被旧滚动位置顶掉的问题。

### 下载内容

- `2KBigRedFlowers-1.0.5-debug.apk`
- `SHA256SUMS.txt`

Android APK 使用 debug 证书，仅用于侧载测试。

## English

This Android sideload preview introduces a HyperOS-inspired mobile redesign and
normalizes app version reporting.

### Highlights

- Unified mobile light mode with crisp white surfaces, cool-gray sections,
  softer radii, and consistently high-contrast text.
- Rebuilt the player directory so the light theme no longer leaves a dark
  filter panel or white-on-white player-card content behind.
- Added an About center with the installed version, manual update check, and
  release-notes link.
- Fixed stale Android native metadata that still reported `1.0.1` in newer APKs.
- Bound staged web, Android, and iOS native versions to `package.json`.
- Reset scroll position when changing mobile tabs or restoring routes.

### Downloads

- `2KBigRedFlowers-1.0.5-debug.apk`
- `SHA256SUMS.txt`

The Android APK uses a debug certificate and is intended for sideload testing.
