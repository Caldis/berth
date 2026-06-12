# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改 IPC、store、路由或 i18n key。所有业务选择值、`selectedKeys`、`onSelectionChange`、`renderValue` 和禁用态原样透传。

## 任务分类与 debt
- type / maintenance.subtype: `maintenance / architecture`
- source.kind / refs: `user-request`, GH-126
- debt.estimate: `incurred=2, repaid=7, net=-5, scope=global, risk=medium, confidence=medium`
- debt.final 预期: T1/T3 完成后偿还 UI 组件复用、交互一致性和 scope side effect locality 债务; 最终值 verify/archive 前按实际 diff 回填。
- revisions: explore 已记录 confidence 校准; implement 已记录 repaid/net 校准。
- Project 字段同步: archive 前统一 strict check。

## 模块结构 / 组件拆分
新增 `src/renderer/src/components/ui/filter-select.tsx`:
- `FilterSelect` 直接使用 HeroUI `Select`。
- 默认 `size="sm"`、`variant="bordered"`、`radius="md"`。
- 默认 trigger className: `h-9 min-h-9 border-border bg-background shadow-none data-[hover=true]:bg-muted/40 data-[open=true]:border-ring`。
- 保留 caller 传入的 `classNames.trigger`, 通过 `cn()` 合并, caller 可补宽度/特殊态。

替换调用点:
- `ScopeSelect`
- `SessionFilterBar` 的 model/sort select
- `ReplayKindFilter`
- `Usage` 的 cost mode select

不做:
- 不改 page chrome、路由、搜索快捷键、placeholder 文案。
- 不把 PageChrome builder 做成浅 helper; 等出现更深 interface 再实现。

`ProjectScopeSwitcher` side effect 抽取:
- 在同文件内增加 `useProjectScopeActions`。
- hook 负责候选加载、source 加载、scope IPC 同步、project activation、asset snapshot 读取、store 写入和错误状态。
- render 只消费 `loading/error/sourceGroups/sourceLoading/sourceError/loadCandidates/selectScope`, 不直接维护这组副作用顺序。
- project activation 失败时保持菜单打开、scope 不变, 让用户能重试或切别的 scope。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改页面结构; 只保证筛选下拉高度统一为 36px。 | renderer 测试断言 `h-9 min-h-9`; 受影响页面测试通过。 |
| 组件选择 / 设计系统一致性 | 新增 `FilterSelect` 到 `components/ui`, 调用点从 `@/components/ui` 引用。 | barrel 测试覆盖导出; `typecheck:web` 通过。 |
| 交互反馈 / 状态切换 | hover/open 边框和背景样式集中到 FilterSelect。 | 新测试断言默认 className; 既有交互测试覆盖多选/单选。 |
| loading / empty / error / disabled / focus | 不改现有禁用态和空结果逻辑; ProjectScope activation 失败保留菜单和旧 scope。 | sessions page 测试覆盖 disabled/model filter; project scope 测试覆盖失败路径。 |
| 响应式 / 可访问性 / 键盘可达 | 保留 HeroUI Select interface 和 aria-label。 | 既有 getByRole/getByTestId 测试继续通过。 |
| 文案 / i18n / 数字和路径格式 | 不改文案和格式化逻辑。 | 既有页面测试继续使用原翻译 key。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| FilterSelect 默认视觉契约和 classNames 合并 | renderer | `tests/renderer/ui/filter-select.test.tsx` | `pnpm test -- tests/renderer/ui/filter-select.test.tsx tests/renderer/ui/barrel.test.tsx tests/renderer/replay-kind-filter.test.tsx tests/renderer/sessions-pages.test.tsx` |  |
| 受影响筛选交互不回归 | renderer | `tests/renderer/replay-kind-filter.test.tsx`, `tests/renderer/sessions-pages.test.tsx` | 同上 |  |
| ProjectScope side effect hook 行为不回归 | renderer | `tests/renderer/project-scope-switcher.test.tsx` | `pnpm test -- tests/renderer/project-scope-switcher.test.tsx` |  |
| TypeScript 导出和调用点类型 | typecheck | `tsconfig.web.json` | `pnpm typecheck:web` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新增 FilterSelect 并替换 4 类调用点 | 1, 2 |
| 新增 renderer UI 测试 | 3 |
| 跑定向测试和 typecheck | 4 |
| 抽取 ProjectScope side effect hook 并覆盖失败路径 | 5, 6 |
