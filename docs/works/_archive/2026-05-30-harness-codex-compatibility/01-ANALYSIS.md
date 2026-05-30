# 需求分析 (Explore 产物)

## 现状理解

- Codex 当前 repo 级技能入口是 `.agents/skills/<skill>/SKILL.md`。本仓库已经把真源放在 `.agents/skills/opsx-*/SKILL.md`，这一层可以被 Codex 直接读取。
- `.codex/skills/opsx-*` 目前是 Git symlink，Windows `core.symlinks=false` 时 checkout 为普通文本文件，内容只有相对路径，不能作为 Codex skill 目录使用。
- `.claude/skills/opsx-*` 也存在同样的 Windows symlink checkout 风险。Claude Code 可通过 `.claude/commands/opsx-*.md` 使用命令桩，但 skill 分发不稳定。
- `scripts/harness-sync.mjs` 已有 symlink 失败后的复制回退，但 `tests/harness/sync.test.ts` 只接受 symlink，不接受复制目录。
- `harness-check` 对生成文件做字节级比较；Windows 工作区 CRLF 会和生成器 LF 不一致，导致误报 drift。

## 关联与依赖

- 分发脚本: `scripts/harness-sync.mjs`, `scripts/harness-lib.mjs`
- 校验入口: `scripts/harness-check.mjs`, `scripts/harness-stats.mjs`
- 测试: `tests/harness/sync.test.ts`
- 文档: `AGENTS.md`, `.agents/README.md`, `.agents/references/ai-tool-command-distribution.md`, `docs/superpowers/specs/2026-05-29-ai-native-workflow-harness-design.md`
- CI: `.github/workflows/ci.yml`

## 验收标准

1. Codex 调用路径以 `.agents/skills/opsx-*` 为准，不再依赖 `.codex/skills`。
2. Claude Code skill 分发可以在 symlink 可用时使用 symlink，在不可用时使用真实目录副本。
3. `pnpm harness:check` 在当前 Windows 工作区通过。
4. harness 单测接受 symlink 与复制回退两种合法形态。
5. 文档准确说明 Claude 与 Codex 的入口差异，不再把 `/opsx:new` 写成 Codex 的入口。
6. CI 覆盖 Linux 与 Windows 的 harness 校验。

## 未决问题

无。用户已确认开始修改。
