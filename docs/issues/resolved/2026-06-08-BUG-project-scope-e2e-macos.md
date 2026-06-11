# 描述
- `tests/e2e/project-scope.e2e.ts`「switches project scope and rebuilds the searchable project assets」在 **macOS** 上失败; 同测试在 Windows 本地与 CI 绿 (见 work GH-113 T5 verify 记录)。
- 已用 baseline 对比确认: stash GH-113 cap-0 改动 → `pnpm build` → 重跑, 同样失败 → **与 cap-0 (能力 parser sourceKey) 无关, 是既有平台差异**。
- 根因待定: 产品侧 (macOS 上 session 派生 project / scope 切换行为) 还是 e2e harness 侧 (macOS electron 键盘/点击时序、session cwd 路径解析)。

# 重现步骤
- macOS, `pnpm build` 后 `pnpm test:e2e project-scope`。
- 测试 beforeEach 造临时 project (`.git` + `packages/app` + codex session `cwd=.../packages/app` + `.agents/skills/e2e-skill`)。
- 测试点击 scope selector 的 `app` option (session 派生 project)。

# 预期结果
- 点击 `app` option 后, scope trigger 文本含 `app`; 随后 `window.api.assets.search('e2e-skill')` 命中。

# 实际结果
- trigger 停在 `Global` (重试 7 次稳定), `expect(trigger).toContainText('app')` 5s 超时 (project-scope.e2e.ts:74)。
- `global-shallow-scope.e2e.ts` 在同环境通过 → 持久化/scope 管线本身正常, 失败局限于「切到 session 派生 project」这一步。
- trace: `test-results/project-scope.e2e.ts-*/trace.zip` (`pnpm exec playwright show-trace`)。

# 解决方案
- 待根因。方向: ① 用 trace 看点击 `app` option 后 setProjectDir/setScope 是否触发、scope state 是否更新; ② 核对 macOS 上 session 派生 project 的项目名/路径识别 (POSIX vs Windows path) 是否产出可点击的 `app` option; ③ 若是 e2e harness 时序, 加等待条件而非放宽断言。
- 关联: work `docs/works/2026-06-07-gh-113-scope-refactor-convergence/`; friction `20260608-3.0-implement-e2e-build-artifact-stale-platform-baseline`; 既有 friction `20260606-3.0-implement-scope-filter-broke-search-e2e` (同测试, 当时是改动引起, 本次是平台引起)。

# 解决记录 (2026-06-11, GH-117)
- **根因 (三重实证, 非产品 bug / 非 macOS 平台差异)**: e2e fixture 只隔离 CODEX_HOME 未隔离 HOME, berth 经 `os.homedir()` 扫到宿主真实 `~/.claude`; 本机 (主力开发机) 数据量下 `activate` 全量重扫 10047ms + snapshot 93ms > 断言 5s 窗口 → 稳定超时。点击事件本身 36ms 即命中 (探针时间线), 产品 IPC 链路全绿 (探针直通), HOME 隔离后同序列 133ms (78 倍差)。Windows 绿只因其 home 干净 — 真实变量是宿主数据量, 不是平台。
- **修复**: 新建 `tests/e2e/launch.ts` 共享 helper (user-data/codex-home/home 三隔离根, POSIX 经 `HOME` env 接管 `os.homedir()`; win32 保守不动并注释言明), 6 个 e2e 全部接入 (app.e2e 顺带补齐 CODEX_HOME 缺失隔离); 移除 `test.skip(darwin)`; 新增 option 计数=3 隔离生效断言。断言零放宽零延时。
- **验证**: macOS 本地全量 e2e 双轮 18 passed (28.8s / 14.5s); CI (Windows) success。关联 commit: 158517d (T1 helper) / 88acd48 (T2 project-scope+去 skip) / 65f8c79 (T3 其余 5 文件)。
- 旁支: activate 全量重扫 10s 的真实用户性能问题已追记 `2026-06-07-FEATURE-background-progressive-asset-indexer.md` (GH-117 追记段)。
- 归档: `docs/works/_archive/2026-06-11-gh-117-project-scope-e2e-macos/` (GitHub Issue #117)。
- 状态: RESOLVED (2026-06-11)。
