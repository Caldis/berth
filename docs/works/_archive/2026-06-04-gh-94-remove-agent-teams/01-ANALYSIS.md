# 需求分析 (Explore 产物)

## 现状理解
Claude Code 官方文档将 Agent Teams 定义为实验性运行时协作功能, 默认关闭, 通过 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 启用。team config 位于 `~/.claude/teams/{team-name}/config.json`, task list 位于 `~/.claude/tasks/{team-name}/`; 二者由 Claude Code 自动生成和更新。官方还说明 config 内含 session IDs、tmux pane IDs 等运行时状态, 不应手写或预先创建; 可复用 teammate role 应使用 subagent definitions。参考: https://code.claude.com/docs/en/agent-teams 和 https://code.claude.com/docs/en/subagents。

Berth 当前实现把 Agent Teams 当静态 `instruction` asset:
- `src/shared/types/asset.ts`: `AssetType` 包含 `team`, `AssetStats` 包含 `teams`。
- `src/main/adapters/claude-code/scanner.ts`: 扫描 `~/.claude/teams/**/*.yml|yaml` 与 `<project>/.claude/teams/**/*.yml|yaml`。
- `src/main/adapters/claude-code/parsers.ts`: `parseTeam()` 返回 `category: "instruction"`, `type: "team"`。
- `src/main/engine/scanner.ts` 与 `src/renderer/src/lib/agent-view.ts`: 单独统计 `teams`。
- `src/renderer/src/App.tsx`, `nav-config.ts`, `instructions.tsx`, `search-dialog.tsx`: 提供 `/instructions/agent-teams` 入口、过滤和搜索跳转。
- `feature-guidance.ts`, `asset-guidance.ts`, `i18n`: 将 Agent Teams 解释成编排资产。
- `src/main/agent-plugins/registry.ts` / `manifest.ts`: 将 `team` 当 plugin asset descriptor 类型。
- `src/main/engine/health.ts`: 将 `team` 归入 instructions target route。

## 关联与依赖
跨进程边界:
- 主进程 scanner/parser 产出 Asset。
- `src/shared/types/asset.ts` 是 renderer 和 main 的共享契约。
- runtime/search/stats 从 AssetType 派生数据。
- renderer 只消费共享资产和路由配置, 不直接访问文件系统。

需要保留的相邻逻辑:
- Claude Code `TeammateIdle` hook event 属于运行时 hook schema, 不等同于静态 Agent Teams asset, 本任务不删除。
- `~/.claude` 与 `<project>/.claude` source coverage 仍保留, 只是不再把 `teams` YAML 当 asset 扫描。
- 可复用 teammate role 应由现有 Subagents 页面承载, 不新增替代 Agent Teams 页面。

## 任务分类与 debt 校准
- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: docs-issues / `docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md`。
- debt estimate 修正: 初始估算仍准确。全局共享类型、主进程扫描、renderer 路由和测试都受影响, 但删除路径清晰。
- scope / risk / areas / confidence: global / medium / architecture, ui-ux, testability / medium。
- revision: 无。
- `pnpm harness:stats`: total=14, status=ok, 不需要 maintenance override。

## 验收标准
1. Berth 不再定义 `team` 静态资产类型, 也不再输出 `AssetStats.teams`。
2. Claude Code scanner 不再扫描或解析 `~/.claude/teams` / `.claude/teams` YAML 作为 instruction asset。
3. 侧边栏、路由、页面过滤、全局搜索跳转、feature guidance、asset guidance 和 i18n 中不再出现 Agent Teams 页面入口或说明。
4. plugin registry / manifest / health route 不再把 `team` 当 instruction asset。
5. 保留 `TeammateIdle` hook event 与相关 hook 生命周期说明。
6. 相关 unit / renderer 测试和 fixture 更新后通过; TypeScript 类型无残留错误。

## 界面质量与交互验收
当前 UI 是侧边栏一级入口 + route-driven `Instructions` 页面。移除后:
- Instructions 分组少一个入口, 不引入替代空页。
- `/instructions/agent-teams` 旧路径应跳回 `/instructions/subagents`, 因为可复用 teammate role 归入 subagents。
- 全局搜索不再能跳到被删除页面。
- 中英文文案不应残留“Agent Teams 是编排资产”的误导说明。
- 响应式、focus、loading/empty/error 状态不新增分支; 复用现有导航和页面行为。

## 未决问题
无。按“完整移除 Agent Teams 静态资产入口与建模, 保留运行时 teammate hook 事件”执行。
