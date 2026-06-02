# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 输入: `asset: Asset`, `label?: string`, `className?: string`。
- 行为:
  - click 后调用 `window.api.assets.get(asset.id)`。
  - `full?.raw ?? asset.raw` 有值时调用 `openInspector(asset.path, raw)`。
  - 没有 raw 或读取异常时, 设置本地不可用状态并禁用按钮。

## 模块结构 / 组件拆分
- 新增共享组件 `src/renderer/src/components/shared/view-raw-button.tsx`。
- 能力页和指令页卡片统一使用该组件。
- 不改主进程与 preload API。

## 界面质量与交互验收
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持原按钮大小, 不展开说明块 | 真实页面截图 |
| 组件选择 / 设计系统一致性 | 复用现有 border/hover/accent token 与 `Eye` icon | renderer 测试 + 截图 |
| 交互反馈 / 状态切换 | loading 禁用并显示加载文案; unavailable 禁用并通过 title/aria-label 说明 | renderer 测试 |
| loading / empty / error / disabled / focus | 不可用状态不可点击, focus 样式仍按按钮语义 | renderer 测试 |
| 响应式 / 可访问性 / 键盘可达 | 使用 button, `type=button`, icon `aria-hidden`, 不可用原因进 aria-label/title | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 新增 `inspector.loadingRaw` / `inspector.rawUnavailable` | typecheck |

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| raw 可用时打开 drawer | renderer | `tests/renderer/view-raw-button.test.tsx` | `pnpm vitest run tests/renderer/view-raw-button.test.tsx` |  |
| raw 不可用/读取失败时禁用并提示 | renderer | `tests/renderer/view-raw-button.test.tsx` | `pnpm vitest run tests/renderer/view-raw-button.test.tsx` |  |
| 能力页/指令页复用共享按钮 | renderer | `tests/renderer/view-raw-button.test.tsx` | `pnpm vitest run tests/renderer/view-raw-button.test.tsx` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 共享 ViewRawButton | 1, 2, 3, 4 |
| i18n loading/unavailable 文案 | 2, 4 |
| renderer 测试覆盖可用/不可用/失败 | 1, 2, 3 |
