# Project Scope Switcher

## 类型

FEATURE

## 状态

Resolved

## 完成日期

2026-06-03

## 背景

应用曾主要以全局视图展示会话、配置、能力、hooks、skills、MCP 和用量。用户无法在全局、用户域和具体项目域之间切换, 项目级资产也容易被设置页里的本地来源入口稀释。

## 完成记录

- GH-77 新增应用级 scope 模型: `global` / `user` / `project`。
- GH-77 在应用壳侧边栏增加固定的项目范围入口, 支持全局、用户域和项目候选分组。
- GH-77 让 Overview / Sessions / Usage / Instructions / Capabilities 消费应用级 scope, project scope 使用规范化后的精确 project path。
- GH-77 在切换 project scope 后重建 scanner、search index 和 watcher, 避免继续沿用上一个项目上下文。
- GH-78 补齐从子目录 cwd 向父级项目根扫描 Claude Code / Codex 项目配置的逻辑, 让 project scope 能发现父级 `AGENTS.md`、`.agents/skills`、`CLAUDE.md`、`.claude/*`、`.codex/*` 等资产。
- GH-78 让 watcher 也使用同一套 project config roots, 项目父级配置变化能触发刷新。

## 验收记录

- `docs/works/_archive/2026-06-02-gh-77-project-scope-switcher/03-PLAN.md` 已记录 scope 模型、主进程候选生成、侧边栏入口、页面消费、scanner/search/watch rebuild、renderer 测试、Electron e2e 和视觉截图验收。
- `docs/works/_archive/2026-06-03-gh-78-project-config-discovery/INDEX.md` 已记录父级项目配置扫描、watcher 覆盖和 project scope e2e 验收。
- GH-77 与 GH-78 的 GitHub Project item 均已置为 `Done`。

## 归档

- 任务归档路径: `docs/works/_archive/2026-06-02-gh-77-project-scope-switcher/`
- 补充修复归档路径: `docs/works/_archive/2026-06-03-gh-78-project-config-discovery/`
