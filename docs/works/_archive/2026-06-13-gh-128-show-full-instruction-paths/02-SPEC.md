# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 `Asset`、IPC、扫描器输出。
- 不改 `truncatePath(path, maxLength)` 的签名与行为; 它继续服务摘要型展示。
- conventions 卡片折叠态改为显示原始 `asset.path`。

## 任务分类与 debt
- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: user-request / GitHub Issue #128。
- debt.estimate: net=1, scope=module, risk=medium, areas=ui-ux,testability, confidence=medium。
- debt.final 预期: 修复单页展示并补 renderer test, final net 预计 1。
- revisions: explore 阶段把 confidence 从 low 调整为 medium。
- Project 字段同步: design 后运行 `node scripts/harness-projects.mjs ensure <task-dir>`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/pages/instructions.tsx`
  - `MemoryCard` 折叠态路径从 `truncatePath(asset.path)` 改为 `{asset.path}`。
  - 路径样式从 `truncate` 改为 `whitespace-normal break-all leading-relaxed`, 保留 `font-mono` 和 muted 色。
  - 按钮行从垂直居中调整为适合多行路径的顶部对齐, 避免图标在高卡片中显得漂浮。
- `tests/renderer/instructions-guidance.test.tsx`
  - 更新 GH-127 的 conventions 路径测试, 断言长路径完整出现、不出现 `D:\...\project\CLAUDE.md` 或 `D:/.../project/CLAUDE.md`。
  - 断言路径元素不再带 `truncate`, 并带 `break-all`。
- 不新增共享组件。当前只有 conventions 折叠态需要“路径即主信息”的完整展示; 其他 `truncatePath()` 使用点仍是摘要区。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保留单层卡片; 长路径允许增加行高 | renderer test + 真实界面截图 |
| 组件选择 / 设计系统一致性 | 不引入新 primitive; 保留现有卡片和 mono 路径样式 | 代码审查 |
| 交互反馈 / 状态切换 | 展开/收起行为不变 | renderer test 点击展开 |
| loading / empty / error / disabled / focus | 不改这些状态 | 代码审查 |
| 响应式 / 可访问性 / 键盘可达 | 路径可换行、可复制, 不新增交互 | DOM class 断言 + 截图 |
| 文案 / i18n / 数字和路径格式 | 完整显示原始路径, 不新增文案 | renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| conventions 折叠态完整显示长路径 | renderer | `tests/renderer/instructions-guidance.test.tsx` | `pnpm test -- tests/renderer/instructions-guidance.test.tsx` |  |
| 路径换行而非 CSS truncate | renderer | `tests/renderer/instructions-guidance.test.tsx` | `pnpm test -- tests/renderer/instructions-guidance.test.tsx` |  |
| 类型与任务态 | typecheck / harness | tsconfig / work dir | `pnpm typecheck:web`; `pnpm typecheck:test`; `pnpm harness:check --work docs/works/2026-06-13-gh-128-show-full-instruction-paths` |  |
| 真实界面可读性 | manual screenshot | agent-owned Electron | `pnpm dev:agent start ...`; CDP 进入约定页; `pnpm dev:agent screenshot ...` | 截图用于确认真实布局和无横向溢出 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 折叠态显示原始 `asset.path` | 1 |
| 路径使用 `break-all` / `whitespace-normal` | 2 |
| 展开详情行为不变 | 3 |
| 不改 `truncatePath()` | 4 |
