# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 IPC、shared types、asset 数据模型或 `useAppStore` 的字段。
- 继续使用 `openInspector(path, content)` / `closeInspector()` 管理打开关闭。
- 可访问名称复用现有 i18n:
  - dialog: `common.viewRaw`
  - copy button: `inspector.copy`
  - close button: `common.close`

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 修改 `src/renderer/src/components/layout/inspector-drawer.tsx`:
  - 引入 `useRef`。
  - 增加组件内 `getFocusableElements` helper。
  - drawer 容器添加 `role="dialog"`、`aria-modal="true"`、`aria-label={t('common.viewRaw')}` 和 ref。
  - backdrop 添加 `aria-hidden="true"`。
  - Copy / Close button 添加 `type="button"` 和 `aria-label`。
  - lucide icons 添加 `aria-hidden="true"`。
  - 打开后 focus Close button; Tab/Shift+Tab 在 drawer 内循环; Escape 继续关闭。
- 新增 `tests/renderer/inspector-drawer.test.tsx`:
  - 用 `useAppStore.openInspector()` 准备打开状态。
  - 覆盖 dialog 语义、初始 focus、Tab/Shift+Tab、Escape、backdrop、copy。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持 fixed backdrop + right drawer + header + raw pre 布局, 不新增内容区块。 | renderer test + Electron 截图确认布局未变形。 |
| 组件选择 / 设计系统一致性 | 保持现有 button/pre/Tailwind token 和 lucide icons, 不引入依赖。 | `git diff` 检查 class 范围; screenshot 检查视觉稳定。 |
| 交互反馈 / 状态切换 | Escape/backdrop close 保持; Copy 后 copied 状态保持。 | renderer test 覆盖 close 和 copy。 |
| loading / empty / error / disabled / focus | Drawer 无异步 loading/error; 本任务补初始 focus 和循环。 | renderer test 覆盖初始 focus 和 Tab/Shift+Tab wrap。 |
| 响应式 / 可访问性 / 键盘可达 | Drawer 暴露 modal dialog 语义; Tab 不逃出抽屉。 | `getByRole('dialog')`、`aria-modal`、keyboard tests 和 CDP 实测。 |
| 文案 / i18n / 数字和路径格式 | 复用既有 `View Raw` / `Copy to clipboard` / `Close`, 不新增翻译。 | 中英文 key 不变; 测试用英文名称覆盖稳定语义。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| InspectorDrawer modal 语义、aria-modal、初始 focus | renderer | `tests/renderer/inspector-drawer.test.tsx` | `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` | 不适用 |
| InspectorDrawer Tab / Shift+Tab focus trap | renderer | `tests/renderer/inspector-drawer.test.tsx` | `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` | 不适用 |
| Escape、backdrop close | renderer | `tests/renderer/inspector-drawer.test.tsx` | `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` | 不适用 |
| Copy button accessible name 和 clipboard 写入 | renderer | `tests/renderer/inspector-drawer.test.tsx` | `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` | 不适用 |
| 类型与 harness 结构 | typecheck / harness | n/a | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-68-inspector-drawer-modal-focus` | 不适用 |
| 真实 UI 交互 | manual / CDP | n/a | agent-owned Electron + CDP assertions + PrintWindow screenshot | 自动化 renderer 覆盖行为, 真实 UI 用于确认 Electron 中焦点和视觉层级。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| dialog 语义与 accessible name | 1 |
| 初始 focus | 2 |
| icon-only button accessible name | 3 |
| Tab / Shift+Tab focus trap | 4 |
| Escape / backdrop close | 5 |
| Copy 行为保持 | 6 |
| 视觉和布局保持 | 7 |
