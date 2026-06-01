# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增或修改 IPC 契约。Hook 健康检查继续使用 `window.api.assets.healthCheck()`; 行级 Hook 操作继续使用现有 `window.api.hooks.setHookEnabled()`。
- 本次只移除 Hooks 页面上的 Agent 级 enablement panel 调用点, 不删除 `hooks:statuses` / `hooks:set-enabled` 相关主进程能力。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - 删除 `HookDensity` 状态、舒适/紧凑切换和相关条件样式, Hook 行固定使用原来的舒适间距。
  - 删除 `HookAgentEnablementPanel` 渲染和组件定义, 让功能区只承担视图切换、当前 Agent view 标记和健康检查摘要。
  - 生命周期模式布局改为桌面双列: 左侧索引 `lg` 起作为 sticky 侧栏, 使用 `top-4 max-h-[calc(100vh-2rem)] overflow-y-auto`; 小屏仍保持横向可滚动索引。
  - `HookStageSection`、`UnknownHookSection`、`HookEventList`、`HookAssetRow` 不再接收 `density` 参数。
- `tests/renderer/hooks-lifecycle-view.test.tsx`
  - 删除依赖 Agent 级开关面板的等待辅助和测试。
  - 删除密度切换测试, 改为断言密度按钮不再存在且长命令仍可见。
  - 增加/调整断言: 不出现 `Disable all` / `Enable all`, 生命周期侧栏带 sticky/max-height/overflow 类, 健康检查仍正常。
- i18n 文件暂不清理历史 key, 因为删除未使用文案不是本次验收必需, 且可能影响后续功能复用。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 移除密度切换与 Agent 级全部禁用入口 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 生命周期索引改为页面内 sticky 侧栏 | renderer + manual | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`; 必要时启动 dev 目视检查 | 自动化断言 class/结构, 粘性滚动效果需浏览器/窗口实测补充 |
| Hook 健康检查保留 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 类型与 harness 状态 | typecheck / harness | N/A | `pnpm typecheck:web`; `pnpm harness:check` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 保留视图切换, 删除密度切换 | 1 |
| 删除 Agent 级 enablement panel | 2 |
| 保留 Hook 健康检查 | 3 |
| 生命周期索引 sticky 侧栏 | 4 |
| 对照 Agent 和筛选提示保持 | 5 |
| 测试、类型检查、harness 检查 | 6 |
