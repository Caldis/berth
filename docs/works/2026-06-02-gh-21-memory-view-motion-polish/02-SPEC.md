# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不改变 `MemoryNoteSummary` 或 IPC 契约。新增行为全部在 renderer 内部状态和样式中完成。

## 模块结构 / 组件拆分

- 修改 `src/renderer/src/components/memory/memory-view.tsx`。
- 保持 `NoteCard` 私有组件结构, 不新增全局组件。
- 在 `MemoryView` 内维护 `focusTimerRef`, 点击关联时清除旧 timer 并设置新 timer。
- 在组件卸载时清除 `focusTimerRef`。
- `NoteCard` 详情区域改为常驻外层 wrapper, 使用 `gridTemplateRows` 在 `0fr` 与 `1fr` 间切换; 内层用 `overflow-hidden`。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保留原列表结构, 只让详情区在展开后占据空间 | renderer test + 代码检查 |
| 组件选择 / 设计系统一致性 | 继续使用现有 Button/Badge/card class, 不引入第三方动画库 | `package.json` 不变 |
| 交互反馈 / 状态切换 | 详情区 grid rows 过渡; focus ring 约 2 秒后清除 | fake timers renderer test |
| loading / empty / error / disabled / focus | 不改 loading/empty/error; focus 状态变成瞬时反馈 | renderer test |
| 响应式 / 可访问性 / 键盘可达 | 收起详情区 `aria-hidden`, 并只在展开时挂载可交互详情内容 | renderer test |
| 文案 / i18n / 数字和路径格式 | 不新增用户可见文案 | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 详情区用 grid rows 过渡并在收起时隐藏 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` |  |
| 关联跳转高亮自动清除 | renderer | `tests/renderer/memory-view.test.tsx` | `pnpm test -- tests/renderer/memory-view.test.tsx` |  |
| 类型与页面集成不破坏 | typecheck | n/a | `pnpm typecheck:web` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 详情区 grid rows 过渡 | 1, 2 |
| focus timer 自动清除和卸载清理 | 3, 4 |
| 不改数据契约与现有行为 | 5 |
