# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: `docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md` (快照于 2026-06-11) + GitHub Issue #117

## 原始 issue 内容 (逐字快照)

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
- 状态: OPEN。

## 补充事实 (0.0-new 时点核实, 2026-06-11)

- 该测试当前在 macOS 被显式跳过: `tests/e2e/project-scope.e2e.ts:12` — `test.skip(process.platform === 'darwin', 'known macOS failure — docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md')`; 本机实测 `pnpm test:e2e project-scope` 输出 `1 skipped`。
- 含义: macOS 上「切到 session 派生 project」用户路径目前零 e2e 覆盖; 根因 (产品 vs harness) 仍未定性。
- issue 中引用的 work 路径现已归档: `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/`。

## 复现步骤

- macOS 本机: 先临时移除/绕过 `project-scope.e2e.ts:12` 的 `test.skip(darwin)`, 然后 `pnpm build && pnpm test:e2e project-scope`。

## 期望 vs 实际

- 期望: 点击 scope selector 的 `app` option 后 trigger 文本含 `app`, `window.api.assets.search('e2e-skill')` 命中; macOS 与 Windows 行为一致。
- 实际 (2026-06-08 记录): trigger 停在 `Global`, 断言 5s 超时, 重试 7 次稳定失败; 当前被 skip 掩盖。
