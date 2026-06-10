# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (单链路: 类型 → main → IPC → renderer → 验收; 文件依赖前后衔接, 不并行)。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] T1 共享契约 + reader: `src/shared/types/ipc.ts` 新增 AgentTeam* 类型与 `teams:list` 契约; 新建 `src/main/agent-teams/index.ts` (listAgentTeams + leadSessionAvailable 富化函数 markLeadSessionAvailability)
  - tests: tests/unit/agent-teams-reader.test.ts — 字段映射 / 跳过缺 config 与坏 JSON / teams 根缺失→[] / tasks 容错 / inbox 统计 / lastActivityAt=max(mtime) / 降序 null 殿后 / backend 归一 / 富化函数
  - verify: pnpm vitest run tests/unit/agent-teams-reader.test.ts + pnpm typecheck (非 UI 项, 界面验收不适用)
- [ ] T2 IPC + preload: handlers.ts 注册 `teams:list` (reader + runtime.getAsset 富化); preload index.ts + index.d.ts 暴露 window.api.teams.list
  - tests: 契约由 typecheck 把关 (SPEC 测试策略表已声明理由: handler 为一行注册, 富化函数已在 T1 单测)
  - verify: pnpm typecheck + pnpm lint (非 UI 项, 界面验收不适用)
- [ ] T3 renderer 数据层 + 页面四态: use-agent-teams.ts hook (模块缓存 + mount 刷新); pages/teams.tsx 骨架 (PageChrome title/subtitle/guide + loading/empty/error/数据四态); feature-guidance.ts teamsGuide; i18n en/zh 键
  - tests: tests/renderer/teams-page.test.tsx — 四态 (loading / empty 含启用文案断言 / error+retry 调 reload / 数据渲染 team 名)
  - verify: 页面测试绿 + 界面验收项: empty 态完成"是什么/如何启用/Codex 不适用"三件事 (AC5), subtitle 实验性标注 (AC6), 文案无硬编码 (AC9)
- [ ] T4 路由 + 导航 + redirect: App.tsx /teams 路由 + 旧 redirect 改指 /teams; nav-config work 区追加 teams 项 (Users 图标)
  - tests: tests/renderer/app-routing.test.tsx 改 redirect 断言; teams-page.test.tsx 加 nav-config work 区断言
  - verify: 两个测试文件绿 + 界面验收项: 侧边栏 work 区出现 Agent Teams 且高亮规则正常 (AC4)
- [ ] T5 卡片明细 UI: Accordion 卡片 (标题行 chips: 成员数/lead 模型/近期活跃≤5min; 相对时间+title 绝对时间) + 展开区 (描述/创建/dirPath mono/inbox 统计 → 成员列表: color dot/agentType chip/model/backend chip/prompt line-clamp-2 展开按钮 → 任务列表: 状态 chip/owner/blockedBy 提示/缺失说明文案) + lead session 跳转按钮 (leadSessionAvailable 才渲染)
  - tests: teams-page.test.tsx 补卡片断言 — 成员/任务渲染、recentlyActive 阈值 (新旧 lastActivityAt 两例)、lead 跳转按钮有无两例、prompt 展开/收起、aria-expanded/title 属性
  - verify: 测试绿 + 界面验收项: 密度对齐 sessions 卡片、chip 语义色、Accordion 键盘可达、无 disabled 死按钮 (AC7, AC8, 可访问性行)
- [ ] T6 verify 收口: 全量 gates (typecheck/lint/test) + Electron 实测截图 (列表态 + HOME 覆写空态) + 验收标准 AC1–AC11 逐条核对 + ARCHITECTURE.md 补 agent-teams 模块条目
  - tests: pnpm test 全量
  - verify: AC 全过 + 截图留档 docs/works/{task}/assets/ + harness:check

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
