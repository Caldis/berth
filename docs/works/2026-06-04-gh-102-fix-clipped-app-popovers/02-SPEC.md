# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

不改主进程、preload、IPC 和共享资产数据模型。

新增 renderer 共享组件:
- `src/renderer/src/components/shared/floating-popover.tsx`
- 以 `@floating-ui/react` 为底层 primitive。
- 公开能力:
  - `trigger`: trigger JSX。
  - `children`: popover 内容。
  - `side` / `align` / `sideOffset` / `collisionPadding`: 转为 Floating UI placement 和 middleware 参数。
  - `triggerTestId` / `contentTestId`: 保持现有测试锚点。
  - `contentClassName` / `triggerClassName`: 让调用点保留已有尺寸和视觉 token。
  - hover/focus/click 打开策略: 共享组件内统一处理 open state、`safePolygon` hover 转移、延迟关闭和 portal content 事件。

## 任务分类与 debt

- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: user-request; GH-102。
- debt.estimate: incurred=2, repaid=0, net=2, scope=module, risk=medium, areas=[ui-ux], confidence=medium。
- debt.final 预期: 如果实现只增加共享组件并移除两处手写浮层, final net 维持 2; 若后续连带收敛更多浮层再修正。
- revisions: 无。
- Project 字段同步: `harness-projects ensure` 已将 GH-102 同步到 Project #6, item `PVTI_lAHOADXbEs4BZHvQzguvNn8`。

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的 renderer 边界:
- `package.json` / `pnpm-lock.yaml`: 新增 `@floating-ui/react` devDependency, 不再引入 `@radix-ui/react-popover`。
- `src/renderer/src/components/shared/floating-popover.tsx`: 公共浮层组件, 只负责 Floating UI Portal、定位、打开/关闭、hover 转移检测与基础样式; 不包含业务文案。
- `src/renderer/src/components/layout/top-navigation.tsx`: 移除本地 `guideOpen` / timer / absolute panel 逻辑, 改用 `FloatingPopover` 包裹指南按钮和 `FeatureGuidePanel`。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`: `HealthStatusTip` 改用 `FloatingPopover`; `HookHealthSignal` 和检查行内容保持原样。
- `tests/renderer/capabilities-guidance.test.tsx`: 保留现有文案断言, 增加 header 指南 panel 不在 `top-navigation` DOM 内的断言。
- `tests/renderer/hooks-lifecycle-view.test.tsx`: 保留现有文案断言, 增加 Hook 检查 tooltip 不在 sticky sidebar DOM 内的断言。

本轮不顺手改 `AgentSupportTip`、`session-detail.tsx`、`project-scope-switcher.tsx` 或 memory 页筛选浮层; 它们不是截图中点名的两个位置。若后续需要全仓浮层收敛, 单独建任务。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 浮层内容通过 Floating UI Portal 渲染到 body, 不再受 header/sidebar overflow 限制; 外层只做 fixed 定位, 内层做动画和视觉样式。 | renderer 结构断言 + Electron 截图 |
| 组件选择 / 设计系统一致性 | 使用 Floating UI; 样式继续使用 `bg-popover`、`border-border`、`shadow-lg` 和现有圆角。 | typecheck + 视觉检查 |
| 交互反馈 / 状态切换 | hover/focus 打开; 直接离开 trigger 时关闭; 从 trigger 穿过空隙走向 popover 时由 `safePolygon({ requireIntent: false })` 保持显示; click 仍可打开 header 富内容。 | renderer hover 测试 + Electron 坐标验证 |
| loading / empty / error / disabled / focus | 不改变 Hook 检查 loading/stale/ok/error 文案和状态; trigger 继续是 button。 | `hooks-lifecycle-view.test.tsx` |
| 响应式 / 可访问性 / 键盘可达 | `collisionPadding=16`, max width 保持 `calc(100vw - 2/3rem)`; trigger 通过 `aria-describedby` 关联内容。 | renderer 断言 + 截图 |
| 文案 / i18n / 数字和路径格式 | 不新增业务文案; 复用现有 i18n。 | 现有测试继续通过 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Header 指南使用公共 Portal popover | renderer | `tests/renderer/capabilities-guidance.test.tsx` | `pnpm exec vitest run tests/renderer/capabilities-guidance.test.tsx` |  |
| Header 指南 hover 转移与动画分层 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm exec vitest run tests/renderer/top-navigation.test.tsx` |  |
| Hook 检查状态 tag 使用公共 Portal popover | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 共享组件类型与依赖接入 | typecheck | `src/renderer/src/components/shared/floating-popover.tsx` | `pnpm typecheck:web` |  |
| harness 任务态 | harness | `docs/works/2026-06-04-gh-102-fix-clipped-app-popovers` | `pnpm harness:check --work docs/works/2026-06-04-gh-102-fix-clipped-app-popovers` |  |
| 实际界面不被裁剪 | manual UI | Electron dev + 截图 | 进入 Hooks 页面 hover 两处浮层并截图 | 浮层裁剪属于视觉层级问题, 最终仍需实测截图确认 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新增 `FloatingPopover` + Floating UI Portal / hover intent | 1, 2, 3, 4 |
| Header 指南接入公共组件 | 1, 3, 4, 5 |
| Hook 检查状态 tag 接入公共组件 | 2, 3, 4, 5 |
| renderer 测试补充 Portal 结构断言 | 1, 2, 3, 5 |
| Electron 截图验收 | 1, 2 |
