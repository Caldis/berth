# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 方案概述
纯测试健壮性修复。`tests/e2e/incremental-watch.e2e.ts` 在捕获 `before.id` 前未等待 activate 首扫**提交** (commit): GH-135 渐进 partial 让 seed skill 在 commit 前 (id 仍 `'initial'`) 即可见, windows CI 慢 → poll 抢在 commit 前捕获 `before.id='initial'`, 随后首扫 commit 铸新 id → `afterId !== before.id`。修复让 before-poll 多等一个条件: snapshot 已提交 (`id !== 'initial'`)。**不动产品代码。**

## 数据契约
- 不变。snapshot id 语义不变: 初始 `'initial'`, 每次 `commitScan` 铸 `snapshot-<ts>-<rand>`, `applyPartial` / `applyFileChange` 保持 id。
- 测试依赖的契约: `window.api.assets.snapshot()` 返回 `{ id, assets, ... }`; 初始未提交快照 id 恒为 `'initial'` (`createInitialSnapshot`)。

## 任务分类与 debt
- type / maintenance.subtype: bug / —。
- source.kind / refs: docs-issues / docs/issues/2026-06-16-BUG-windows-incremental-watch-full-rescan.md; GitHub #137。
- debt.estimate: incurred 1 / repaid 0 / net 1 / scope file / risk low / areas [testability] / confidence high (已在 explore 校准, 见 INDEX revisions[0])。
- debt.final 预期: 与 estimate 一致 (单文件测试改动, 无产品代码)。
- revisions: explore 已记一条 (architecture/module/medium → testability/file/low)。design 无再修正。
- Project 字段同步: ensure 已绑定 (item_id PVTI_lAHOADXbEs4BZHvQzgv7lg8); archive 走 done。

## 模块结构 / 组件拆分
- 仅改 `tests/e2e/incremental-watch.e2e.ts` 一处 before-poll 谓词。无模块边界影响。
- **AC5 (平台无关单测) 丢弃**: 产品不变量 "applyFileChange 保持 snapshot id" 已被 `tests/unit/agent-asset-runtime.test.ts:1062` ("keeps the snapshot id stable and invalidates the selector cache") 平台无关覆盖。再加单测冗余。

## 界面质量与交互验收
不适用 (e2e 测试时序修复, 无 UI 改动)。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| before-poll 等首扫 commit (id!=='initial') 后再捕获 before.id | e2e | tests/e2e/incremental-watch.e2e.ts | `pnpm build && pnpm test:e2e -- tests/e2e/incremental-watch.e2e.ts` | — (改动本身即测试, 在 windows 实机 + CI 验收) |
| 产品不变量: applyFileChange 保持 snapshot id | unit (已存在) | tests/unit/agent-asset-runtime.test.ts:1062 | `pnpm test -- tests/unit/agent-asset-runtime.test.ts` | 复用现有覆盖, 不新增 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| before-poll 加 `id !== 'initial'` 条件 | AC1 |
| 本地 windows 实机绿 (含 retry) | AC2 |
| 不改产品代码, 仅改测试 | AC3 |
| windows CI 转绿, 其他平台不回归 | AC4 |
| AC5 丢弃 (已有单测覆盖产品不变量) | AC5 (closed as redundant) |
