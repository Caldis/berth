# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增 IPC、shared type 或本地文件契约。
- `SettingsDialog` 增加可选 `returnFocusRef?: React.RefObject<HTMLElement | null>` prop, 用于关闭后把焦点还给触发器。
- `Sidebar` 为 Settings 按钮新增 ref, 传给 `SettingsDialog`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 修改 `src/renderer/src/components/layout/settings-dialog.tsx`:
  - 增加 dialog root ref。
  - 增加通用 `getFocusableElements(container)` helper, 查询 button/input/select/textarea/a[href] 和 `[tabindex]` 等可聚焦元素, 排除 disabled、hidden 和 `tabIndex < 0`。
  - 在打开时继续让关闭按钮获得初始焦点。
  - keydown 处理扩展为 Escape + Tab trap: Tab 到最后一个元素时回到第一个; Shift+Tab 在第一个元素时回到最后一个。
  - 关闭时若提供 `returnFocusRef.current`, 在下一帧恢复焦点。
- 修改 `src/renderer/src/components/layout/sidebar.tsx`:
  - 使用 `useRef<HTMLButtonElement>(null)` 保存 Settings 触发器, 并传给 SettingsDialog。
- 新增 `tests/renderer/settings-dialog.test.tsx`:
  - 渲染一个带外部按钮、触发按钮和 SettingsDialog 的 wrapper。
  - 验证打开后初始焦点在 Close。
  - 验证 Shift+Tab 从 Close 循环到 dialog 内最后一个可聚焦元素。
  - 验证 Tab 从最后一个元素循环回 Close。
  - 验证 Escape / close 后弹窗消失且焦点回到触发按钮。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增 DOM 层级说明或文案, 只给 dialog 增加 ref 和 keydown 行为。 | 代码 diff; renderer test 只验证行为。 |
| 组件选择 / 设计系统一致性 | 保留现有 custom dialog, 不引入新依赖。 | `pnpm typecheck:web`; 代码审查。 |
| 交互反馈 / 状态切换 | Escape、关闭按钮、遮罩点击保留; Tab/Shift+Tab 在 dialog 内循环。 | renderer test 覆盖。 |
| loading / empty / error / disabled / focus | 不新增这些状态; focus 回到触发按钮。 | renderer test 检查 focus。 |
| 响应式 / 可访问性 / 键盘可达 | `aria-modal` 对应真实 focus trap; 不让焦点进入背景按钮。 | renderer test + agent-owned Electron CDP 验收。 |
| 文案 / i18n / 数字和路径格式 | 不新增翻译, 继续使用 `common.close` / `settings.title`。 | 既有 i18n 测试继续通过。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Tab / Shift+Tab focus trap | renderer | `tests/renderer/settings-dialog.test.tsx` | `pnpm vitest run tests/renderer/settings-dialog.test.tsx` | 不适用 |
| Escape / close 后焦点恢复 | renderer | `tests/renderer/settings-dialog.test.tsx` | `pnpm vitest run tests/renderer/settings-dialog.test.tsx` | 不适用 |
| Sidebar trigger ref 传递 | renderer / typecheck | `tests/renderer/settings-dialog.test.tsx`; source compile | `pnpm vitest run tests/renderer/settings-dialog.test.tsx`; `pnpm typecheck:web` | 不适用 |
| Harness 状态 | harness | n/a | `pnpm harness:check --work docs/works/2026-06-02-gh-66-settings-dialog-focus-trap` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 初始焦点在关闭按钮 | 1 |
| Tab 从最后一个元素回到第一个元素 | 2 |
| Shift+Tab 从第一个元素回到最后一个元素 | 3 |
| Escape / 关闭按钮保持可用 | 4 |
| returnFocusRef + Sidebar trigger ref | 5 |
| DOM 查询可聚焦元素 | 6 |
| 不改视觉布局和文案 | 7 |
