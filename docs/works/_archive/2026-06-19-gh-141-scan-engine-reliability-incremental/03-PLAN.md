# 任务清单 (Design 产物 / 活清单)

修复A (helper) 与修复B (session 增量) 独立。B 内部顺序: sourceKey → derive → watch-wiring。改 scan parser/derive/engine, 按 friction 20260619-engine-timing-change-is-search-relevant 本地跑 scan e2e。

- [x] 任务 1 (B1): session asset 补 `sourceKey`
  - `claude-code/parsers.ts` `parseSessionMeta` + `codex/parsers.ts` `parseCodexSessionMeta`: meta 加 `sourceKey: dedupePathKey(filePath)`
  - tests: ✓ session-meta-parser + codex-session-parser 各加 sourceKey 用例 (先红 2 failed → 后绿); 137 session/runtime 测试无回归
- [x] 任务 2 (B2): `deriveAssetsForPath` session dispatch
  - claude `projects/{name}/*.jsonl` 顶层 (subagents/ 不命中) + codex `rollout-*.jsonl` (sessions/archived); 删除→[]; match functions + engine→adapter 直连 (ARCHITECTURE 例外已登记)
  - tests: ✓ derive-asset.test.ts 4 用例 (claude/codex 命中 + subagent null + 删除 []) 先红 3 failed → 后绿 21 passed
- [x] 任务 3 (B3): watch-wiring session 走增量
  - 无需改代码 (session derive 非 null → applyFileChange)
  - tests: ✓ watch-wiring.test.ts 加 2 session 增量用例; 2 个旧 "session=unsupported" 测试按 ARCHITECTURE 规则9 改写为真 unsupported 文件 (9 passed)
- [x] 任务 4 (A): scan-helper keep-alive
  - `setInterval(()=>{}, 2_147_483_647)` 保持 packaged child alive (Electron #42978); 不改 helper-host
  - tests: not needed - utilityProcess packaged 行为无法 unit host 复现; 验证靠任务 6
- [x] 任务 5: 全门禁 + scan e2e
  - tests: ✓ typecheck + lint + `pnpm test` (175 文件 / 1246 用例) 全绿; `pnpm build` + e2e (project-scope + incremental-watch + snapshot-persistence + scan-control + global-shallow-scope + app) 全绿
- [x] 任务 6: 真跑验证 (verify 阶段) — 通过
  - verify: ✓ (a) session 增量端到端 e2e (`incremental-watch.e2e.ts` GH-141): 新 session 文件 → watcher → applyFileChange 增量, snapshot id 不变 (afterId===before; 全量重扫会 mint 新 id)。铁证 session 走增量不全量。(b) helper keep-alive: dev 不回归 (scan-control / incremental-watch 等 e2e helper 正常 scan); packaged child 退出是 Electron #42978 平台行为, setInterval ref event loop 逻辑确证, 发布后观察 main.log 不再 `exit code 0`。

## 发版 (verify 通过后)
patch bump 0.4.1 → 0.4.2 + archive。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
