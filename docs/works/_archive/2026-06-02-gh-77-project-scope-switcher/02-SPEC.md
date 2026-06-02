# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增共享 scope 类型, 放在 `src/shared/types/asset.ts` 或相邻 shared 类型文件:
  - `AppScopeMode = 'global' | 'user' | 'project'`
  - `ProjectScopeCandidate { id, path, name, displayPath, source, lastSeenAt?, sessionCount? }`
  - `AppScopeSelection { mode: AppScopeMode; projectPath?: string }`
- `project` 模式必须带 `projectPath`; `global` 和 `user` 不带项目路径。路径比较使用规范化后的 Windows-insensitive key, 但 UI 保留原始路径展示。
- IPC 扩展:
  - `sessions:list` 支持 `projectPath?: string`, 并保留旧 `projectFilter` 兼容入口。
  - `usage:summary` 支持 `projectPath?: string`; 先按 session 资产中的精确项目路径过滤。
  - 新增或复用一个项目候选查询 IPC, 从当前 scanner projectDir、历史 sessions、scan source candidates 合并候选。
- Renderer store 新增:
  - `scopeSelection`
  - `projectCandidates`
  - `setScopeSelection(selection)`
  - `setProjectCandidates(candidates)`
  - derived helper: 当前 scope label、当前 project candidate。
- 第一版实现采用“精确过滤 + 现有扫描结果”策略。切换 project scope 后, Sessions / Overview recent sessions / Usage 必须精确过滤; Instructions / Capabilities 在现有资产基础上过滤 user / enterprise / matching project 资产。完整重建 scanner / watcher 作为后续实现项保留在同一任务计划中, 不在第一提交里伪装完成。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/shared/`: 放 scope 类型、路径规范化 helper, 供 main 和 renderer 共用。
- `src/main/ipc/handlers.ts`: 生成项目候选, sessions/usage 支持 `projectPath`。
- `src/main/engine/scanner.ts`: 暴露当前 projectDir 和 source candidate 数据, 不在首版重建 singleton。
- `src/renderer/src/stores/app.ts`: 保存 scope selection 和候选列表。
- `src/renderer/src/hooks/use-ipc.ts`: `useSessions` / `useUsageSummary` 接收 scope selection, 新增 `useProjectCandidates`。
- `src/renderer/src/components/layout/sidebar.tsx`: sidebar footer 增加 Project / Scope 入口, Agent 选择器继续保留在顶部但文案区分。
- `src/renderer/src/components/layout/project-scope-switcher.tsx`: 新组件。使用 button + popover/listbox 语义, 展示 global/user/project 三类; 项目列表展示名称、短路径、来源和会话数量。
- `src/renderer/src/pages/overview.tsx`, `sessions.tsx`, `usage.tsx`, `instructions.tsx`, `capabilities.tsx`: 消费全局 scope selection, 页面内过滤不得覆盖应用级 scope。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 入口放在 sidebar footer, 与 Settings 同级; collapsed 时保留图标入口。弹层顶部展示当前 scope, 下方分 global / user / projects。 | Electron 实测截图: expanded 与 collapsed sidebar; 检查不遮挡 window controls 和 breadcrumb。 |
| 组件选择 / 设计系统一致性 | 使用现有 shadcn/button/dropdown/popover 风格, 黑白工具壳; 不新增大卡片, 不使用橙色强调作为主色。 | 视觉检查 + CSS 检查, 确认没有页面内重复说明块。 |
| 交互反馈 / 状态切换 | 选择 scope 后即时更新 store, 相关页面重新请求数据; 当前选项有 `aria-pressed`/选中态。 | unit/renderer 测试 + e2e 点击切换。 |
| loading / empty / error / disabled / focus | 候选加载时显示轻量行内状态; 无项目候选时仍可选 global/user; 请求失败保留旧候选并显示小提示。 | renderer 测试覆盖 empty/error; 手动焦点检查。 |
| 响应式 / 可访问性 / 键盘可达 | 弹层可用 Enter/Space 打开, Esc 关闭并回到触发按钮; 长路径中间截断, `title` 展示完整路径。 | Playwright 键盘路径测试或手动截图记录。 |
| 文案 / i18n / 数字和路径格式 | 中文: 全局、用户域、项目域; 英文: Global, User, Project。项目 tag 展示来源: 当前目录 / 会话历史 / 扫描来源。 | i18n key 测试或快照检查; 长路径 UI 验证。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| scope 类型与路径规范化 | unit | `src/shared/scope.test.ts` | `pnpm test src/shared/scope.test.ts` |  |
| project candidates 合并去重 | unit/main | `src/main/ipc/project-scope.test.ts` 或 handlers helper test | `pnpm test src/main/ipc/project-scope.test.ts` |  |
| sessions 按精确 project path 过滤 | unit/main | `src/main/ipc/handlers.test.ts` 或新增 helper test | `pnpm test <file>` |  |
| usage summary 按 project path 过滤 | unit/main | `src/main/usage/*.test.ts` 或 handlers helper test | `pnpm test <file>` |  |
| store 保存 scope selection | renderer unit | `src/renderer/src/stores/app.test.ts` | `pnpm test src/renderer/src/stores/app.test.ts` |  |
| sidebar scope switcher UI | renderer | `src/renderer/src/components/layout/project-scope-switcher.test.tsx` | `pnpm test src/renderer/src/components/layout/project-scope-switcher.test.tsx` |  |
| 页面消费 scope | renderer | page tests 或 app e2e | `pnpm test src/renderer/src/pages/*.test.tsx` |  |
| 用户主路径: 打开弹层、切换项目、Sessions/Usage 显示变化 | e2e | `tests/e2e/app.e2e.ts` 或新增 `project-scope.e2e.ts` | `pnpm test:e2e tests/e2e/project-scope.e2e.ts` |  |
| UI 视觉验收 | manual/e2e screenshot | 临时截图文件 + 任务 verify 回写 | `pnpm dev:agent ... screenshot --mode print-window` | 自动截图需要真实 Electron 窗口, 作为 verify 阶段证据。 |
| harness 产物 | harness | 当前 task dir | `pnpm harness:check --work docs/works/2026-06-02-gh-77-project-scope-switcher` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 数据契约: `AppScopeSelection` / `ProjectScopeCandidate` | 1, 3, 8 |
| Sidebar footer scope switcher | 2, 7, 8 |
| Project candidate 合并去重与路径规范化 | 3, 8 |
| Sessions / Overview / Usage 精确 project path 过滤 | 4, 8 |
| Instructions / Capabilities 应用级 scope 过滤 | 5, 8 |
| 分段 scanner 策略与后续重建任务 | 6 |
| UI 状态、键盘、collapsed sidebar、长路径 | 7 |
| 测试矩阵与 e2e 主路径 | 8 |
