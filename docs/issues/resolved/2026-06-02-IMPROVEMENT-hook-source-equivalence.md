# Hook Source Equivalence

## 类型

IMPROVEMENT

## 状态

Resolved

## GitHub

- Issue: https://github.com/Caldis/berth/issues/14
- Number: #14
- State: CLOSED

## 完成记录

- Work: `docs/works/_archive/2026-06-02-gh-14-hook-source-equivalence`
- Code: `src/main/engine/scanner.ts`, `src/renderer/src/lib/hook-lifecycle.ts`, `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
- Tests: `tests/unit/engine-scanner.test.ts`, `tests/unit/hook-lifecycle.test.ts`, `tests/renderer/hooks-lifecycle-view.test.tsx`

## 关联任务

- 来源归档: `docs/works/_archive/2026-06-01-gh-11-claude-hook-soft-disable/`

## 背景

同一个 Hook 可能同时来自 user、project、plugin、managed 或 Codex inline config / `hooks.json`。用户在 UI 中点“禁用”时, 当前操作往往只影响当前来源。如果另一个来源仍有等价 Hook, 实际效果可能不是用户以为的“这个 Hook 已经不运行”。

GH-11 已经把 Hook 身份收窄到 scenario hash + child hook hash, 但跨来源等价关系还没有完整写入资产模型和 UI。

## 需要改进

- 扫描阶段为等价 Hook 写入 `equivalentSources`。
- Codex inline hooks 与 plugin `hooks.json` 出现同类 Hook 时, 能标记为等价来源。
- Claude Code user / project / managed 等来源出现同类 Hook 时, UI 能提示“当前操作只影响 user source”。
- 生命周期页区分:
  - `enabled`: 当前这条注册是否启用。
  - `effectiveEnabled`: 是否仍可能因其他来源生效。
- 禁用后若仍有其他来源生效, 行内 tag 或详情中必须说明原因。

## 验收方向

- 用户能看出“禁用了这一条”与“这个 Hook 完全不会运行”的区别。
- 多来源存在时, 生命周期行展示 source count 和实际 effective 状态。
- 不支持修改的来源保持 read-only, 但能解释它为什么仍然生效。

## 验证

- `pnpm test -- tests/unit/engine-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm harness:check`
