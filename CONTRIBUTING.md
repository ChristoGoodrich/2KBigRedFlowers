# Contributing To 2KBigRedFlowers

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

Thanks for helping improve 2KBigRedFlowers.

## Before You Start

- Search existing issues before opening a new one.
- Open an issue before starting a substantial behavior or architecture change.
- Never include account credentials, Supabase service-role keys, signing
  certificates, keystores, or other secrets.
- Use the private vulnerability reporting flow in [`SECURITY.md`](./SECURITY.md)
  for security-sensitive findings.

## Development Setup

Use Node.js 22 LTS:

```powershell
npm install
npm test
```

Keep the existing classic-script shell and sidecar module boundaries unless a
larger migration has been discussed first. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md)
before changing module ownership or script load order.

## Pull Requests

- Keep each pull request focused on one coherent change.
- Describe the user-visible impact and the checks you ran.
- Update documentation when behavior, setup, or packaging changes.
- Do not commit generated output such as `node_modules/`, `out/`, `build/`, or
  `dist/`.
- Make sure `npm test` passes before requesting review.

## Rights

This repository is source-available and does not grant an open-source license.
By submitting a contribution, you confirm that you have the right to submit it
for inclusion in this repository.
