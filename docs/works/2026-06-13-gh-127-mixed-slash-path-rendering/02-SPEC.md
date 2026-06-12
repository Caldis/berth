# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 `Asset`、`SessionSummary`、IPC、扫描器输出。
- `truncatePath(path, maxLength)` 继续返回 string, 签名不变。
- 截断展示规则:
  - 输入不超过 `maxLength` 时原样返回。
  - Windows-like path 使用 `\` 拼接截断结果: drive path (`C:\...` / `C:/...`)、UNC path、包含反斜杠的本地路径。
  - POSIX path 使用 `/` 拼接截断结果。
  - 截断形态保持“首段 + ... + 末两段”。

## 任务分类与 debt
- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: user-request / GitHub Issue #127。
- debt.estimate: net=2, scope=module, risk=medium, areas=ui-ux,testability, confidence=medium。
- debt.final 预期: 修复共享 helper 并补测试, final net 预计 1。
- revisions: explore 阶段把 confidence 从 low 调整为 medium。
- Project 字段同步: design 后运行 `node scripts/harness-projects.mjs ensure <task-dir>`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/lib/utils.ts`: 增加私有 helper 判断截断展示分隔符, 修改 `truncatePath()` 拼接逻辑。
- `tests/unit/utils.test.ts`: 覆盖 Windows backslash、Windows forward slash drive、POSIX、UNC path。
- `tests/renderer/instructions-guidance.test.tsx`: 覆盖 conventions 卡片折叠短路径和展开完整路径的一致性。
- 不修改 `session-location-groups.ts`, 它的 slash 归一用于会话分组 key / label, 与本任务文件路径展示不同。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 只改文本格式, 不增加布局层级和行高 | renderer test 断言列表/详情文本 |
| 组件选择 / 设计系统一致性 | 继续用现有卡片、DetailRow、font-mono、truncate | 代码审查 + renderer test |
| 交互反馈 / 状态切换 | 展开按钮行为不变 | renderer test 点击展开后断言完整路径 |
| loading / empty / error / disabled / focus | 不改这些状态 | 代码审查 |
| 响应式 / 可访问性 / 键盘可达 | 不改 focus / role; 文本仍 truncate | renderer test 不新增交互负担 |
| 文案 / i18n / 数字和路径格式 | 统一短路径分隔符, 不改 i18n 文案 | unit + renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| `truncatePath()` 保持路径分隔符一致 | unit | `tests/unit/utils.test.ts` | `pnpm test -- tests/unit/utils.test.ts` |  |
| instructions conventions 折叠/展开路径一致 | renderer | `tests/renderer/instructions-guidance.test.tsx` | `pnpm test -- tests/renderer/instructions-guidance.test.tsx` |  |
| 任务态结构 | harness | 当前 work dir | `pnpm harness:check --work docs/works/2026-06-13-gh-127-mixed-slash-path-rendering` |  |
| 类型边界 | typecheck | renderer/test tsconfig | `pnpm typecheck:web`; `pnpm typecheck:test` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Windows-like path 截断使用 `\` | 1, 3 |
| POSIX path 截断使用 `/` | 2 |
| instructions conventions 页面一致性 | 4 |
| 不改数据契约和会话分组 | 5 |
