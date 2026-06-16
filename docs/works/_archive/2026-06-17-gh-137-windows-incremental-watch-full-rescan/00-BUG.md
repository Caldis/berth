# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
- GitHub Issue: https://github.com/Caldis/berth/issues/137
- docs/issues/2026-06-16-BUG-windows-incremental-watch-full-rescan.md (GH-135 归档闸门捕获)
- CI 证据: 首红 run 27527220031 (`d4f5fe4`, 06-15); 最新红 run 27608429421 (`69c6227`, 06-16); 末次全绿 run 27527108164 (`49ce1891`, 06-15)。

## 复现步骤
1. 在 windows 上运行 `pnpm test:e2e incremental-watch.e2e.ts`。
2. 测试 "folds a newly-added watched skill ... id stays stable" 加 `.agents/skills/added/SKILL.md` 后断言 `afterId === before.id`。

## 期望 vs 实际
- 期望: 新增/变更 skill (glob 类能力) 文件触发**增量折叠**, snapshot id 稳定 (macOS/ubuntu 行为)。
- 实际 (windows-only): 走**全量重扫**, `createSnapshotId()` 铸新 id → `incremental-watch.e2e.ts:72` `afterId !== before.id` 持续红。变更的 skill 仍正确出现 (性能回归, 非功能错误)，但 id-keyed 消费者被迫重取, 且每次 watched 变更触发整轮重扫。

## 根因线索 (待 windows 实机定位, explore 校准)
机制: `applyWatchEvent` (watch-wiring.ts:22) → `deriveAssetsForPath(filePath)` 在 windows 对该 skill 返回 `null` → 落 `scheduleRefresh/refresh({reason:'watcher'})` 全量路径 → `createSnapshotId()` (runtime.ts:651) 铸新 id。macOS/ubuntu 返回非 null → `applyFileChange` (runtime.ts:870, id 不变)。
- `packages/berth-scan-engine` `derive-asset.ts` `matchCapabilityGlob` (line 124): `normalizeForSuffix` (\\→/ + win32 lowercase) 匹配 glob dir/fileName/ext, windows 路径下是否命中 skill rule 需实机验证。
- `inferScope` (line 154-162): `sep = win32 ? '\\' : '/'` 后 `fileKey.startsWith(rootKey + sep)`, 但 `dedupePathKey` 按 `normalizeForSuffix` 归一为 `/` → windows 上 `\\` 比对 `/` 分隔 key, startsWith 失败 → scope 误判 'user'。大概率非本 e2e 直接红因, 但同处真实 windows bug, 一并处理。
- watcher (engine/watcher) 在 windows 给出的 `event.filePath` / `event.sourceKey` 格式是否喂错 `deriveAssetsForPath`。
- 关联: docs/issues/2026-06-09-IMPROVEMENT-shared-path-and-type-config (路径/分隔符归一统一化)。
