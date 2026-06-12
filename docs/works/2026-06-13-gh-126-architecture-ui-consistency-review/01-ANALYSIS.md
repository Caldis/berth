# 需求分析 (Explore 产物)

## 现状理解
`docs/ARCHITECTURE.md` 规定 renderer 的设计系统原语只从 `src/renderer/src/components/ui` 进入, 页面和业务组合不应直接依赖 `@heroui/react`。当前源码基本满足这个入口约束: 直接 `@heroui/react` 只出现在 `App.tsx` 的 provider 和 `components/ui/*`。

实际问题在更细的 interface 上: 筛选类 `Select` 的视觉契约仍散落在多个调用点。`ScopeSelect`、`SessionFilterBar`、`ReplayKindFilter`、`Usage` 都在业务实现里重复声明 `size="sm"`、`variant="bordered"`、`classNames.trigger` 或部分高度/边框类。这个 Module 很浅: 调用方必须知道 HeroUI Select 的视觉实现细节, 但业务只需要表达“这是筛选下拉”。

本轮生成的临时架构报告: `C:\Users\mail\AppData\Local\Temp\berth-gh126-architecture-review.html`。

## 关联与依赖
- `src/renderer/src/components/ui/index.ts`: 设计系统入口。
- `src/renderer/src/components/shared/filter-bar.tsx`: 能力页顶栏 scope 筛选。
- `src/renderer/src/components/sessions/session-filter-bar.tsx`: 会话列表模型筛选与排序。
- `src/renderer/src/components/sessions/replay-kind-filter.tsx`: 会话回放事件类型筛选。
- `src/renderer/src/pages/usage.tsx`: 计价模式筛选。
- 相关测试: `tests/renderer/ui/*`, `tests/renderer/replay-kind-filter.test.tsx`, `tests/renderer/sessions-pages.test.tsx`。

## 候选
1. **FilterSelect**: 在 `components/ui` 增加一个深一点的筛选 Select Module, 统一密集筛选控件高度、边框、背景、hover/open 样式。风险低, 可小步验证。
2. **PageChrome builder**: `capabilities`、`instructions`、`sessions`、`memory-view` 都重复组装 page chrome search/guide/actions。审计后判断当前只做 helper 容易变成浅搬运, 暂不实现。
3. **ProjectScope hook**: `ProjectScopeSwitcher` 同时处理 UI、store 写入、IPC 和 asset snapshot 刷新。可把 side effect 移到内部 hook, 保留现有 UI interface 和测试面。

## 任务分类与 debt 校准
- type / maintenance.subtype: `maintenance / architecture`
- source.kind / refs: `user-request`, GH-126
- debt estimate 修正: confidence 从 low 调整为 medium; T3 完成后 repaid 从 6 调整为 7。
- scope / risk / areas / confidence: `global / medium / architecture, ui-ux, testability, performance / medium`
- revision: 已写入 `INDEX.md`。

## 验收标准
1. 筛选类 Select 的通用视觉契约集中到 `components/ui` 的一个 Module, 调用点不再重复写 `h-9 min-h-9`、边框和背景类。
2. scope、session model/sort、replay kind、usage cost mode 的交互行为不变。
3. 新 Module 有 renderer 测试覆盖默认视觉契约和 caller classNames 合并。
4. 受影响 renderer 测试和 `pnpm typecheck:web` 通过。
5. `ProjectScopeSwitcher` 的 store/IPC/snapshot 副作用集中到内部 hook, render 部分只消费动作和状态。
6. 项目作用域选择成功、source 加载失败、project activation 失败、user scope 即时切换等行为保持不变。

## 界面质量与交互验收
本轮不改信息架构和布局顺序, 只统一筛选下拉控件的外观契约。预期效果:
- 密集筛选控件高度固定为 36px, 与顶栏搜索/按钮密度一致。
- 边框、背景、hover/open 状态在会话、能力、用量、回放页面一致。
- 调用点仍保留业务宽度、禁用态、placeholder、renderValue 和多选行为。

## 未决问题
无需要用户澄清的问题。PageChrome builder 候选暂缓, 因当前实现成 helper 的 depth 不够。
