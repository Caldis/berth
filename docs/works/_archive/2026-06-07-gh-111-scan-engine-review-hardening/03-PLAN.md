# 任务清单 (活清单)

从 02-SPEC 拆解。Tier-1 落地。按"低风险高价值优先 + 文件邻近聚合"排序, 小步提交。

## 实现项

- [x] **T1 覆盖纠正 (C1+C2)** — output-styles 目录+项目级; skills `**/SKILL.md` + parseSkill 父目录名 fallback。提交 d8a1e92e + 金本 fixture b9aa26de。
  - tests: ✅ tests/unit/scan-coverage.test.ts (output-styles user+project; skills 只扫 SKILL.md + 父目录名 + frontmatter name)。
- [x] **T2 settings/glob 可观测 (O1+O3)** — scanCapabilities 坏 settings.json 探测写 settings-json error; safeGlob 接 ctx 写 glob error。提交 79f05406。
  - tests: ✅ scan-coverage (坏/缺 settings.json) + scan-glob-error.test.ts (glob 抛错→ctx.errors)。
- [x] **T3 statSync TOCTOU (R1)** — scanIntegration 裸 statSync 改 safeStatIsFile。提交 79f05406。
  - tests: ✅ scan-coverage (broken symlink → stat error 不抛, Linux CI)。
- [x] **T4 session 可观测 (O2)** — parseSessionMeta malformedLineCount + parseError; scanState 上抛 ctx.errors。提交 588f6ad8。
  - tests: ✅ tests/unit/session-observability.test.ts (3)。
- [x] **T5 samePath 平台/locale (R3)** — win32 toLowerCase, 其它精确; 注入 platform 参数。提交 c4c16155。
  - tests: ✅ tests/unit/parser-path-equality.test.ts (2)。
- [x] **T6 watcher 不自忽略 (R2)** — isIgnoredWatchPath 谓词只忽略 node_modules/.git。提交 c4c16155。
  - tests: ✅ tests/unit/asset-watcher.test.ts (3, 含监听根不自忽略)。
- [x] **T7 runRefresh 代际守护 (R4)** — 捕获 scanner 引用 + isCurrent 守护 progress/partial/commit/error。提交 c136467d。
  - tests: ✅ agent-asset-runtime.test.ts (扫描中切项目不 clobber)。
- [x] **T8 partial 去 raw + errorCount (P1+O4)** — onPartial 剥 raw + 带 errorCount。提交 02010f12。
  - tests: ✅ engine-scanner.test.ts (partial raw=undefined + errorCount; 最终 snapshot 保留 raw)。O4 渲染层 live 显示作低价值后续 (扫描完成后完整错误已可见)。
- [x] **T9 Tier-2 issues + 回归收口** — 5 条 docs/issues (P2/P3/P4/P5/R5) 交叉引用本任务; `pnpm test` 111/736 + scan-engine 24 + build + harness:check 全绿。
  - tests: ✅ 全绿。

## 并行/顺序
- T1–T6 多在 claude-code/scanner.ts + parsers.ts (文件重叠) → 顺序, 小步提交。
- T7 (runtime.ts) / T8 (engine+worker+渲染链) / T6 (watcher.ts) 文件独立, 可与 T1–T5 交错但仍小步。
- T9 最后。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
