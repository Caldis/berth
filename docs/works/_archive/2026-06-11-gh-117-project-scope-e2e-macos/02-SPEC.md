# 技术方案 (Design 产物)

> GH-117。方案核心: 抽 e2e 共享 launch helper, 统一隔离 HOME (POSIX) / CODEX_HOME / user-data-dir, 移除 darwin skip。产品代码零改动。

## 设计决策 (消解 01-ANALYSIS 未决问题)

1. **Windows 不隔离 `USERPROFILE` (保守方案)**: win32 `os.homedir()` 不读 `HOME` env, 只设 `HOME` 对 Windows 行为零变化, CI 维持现状绿; `USERPROFILE` 会影响 Electron 自身路径推导, 引入本机无法实证的新风险。helper 内注释言明该已知差异。依据: 失败面只在 POSIX (01-ANALYSIS 根因)。
2. **抽共享 helper 而非逐文件补 env**: 6 处 `electron.launch` env 构造已漂移 (app.e2e 缺 `CODEX_HOME`), helper 一次收敛, 杜绝新 e2e 再漏。
3. **断言不放宽不延时**; 仅在 project-scope 本体新增 option 计数断言把"隔离生效"固化为可回归断言 (AC-3), 其余文件断言不动。

## 数据契约

无 IPC/数据契约变更。新增的是测试基建内部契约:

```ts
// tests/e2e/launch.ts (新, testMatch 为 **/*.e2e.ts 不会误捕)
export interface IsolatedDirs {
  userDataDir: string  // <tempDir>/user-data
  codexHome: string    // <tempDir>/codex-home
  homeDir: string      // <tempDir>/home — POSIX 下经 env.HOME 接管 os.homedir()
}
export function prepareIsolatedDirs(tempDir: string): IsolatedDirs  // mkdirSync ×3 (recursive)
export async function launchBerthApp(
  dirs: IsolatedDirs,
  extraEnv?: Record<string, string>
): Promise<{ app: ElectronApplication; page: Page }>
// launch args: [out/main/index.js, --user-data-dir=<dirs.userDataDir>]
// env: { ...process.env, NODE_ENV: 'test', CODEX_HOME: dirs.codexHome,
//        ...(process.platform !== 'win32' ? { HOME: dirs.homeDir } : {}),  // win 见决策 1
//        ...extraEnv }
// 后置: firstWindow + waitForLoadState('domcontentloaded')
```

隔离原理 (01-ANALYSIS 实证): `src/main/agent-homes.ts` 经 `os.homedir()` 解析 `~/.claude` 等 home 级扫描根; POSIX 下 `os.homedir()` 优先 `$HOME` → 指向 fixture 空目录后宿主数据不可见。

## 任务分类与 debt
- type / maintenance.subtype: bug / 无。
- source.kind / refs: docs-issues / `docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md`。
- debt.estimate: incurred 1 / repaid 2 / net -1 / scope module / risk low / areas [testability] / confidence high (explore 已校准, design 无变化)。
- debt.final 预期: 与 estimate 一致 (产品零改动, 无新增面)。
- revisions: 无新增 (沿用 1.0-explore 那条)。
- Project 字段同步: implement 完成后跑 `node scripts/harness-projects.mjs ensure docs/works/2026-06-11-gh-117-project-scope-e2e-macos`。
- `pnpm harness:stats` 总 debt 18 (<40), 无需 override 说明。

## 模块结构 / 组件拆分

- `tests/e2e/launch.ts` (新): 上述两函数, 唯一职责是隔离根准备 + 统一 launch; 不吞各测试自有的 fixture 内容构造 (sessions 文件、项目目录等仍由各测试自建, 保持测试自描述)。
- 6 个 `tests/e2e/*.e2e.ts`: beforeEach 改为 `prepareIsolatedDirs` + 自建 fixture 内容 + `launchBerthApp`; 删除各自手写的 `electron.launch` 与 env 拼装。
- `project-scope.e2e.ts` 额外: 删除 line 10-12 的 darwin skip 注释块与 `test.skip`; 弹层打开后新增 `await expect(page.getByRole('option')).toHaveCount(3)` (Global/User/app)。
- 产品代码 (`src/`) 与 `playwright.config.ts` 零改动。遵守 ARCHITECTURE 边界: 改动全部在 tests 层。

## 界面质量与交互验收

不适用 — 仅改 e2e 测试基建, 产品 UI 零改动 (explore 探针 B 已确认 ProjectScopeSwitcher 交互正确)。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| launch helper 本体 | typecheck + lint (tsconfig.test 纳管) | tests/e2e/launch.ts | `pnpm typecheck && pnpm lint` | 纯测试基建, 行为验收 = 消费方 6 个 e2e 全绿 (T2/T3), 不另写"测试的测试" |
| project-scope 隔离 + 去 skip + 计数断言 | e2e (macOS 本地) | tests/e2e/project-scope.e2e.ts | `pnpm build && pnpm test:e2e project-scope` | — |
| 其余 5 文件接入 helper | e2e 全量 (macOS 本地) | tests/e2e/*.e2e.ts | `pnpm test:e2e` | — |
| Windows 回归 (行为零变化验证) | CI e2e | — | push 后 `pnpm harness:ci:wait --sha <sha>` | 本机无 Windows; CI 即验证面 |
| 单测回归 | vitest 全量 | — | `pnpm test` (prepush 含) | — |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| project-scope 去 skip + 本地绿 (断言原样) | AC-1 |
| helper + 6 文件接入 (含 app.e2e 补 CODEX_HOME) | AC-2 |
| option 计数断言 (=3) | AC-3 |
| macOS 全量 e2e 绿 + CI (win) 绿 | AC-4 |
| issue 补结论移 resolved (archive 阶段硬项) | AC-5 |
