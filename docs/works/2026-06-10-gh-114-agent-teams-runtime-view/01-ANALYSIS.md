# 需求分析 (Explore 产物)

## 现状理解

### 官方契约 (2026-06-10 检索 https://code.claude.com/docs/en/agent-teams)
- Agent Teams 是实验性功能, 默认关闭, 需 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (settings.json env 或环境变量), 要求 Claude Code v2.1.32+。
- 架构四件套: team lead (创建团队的主 session) / teammates (独立 Claude Code 实例) / shared task list / mailbox。
- 存储: team config `~/.claude/teams/{team-name}/config.json`; task list `~/.claude/tasks/{team-name}/`。无项目级等价物 (`.claude/teams/` 不被识别)。
- **生命周期 (设计判据)**: 官方声明两个目录"仅在 team 活跃期间存在, cleanup 或 session 结束时删除"; 但同页 troubleshooting 承认 cleanup 不可靠 (orphaned tmux sessions / task status can lag / lead 提前结束)。本机实测 5 个遗留 team 目录 (mtime 2/25–6/3, 今天 6/10, 无一活跃) 证实**遗留是常态**。
- config 含 session IDs / tmux pane IDs 等运行时状态, 官方明确"勿手写、勿预创建, 会被覆盖"; 可复用角色应使用 subagent definitions。
- hooks: TeammateIdle / TaskCreated / TaskCompleted (GH-94 已保留, 不在本任务范围)。

### 本机数据形态 (empirical; 官方未公开字段级 schema, 以下为实测样本)
- `config.json`: `{name, description, createdAt(epoch ms), leadAgentId, leadSessionId, members[]}`; member: `{agentId, name, agentType, model, prompt, color?, planModeRequired?, joinedAt, tmuxPaneId(''|'in-process'|tmux id), cwd, subscriptions[], backendType?('in-process')}`。lead 也在 members[0] (agentType: 'team-lead', 无 prompt)。
- `inboxes/{member-name}.json`: 消息数组 `{from, text, timestamp(ISO), type('message'), read(bool)}`; 仅 2/5 团队存在。
- `~/.claude/tasks/{team-name}/`: 任务文件 `{n}.json` = `{id, subject, description, activeForm, status('pending'|'in_progress'|'completed'), blocks[], blockedBy[], owner?}` (schema 取自同一任务系统的 session 任务目录样本 8b56c88a; 遗留 team 任务目录常只剩 `.lock`/`.highwatermark`, **任务数据缺失是常态**)。
- 边界样本: `f618f03e-…` 目录只有 `inboxes/` 无 config.json (清理残骸)。
- 命名共存: `~/.claude/tasks/` 同时存放 session 任务 (UUID 目录) 与 team 任务 (team-name 目录), 只能按 team name 定向读取, 不可枚举推断。

### Berth 现状 (GH-94 之后)
- 静态资产面已全部移除: 无 `team` AssetType、无 scanner、无导航入口、无 i18n 残留; 仅剩 `src/renderer/src/App.tsx:51` `/instructions/agent-teams` → `/instructions/subagents` 的 redirect。
- 导航 IA (`components/layout/nav-config.ts`): `work` 区当前只有 Sessions (`/sessions`); Teams 若展示, IA 归属即此区 (运行时协作记录与 Sessions 同心智)。
- Session 资产 id = `session-{sessionId}` (claude parsers `parseSessionMeta`), 故 `leadSessionId` 可直接拼出 session 详情路由 `/sessions/session-{uuid}` (该 session JSONL 仍存在时)。
- IPC 模式: `src/main/ipc/handlers.ts` 注册, 契约在 `src/shared/types/ipc.ts`, preload `src/preload/index.ts` 暴露 `window.api.*`。**`src/main/memory/` 是"非 asset-model 的只读按需 IPC 域"现成先例** (listMemory) — teams 读取应同型, 不回灌 asset model (否则重蹈 GH-94 撤销的建模错误)。
- 渲染层数据 hook 模式: `use-ipc.ts` (`useSessionDetail` 简单按需取数 / `useSessions` SWR 缓存)。teams 数据量极小 (个位数目录), 按需取数即可, 不需要 SWR/watcher/runtime 集成。
- 共享 UI: `EmptyState`/`ErrorState`/`LoadingState`、`Chip`、PageChrome + feature-guidance (sessions 有 `sessionGuide` 先例)。i18n: `src/renderer/src/i18n/locales/{en,zh}.json`。
- **agentView 是遗留空挂**: `stores/app.ts` 有 `agentView: 'all'` + setter, 全应用 7 处消费, 但 **setter 无任何调用点** — 全局 agent 切换器已在历史重构中移除, agentView 恒为 'all'。结论: "Codex 视角隐藏导航入口"在导航层暂无可工作机制, 本任务以页面级 agent 标注 + 空态说明落实该验收意图; 旁支发现已记 `docs/issues/2026-06-10-IMPROVEMENT-agent-view-store-vestige.md`。

## 关联与依赖
- 主进程新增只读 reader (新模块, 参照 `src/main/memory/` 形态) → IPC handler → preload → renderer hook → 页面 + 导航 + 路由 + i18n。
- 不触及: asset model / scanner / runtime / watcher / search / health。
- 安全约束 (docs/ARCHITECTURE.md 硬边界): 只读用户配置 ✓ (纯读取); 路径范围新增 `~/.claude/teams` 与 `~/.claude/tasks/{team-name}` 两个只读点; member prompt / 消息文本与 session transcript 同密级 (本地展示, 不出本机), 无凭证内容。
- 与 GH-94 的衔接: `/instructions/agent-teams` redirect 目标从 `/instructions/subagents` 改为新视图 (旧链接语义即"看 teams")。

## 任务分类与 debt 校准
- type / maintenance.subtype: feature / 不适用。
- source.kind / refs: docs-issues / `docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md` ✓。
- debt estimate 修正: incurred/repaid/net 维持 5/2/3; scope 维持 cross-process; risk 维持 medium (新增面虽隔离, UI 新面验收成本计入); areas 维持 ui-ux+architecture。
- confidence: low → medium (官方契约 + 本机数据形态均已钉死)。
- revision: 已追加 debt.revisions[] (explore, confidence 校准)。

## 验收标准 (verify 据此核对)
1. 主进程新增只读 teams reader: 仅读 `~/.claude/teams/*/config.json`、`~/.claude/teams/*/inboxes/*.json`、`~/.claude/tasks/{team-name}/*.json`; 无写入、无 watcher、不进 asset model/scanner/search。
2. IPC 契约 `teams:list` 落 `src/shared/types/ipc.ts`, preload 暴露 `window.api.teams.list()`; 返回按 lastActivityAt 降序的 team 记录数组, 字段含 name / description / createdAt / lastActivityAt / lead (agentId, sessionId) / members[] (name, agentType, model, backendType, prompt) / tasks[] (id, subject, status, owner?, blockedBy) / inbox 统计 (messageCount, lastMessageAt) / dirPath。
3. 仅含可解析 `config.json` 的目录入列; config 缺失或 JSON 损坏的目录跳过且不致错; tasks / inboxes 缺失时对应字段为空集合而非报错。
4. 导航 `work` 区新增 Agent Teams 入口 (Sessions 之后), 新路由 `/teams`; `/instructions/agent-teams` redirect 改指 `/teams`; teams 不进全局搜索索引 (非 asset)。
5. 页面四态齐全: loading / error (可重试) / empty / 数据。empty 态完成三件事: 解释 Agent Teams 是什么、如何启用 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` + v2.1.32+)、明确这是 Claude Code 专属实验功能 (Codex 不适用)。
6. 运行时定性诚实: 页头标注"实验性 · Claude Code 运行时生成 · 勿手写"; 不声称 team 当前活跃; 以 lastActivityAt 相对时间呈现近期性, 仅当活动时间在阈值内 (SPEC 定值) 才显示"可能活跃"弱信号。
7. team 卡片信息架构: 名称、描述、成员数、创建/最近活动相对时间、lead 模型; 可展开成员明细 (名称/agentType/模型/backend/prompt 可截断展开) 与任务清单 (含状态与依赖提示); 任务缺失显示说明文案而非空表格。
8. leadSessionId 对应 session 资产存在时提供"打开 lead session"跳转 (`/sessions/session-{uuid}`); 不存在时不渲染死链接 (展示无跳转的 session id 缩写)。
9. i18n en/zh 双语全覆盖, 无硬编码用户可见文案。
10. 测试: reader 单测覆盖 正常/缺 config/坏 JSON/含 tasks/含 inboxes/排序; IPC 契约类型对齐; 页面测试覆盖四态 + redirect 更新; 全部 gates (typecheck/lint/test) 绿。
11. UI 验收: Electron 实测窗口截图 (按 BUILD_ENV 实测坐标裁剪), 覆盖列表态与空态; 视觉符合现有设计系统 (HeroUI v2 + ui/ primitive, 复用 Chip/EmptyState 等)。

## 界面质量与交互验收 (现状记录)
- 页面骨架: PageChrome (标题/描述/guide/actions) + 内容区; sessions 页是 work 区基准 (toolbar 状态槽 + VirtualGroupedList + CategoryJumpNav — teams 数据量小, 不需要虚拟化与跳转导航)。
- 设计系统: `components/ui` 唯一 primitive 入口 (HeroUI v2); 语义 Chip 有现成 variant; EmptyState 有 PAGE_EMPTY_FILL 布局常量。
- 信息密度: sessions 卡片密度为基准 (标题行 + 元数据行 + chips); teams 卡片同密度, 展开态承载 prompt/任务等重内容。
- 用户路径: 侧边栏 work 区进入 → 扫卡片 → 展开看成员/任务 → 跳 lead session 深查。空态路径: 理解功能 → 看到启用方法。
- 可见状态: loading、empty、error+retry、数据、卡片展开/收起、prompt 截断/展开。
- 交互反馈: 展开走 ui/motion token; 跳转为标准路由导航; focus ring 沿用全局。
- 响应式: 与 sessions 同栅格策略 (单列卡片, 宽屏不强制多列)。
- 可访问性风险: 展开区需 aria-expanded; 相对时间需 title 提供绝对时间; chips 语义色沿用现有 Chip 保证对比度。

## 未决问题
- 无阻塞项。用户已委托 UX 决策权 ("从用户体验角度出发做最优设计和实现并落地"), 方案取舍 (展示口径/IA 位置/详情形态) 在 02-SPEC 给出结论与依据, 不回询。

## 旁支发现 (已按不变量 10 记录)
- `docs/issues/2026-06-10-IMPROVEMENT-agent-view-store-vestige.md`: agentView 全局状态有消费无生产者, 切换器已被历史重构移除, 7 处消费点恒收 'all'。
