# 任务清单 (活清单)

从 02-SPEC 拆解。Tier-1 落地。按"低风险高价值优先 + 文件邻近聚合"排序, 小步提交。

## 实现项

- [ ] **T1 覆盖纠正 (C1+C2)** — `claude-code/scanner.ts` (output-styles 目录+项目级; skills `**/SKILL.md`) + `parsers.ts parseSkill` (父目录名 fallback)。
  - tests: tests/unit/scan-coverage.test.ts — output-styles user+project; skills 只扫 SKILL.md + 父目录名。
- [ ] **T2 settings/glob 可观测 (O1+O3)** — `parsers.ts readSettingsJson` 区分缺失/坏JSON+onError; `scanner.ts safeGlob` 写 ctx.errors; 调用点传 ctx。
  - tests: scan-coverage — 坏 settings.json → ctx.errors; glob 错 → ctx.errors。
- [ ] **T3 statSync TOCTOU (R1)** — `scanner.ts` 裸 statSync 守护 (safeStat helper)。
  - tests: scan-coverage — glob 后删文件不抛 + errors + 其它资产不丢。
- [ ] **T4 session 可观测 (O2)** — session parser malformedLineCount + 读失败 errors。
  - tests: tests/unit/session-observability.test.ts。
- [ ] **T5 samePath 平台/locale (R3)** — win32 toLowerCase, 其它精确。
  - tests: 单测断言平台分支 (mock process.platform 或纯函数注入)。
- [ ] **T6 watcher 不自忽略 (R2)** — `watcher.ts ignored` 改谓词函数。
  - tests: tests/unit/asset-watcher.test.ts — ignore 谓词对监听根/噪声。
- [ ] **T7 runRefresh 代际守护 (R4)** — 捕获 scanner 引用 + 提交前校验。
  - tests: tests/unit/agent-asset-runtime.test.ts — 扫描中切项目。
- [ ] **T8 partial 去 raw + errorCount (P1+O4)** — engine onPartial 剥 raw + 带 errorCount; worker/host/runtime/ipc/store 透传。
  - tests: asset-worker-host / app-store — errorCount 透传; partial 去 raw。
- [ ] **T9 Tier-2 issues + 回归收口** — 写 docs/issues (P2/P3/P4/P5/R5 各一条交叉引用本任务); `pnpm test` + scan-engine + build + harness:check 全绿。
  - tests: 全绿。

## 并行/顺序
- T1–T6 多在 claude-code/scanner.ts + parsers.ts (文件重叠) → 顺序, 小步提交。
- T7 (runtime.ts) / T8 (engine+worker+渲染链) / T6 (watcher.ts) 文件独立, 可与 T1–T5 交错但仍小步。
- T9 最后。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
