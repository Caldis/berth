# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不修改 Asset、IPC、preload、主进程 hooks manager 或 hook lifecycle 数据模型。新增内容仅为 renderer 内部布局状态:

- `activeStageId`: 继续使用本地 React state, 点击和 IntersectionObserver 都能更新。
- `connectorLines`: renderer 内部测量结果, 不持久化。
- DOM 标记:
  - 生命周期按钮: `data-hook-stage-anchor={group.id}`。
  - 右侧 section: `data-hook-stage-target={group.id}`。
  - SVG overlay: `data-testid="hook-lifecycle-connectors"`, `aria-hidden="true"`。

## 任务分类与 debt
- type / maintenance.subtype: feature, 无 maintenance subtype。
- source.kind / refs: user-request, Issue #91。
- debt.estimate: incurred=3, repaid=0, net=3, module / medium / ui-ux / medium。
- debt.final 预期: module / medium; 若只改 renderer 单组件与测试, net 维持 3。
- revisions: Explore 阶段已将 confidence 从 low 调整为 medium。
- Project 字段同步: design 后 estimate 无变化, implement 完成后如无变化不需要额外同步。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

只修改:

- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - `HooksLifecycleView`: 重排左侧 rail, 增加 scroll spy 和 connector overlay。
  - `HookHealthSignal`: 改为左栏纵向面板, status/severity 不使用 wrap tag 结构。
  - `HookRecoveryCenter`: 复用现有组件, 移入左侧 rail 下方; 仅调整窄列 summary 布局所需 class。
  - 新增内部 hook/helper:
    - `useHookStageScrollSpy(groups, setActiveStageId)`: 观察右侧 section, root 取最近 scrollable ancestor 或 `[data-testid="app-content-scroll"]`; 无 IntersectionObserver 时不报错。
    - `useHookStageConnectors(groups, activeStageId)`: 用 `ResizeObserver` + scroll/resize listener + `requestAnimationFrame` 计算 SVG path。
    - `buildRoundedConnectorPath(...)`: 生成圆角直线路径, path 使用 `strokeLinecap="round"` 与 `strokeLinejoin="round"`。
- `tests/renderer/hooks-lifecycle-view.test.tsx`
  - 增加局部 `IntersectionObserver` mock。
  - 增加左栏重排、Hook 检查不换行结构、滚动高亮、SVG 连线测试。

不修改:

- `src/renderer/src/lib/hook-lifecycle.ts`
- `src/main/**`
- `src/preload/**`
- i18n 文案, 除非实现时发现必须新增无障碍 label。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | desktop 使用 `lg:grid-cols-[300px_minmax(0,1fr)]`; 左侧 sticky rail 顺序为生命周期、Hook 检查、恢复中心; 右侧保持阶段卡片列表 | renderer 测试 + Electron 截图 |
| 组件选择 / 设计系统一致性 | 保持 card/border/muted 语义色和 rounded-md/rounded-lg; 不新增第三方库; 图标继续用 lucide | renderer 测试 + 视觉验收 |
| 交互反馈 / 状态切换 | 点击生命周期立即高亮并 `scrollIntoView`; 右侧滚动通过 IntersectionObserver 同步 `aria-current`; active connector 使用更深文本/边框色 | renderer 测试 + Electron 滚动实测 |
| loading / empty / error / disabled / focus | Hook 检查保留 loading/stale/clear/error/warning/info hover/focus 详情; 恢复中心保留 loading/error/empty/disabled restore | 现有测试 + 新布局测试 |
| 响应式 / 可访问性 / 键盘可达 | mobile 单列隐藏 SVG connector; connector `aria-hidden` 且 `pointer-events-none`; 生命周期按钮保留 `aria-current`; tooltip 触发器保留 focus-visible | renderer 测试 + 截图 |
| 文案 / i18n / 数字和路径格式 | 不改现有文案; Hook count、severity count、path/raw JSON 格式保持 | 现有英文/中文测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Hook 检查与恢复中心移动到左侧生命周期下方 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| Hook 检查改为不换行纵向状态布局 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| 右侧滚动同步左侧 `aria-current` | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| 生命周期与右侧 section 的 SVG 圆角连线 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| 现有 Hook 行、恢复、健康 hover、启停行为回归 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | 同上 |  |
| 类型检查 | harness/web | 不适用 | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` |  |
| 桌面视觉和交互 | manual/electron | 不适用 | `pnpm dev:agent start --id hooks-layout --debug-port <port>` 后截图与滚动实测 | 截图和真实滚动属于 UI 验收 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 左侧 rail 重排 | 1 |
| Hook 检查纵向布局 | 2 |
| IntersectionObserver scroll spy | 3 |
| SVG connector overlay | 4 |
| mobile 隐藏 connector / 无横向滚动 | 5 |
| 行为回归测试 | 6, 7 |
