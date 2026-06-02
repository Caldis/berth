# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增主进程 helper: `src/main/project-config-roots.ts`。
- 导出:
  - `resolveProjectConfigRoots(projectDir?: string): string[]`
  - 输入为空时返回 `[]`。
  - 输入为 cwd 时, 返回从仓库根到 cwd 的目录序列; 若向上过程中找到 `.git`, 在该目录停止并包含它。
  - 若没有 `.git`, 只返回当前选择目录, 避免把用户 home 或磁盘根下的同名目录误判为项目配置。
  - 返回值去重, Windows 下大小写不敏感。
- `ScanContext` 增加 `projectDirs?: string[]`, 保留 `projectDir?: string` 兼容现有测试和 parser command path 推导。
- `ScanSourceCode` 不新增枚举。已有 `claude.project.directory` / `claude.project.mcp-config` / `codex.project.*` 可重复出现于多个父级目录, UI 通过 `path` 区分来源。

## 任务分类与 debt
- type: bug。
- source.kind: docs-issues。
- debt.estimate: 不调整, 仍为 `incurred=5, repaid=0, net=5, scope=cross-process, risk=high`。
- debt.final 预期: 修复后净债应下降, 但仍会保留少量 scanner 层级复杂度; verify 时填写。
- revisions: 无。
- Project 字段同步: 当前 Project item 已为 In Progress, 不需要改字段。

## 模块结构 / 组件拆分
- `src/main/project-config-roots.ts`
  - 只处理路径层级和去重。
  - 不解析 agent 具体配置, 避免把 Claude / Codex 规则写在通用 helper。
- `src/main/adapters/claude-code/index.ts`
  - 构造 `projectDirs = resolveProjectConfigRoots(projectDir)`。
  - `scanSourceCoverage()` 对每个 project root 报告 `.claude` 和 `.mcp.json`。
  - `createContexts()` 把全部 `projectDirs` 传给第一组 Claude home context, 其他 extra Claude home 只扫用户 home。
- `src/main/adapters/claude-code/scanner.ts`
  - `scanInstructions()` / `scanCapabilities()` 用 `projectDirs` 循环扫描项目级 CLAUDE/AGENTS、skills、agents、commands、teams、settings、MCP。
  - 保留 `projectDir` 作为命令路径解析 fallback。
- `src/main/adapters/codex/index.ts`
  - 构造 `projectDirs = resolveProjectConfigRoots(projectDir)`。
  - `scanSourceCoverage()`、`scanInstructions()`、`scanCapabilities()` 对每个 project root 扫 `AGENTS.md`、`.codex/config.toml`、`.codex/hooks.json`、`.codex/agents`、`.agents/skills`。
- `src/main/engine/watcher.ts`
  - `getAssetWatchPaths()` 使用同一 helper, 对每个 project root 添加 `.claude`、`.mcp.json`、`CLAUDE.md`、`AGENTS.md`、`.codex`、`.agents/skills`。
- `tests/e2e/project-scope.e2e.ts`
  - 把 session cwd 放到项目子目录, 把 project skill 放在父级 `.agents/skills`, 验证切换项目后 search 能找到。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增页面结构, 只让现有来源列表和资产页拿到更完整数据。 | renderer 不需要截图; e2e 搜索结果证明 UI 数据可见。 |
| 组件选择 / 设计系统一致性 | 不新增组件; 继续使用现有 Project Scope Switcher / asset list / search dialog。 | 确认没有新增大段解释卡片或橙色主题。 |
| 交互反馈 / 状态切换 | 切换 project scope 后仍通过 `activateProjectScope()` 原链路刷新 assets/stats/search。 | `tests/e2e/project-scope.e2e.ts`。 |
| loading / empty / error / disabled / focus | 不改状态机; 保持已有 loading/error/focus 行为。 | 现有 project scope renderer 测试继续通过。 |
| 响应式 / 可访问性 / 键盘可达 | 不改布局和键盘事件。 | 现有 project scope e2e 覆盖 Enter/Escape。 |
| 文案 / i18n / 数字和路径格式 | 不新增文案; source coverage 继续使用 path 展示。 | source coverage 单测验证父级 path 存在。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| project roots 从子目录上溯到仓库根并去重 | unit | `tests/unit/project-config-roots.test.ts` | `pnpm test tests/unit/project-config-roots.test.ts` |  |
| Claude 子目录 cwd 能发现父级项目配置 | unit | `tests/unit/claude-code-adapter.test.ts` 或 `tests/unit/claude-scanner.test.ts` | `pnpm test tests/unit/claude-code-adapter.test.ts tests/unit/claude-scanner.test.ts` |  |
| Codex 子目录 cwd 能发现父级 AGENTS / MCP / hooks / agents / skills | unit | `tests/unit/codex-adapter.test.ts` | `pnpm test tests/unit/codex-adapter.test.ts` |  |
| watcher 监听父级项目配置 roots | unit | `tests/unit/watcher.test.ts` | `pnpm test tests/unit/watcher.test.ts` |  |
| project scope 切换后 search index 包含父级 project skill | e2e | `tests/e2e/project-scope.e2e.ts` | `pnpm build && pnpm test:e2e tests/e2e/project-scope.e2e.ts` |  |
| harness 产物 | harness | 当前 task dir | `pnpm harness:check --work docs/works/2026-06-03-gh-78-project-config-discovery` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `resolveProjectConfigRoots()` 数据契约 | 1, 2, 4, 6 |
| Claude adapter / scanner projectDirs | 1, 3, 5, 6, 7 |
| Codex adapter projectDirs | 2, 3, 5, 6, 7 |
| Watcher 使用同一 helper | 4, 6, 7 |
| E2E 搜索 fixture 改为子目录 cwd | 5, 7 |
