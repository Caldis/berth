# 需求分析 (Explore 产物)

两个根因均已确证 (非 issue 假设)。根因1 是 Electron 平台行为 (packaged 与 dev 不一致), 修复简单; 根因2 是 GH-113 增量索引未完成的 session slice, 修复中等且有 sourceKey 前提。

## 现状理解

### 根因1: scan-helper packaged 模式过早退出 (BUG, 已确证)
- `src/main/scan-helper.ts` 设计 long-lived (注释自陈 "stays alive between scans"), 仅靠 `parentPort.on('message')` (line 72) 维持; 无 `process.exit`、无 ref/unref、scan 完成后无 pending timer。
- **Electron 官方确证** (utility-process docs + issue #42978): `utilityProcess.fork` 的 child 在 **dev 模式保持运行 (until parent closes), 但 packaged 应用里 script 执行完即退出**。即 `parentPort.on('message')` 在 packaged 不 ref event loop。
- 因此打包版 helper post `done` (`scan-helper.ts` runScan 末) 后 event loop 空 → 退出 code 0 → `src/main/helper-host.ts:119` `onExit` reject 整轮 → scan-history `ok=0`。
- **环境吻合**: GH-140 dev agent 实例首扫 `ok=1` (dev child 不退); 用户**打包版**生产实例 main.log 频繁 `exited with code 0` (packaged child 退)。

### 根因2: watcher 对 session 全量重扫 (IMPROVEMENT, 已确证)
- `packages/berth-scan-engine/src/engine/assets/watch-wiring.ts` `applyWatchEvent`: 非增量支持类型 `deriveAssetsForPath` 返回 null → `scheduleRefresh({reason:'watcher'})` 全库全量。
- `deriveAssetsForPath` (`engine/assets/derive-asset.ts`) 注释明示只覆盖 convention + capability file, "glob-class ... handled by later slices" — **session 是 GH-113 未实现的增量 slice**, 落 null。
- **前提缺口**: session asset **当前不设 `meta.sourceKey`** (grep 确认: 仅 convention/AGENTS.md parser 设 sourceKey; `parseSessionMeta`/`parseCodexSessionMeta` 不设)。而 `runtime.applyFileChange` 靠 `meta.sourceKey` 匹配替换, watcher 事件键已是 `dedupePathKey(filePath)` (`watcher.ts:98`)。session 增量必须先补 sourceKey, 否则 applyFileChange 不匹配 → 重复行。

进程边界: 修复落 main (`scan-helper.ts`) + engine (`derive-asset.ts` / adapters session parser), 不碰 renderer/IPC。

## 关联与依赖
- helper 修复孤立: 仅 `scan-helper.ts` keep-alive; host (`helper-host.ts`) onExit/respawn 逻辑不变 (helper 不再异常退出后, onExit 只在真 cancel/kill 触发)。
- session 增量链: `watch-wiring.applyWatchEvent` → `deriveAssetsForPath` (加 session dispatch) → `parseSessionMeta`(claude, line 652) / `parseCodexSessionMeta`(codex, line 418) → `runtime.applyFileChange(sourceKey, [asset])`。
- session 路径规则 (全量 scan 现状): claude `~/.claude/projects/{name}/*.jsonl` 顶层 (subagents/*.jsonl 是执行子, 排除); codex `{codexDir}/sessions|archived_sessions/**/rollout-*.jsonl` (需 `readCodexSessionTitleIndex` + archived flag)。
- 单 session parse 接口已存在 (parseSessionMeta/parseCodexSessionMeta 各返回 1 asset), 增量无需新解析器。

## 任务分类与 debt 校准
- type: maintenance / subtype: architecture
- source.kind: docs-issues / refs: 2 个 (见 INDEX)
- debt estimate 修正: incurred 4 / repaid 6 / net -2 (从 3/5/-2: session 增量比初估复杂 — 含 sourceKey 契约补全 + 两 adapter 路径规则 + 全量一致性, incurred 上调 1; 偿还面也更大 repaid+1)
- scope: cross-process; risk: medium (改 scan parser/derive + helper 生命周期, 涉数据正确性与平台行为); areas: [architecture]; confidence: medium (根因确证, session 细节清楚)
- revision: 见 INDEX `debt.revisions[]`

## 验收标准
1. helper 不再因 packaged 退出致 scan 失败: 打包版真跑后 scan-history `ok=1`, main.log 无 `exited with code 0` (非 cancel/kill 触发)。
2. helper keep-alive 不破坏 dev 行为, 不阻止 host `kill()` (cancel / before-quit) 正常终止。
3. session 文件变更 `deriveAssetsForPath` 返回 session asset (非 null), watcher 走增量 `applyFileChange`, **不**触发全库全量 scan。
4. session asset 设 `meta.sourceKey = dedupePathKey(filePath)`; applyFileChange 按 sourceKey 正确替换 (不重复、不丢失)。claude 顶层 session 命中、subagents/*.jsonl 不命中; codex rollout-*.jsonl 命中 (含 archived)。
5. session 增量结果与全量 scan 的同一 session asset 一致 (id/meta/sourceKey)。
6. 真跑验证 (日志 + scan-history + 行为观察): 会话写入时不再每次全库全量 scan。
7. 无回归: 全量 scan、convention/capability 增量、search/dashboard 等派生读不破。

## 界面质量与交互验收
非 UI 任务 (engine/main 机制)。间接影响: 侧栏 scan status 不再因 session 写入频繁闪 scanning; 数据更新更即时。verify 真跑观察 (非组件视觉)。

## 未决问题 (留给 design)
1. session 增量范围: claude + codex 都做, 还是先 claude (主要来源)? codex 单文件 derive 需每次 `readCodexSessionTitleIndex` (成本) — design 评估是否缓存或接受。**倾向两者都做** (用户要"全部修"; codex session 也常见)。
2. helper keep-alive 验证: dev 不复现 (child 本就 alive), 需 packaged build 真跑确认 `ok=1`。verify 是否打包真跑, 还是逻辑 + dev 不回归 + 一条针对性测试? (见根因1 平台特性)
3. 发版: 两修复完成 + 验证后 patch bump (0.4.1 → 0.4.2)。
