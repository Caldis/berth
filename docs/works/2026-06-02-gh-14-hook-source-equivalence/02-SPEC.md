# 技术方案 (Design 产物)

## 数据契约

在 hook asset meta 中新增:
- `equivalentSources`: array, 每项含 `id`, `agentId`, `scope`, `name`, `path`, `enabled`, `managed`
- `equivalentSourceCount`: number
- `effectiveEnabled`: boolean

不新增 shared TypeScript 类型, 保持 meta 扩展。

## 模块结构 / 组件拆分

- `AssetScanner.runScanAll()` 在缓存前调用 `annotateEquivalentHookSources(assets)`。
- equivalence key: `agentId:scenarioHash:hookHash`。
- `getHookRiskHints()` 增加 `effectiveElsewhere` 和 `equivalentSources` 提示。
- `HookAssetRow` 在 enabled badge 后显示 equivalent source count 和 effective badge。
- en/zh locale 增加最少文案。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| scanner 标注 equivalentSources / effectiveEnabled | unit | `tests/unit/engine-scanner.test.ts` | `pnpm test -- tests/unit/engine-scanner.test.ts` |  |
| lifecycle risk hints 读取 equivalence meta | unit | `tests/unit/hook-lifecycle.test.ts` | `pnpm test -- tests/unit/hook-lifecycle.test.ts` |  |
| renderer 显示 source count/effective | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 类型检查 | typecheck | n/a | `pnpm typecheck:web`; `pnpm typecheck:node` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| scanner annotation | 1, 2, 3 |
| lifecycle row badges/hints | 4, 5 |
