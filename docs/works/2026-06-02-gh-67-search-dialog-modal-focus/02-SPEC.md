# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 IPC、shared types、store shape 或 asset 数据模型。
- 继续使用 `useAppStore().searchOpen` 和 `setSearchOpen(open)` 管理打开状态。
- 新增的可访问名称使用现有 `search.placeholder` 文案, 避免新增 i18n key。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 修改 `src/renderer/src/components/layout/search-dialog.tsx`:
  - 引入 `useRef`。
  - 在面板容器上添加 `role="dialog"`、`aria-modal="true"` 和 `aria-label={t('search.placeholder')}`。
  - backdrop 标记 `aria-hidden="true"`。
  - 搜索 icon 标记 `aria-hidden="true"`。
  - 给输入框加 `aria-label={t('search.placeholder')}` 并用 ref 进行初始 focus。
  - 增加本组件内的 `getFocusableElements` helper, 处理 Tab / Shift+Tab wrap。
  - Escape 继续关闭 overlay; `Ctrl+K` / `Cmd+K` 继续切换。
- 修改 `tests/renderer/search-dialog.test.tsx`:
  - 增加 focus trap、Escape/backdrop close、quick action close 测试。
  - 保留现有中文 quick action label 测试。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持现有 fixed overlay、backdrop、`max-w-lg` command panel 和 5 个 quick action, 不增加说明区块。 | renderer test + Electron 实测截图确认面板未变形。 |
| 组件选择 / 设计系统一致性 | 保持 Tailwind token 和现有 button/input 结构, 不引入新组件或依赖。 | `git diff` 检查 class 变更范围; screenshot 检查视觉稳定。 |
| 交互反馈 / 状态切换 | `Ctrl+K`/`Cmd+K`、Escape、backdrop、quick action click 均保持可用。 | renderer test 覆盖 Escape/backdrop/quick action; CDP 实测。 |
| loading / empty / error / disabled / focus | 搜索面板无异步 loading/error; 本任务只补 focus 初始点和循环顺序。 | renderer test 覆盖 input 初始 focus 和 Tab/Shift+Tab wrap。 |
| 响应式 / 可访问性 / 键盘可达 | 面板暴露 modal dialog 语义; Tab 不逃出 overlay。 | `getByRole('dialog')`、`aria-modal` 和 keyboard tests。 |
| 文案 / i18n / 数字和路径格式 | 复用 `search.placeholder` 作为 dialog/input 名称, 不新增文案。 | 中英文 key 不变; 现有中文 label test 继续通过。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| SearchDialog modal 语义、aria-modal、初始 focus | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm vitest run tests/renderer/search-dialog.test.tsx` | 不适用 |
| SearchDialog Tab / Shift+Tab focus trap | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm vitest run tests/renderer/search-dialog.test.tsx` | 不适用 |
| Escape、backdrop、quick action close | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm vitest run tests/renderer/search-dialog.test.tsx` | 不适用 |
| 类型与 harness 结构 | typecheck / harness | n/a | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-67-search-dialog-modal-focus` | 不适用 |
| 真实 UI 交互 | manual / CDP | n/a | agent-owned Electron + CDP assertions | 自动化 renderer 覆盖行为, 真实 UI 用于确认 Electron 中焦点和截图。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| dialog 语义与 accessible name | 1 |
| 输入框初始 focus | 2 |
| Tab / Shift+Tab focus trap | 3 |
| Escape / backdrop close | 4 |
| quick action 行为保持 | 5 |
| 视觉和布局保持 | 6 |
