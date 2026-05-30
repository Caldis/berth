# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- `ScanResult` 仍是全量扫描的单一返回结构: `{ assets, stats, errors }`。
- 渲染层以 `useAppStore.assets` / `useAppStore.stats` 作为页面共享数据源。`useAssets()` 负责调用 `window.api.assets.scanAll()` 并写入 store, 不再只写 hook 私有 state。(验收 1, 2, 4)
- 主进程 `AssetScanner` 增加“是否已完成至少一次扫描”的状态。`sessions:list` 与 `usage:summary` 在读取缓存前先确保扫描已完成, 避免页面访问顺序影响结果。(验收 4)
- `usage:summary` 聚合顺序:
  1. 优先使用 `usage-data` 中的真实 cost / token 明细。
  2. 若没有 `usage-data`, 使用 `stats-cache` 中的真实 token / model 使用数据作为 fallback。
  3. 没有真实成本时, `totalCost` 与 model `cost` 保持 0; 不从 token 估算成本。(验收 3)
- Session 扫描保持 PRD 定义: 只把 `~/.claude/projects/<encoded>/*.jsonl` 顶层文件作为 session。`subagents/*.jsonl` 不作为独立 session 展示, 后续若做父子关联再单独建模。(验收 5)

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/hooks/use-ipc.ts`
  - 接入 `useAppStore` 的 `assets/stats/scanning/setAssets/setStats/setScanning`。
  - `refresh()` 成功后同时更新 store。
- `src/renderer/src/components/layout/app-layout.tsx`
  - 在全局壳触发一次 `useAssets()` bootstrap, 让 Instructions / Capabilities 直接打开时也能拿到数据。
- `src/renderer/src/pages/overview.tsx`
  - 统计卡片改读 store 中的 `stats`, 避免 Overview 自己再触发一轮重复扫描。
- `src/main/engine/scanner.ts`
  - 增加 `hasScanned()`。
- `src/main/ipc/handlers.ts`
  - 增加 `ensureScanned()`。
  - `sessions:list`, `sessions:get`, `usage:summary` 等缓存读取路径使用已扫描数据或触发首次扫描。
  - `usage:summary` 增加 `stats-cache` fallback 聚合函数。
- `src/main/adapters/claude-code/scanner.ts`
  - 保持顶层 session 扫描, 增加注释说明为什么不递归吞掉 `subagents/*.jsonl`。

## 测试策略
- 单元测试:
  - `AssetScanner.hasScanned()` 初始 false, `scanAll()` 后 true。
  - `stats-cache` fallback 能返回非零 `totalTokens` 和按 model 的百分比分布; 成本缺失时保持 0。
  - Windows 风格 fixture 中, 顶层 session 被扫描, `subagents/*.jsonl` 不作为独立 session。
- 渲染测试:
  - `useAssets()` 调用 `scanAll()` 后把 assets/stats 写入 `useAppStore`, 页面共享数据源能读到。
- 运行验证:
  - `pnpm typecheck`
  - `pnpm test`
  - Windows Electron 实测: 直接打开 Instructions / Capabilities / Usage, 不依赖先访问 Overview。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 全局 store bootstrap | 1, 2, 4 |
| 主进程 ensure scanned | 4 |
| `stats-cache` usage fallback | 3 |
| 顶层 session 策略显式化 | 5 |
| 单元 / 渲染 / 运行验证 | 6 |
