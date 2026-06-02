# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不新增 IPC 契约。新增的是渲染层导航模型:

```ts
interface NavItem {
  id: string
  labelKey: string
  descriptionKey?: string
  icon: ComponentType<{ className?: string }>
  path: string
  legacyPaths?: string[]
}

interface NavSection {
  id: string
  labelKey?: string
  items: NavItem[]
}
```

路由策略:
- Instructions 分组新路径:
  - `/instructions/memories`
  - `/instructions/conventions`
  - `/instructions/skills`
  - `/instructions/subagents`
  - `/instructions/commands`
  - `/instructions/output-modes`
  - `/instructions/agent-teams`
- Capabilities 分组新路径:
  - `/capabilities/mcp`
  - `/capabilities/hooks`
  - `/capabilities/plugins`
  - `/capabilities/status-line`
  - `/capabilities/permissions`
  - `/capabilities/env`
- 旧路径兼容:
  - `/configuration/instructions` 跳转到 `/instructions/skills`。
  - `/configuration/capabilities?tab=hooks` 跳转到 `/capabilities/hooks`; 其它 tab 同理, 未知 tab 跳到 `/capabilities/mcp`。

## 任务分类与 debt
- type / maintenance.subtype: feature / 不适用。
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-FEATURE-sidebar-information-architecture.md`。
- debt.estimate: incurred=5, repaid=0, net=5, scope=global, risk=high, areas=architecture/ui-ux/testability, confidence=medium。
- debt.final 预期: incurred=5, repaid=2, net=3。实现会新增路由兼容和测试, 但主导航结构更清晰。
- revisions: explore 后确认不涉及 IPC, confidence 从 low 调整为 medium。
- Project 字段同步: 保持 GitHub Project item `PVTI_lAHOADXbEs4BZHvQzguiY0s` In Progress, verify/归档时再置 Done。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/components/layout/nav-config.ts`
  - 扩展 `NavItem` 加 `descriptionKey` 与 `legacyPaths`。
  - 把 instructions/capabilities 的内部 tab 提升为侧边栏分组项。
  - 导出 `findNavItemByPath` / `flattenNavItems` 供面包屑和搜索复用。
- `src/renderer/src/components/layout/sidebar.tsx`
  - 展开态每个菜单项显示标题和简短说明。
  - Agent 视角移到底部过滤区, 与 Project scope 同列但独立。
  - 折叠态保留图标、title、aria-label。
- `src/renderer/src/components/layout/top-navigation.tsx`
  - 使用新 nav config 匹配当前路径。
  - 新分组展示为 `分组 > 页面`, 概览/会话/用量展示单级。
- `src/renderer/src/App.tsx`
  - 新增新路由。
  - 新增旧路径 redirect 组件。
- `src/renderer/src/pages/instructions.tsx`
  - 接收 `activeSection` prop。
  - 移除页面顶部 `TabGroup`。
  - 过滤、FeatureGuide、内容渲染保留。
- `src/renderer/src/pages/capabilities.tsx`
  - 接收 `activeSection` prop。
  - 移除页面顶部 `TabGroup` 和 `setSearchParams` 主导航逻辑。
  - 保留旧 query 读取仅在 redirect 中处理。
- `src/renderer/src/components/layout/search-dialog.tsx`
  - 快捷入口和 result route 改为新路径。
- `src/renderer/src/i18n/locales/{zh,en}.json`
  - 增加 nav 分组、描述、Agent 视角底部文案。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 侧边栏分为 Overview、Work、Instructions、Capabilities、Usage; instructions/capabilities 子模块成为一级可点项; 展开态显示一行标题和一行短说明。 | 视觉检查桌面和窄窗口; renderer sidebar 测试校验文案和 active。 |
| 组件选择 / 设计系统一致性 | 继续使用现有 button、Tailwind、lucide、`ProjectScopeSwitcher`; 不引入新三方库。 | `pnpm typecheck:web`; 代码 review 确认无新依赖。 |
| 交互反馈 / 状态切换 | active 使用现有 accent 样式, hover/focus-visible 明确; Agent 视角为小型分段按钮, 不再放标题区。 | renderer 测试切换 Agent 视角; 手工或浏览器检查 focus。 |
| loading / empty / error / disabled / focus | 页面原有 loading/empty/error 保持; redirect 不新增中间空白页; nav button 有 aria-label/title。 | 现有页面测试 + 新 redirect 测试。 |
| 响应式 / 可访问性 / 键盘可达 | 长菜单在 nav 内滚动, 底部过滤区固定; 折叠态图标可识别。 | 视觉检查展开/折叠; sidebar 测试。 |
| 文案 / i18n / 数字和路径格式 | 新增中英文 nav description; 页面标题沿用现有 tab label, 不写冗长说明。 | `rg` 检查 key; renderer 测试不出现 missing key。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 新 nav config 与路径匹配 | renderer/unit | `tests/renderer/sidebar-agent-view.test.tsx` 或新增 `tests/renderer/sidebar-navigation.test.tsx` | `pnpm test tests/renderer/sidebar-agent-view.test.tsx` | 不适用 |
| Instructions 新路径展示对应模块且无主 tab | renderer | `tests/renderer/instructions-guidance.test.tsx` | `pnpm test tests/renderer/instructions-guidance.test.tsx` | 不适用 |
| Capabilities 新路径展示对应模块且无主 tab | renderer | `tests/renderer/capabilities-guidance.test.tsx` | `pnpm test tests/renderer/capabilities-guidance.test.tsx` | 不适用 |
| 旧 capabilities query redirect | renderer | `tests/renderer/capabilities-guidance.test.tsx` | 同上 | 不适用 |
| 搜索结果跳转新路径 | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm test tests/renderer/search-dialog.test.tsx` | 不适用 |
| 全局类型与 harness 合规 | harness/typecheck | 不适用 | `pnpm typecheck:web`; `pnpm harness:check` | 不适用 |
| 真实 UI 侧边栏展开/折叠/长菜单 | manual/electron | 截图或 CDP 检查 | `pnpm dev:agent start ...` 后用浏览器/截图验证 | Electron 视觉质量不能只靠 DOM 测试证明 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新 nav config 和新路由 | 1, 2, 5, 6 |
| 旧路径 redirect | 3 |
| Agent 视角底部过滤区 | 4 |
| 页面改为 route-driven section | 2, 6 |
| i18n、面包屑、搜索更新 | 5, 6 |
| renderer/manual 验证 | 7 |
