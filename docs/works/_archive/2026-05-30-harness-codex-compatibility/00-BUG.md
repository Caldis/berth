# BUG 快照 (只读)

来源: 用户在 2026-05-30 询问「这个项目的 harness 框架是在 claude 生态中构建的, 请你深入检查, 对你 (codex) 是否兼容, 如果需要调整, 如何同时兼容?」；审计后确认方案，用户回复「没问题, 请开始修改」。

## 复现步骤

1. 在 Windows checkout 中运行 `pnpm harness:check`。
2. 运行 `pnpm vitest run tests/harness`。
3. 检查 `.codex/skills/opsx-*` 和 `.claude/skills/opsx-*` 在 `core.symlinks=false` 下的工作区形态。

## 期望 vs 实际

期望:
- Codex 能直接发现 repo 级 harness skills。
- Claude Code 与 Codex 的分发规则清晰，不依赖单个平台的 symlink 行为。
- `pnpm harness:check` 与 harness 单测在 Windows/Linux 上都可靠。

实际:
- `.codex/skills/*` 在 Windows checkout 下变成普通文本文件，不是包含 `SKILL.md` 的目录。
- `pnpm harness:check` 因 CRLF/LF 精确比较与 symlink 形态报 32 个 drift。
- `tests/harness/sync.test.ts` 硬性 `readlinkSync`，与脚本已有复制回退策略冲突。
