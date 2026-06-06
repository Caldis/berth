# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
纯渲染层控件替换, 无 IPC / 数据契约变更。各控件的受控 props (value/onChange/selection)
与 i18n key 保持不变, 仅替换底层渲染元素。HeroUI 控件契约 (已读 @heroui 安装版 .d.ts):
- `Input` (v2.4.33): `ref: Ref<HTMLInputElement>` (转发到内部 input, `focus()/select()` 可用);
  `onValueChange(value: string)`; `startContent`/`endContent`; slots `inputWrapper`/`input`。
- `Select`: `selectedKeys` + `onSelectionChange(keys: SharedSelection)` + `selectionMode="single"`;
  `SelectItem` 子项; `aria-label`/`placeholder`。
- `Dropdown` + `DropdownTrigger`/`DropdownMenu`/`DropdownItem`: `onAction` 触发动作。
- `Chip` (berth composite): 语义 `tone` 映射 (见 `ui/chip.tsx`)。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / ui-ux
- source.kind / refs: docs-issues / heroui-migration-followup + GH-105
- debt.estimate: incurred 5 / repaid 9 / net -4 / scope module / risk medium / confidence medium
- debt.final 预期: 全 C1–C6 交付后 repaid 兑现 ~9, net ≈ -4 (偿还 ui-ux 一致性债)
- revisions: explore 已追加 1 条 (见 INDEX)
- Project 字段同步: ensure 已写 In Progress; done 时回写 final

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md: 所有 HeroUI 控件从 `@/components/ui` 引入, 不直接 `@heroui/react`。
逐控件方案 (每项独立提交):

- **C1 header Input** (`components/layout/top-navigation.tsx`): `<input>` → `<Input>`;
  `ref={searchInputRef}` (保留 ⌘K focus+select), `value`/`onValueChange`, `placeholder`/`aria-label`,
  `startContent={<Search/>}`, `endContent={<Kbd>}` (⌘K/Ctrl+K, ≥text-xs), `variant="bordered"` `size="sm"`,
  classNames 把 `inputWrapper` 对齐 `h-9` + berth token (border/bg-background/hover/focus-ring)。
  删除原绝对定位 Search/kbd 与手写 className; 保留外层宽度容器 (`min-w-[14rem] flex-1 sm:w-72`)。
- **C2 usage Select** (`pages/usage.tsx`): cost-mode `<select>` → `<Select selectionMode="single">` +
  `<SelectItem>`; `selectedKeys={[costMode]}`, `onSelectionChange` 取首 key → `setCostMode`; i18n label 不变。
- **C3 hooks Dropdown** (`components/capabilities/hooks-lifecycle-view.tsx`): HookActions `<details>` →
  `Dropdown`/`DropdownTrigger`(Button)/`DropdownMenu`/`DropdownItem`; 保留动作项与只读项展示, `onAction` 派发。
- **C4 filter-bar** (`components/shared/filter-bar.tsx`): `ScopeSelect` `<select>`→`Select`,
  `FilterBar` `<input>`→`Input`; 不改对外 props 签名 (value/onChange/scope/placeholder), 仅换内部渲染;
  逐一回归 3 处消费方 (project-scope-switcher/capabilities/overview)。
- **C5 memory Input** (`components/memory/memory-view.tsx`): 搜索 `<input>` → `Input` (同 C1 模式, 无 ⌘K)。
- **C6 Chip 收敛** (`memory-view.tsx`/`agent-capability-plugins-section.tsx`/`pages/instructions.tsx`):
  本地手搓 pill → `ui/Chip` 对应 `tone`; ≥text-xs。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写"不适用"。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 控件高度对齐现有 (`h-9` header/`h-8` sm); Chip ≥text-xs | 截图对比页头/各页密度 |
| 组件选择 / 设计系统一致性 | 全部走 `@/components/ui` 的 Input/Select/Dropdown/Chip | grep 确认无残留原生 `<select>`/`<details>` 菜单 |
| 交互反馈 / 状态切换 | Input hover/focus-ring; Select/Dropdown open/选中; Chip tone | 实测 + 截图 |
| loading / empty / error / disabled / focus | 保留禁用态 (hooks 只读项); Input focus-ring; ⌘K focus+select | 键盘实测 ⌘K → 聚焦并全选 |
| 响应式 / 可访问性 / 键盘可达 | header `sm:w-72` flex; Select/Dropdown 键盘导航; aria-label 保留 | 缩窗 + 键盘 Tab/方向键实测 |
| 文案 / i18n / 数字和路径格式 | 所有 i18n key、placeholder、选项文案不变 | grep diff 确认 key 未动 |

## 测试策略
每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| C1 header Input 渲染+⌘K 聚焦 | renderer | tests/renderer/top-navigation-search.test.tsx (新增) | `pnpm exec vitest run tests/renderer/top-navigation-search.test.tsx` | — |
| C2 usage Select 选项切换 | manual + typecheck | — | `pnpm typecheck:web` + 截图 | 现有 usage 无 select 单测; 行为简单, 视觉+typecheck 验收 |
| C3 hooks Dropdown 动作 | renderer (复用) | tests/renderer/hooks-lifecycle-view.test.tsx | `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` | 复用现有套件, 改后必须仍绿 |
| C4 filter-bar Select/Input | renderer/manual | 现有消费方测试 + 截图 | `pnpm test` 相关 + 截图 3 处 | 共享组件无独立测试, 靠消费方回归 |
| C5 memory Input | manual + typecheck | — | `pnpm typecheck:web` + 截图 | 行为=受控搜索, 同 C1 模式 |
| C6 Chip 收敛 | manual + typecheck | — | `pnpm typecheck:web` + 截图 | 纯视觉替换 |
| 全量 | gate | — | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | verify 总收口 |

> 例外说明 (不变量 16): C2/C5/C6 纯视觉/受控替换, 无独立自动化测试, 以 typecheck + 截图视觉验收替代,
> 已在上表 "理由" 列写明; C1/C3/C4 有 renderer 测试证据。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| C1 | 1 |
| C2 | 2 |
| C3 | 3 |
| C4 | 4 |
| C5 | 5 |
| C6 | 6 |
| 门禁/截图 | 7 |
| 延后项交叉引用 | 8 |
