# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号 (AC1–AC11)。

## UX 决策 (用户已委托, 此处为结论与依据)

**D1 — 展示口径: 协作记录, 非实时仪表盘** (→AC6)
官方生命周期声明目录仅活跃期存在, 但同页承认 cleanup 不可靠; 本机 5/5 team 目录全部陈旧。任何"实时运行态"口径在大多数时刻都会展示错误的活跃声明。定调与 Sessions 同心智的"团队协作记录": 按最近活动排序的历史/现存记录, 以相对时间呈现近期性; 仅当 lastActivityAt 距今 ≤5 分钟时显示弱信号 chip "近期活跃" (不声称 running)。

**D2 — IA: work 区一级入口 `/teams`, 排在 Sessions 之后** (→AC4)
否决项:
- 不展示: 本机存在真实 team 数据而产品零可见, 与 berth "本机 agent 资产与运行可观测" 定位直接冲突; 用户委托即要求补此缺口。
- 并入 Sessions 列表: teams 与 sessions 是 1:N 的不同实体, 混入会污染高密度虚拟化列表; 关联用 lead session 跳转表达 (AC8)。
- 放回 Instructions/Capabilities: 重蹈 GH-94 撤销的静态资产误分类。

**D3 — 详情形态: 单页 + Accordion 可展开卡片, 不建 `/teams/:name` 二级路由** (→AC7)
team 基数个位数、内容深度浅 (成员/任务/链接), 二级路由徒增导航成本与 back 链路。Accordion 是 GH-105 收敛后的标准折叠 primitive。

**D4 — 数据架构: `src/main/agent-teams/` 只读按需读取 + 单一 `teams:list` IPC** (→AC1, AC2)
镜像 `src/main/memory/` 先例 (非 asset-model 只读 IPC 域)。不进 scanner/watcher/search/health, 不持久化, 每次调用即时读盘 (数据量个位数目录, 无性能问题)。

**D5 — Codex 视角: 页面级标注** (→AC5)
agentView 切换器为遗留空挂 (01-ANALYSIS), 导航级条件显示无可工作机制。落地: 页头 subtitle + guide 明确 Claude Code 专属实验功能; empty 态说明 Codex 不适用。升级路径挂在 `docs/issues/2026-06-10-IMPROVEMENT-agent-view-store-vestige.md`。

**D6 — 旧路由语义恢复**: `/instructions/agent-teams` redirect 改指 `/teams` (→AC4)。

## 数据契约 (→AC2, AC3)

`src/shared/types/ipc.ts` 新增:

```ts
export interface AgentTeamMember {
  name: string
  agentId: string
  agentType: string            // 'team-lead' | subagent 类型 | 'general-purpose' …
  model?: string
  backend?: 'in-process' | 'tmux'   // 归一化: backendType ?? tmuxPaneId 推断; lead (空 paneId) 为 undefined
  prompt?: string
  color?: string
  joinedAt?: number            // epoch ms
}

export interface AgentTeamTask {
  id: string
  subject: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'unknown'  // 未知值容错归 unknown
  owner?: string
  blockedBy: string[]
}

export interface AgentTeamSummary {
  name: string
  description?: string
  dirPath: string
  createdAt: number | null     // config.createdAt, 缺失为 null
  lastActivityAt: number | null // max(config/inbox/task 文件 mtimeMs)
  leadAgentId?: string
  leadSessionId?: string
  leadSessionAvailable: boolean // handler 层经 runtime.getAsset(`session-{id}`) 判定 (AC8)
  members: AgentTeamMember[]
  tasks: AgentTeamTask[]
  inboxMessageCount: number
  lastInboxMessageAt: number | null
}

export interface AgentTeamListResult {
  teams: AgentTeamSummary[]    // lastActivityAt 降序, null 殿后
}
// IpcContract: 'teams:list': { args: []; result: AgentTeamListResult }
```

来源映射 (empirical schema 见 01-ANALYSIS):
- `~/.claude/teams/{name}/config.json` → name/description/createdAt/leadAgentId/leadSessionId/members[]。
- `~/.claude/teams/{name}/inboxes/*.json` → 消息计数 + 最新 timestamp (解析失败按 0/null 容错)。
- `~/.claude/tasks/{team-name}/{n}.json` → tasks (目录缺失/空 → [])。
- 跳过: 无 config.json 或 JSON 损坏的目录 (AC3); `.lock`/`.highwatermark` 等非 `{n}.json` 文件。

## 任务分类与 debt
- type / maintenance.subtype: feature / 不适用。
- source.kind / refs: docs-issues / 2026-06-03-BUG-agent-teams-runtime-state-classification.md。
- debt.estimate: 维持 5/2/3 (cross-process, medium, ui-ux+architecture, confidence medium) — design 未改变影响面认知。
- debt.final 预期: incurred 5 / repaid 2 / net 3; 若实现期发现 UI 面更薄可下调 incurred。
- revisions: explore 已记一笔 (confidence low→medium); design 无新增。
- Project 字段同步: 0.0-new 已 ensure; archive 时 done 同步 final。
- `pnpm harness:stats` total=20 (notice, <40), 无需 maintenance override 说明。

## 模块结构 / 组件拆分 (→AC1, AC2, AC4)

```
src/main/agent-teams/index.ts        新增: listAgentTeams(homeDir?) — 纯 fs 读取 + 归一化 + 排序
src/main/ipc/handlers.ts             新增: ipcMain.handle('teams:list') — 调 reader + leadSessionAvailable 富化
src/shared/types/ipc.ts              新增: 上述契约类型 + IpcContract 条目
src/preload/index.ts                 新增: api.teams.list()
src/preload/index.d.ts               新增: window.api.teams 类型
src/renderer/src/hooks/use-agent-teams.ts  新增: useAgentTeams() — 模块级缓存 + mount 时刷新 (useAgentCapabilityPlugins 同型, 无 snapshot 依赖)
src/renderer/src/pages/teams.tsx     新增: 页面 (四态 + 卡片列表)
src/renderer/src/components/layout/nav-config.ts  work 区追加 teams 项 (icon: Users/UsersRound)
src/renderer/src/App.tsx             新增 /teams 路由; RemovedAgentTeamsInstructionRedirect → Navigate to /teams (更名 AgentTeamsLegacyRedirect)
src/renderer/src/lib/feature-guidance.ts  新增 teamsGuide + 并入 allFeatureGuides
src/renderer/src/i18n/locales/{en,zh}.json  新增 nav.teams + teams.* 键
```

边界遵守: reader 仅 fs + 路径白名单两点 (AC1); 跨域 join (session 存在性) 只发生在 handler 层; renderer 不触 fs; 类型经 @shared。

## 界面质量与交互验收 (→AC5–AC9, AC11)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | PageChrome (title + subtitle 实验性标注 + guide + 无 search/无 toolbar); 内容区 `space-y` 单列 Accordion 卡片, 行密度对齐 sessions 卡片 (标题行 + chips + 相对时间); 展开区分三段: 概要 meta (描述/创建/目录/收件箱统计) → 成员列表 → 任务列表 | RTL 断言结构 + Electron 截图比对密度 |
| 组件选择 / 设计系统一致性 | 全部走 `@/components/ui`: Accordion/AccordionItem (splitted 风格对齐现有用法)、语义 Chip (memberCount=default, model=default/muted, recentlyActive=success, task status: pending=default / in_progress=primary / completed=success)、Button (flat, sm) 跳 lead session、EmptyState/ErrorState/LoadingState 共享组件; 图标 lucide Users | lint (无直接 @heroui import) + 截图 |
| 交互反馈 / 状态切换 | Accordion 展开动画走 HeroUI 内建 (motion token 一致); prompt 截断 line-clamp-2 + "展开/收起" 按钮; lead session 跳转为路由导航; hover/focus 沿用全局 ring | RTL: 展开/收起断言; 截图 hover 态不做 (非关键) |
| loading / empty / error / disabled / focus | loading=LoadingState(rows=3); empty=EmptyState(fullHeight, 标题+描述含启用方法 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 与 v2.1.32+ 与 Codex 不适用); error=ErrorState(onRetry=reload); leadSessionAvailable=false 时不渲染跳转按钮 (展示 session id 缩写文本, 无 disabled 死按钮) | RTL 四态全覆盖 (AC10) |
| 响应式 / 可访问性 / 键盘可达 | 单列布局天然响应式; AccordionItem 原生 aria-expanded/键盘可达; 相对时间元素加 title=绝对时间; prompt 展开按钮带 aria-label; chip 颜色沿用语义 token 保证对比度 | RTL 断言 title/aria 属性 |
| 文案 / i18n / 数字和路径格式 | en/zh 全键覆盖 (AC9); 相对时间用现有 `formatOptionalRelativeTime`; dirPath 等宽字体 (现有 path 展示惯例); 日期绝对值 toLocaleString; 不出现"running/活跃中"等强声明, 统一"近期活跃/最近活动" | i18n 键齐全检查 + 截图文案 review |

## 测试策略 (→AC10)

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| reader: 正常 team 字段映射 (name/desc/createdAt/lead/members backend 归一) | unit | tests/unit/agent-teams-reader.test.ts (新) | pnpm vitest run tests/unit/agent-teams-reader.test.ts | — |
| reader: 跳过缺 config / 坏 JSON 目录; teams 根目录缺失 → [] | unit | 同上 | 同上 | — |
| reader: tasks 解析 + 状态容错 + 缺失 → []; 非 {n}.json 文件忽略 | unit | 同上 | 同上 | — |
| reader: inbox 统计 + 缺失容错; lastActivityAt = max(mtime); 排序降序 null 殿后 | unit | 同上 | 同上 | — |
| IPC 契约类型对齐 (teams:list 进 IpcContract) | typecheck | — | pnpm typecheck | 类型层面由 tsc 把关, 无运行时分支 |
| handler leadSessionAvailable 富化 | unit | tests/unit/agent-teams-reader.test.ts 内联 (富化函数独立导出测试) | 同 reader | handler 仅一行注册 + 调富化函数, 函数级测试覆盖 |
| 页面四态 (loading/empty/error+retry/数据) | renderer | tests/renderer/teams-page.test.tsx (新) | pnpm vitest run tests/renderer/teams-page.test.tsx | — |
| 卡片内容: 成员/任务/近期活跃 chip 阈值/lead 跳转有无 | renderer | 同上 | 同上 | — |
| 旧路由 redirect → /teams | renderer | tests/renderer/app-routing.test.tsx (改) | pnpm vitest run tests/renderer/app-routing.test.tsx | — |
| 导航 work 区含 teams 项 | renderer | tests/renderer/teams-page.test.tsx 内 nav-config 断言 | 同上 | nav-config 是纯数据, 数组断言即可 |
| 视觉密度/一致性/文案 | manual | — | Electron 实测截图 (BUILD_ENV 坐标裁剪) | 主观视觉项, 用户已委托自主验收, 截图留档 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| D4 + 模块结构 reader | AC1, AC3 |
| 数据契约 + preload | AC2 |
| D2 + D6 + nav/路由 | AC4 |
| 界面表格 loading/empty/error 行 | AC5 |
| D1 + 文案行 | AC6 |
| D3 + 布局/组件行 | AC7 |
| leadSessionAvailable + 跳转按钮行 | AC8 |
| 文案/i18n 行 | AC9 |
| 测试策略全表 | AC10 |
| 截图 manual 行 | AC11 |

## 非目标 (范围外, 不做)
- mailbox 消息时间线展示 (v1 仅统计; 若后续有真实诉求再立 issue)。
- teams 进全局搜索 / Overview 集成 / watcher 实时刷新 (mount 级刷新已够个位数数据)。
- 导航级 Codex 视角隐藏 (挂 agent-view-store-vestige issue)。
- 读取/展示 `.lock`、`.highwatermark`、session-UUID 任务目录。
