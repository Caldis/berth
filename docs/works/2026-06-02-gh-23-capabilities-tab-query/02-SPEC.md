# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不新增跨进程数据契约。页面内部增加一个窄范围 helper:

- `isCapabilityTab(id: string | null): id is CapabilityTabId`
- `CapabilityTabId` 来自 `tabs[number]['id']`

URL query 契约:

- `tab=<known tab id>`: 使用对应页签。
- `tab` 缺失或未知: 回退 `mcp`。
- 用户点击页签: 用 `setSearchParams` 写入 `tab`, 保留同页面 URL 状态。

## 模块结构 / 组件拆分

- `src/renderer/src/pages/capabilities.tsx`
  - 引入 `useSearchParams`。
  - 用 `tab` query 派生初始 active tab。
  - `handleTabChange` 同步 React state 与 URL query。
  - 用 effect 监听 query 变化, 处理浏览器后退/前进或外部 navigate。
- `tests/renderer/capabilities-guidance.test.tsx`
  - 增加 `renderCapabilities(initialEntry)` helper, 内部包 `MemoryRouter`。
  - 保留既有测试。
  - 新增合法 query、非法 query、点击同步 query 的测试。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 DOM 层级, 不新增可见控件 | renderer 测试确认原指南内容仍展示 |
| 组件选择 / 设计系统一致性 | 继续使用现有 `TabGroup` | 不新增样式类 |
| 交互反馈 / 状态切换 | URL query 和 TabGroup 选中态同步 | 点击 Status Line 后断言 URL 文本和内容变化 |
| loading / empty / error / disabled / focus | 非法 query 静默回退 MCP, 不显示错误块 | invalid query 测试 |
| 响应式 / 可访问性 / 键盘可达 | 不改布局; 页签仍是 button role | 通过 role/name 查找并点击 |
| 文案 / i18n / 数字和路径格式 | 不新增用户可见文案 | N/A |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 合法 `tab=hooks` 初始化 Hooks 页签 | renderer | `tests/renderer/capabilities-guidance.test.tsx` | `pnpm test -- tests/renderer/capabilities-guidance.test.tsx` | N/A |
| 非法 `tab` 回退 MCP | renderer | `tests/renderer/capabilities-guidance.test.tsx` | `pnpm test -- tests/renderer/capabilities-guidance.test.tsx` | N/A |
| 点击页签同步 query | renderer | `tests/renderer/capabilities-guidance.test.tsx` | `pnpm test -- tests/renderer/capabilities-guidance.test.tsx` | N/A |
| 类型约束 | typecheck | N/A | `pnpm typecheck:web` | N/A |
| harness 任务态 | harness | N/A | `pnpm harness:check` | N/A |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| query 初始化 | 1, 2 |
| query 同步 | 3 |
| 测试包 Router 后继续通过 | 4 |
| 验证命令 | 5 |

