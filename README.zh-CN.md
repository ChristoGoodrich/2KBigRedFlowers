<div align="center">
  <img src="./assets/logo.svg" alt="2KBigRedFlowers 标志" width="120">
  <h1>2KBigRedFlowers</h1>
  <p>本地优先的 NBA 2K26 建模管理、比赛记录、球员球探、OCR 辅助录入与数据分析工具。</p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="https://github.com/ChristoGoodrich/2KBigRedFlowers/actions/workflows/ci.yml"><img src="https://github.com/ChristoGoodrich/2KBigRedFlowers/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/ChristoGoodrich/2KBigRedFlowers/releases"><img src="https://img.shields.io/github/v/release/ChristoGoodrich/2KBigRedFlowers?include_prereleases&label=release" alt="发布版本"></a>
    <a href="./LICENSE.md"><img src="https://img.shields.io/badge/license-all%20rights%20reserved-lightgrey" alt="许可：保留所有权利"></a>
  </p>
</div>

## 项目简介

2KBigRedFlowers 是一款非官方 NBA 2K26 辅助工具，可在 Windows、Android、
iOS、macOS 和网页端管理建模与比赛记录。网页应用是唯一的功能源代码；
Electron 将它封装为桌面应用，Capacitor 将同一套应用封装为移动端应用。

数据默认保存在本地。配置自己的 Supabase 项目后，可以选择将记录同步到
自己的多台设备。

## 下载

当前多平台基线版本为
[`v1.0.0 Preview`](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.0)。
Android 用户应安装
[`v1.0.1 Android Preview`](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/tag/v1.0.1)
可用性热修复。

| 平台 | 安装包 | 状态 |
| --- | --- | --- |
| Windows x64 | [下载安装器](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-1.0.0.Setup.exe) | 未签名预览版安装器 |
| Android | [下载 debug APK](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.1/2KBigRedFlowers-1.0.1-debug.apk) | 最新 debug 证书签名侧载热修复 |
| macOS Apple Silicon | [下载内部测试压缩包](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-darwin-arm64-1.0.0-unsigned.tar.gz) | 未签名压缩包 |
| macOS Intel | [下载内部测试压缩包](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/2KBigRedFlowers-darwin-x64-1.0.0-unsigned.tar.gz) | 未签名压缩包 |
| iOS | [打开 Xcode 工程](./ios/App/App.xcodeproj) | 需要在 macOS 使用 Xcode 和 Apple Developer 身份构建 |
| Android 校验文件 | [下载热修复 SHA-256 清单](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.1/SHA256SUMS.txt) | 用于核验 Android 热修复 APK |
| 基线校验文件 | [下载 v1.0.0 SHA-256 清单](https://github.com/ChristoGoodrich/2KBigRedFlowers/releases/download/v1.0.0/SHA256SUMS.txt) | 用于核验 Windows 和 macOS 预览资产 |

当前安装包用于预览测试。Windows 和 macOS 包尚未使用商业证书签名，
Android APK 使用 debug 证书签名。

## 主要功能

- 管理建模属性、徽章与 OVR 估算。
- 记录比赛、队友和对手数据。
- 通过 OCR 辅助识别截图并录入数据。
- 提供球员球探、对比、表现分析和数据质量检查。
- 使用导入、导出工具备份本地数据。
- 可选的 Supabase 多端同步。

## 云同步

1. 在 Supabase SQL Editor 中执行一次
   [`supabase-cloud-sync.sql`](./supabase-cloud-sync.sql)。
2. 打开 `Settings > Backup > Cloud Sync > Advanced setup`。
3. 输入 Supabase 项目 URL 和公开的 anon key。
4. 在每台设备上登录同一个账号。

请勿在应用中使用 Supabase service-role key。

## 本地开发

使用 Node.js 22 LTS：

```powershell
npm install
npm test
```

常用打包命令：

```powershell
npm run desktop:make:win
npm run android:apk
npm run desktop:make:mac:unsigned
npm run ios:sync
```

平台环境和 Apple 发布要求请查看 [`PACKAGING.md`](./PACKAGING.md)，模块边界和
校验规则请查看 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## 贡献与支持

- 提交 Pull Request 前请阅读 [`CONTRIBUTING.zh-CN.md`](./CONTRIBUTING.zh-CN.md)。
- 通过 [Issue 表单](https://github.com/ChristoGoodrich/2KBigRedFlowers/issues/new/choose)
  提交缺陷、功能建议和使用问题。
- 排查常见问题请查看 [`SUPPORT.md`](./SUPPORT.md)。
- 安全漏洞请按照 [`SECURITY.md`](./SECURITY.md) 私密提交。
- 历史变更请查看 [`CHANGELOG.md`](./CHANGELOG.md)。

## 权利声明

本仓库公开提供源码查看，但并未使用开源许可证发布。详情请查看
[`LICENSE.md`](./LICENSE.md)。

2KBigRedFlowers 是非官方玩家工具，与 2K、Visual Concepts、NBA 或 NBPA
不存在隶属、授权、背书或赞助关系。相关产品名称、标志和商标归各自权利人所有。
