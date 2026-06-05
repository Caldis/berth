# 需求分析 (Explore 产物)

会话列表重设计: 把 `sessions.tsx` 右侧列表从手写元素升级为 HeroUI 组件化, 暴露已采集但未展示的有效数据, 提升扫读效率与交互反馈。

## 现状理解

进程链路: renderer `useSessions({agentView, projectPath})` (`@/hooks/use-ipc`) → IPC → main adapters (`src/main/adapters/claude-code/parsers.ts`、`src/main/adapters/codex/parsers.ts`) → `SessionSummary[]`。列表纯 renderer 渲染, 不涉及 main 改动。

核心文件 `src/renderer/src/pages/sessions.tsx` (346 行):
- 页面容器: 筛选输入 (`useDeferredValue`)、分组切换 (project/date)、`CategoryJumpNav` 左锚、`VirtualGroupedList` 右列。
- `buildSessionGroups`: project 分组委托 `buildSessionProjectGroups` (`@/lib/session-location-groups`), date 分组本地按 `startedAt` 归并。
- `SessionRow` (296-346): **全手写 `button` + `span` + lucide 图标 + tailwind, 未使用任何 HeroUI / `@/components/ui` 组件**。当前展示字段:
  - 主区: `title` (truncate)、相对时间 (`Clock`)、`duration`。
  - 右区: agent 标识 (手写 `border` span, 仅 `agentView==='all'` 显示)、`cost` (`Coins`)、token (`TokenUsageDisplay` compact)、`model` (手写 `bg-primary/10` span)。
- 分组头 (`renderGroup` 209-226): `FolderOpen` + 组名 + 父路径副标题 + 右侧 count, 手写卡片样式。

虚拟列表 `VirtualGroupedList` (`@/components/shared/virtual-grouped-list`): 封装 react-virtuoso `GroupedVirtuoso`。`defaultItemHeight={72}` 当前传入。`renderItem` 提供 context (`isFirstInGroup`/`isLastInGroup` 等)。

## 关联与依赖

**数据契约** `SessionSummary` (`src/shared/types/asset.ts:142`):
- 已展示: `title`、`startedAt`、`duration`、`agentId`、`cost`、`tokenUsage`、`model`。
- **已采集但未展示** (本任务核心抓手): `skillsUsed: string[]`、`mcpServers: string[]`、`hooksFired: number`、`tokenUsage` 细分 (input/output/cacheRead/cacheCreation/reasoning/unknown)、`endedAt`、`transcriptPath`。
- 注意: 列表用 `SessionSummary` (字符串数组), 详情页用 `SessionDetailResult` (Asset 对象, 带 scope/error)。列表行无 scope/signals 数据, 除非扩 IPC (本任务不扩)。

**设计系统** `@/components/ui` (`index.ts`, GH-105 建立):
- 唯一 import 面, re-export 全套 HeroUI primitives (Button/Card/Tooltip/Badge/Avatar/AvatarGroup/Accordion/ScrollShadow/Skeleton/Divider/Kbd 等)。**规则: 页面只能从 `@/components/ui` import, 禁止直接 `@heroui/react`**。
- `Chip` 是 berth 语义封装 (`tone`: neutral/primary/success/warning/danger, 默认 flat/sm/sm)。已被 scope-badge/cost-source-badge/session-detail/settings-dialog 使用。
- **`Progress` 未 re-export** — 若用进度条, 需在 index.ts 补 export, 或复用 `TokenUsageDisplay` 现成的手写 bar。

**可复用组件**:
- `TokenUsageDisplay` (`@/components/shared/token-usage-display`): `compact` (单行 inline) / `detail` (大数字 + 进度条 + legend, 段色取 `TOKEN_SEGMENT_COLOR_VAR`)。
- `CategoryJumpNav` (89 行): 已是干净实现 (lg:sticky 左 rail, w-48, heading+button+count)。属右侧区但非重点, 保留风格。

**详情页展示参考** (`session-detail.tsx`):
- 图标语义已建立 — Skills=`Sparkles` 蓝 / MCP=`Plug` 绿(错误红) / Hooks=`Zap` 黄。列表行复用同套语义保持一致。
- `ModelBadge` (657+): model chip + hover tooltip 展示 pricing/provider/release/cutoff。列表 model chip 可升级为带 Tooltip 版本。
- `SessionSummaryPanel`: MetaItem 4 列网格 (Duration/Cost/Tokens-detail/Time)。

**外部库行为** (规则 9, context7 `/petyosi/react-virtuoso` 确认, 高置信): Virtuoso **零配置支持可变行高**, 自动测量并响应内容/高度变化, 无需额外配置 ("automatically handles any changes of items' heights")。`defaultItemHeight` 仅为初始估算, 非固定高度。结论: **行高可自由调整**, 但实践上保持统一以稳定扫读节奏与滚动条精度; 调整布局后同步更新 `defaultItemHeight`。

**设计 token** (`globals.css`): HSL 变量 + accent 切换 (blue 默认 / violet / emerald / amber); `--radius: 0.875rem`; **categorical palette `--chart-1..5` (blue/green/amber/violet/pink), 注释指定用于 "token segments, breakdown rows"** — 即多类数据可视化调色板。

## 任务分类与 debt 校准
- type: feature (确认; redesign + 暴露新数据, 与 GH-105 同类)。
- source.kind: user-request / refs: GH-108。
- scope: module (主改 `sessions.tsx`; 可能新增 1-2 个小展示组件 + `ui/index.ts` 补 Progress export + i18n 文案)。
- risk: low-medium (虚拟列表可变高度已官方确认, 行高风险解除; 剩余风险为信息密度平衡、Claude/Codex 字段差异分支、空值占位)。
- areas: ui-ux。
- debt estimate: incurred=4 / repaid=2 / net=2 维持; confidence low→medium。
- revision: 追加 explore 条 (net 不变, risk medium→low-medium, confidence low→medium, rationale 细化)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

**组件化**
1. `SessionRow` 与分组头改用 `@/components/ui` 的 HeroUI 组件 (Card/Chip/Tooltip 等), 不再出现手写 agent badge / model chip / 边框 span; 不直接 import `@heroui/react`。
2. agent 标识、model chip 收敛到语义 `Chip` (接续 GH-105 badge 统一)。

**数据可视化 (可见字段审计)**
3. 保留并清晰呈现现有字段: `title`、相对时间、`duration`、`cost` (Codex 为 null 时显示占位而非 0/报错)、token、`model`、agent。
4. 新增展示 `skillsUsed` (至少 top-N + 溢出计数), 有值才显示, 空数组不占位。
5. 新增展示 `mcpServers` (至少 top-N + 溢出计数), 有值才显示, 空数组不占位。
6. token 在列表行提供细分可视化 (input/output 至少, 复用段色), 不只总量。
7. `hooksFired` / cache / reasoning 等低有值率字段: 默认不进列表行主区 (避免 80%+ 空占位); 如展示须 conditional 且不破坏密度。
8. Claude 与 Codex 会话差异正确处理: Codex 无 `cost`、`skillsUsed` 有值率低 — 渲染分支不报错、不显示误导性 0。

**易用性与状态**
9. 行信息层级清晰 (主标题 > 元数据 > 标签), 扫读时主信息一眼可得。
10. 行 hover / focus-visible / 键盘可达 (列表项可 Tab + Enter 打开详情), 点击仍导航到 `/sessions/:id`。
11. 加载态 (`LoadingState`)、空态 (无会话 / 筛选无结果, 区分文案)、刷新态 (`toolbarStatus`) 保留且与新设计协调。
12. 行高调整后同步更新 `defaultItemHeight`; 虚拟滚动、jump-nav 定位、分组吸顶不回归。

**质量门禁**
13. typecheck / lint / 相关单测通过; 新增展示逻辑 (top-N 截断、空值分支、token 细分) 有单测覆盖。
14. dark / light + 至少一个非默认 accent 下视觉正确 (Electron 实测截图)。

## 界面质量与交互验收

- **现有页面结构**: 页头 (标题+分组切换+搜索+guide) 由 `usePageChrome` 注入; 主区左 jump-nav + 右虚拟分组列表; 行为扁平卡片 (border + bg-card, 组内首尾圆角)。
- **设计系统用法**: 页面层几乎未用 HeroUI (手写 tailwind 为主); DS 层 (`@/components/ui`) 已就绪但 sessions 页未消费 — 本任务正是补齐。
- **信息密度**: 当前行 72px, 右区 4 项元数据横排, 中等密度; 标题区有留白可承载一行副标签 (skills/mcp)。
- **主要用户路径**: 扫读会话 → 按 project/date 跳转 (jump-nav) → 筛选 → 点击行进详情。重设计不得增加点击成本或破坏跳转。
- **可见状态**: 已有 loading/empty/no-results/refreshing; 缺 hover 之外的行级强调 (如 agent 色彩区分)。
- **交互反馈**: 当前仅 `hover:bg-accent/5`; focus-visible 依赖原生 button。HeroUI 化后须保留等价或更强反馈, 且 focus ring 走 `--ring`。
- **响应式**: `max-lg:flex-col` 下 jump-nav 转横向滚动条; 行右区在窄宽需考虑换行/截断, 不溢出。
- **可访问性**: 行是 `button` (语义正确); 新增 chip 群需 `aria-label` 或 title; 颜色不作唯一信息载体 (agent/skill 区分要有文本/图标)。

## 未决问题
留给 design 向人澄清 (brainstorming ≤3 问, 均影响方案):
1. **信息密度取向**: 单行高密度 (≈64px, 横排塞满) / 双行中密度 (≈88-96px, 标题行 + 元数据行) / 卡片式 (≈120px, 最丰富)? 影响行高、虚拟列表估算、可承载字段量。
2. **新字段优先级**: skills 与 mcp 是否都进列表行? token 细分用 inline 文字还是 mini bar? hooksFired 是否完全不进列表 (本机样本佐证多为 0)?
3. **行内可视化 vs 悬浮展开**: 丰富信息直接铺在行内 (增高), 还是主行精简 + hover Tooltip/Popover 展开细节 (省高度、保密度)?
