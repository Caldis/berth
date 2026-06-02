# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不新增 IPC 或持久化契约。仍使用 `localStorage['berth-advanced-mode']` 保存布尔字符串。

`Toggle` 组件 props 调整为:
- `enabled: boolean`
- `onToggle: (v: boolean) => void`
- `ariaLabel: string`

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/pages/settings.tsx`: `Toggle` 接收 `ariaLabel`, 渲染到按钮的 `aria-label` 与 `title`, 并补 `type="button"`。
- `tests/renderer/settings-page.test.tsx`: 增加 Advanced Mode switch 的英文、中文与状态切换测试。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增可见文本或说明块, 保持现有 Settings 分组行布局 | Electron 实测截图 |
| 组件选择 / 设计系统一致性 | 继续使用当前 `Toggle` 组件和 `cn` 样式 | 代码 diff 检查 |
| 交互反馈 / 状态切换 | 保留 click 切换与 `aria-checked` 同步 | renderer 测试 + UI 实测 |
| loading / empty / error / disabled / focus | 本任务不改变这些状态; focus 仍由原 button 提供 | UI 实测 focus/query |
| 响应式 / 可访问性 / 键盘可达 | switch 暴露本地化 accessible name | Testing Library role/name 查询 |
| 文案 / i18n / 数字和路径格式 | 复用 `settings.advancedMode` | 英文/中文测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Advanced Mode switch 有英文名称并可切换 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| Advanced Mode switch 有中文名称 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| Settings 视觉布局不变且控件可查询 | manual UI | Electron dev 实例 | Playwright CDP + 截图 | 自动化截图只作辅助, role/name 用 renderer 测试覆盖 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `Toggle` 增加 `ariaLabel` 并复用 `settings.advancedMode` | 1, 2, 4 |
| renderer 测试覆盖英文/中文/切换 | 1, 2, 3, 5 |
| UI 实测 Settings 弹窗 | 4, 5 |
