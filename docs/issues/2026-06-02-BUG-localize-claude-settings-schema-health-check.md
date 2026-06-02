# BUG: Claude settings schema health check text is not localized

## Summary

中文界面的 Overview 健康检查里, `Claude settings schema is not declared` 仍显示英文标题、说明、修复 label 和修复说明。

## Evidence

- 发现时间: 2026-06-02 GH-57 verify
- 截图: `C:\Users\mail\AppData\Local\Temp\berth-gh57-health-metadata-overview-print.png`
- 页面: Overview / 健康检查 / Claude Code

## Expected

中文界面应显示可读中文文案, 与 Codex schema health check 的本地化方式一致。

## Actual

仍显示英文:

- `Claude settings schema is not declared`
- `settings.json does not declare the Claude Code settings JSON schema.`
- `Add Claude settings schema`
- `Add the official Claude Code settings schema near the top of the JSON file.`

## Scope

- `src/renderer/src/lib/health-check-i18n.ts`
- `src/renderer/src/i18n/locales/en.json`
- `src/renderer/src/i18n/locales/zh.json`
- Overview / Hooks health check renderer tests
