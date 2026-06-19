# 任务清单 (Design 产物 / 活清单)

修复A (helper) 与修复B (session 增量) 独立。B 内部顺序: sourceKey → derive dispatch (B2 依赖 B1 的 sourceKey 契约)。改 scan parser/derive/engine 数据路径, 按 friction 20260619-engine-timing-change-is-search-relevant: 推送前本地跑 scan 相关 e2e (project-scope / sessions), 不靠 CI 兜底。

- [ ] 任务 1 (B1): session asset 补 `sourceKey`
  - `claude-code/parsers.ts` `parseSessionMeta` + `codex/parsers.ts` `parseCodexSessionMeta`: meta 加 `sourceKey: dedupePathKey(filePath)`
  - tests: 先写/更新 session parser 单测断言 `meta.sourceKey === dedupePathKey(path)` (先红)
  - verify: 不适用 (纯数据契约)
- [ ] 任务 2 (B2): `deriveAssetsForPath` 加 session dispatch
  - `engine/assets/derive-asset.ts`: claude 顶层 `projects/{name}/*.jsonl` → `parseSessionMeta(fp, basename(dirname(fp)))`; codex `rollout-*.jsonl` (sessions/archived_sessions) → `parseCodexSessionMeta(fp, {titleIndex})` + archived flag; subagents/*.jsonl 不命中; 删除/unreadable → []
  - tests: `derive-asset.test.ts` 先写用例 (claude session 命中 + subagent 不命中 + codex rollout 命中 + 删除→[] + sourceKey 一致) (先红)
  - verify: 不适用
- [ ] 任务 3 (B3): watch-wiring session 走增量 (验证, 预计无需改代码)
  - tests: `watch-wiring.test.ts` 加用例: session 文件 event → `applyFileChange` 被调 (非 `scheduleRefresh`)
  - verify: 不适用
- [ ] 任务 4 (A): scan-helper keep-alive
  - `src/main/scan-helper.ts`: 顶层加常驻 `setInterval(()=>{}, 2_147_483_647)` (注释引 Electron #42978); 不改 helper-host
  - tests: not needed - utilityProcess packaged 行为无法在 unit host 复现; 验证靠任务 6 真跑 (dev 不回归 + packaged ok=1)
  - verify: 见任务 6
- [ ] 任务 5: 全门禁 + scan 相关 e2e
  - tests: `pnpm typecheck` + `lint` + `pnpm test` 全绿; **本地** `pnpm build` + `playwright test project-scope sessions` (改 scan 数据路径, friction 强制本地 e2e)
  - verify: 不适用
- [ ] 任务 6: 真跑验证 (verify 阶段)
  - tests: not needed - 时序/平台行为, 走真跑
  - verify: (a) dev agent 实例真跑: 触发 session 写入, 观察 scan-history / log — session 变更走增量 (无新 watcher 全量 scan 记录), 全量结果不回归; (b) helper: dev 实例确认 long-lived 不回归; packaged 真跑 (若可行) 确认 main.log 无 `exited code 0` + scan-history ok=1, 否则记录为发布后观察项 + 逻辑论证。请用户确认。

## 发版 (verify 通过后)
patch bump 0.4.1 → 0.4.2 + archive。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
