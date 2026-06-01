# Harden Harness Check Validation

## 类型

IMPROVEMENT

## 状态

Resolved

## 完成日期

2026-06-02

## GitHub

- Issue: https://github.com/Caldis/berth/issues/17
- Number: #17

## 背景

harness-check 校验器需要两项加固:

1. `.agents/workflow/<action>.md` 被截断为空文件时必须报错。
2. `docs/works/_archive` 与 `docs/friction/_archive` 即使为空, 也应被 git 跟踪。

孤儿 playbook 检测此前已经完成, 不属于本次剩余范围。

## 完成记录

- `scripts/harness-check.mjs` 的 `checkWorkflowSources` 已检查 `_shared.md` 与所有 action playbook 是否非空。
- `tests/harness/check.test.ts` 已覆盖空 playbook 报错、完整非空 playbook 通过、孤儿 playbook 报错。
- `docs/works/_archive/.gitkeep` 与 `docs/friction/_archive/.gitkeep` 已存在并被 git 跟踪。

## 验收记录

- `pnpm test -- tests/harness/check.test.ts` 通过, 33 tests passed。
- `node -e "import('./scripts/harness-check.mjs').then(...checkWorkflowSources...)"` 输出 `workflow sources ok`。
- `git ls-files docs/works/_archive/.gitkeep docs/friction/_archive/.gitkeep` 输出两个 `.gitkeep` 路径。
- `pnpm harness:check --work docs/works/2026-06-02-gh-17-harness-check-hardening` 通过。
- `pnpm harness:issues` 显示 active=10 resolved=7。
- `pnpm harness:check` 通过。
- `node scripts/harness-projects.mjs check --strict` 通过。

## 归档

- 任务归档路径: `docs/works/_archive/2026-06-02-gh-17-harness-check-hardening/`
