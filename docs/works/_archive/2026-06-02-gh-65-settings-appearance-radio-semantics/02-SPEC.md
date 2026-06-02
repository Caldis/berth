# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增 IPC、shared type 或本地文件契约。
- Theme 仍使用 `ThemeProvider` 的 `theme` / `setTheme()`。
- Language 仍使用 `i18n.language`, `i18n.changeLanguage()` 和 `localStorage['berth-language']`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 修改 `src/renderer/src/pages/settings.tsx`:
  - Theme 容器增加 `role="radiogroup"` 和 `aria-label={t('settings.theme')}`。
  - Language 容器增加 `role="radiogroup"` 和 `aria-label={t('settings.language')}`。
  - 每个选项按钮增加 `type="button"`, `role="radio"`, `aria-checked`, roving `tabIndex`, 并隐藏装饰图标的辅助技术名称。
  - 增加局部方向键处理函数, 支持 ArrowRight / ArrowDown 前进, ArrowLeft / ArrowUp 后退, Home / End 跳到首尾。
- 修改 `tests/renderer/settings-page.test.tsx`:
  - 用 `ThemeProvider` 包裹 SettingsContent。
  - 增加外观选项 role、checked state、点击和方向键测试。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增说明块, 保留现有设置页卡片和横向选项布局。 | renderer 测试确认控件仍按名称存在; 人工核对 diff 不改布局 class。 |
| 组件选择 / 设计系统一致性 | 继续使用现有按钮样式和 lucide 图标, 只补语义和键盘行为。 | 代码审查; `pnpm typecheck:web`。 |
| 交互反馈 / 状态切换 | 点击和方向键都会更新选中态; 视觉 selected class 沿用原逻辑。 | renderer 测试覆盖 click / keyDown 后的 `aria-checked`。 |
| loading / empty / error / disabled / focus | 外观选项无 loading/empty/error/disabled 态; focus 由 roving `tabIndex` 和浏览器默认 focus 样式承担。 | renderer 测试检查当前项可聚焦, 方向键移动焦点。 |
| 响应式 / 可访问性 / 键盘可达 | radiogroup + radio + aria-checked; 方向键只在当前组选项间循环。 | Testing Library role 查询和 keyDown 测试。 |
| 文案 / i18n / 数字和路径格式 | 复用 `settings.theme` / `settings.language` 作为 group 名称, 不新增翻译。 | 中英文既有测试继续通过; 新测试使用英文。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Theme/Language role 与 checked state | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| 点击更新主题、语言和本地存储 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| 方向键在组内切换并移动焦点 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| TypeScript / harness 状态 | typecheck / harness | n/a | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-65-settings-appearance-radio-semantics` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Theme radiogroup + radio + checked state | 1, 2 |
| Language radiogroup + radio + checked state | 3, 4 |
| Click handlers 保持原存储行为 | 5 |
| 方向键与 roving focus | 6 |
| 不改布局与文案 | 7 |
