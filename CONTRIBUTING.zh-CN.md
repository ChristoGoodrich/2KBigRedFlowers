# 为 2KBigRedFlowers 做贡献

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

感谢你帮助改进 2KBigRedFlowers。

## 开始之前

- 新建 Issue 前请先搜索已有内容。
- 大范围功能或架构修改请先创建 Issue 讨论。
- 请勿提交账号凭据、Supabase service-role key、签名证书、keystore 或其他机密。
- 安全问题请按照 [`SECURITY.md`](./SECURITY.md) 使用私密漏洞报告流程。

## 开发环境

使用 Node.js 22 LTS：

```powershell
npm install
npm test
```

除非已经讨论过更大范围的迁移，否则请保留现有 classic-script 页面外壳和 sidecar
模块边界。修改模块职责或脚本加载顺序前，请先阅读
[`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## Pull Request

- 每个 Pull Request 只处理一组紧密相关的修改。
- 说明对用户可见的变化以及已运行的检查。
- 功能、配置或打包流程发生变化时，请同步更新文档。
- 请勿提交 `node_modules/`、`out/`、`build/` 或 `dist/` 等生成目录。
- 发起审核前请确认 `npm test` 通过。

## 权利

本仓库公开提供源码查看，但不授予开源许可证。提交贡献即表示你确认自己有权将
相关内容提交至本仓库。
