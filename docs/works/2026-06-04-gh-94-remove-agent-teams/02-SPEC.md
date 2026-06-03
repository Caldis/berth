# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
删除共享静态资产契约中的 `team`:
- `AssetType` 移除 `team`。
- `AssetStats` 移除 `teams`。
- 主进程和 renderer 的空 stats、统计派生和测试 fixture 同步删除 `teams` 字段。

保留 Claude Code hook event `TeammateIdle`, 因为它是 hook schema 的运行时事件, 不是静态 asset type。

## 任务分类与 debt
- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: docs-issues / `docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md`。
- debt.estimate: incurred=4, repaid=1, net=3, scope=global, risk=medium, areas=architecture/ui-ux/testability, confidence=medium。
- debt.final 预期: incurred=3, repaid=2, net=1。删除错误模型会降低长期维护成本。
- revisions: 无。
- Project 字段同步: 0.0-new 已同步 Project #6 item `PVTI_lAHOADXbEs4BZHvQzguoT8A`; 实现后如 estimate 变化再运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-94-remove-agent-teams`。

## 模块结构 / 组件拆分
1. 共享契约与扫描
   - `src/shared/types/asset.ts`: 删除 `team` / `teams`。
   - `src/main/adapters/claude-code/scanner.ts`: 删除 teams 扫描。
   - `src/main/adapters/claude-code/parsers.ts`: 删除 `parseTeam()`。
   - `src/main/engine/scanner.ts`, `src/main/engine/assets/runtime.ts`, `src/renderer/src/stores/app.ts`, `src/renderer/src/lib/agent-view.ts`: 删除 teams 统计。

2. renderer 入口和说明
   - `src/renderer/src/App.tsx`: `/instructions/agent-teams` redirect 到 `/instructions/subagents`。
   - `src/renderer/src/components/layout/nav-config.ts`: 移除 `instruction-agent-teams`。
   - `src/renderer/src/pages/instructions.tsx`: 删除 `agentTeams` tab 类型、icon、render case。
   - `src/renderer/src/components/layout/search-dialog.tsx`: 删除 `team` 跳转分支。
   - `src/renderer/src/lib/feature-guidance.ts` / `asset-guidance.ts`: 删除 `agentTeams` guide。
   - `src/renderer/src/i18n/locales/en.json` / `zh.json`: 删除 Agent Teams 文案和 `healthChecks.text.assetTypes.team`。

3. plugin / health / tests
   - `src/main/agent-plugins/registry.ts` 与 `manifest.ts`: 删除 `team` descriptor/type。
   - `src/main/engine/health.ts`: 删除 `team` instruction route 映射。
   - 更新 unit / renderer 测试 fixture 中的 `teams: 0`。
   - 增加或调整测试, 确认旧路由 redirect、nav 不含 Agent Teams、search 不支持 team route、scanner 不产出 team asset。

## 界面质量与交互验收
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | Instructions 侧边栏只保留 Memories、Conventions、Skills、Subagents、Commands、Output Modes。 | renderer nav / sidebar 测试; 必要时 DOM 检查。 |
| 组件选择 / 设计系统一致性 | 不新增组件; 删除现有入口和 guide 配置。 | typecheck + renderer 测试。 |
| 交互反馈 / 状态切换 | 被删除旧路径 redirect 到 Subagents, 不显示空页。 | routing 测试。 |
| loading / empty / error / disabled / focus | 不新增状态; 现有页面状态保持。 | instructions guidance 测试。 |
| 响应式 / 可访问性 / 键盘可达 | 侧边栏少一项后折叠/展开逻辑保持。 | sidebar renderer 测试。 |
| 文案 / i18n / 数字和路径格式 | 中英文删除 Agent Teams 误导说明; 不残留 missing key。 | typecheck + rg 检查 + renderer 测试。 |

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 共享类型、scanner、stats 移除 team | unit/typecheck | 相关 unit tests + TS | `pnpm test -- tests/unit/agent-capability-plugins.test.ts tests/unit/agent-asset-runtime.test.ts tests/unit/asset-worker-host.test.ts tests/unit/project-scope-runtime.test.ts`; `pnpm typecheck:web`; `pnpm typecheck:node` | 不适用 |
| nav / route / instructions 页面删除 Agent Teams | renderer | `tests/renderer/app-routing.test.tsx`, `sidebar-agent-view.test.tsx`, `instructions-guidance.test.tsx` | `pnpm test -- tests/renderer/app-routing.test.tsx tests/renderer/sidebar-agent-view.test.tsx tests/renderer/instructions-guidance.test.tsx` | 不适用 |
| search route 删除 team 分支 | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm test -- tests/renderer/search-dialog.test.tsx` | 不适用 |
| 全局残留检查 | harness/manual | rg + harness | `rg -n "agentTeams|agent-teams|Agent Teams|parseTeam|type === 'team'|type: 'team'|teams:" src tests`; `pnpm harness:check --work docs/works/2026-06-04-gh-94-remove-agent-teams` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 数据契约删除 `team` / `teams` | 1 |
| scanner/parser 删除 teams 静态扫描 | 2 |
| renderer 入口、路由、搜索和说明删除 Agent Teams | 3 |
| plugin / health 删除 team 静态 asset | 4 |
| `TeammateIdle` 保留 | 5 |
| 测试与 typecheck | 6 |
