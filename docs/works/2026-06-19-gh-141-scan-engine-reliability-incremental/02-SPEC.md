# 技术方案 (Design 产物)

两个独立修复 (maintenance:architecture)。修复A = helper keep-alive (平台 workaround, 简单); 修复B = session 增量 (补 sourceKey + derive dispatch, GH-113 slice)。不碰 renderer/IPC。

## 数据契约

### 修复A: scan-helper keep-alive
- `src/main/scan-helper.ts`: 模块顶层加常驻 `setInterval(() => {}, 2_147_483_647)` keep-alive, 让 utilityProcess child 在 packaged 模式保持 event loop alive (Electron #42978: packaged child script 完即退出, 仅靠 `parentPort.on('message')` 不 ref)。dev 行为不变 (本就 long-lived)。host `kill()` (cancel/before-quit) 仍正常终止进程 (utilityProcess.kill 直接杀进程, 不依赖 event loop 空)。
- 不改 `helper-host.ts` (helper 不再异常退出后, onExit 只在真 kill/crash 触发)。

### 修复B: session 增量
- **B1 sourceKey 契约**: `parseSessionMeta` (claude `parsers.ts:652`) 与 `parseCodexSessionMeta` (codex `parsers.ts:418`) 在返回 asset 的 `meta` 加 `sourceKey: dedupePathKey(filePath)`。与 watcher 事件键 (`watcher.ts:98` `dedupePathKey(filePath)`) 一致, 供 `runtime.applyFileChange` 按 sourceKey 替换。全量 scan 产出的 session asset 也因此带 sourceKey (统一)。
- **B2 derive dispatch**: `engine/assets/derive-asset.ts` `deriveAssetsForPath` 加 session 匹配 (在现有 convention/capability dispatch 之后, return null 之前):
  - claude session: 路径匹配 `…/projects/{name}/*.jsonl` 顶层 (basename 是 `*.jsonl` 且父目录的父是 `projects`, 即 `subagents/` 子目录天然不匹配) → `parseSessionMeta(fp, projectName)`, projectName = `basename(dirname(fp))`。
  - codex session: basename 匹配 `rollout-*.jsonl` 且路径含 `/sessions/` 或 `/archived_sessions/` → `parseCodexSessionMeta(fp, { titleIndex })`, titleIndex = `readCodexSessionTitleIndex(codexDir)` (codexDir 从路径上溯), 路径含 `archived_sessions` 则 `asset.meta.archived = true`。
  - 命中返回 `[asset]`; deleted/unreadable parse throw → `[]` (删除语义, 同现有 capability 分支)。
- **B3**: `watch-wiring.applyWatchEvent` 不改 — session 现在 `deriveAssetsForPath` 返回非 null → 自动走 `applyFileChange` 增量, 不再 `scheduleRefresh` 全量。
- engine→adapter session parser 直连: 沿用 ARCHITECTURE 例外清单已登记的 "engine→adapters 直连 (session 解析)"; derive-asset 加入该例外 (与 session-detail/session-replay 同族)。

## 任务分类与 debt
- type: maintenance / subtype: architecture
- source.kind: docs-issues / refs: 2 个
- debt.estimate: incurred 4 / repaid 6 / net -2
- debt.final 预期: incurred 4 / repaid 6 / net -2 (偿还 helper 可靠性 + session 全量低效 + 完成 GH-113 session slice)
- Project 字段同步: archive 时 `done`
- debt pool=31 notice (<40), maintenance 任务主动偿还, 无需 override

## 模块结构 / 组件拆分
改动文件:
- `src/main/scan-helper.ts` (修复A, +keep-alive)
- `packages/berth-scan-engine/src/adapters/claude-code/parsers.ts` + `codex/parsers.ts` (修复B1, session sourceKey)
- `packages/berth-scan-engine/src/engine/assets/derive-asset.ts` (修复B2, session dispatch)
- `docs/ARCHITECTURE.md` 例外清单补 derive-asset session 直连 (与既有 session 解析例外同族)
不改: helper-host / watch-wiring / runtime / renderer / IPC。

## 界面质量与交互验收
非 UI 任务 (engine/main 机制)。间接: 侧栏 scan status 不再因 session 写入频繁闪 scanning; 数据更新更即时。verify 真跑观察 (日志/scan-history/状态序列), 非组件视觉。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化的理由 |
|---|---|---|---|---|
| session asset 带 `sourceKey=dedupePathKey` (claude+codex) | unit | tests/unit (session parser / session-meta 测试) | pnpm test session | — |
| deriveAssetsForPath: claude 顶层 session 命中 → 1 asset; subagents/*.jsonl 不命中 (null) | unit | tests/unit/derive-asset.test.ts | pnpm test derive-asset | — |
| deriveAssetsForPath: codex rollout-*.jsonl 命中 (sessions + archived) | unit | tests/unit/derive-asset.test.ts | 同上 | — |
| deriveAssetsForPath: session 删除/unreadable → [] | unit | tests/unit/derive-asset.test.ts | 同上 | — |
| watch-wiring: session event 走 applyFileChange 增量, 不 scheduleRefresh 全量 | unit | tests/unit/watch-wiring.test.ts | pnpm test watch-wiring | — |
| 全量 scan 仍正确 (session asset 含 sourceKey, 不重复) | unit | tests/unit/agent-asset-runtime.test.ts | pnpm test agent-asset-runtime | — |
| helper keep-alive (packaged child 不退出) | manual | — | packaged 真跑 + dev 不回归 | utilityProcess packaged 行为无法在 unit host 复现 (Electron #42978); dev 真跑确认 long-lived 不回归, packaged 真跑确认 scan-history ok=1 |
| session 增量真跑 (会话写入不触发全库全量) | manual (CDP/日志) | scan-history + log 观察 | 见 03-PLAN | 时序/可观测 (memory runtime-behavior-needs-real-run) |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| A helper keep-alive | 1, 2 |
| B1 session sourceKey | 4, 5 |
| B2 derive session dispatch | 3, 4 |
| B3 watch-wiring 走增量 | 3, 6 |
| 全量/派生不回归 | 5, 7 |
