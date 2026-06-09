# 解决 (RESOLVED 2026-06-10, 已修复漏归档)
- 已由 GH-110 提交 `33751ce5` (test(renderer): 修复 hooks-lifecycle / usage-tooltip 高负载 flaky) 落地: 该用例加 per-test `}, 15000)` 超时 (option ①), 注释 "Usage page render is heavy; the 5s default flakes under parallel load"。
- 本次 (2026-06-10) 全量 `pnpm test` 873 passed / 1 skipped / 0 failed 复核稳定。修复已提交但 issue 未及时移入 resolved/, 本轮补归档。

# 描述
- `tests/renderer/usage-tooltip-label.test.tsx > Usage daily cost tooltip label > localizes the daily cost series label` 在**整套 vitest 并行高负载**下偶发 `Test timed out in 5000ms` 失败, 但**单独运行稳定通过** (2026-06-06 实测隔离运行 2195ms)。
- 该用例渲染 Recharts tooltip, 单测即接近 2.2s; vitest 默认 `testTimeout=5000ms` 在多文件并行 + 机器高负载 (本机多 Agent 并发, full-suite collect ~190s / environment ~240s) 下被击穿。
- 影响: 阻塞 `pnpm harness:prepush` / `pnpm test` 的整套门禁, 与被测改动无关的提交也会因此红 (例如 GH-110 P1.1 仅新增独立 workspace 包, 却被该 flake 挡住推送)。CI(Linux 专用环境)基线为绿, 不复现。

# 重现步骤
- 在本机有其他 CPU 负载时运行 `pnpm test`(全量 690 用例)。
- 观察 `usage-tooltip-label.test.tsx` 偶发 5000ms 超时; 其余 689 用例通过。
- 对照: `npx vitest run tests/renderer/usage-tooltip-label.test.tsx` 隔离运行稳定通过 (~2.2s)。

# 预期结果
- 测试套件在合理负载下稳定, 不因单个 Recharts 渲染用例的 5s 超时而整套红。
- 候选修法 (择一, 不在 GH-110 主线顺手改, 避免动他人测试文件): ① 给该用例/该文件设更宽 `testTimeout`(如 15s); ② 全局 `vitest.config` 适度上调 `testTimeout` 并评估 `poolOptions`/并发度; ③ 该用例 mock/精简 Recharts 渲染以降低单测耗时。

# 实际结果
- 默认 5000ms 超时对"Recharts 渲染 + 高并发负载"过紧, 导致 flaky。
- 由 GH-110 (`docs/works/2026-06-06-gh-110-scan-engine-prod-upgrade/`) 3.0-implement P1.1 推送门禁时发现; 已验证非该改动引入 (P1.1 为独立 `@berth/scan-engine` 包, 不触及 renderer/usage)。GH-110 据此暂缓推送, 待门禁转绿或本 issue 修复。
