# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 方案概述
单文件 e2e 修复。让 windows-only 的 `window-controls.e2e.ts` 在非 win32 平台**根本不启动 app** (把跳过判定提到 beforeEach 启动之前), afterEach 守卫关闭。构造性消除 macOS 上"为必跳用例启动 app → close 挂死"的路径。不动产品代码。

## 代码改动 (tests/e2e/window-controls.e2e.ts)
- `beforeEach` 首行加 `test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')`, 再 `launchBerthApp` → AC1。
- `afterEach` 改为守卫式:
  ```ts
  test.afterEach(async () => {
    const launchedApp: ElectronApplication | undefined = app
    if (launchedApp) await launchedApp.close()
  })
  ```
  `app` 声明保持 `ElectronApplication` (用例 body 直接用 `app.evaluate`, 不引入 `!`); afterEach 经 `| undefined` 局部变量取得可空语义, 非 win32 (app 未赋值, 运行时 undefined) 时不 close → AC2。
- 用例 body / describe 内既有的 `test.skip(non-win32)` 保留 (beforeEach 跳过后已不执行, 冗余但无害, 减少 diff)。

## 数据契约
不变。

## 任务分类与 debt
- type: bug; source.kind: docs-issues; refs: 2026-06-11 issue + #139。
- debt.estimate: incurred 1 / net 1 / file / low / testability / high。
- debt.final 预期: 与 estimate 一致。
- revisions: 无。Project: ensure 已绑定 (item PVTI_lAHOADXbEs4BZHvQzgwDU_U), archive 走 done。

## 模块结构 / 组件拆分
仅改一个 e2e 文件的 beforeEach/afterEach。无模块边界影响; 不碰产品代码。

## 界面质量与交互验收
不适用。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 非 win32 不启 app + afterEach 守卫 | e2e | tests/e2e/window-controls.e2e.ts | `pnpm test:e2e -- tests/e2e/window-controls.e2e.ts` (win32 本地) + macOS CI | — (改动即被测 e2e; macOS 路径由构造保证 + CI 验证) |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| beforeEach 提前 skip | AC1 |
| afterEach 守卫 close | AC2 |
| win32 本地通过 | AC3 |
| macOS CI 不再 teardown timeout | AC4 |
| 仅改测试文件 | AC5 |
