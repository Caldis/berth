# 需求分析 (Explore 产物)

## 现状理解

### 列表页 (`src/renderer/src/pages/sessions.tsx`, 385 行)

- 数据: `useSessions({ projectPath })` → IPC `sessions:list` → runtime `listSessions`; SWR 缓存 30s TTL (`hooks/cached-resource.ts`), 本地有数据时立即展示后台刷新。
- 呈现: 左侧 `CategoryJumpNav` (分组跳转) + 右侧 `VirtualGroupedList` (react-virtuoso GroupedVirtuoso)。
- 分组: project (`lib/session-location-groups.ts`, 含 root/current-project/named-project/unknown 五类 kind 与父目录两级标签) / date (页内 `buildSessionGroups`) 二选一, 由 page-chrome actions 里的小 Tabs 切换。
- 行布局 (`SessionRow`): 标题 + 相对时间 + 时长 | 右侧固定宽列: Agent chip (Claude/Codex), skills 计数 chip, MCP 计数 chip, cost, `TokenSparkBar`, model chip。
- 检索: page-chrome 搜索框是**页内过滤** (title/project/projectPath/model 子串匹配, useDeferredValue); 与全局 Ctrl/⌘K search-dialog 是两类契约, 互不影响。**没有** agent/model/日期范围/费用等结构化筛选, 没有排序控制。
- 状态: loading (skeleton LoadingState) / error (ErrorState+retry) / 空态与无结果态分开 / stale 刷新指示器 (toolbar status slot)。

### 详情页 (`src/renderer/src/pages/session-detail.tsx`, 1594 行单文件)

- 数据: `useSessionDetail(id)` → IPC `sessions:get` → `buildSessionDetail` (engine/session-detail.ts); **无缓存**, 每次进入重新解析整个 JSONL。
- 顶部 tab: **已经是 HeroUI Tabs**, 但 `variant="light"` + `cursor: 'hidden'` + 自绘 grid 卡片样式 (`SessionTabTitle` 含图标/描述/计数), 完全不是 heroui 原生形态。三个 tab: overview / timeline / artifacts。
- timeline tab = `ToolTimeline`: 仅工具调用事件 (`SessionToolEvent[]`), 自绘竖线时间轴 + 状态图标 + duration 阈值 range slider (`.duration-filter-range` 专属样式, globals.css:196-243) + all/failed 过滤。**没有用户消息、助手消息、thinking、逐事件 payload**。
- overview tab: SessionSummaryPanel (meta 卡) + SessionSignalsPanel (7 个指标) + LoadedAssetsPanel (skills/mcp/hooks 折叠节)。
- artifacts tab: plans/todos/files/checkpoints 折叠节。
- 页内大量手写 hover-popover (ModelBadge、SignalMetric explanation、ToolTipButton) 未用 HeroUI Tooltip/Popover。

### 数据层 (重放可行性核心)

- IPC 通道仅两条: `sessions:list` → `SessionListResult`; `sessions:get` → `SessionDetailResult | null` (一次性全量, 无分页/流式)。类型在 `src/shared/types/ipc.ts` (SessionToolEvent: ipc.ts:118-132)。
- 解析链: `buildSessionDetail` (engine/session-detail.ts:15-40) → per-agent `parseClaudeSessionDetail` (adapters/claude-code/session-detail.ts:35-132) / `parseCodexSessionDetail` (adapters/codex/parsers.ts:523-637)。
- **JSONL 原始数据里有但被解析层丢弃的** (重放缺口):
  1. 用户消息正文 (Claude `type:'user'` 行 message.content; Codex `event_msg`/`response_item` message)。
  2. 助手消息正文文本块 (仅 `tool_use` 块被提取)。
  3. thinking 块内容。
  4. 消息级 timestamp (JSONL 每行有 timestamp, 当前仅 tool 事件保留)。
  5. 单条消息 token usage (`message.usage`, 当前只聚合成总数)。
- 工具事件已有 per-event `startedAt/endedAt` (ISO8601, 来自 JSONL 行 timestamp), callId 配对; Codex 另有精确 durationMs。
- 性能边界: scan 在 worker 线程, 但 `sessions:get` 的 detail 解析在**主进程主线程同步执行且无缓存**; 重放要求全量事件正文, 大 transcript (几万行) 风险放大。`AssetFileCache` (path+size+mtimeMs) 已用于 session meta, detail 未接。

### 设计系统现状

- `components/ui` 已 re-export: Tabs/Tab, Table 族, Select, Slider, Input, Listbox, ScrollShadow, Tooltip, Popover, Kbd, Dropdown, Chip(自定义 composite) 等 — 重设计所需组件全部就位, 页面只准从 `@/components/ui` 引入。
- HeroUI v2 Tabs 官方契约 (https://v2.heroui.com/docs/components/tabs, 2026-06-11 检索): variant `solid|bordered|light|underlined` (默认 solid), color/size/radius/placement/isVertical/fullWidth, `destroyInactiveTabPanel` 默认 **true**, slots `base|tabWrapper|tabList|tab|tabContent|cursor|panel`, Tab 支持富 `title` 与 `href`, 键盘 `keyboardActivation: automatic|manual`, cursor 动画依赖 framer-motion (disableCursorAnimation 可关)。
- 强调色体系 7 色 (`data-accent`), HeroUI `--heroui-primary` 与 berth `--primary` 同源驱动。

## 关联与依赖 (blast radius, 按符号边界)

**列表页重构波及**:
- `pages/sessions.tsx` (主体)
- `components/sessions/category-jump-nav.tsx` / `asset-count-chip.tsx` / `token-spark-bar.tsx` (仅 sessions.tsx 引用)
- `lib/session-location-groups.ts`、`lib/virtual-list-model.ts` (后者同被 instructions.tsx 与 memory-view.tsx 经 VirtualGroupedList 使用 — **共享件, 改 API 需同批顾及两处**)
- 测试: `tests/renderer/sessions-pages.test.tsx` (1154 行, mock GroupedVirtuoso)、`session-location-groups.test.ts`、`asset-count-chip.test.tsx`、`use-sessions-swr.test.tsx`
- i18n: `sessions.*` 命名空间 (en/zh 对称)

**详情页重构波及**:
- `pages/session-detail.tsx` (全部)
- `styles/globals.css` `.duration-filter-range` (timeline 专属)
- 数据层 (若做重放): `src/shared/types/ipc.ts` + preload 派生 + `tests/setup.ts` mock (IPC 四方对账强制) + `adapters/claude-code/session-detail.ts` + `adapters/codex/parsers.ts` + `engine/session-detail.ts` + `hooks/use-ipc.ts`
- 测试: `tests/unit/session-detail.test.ts`、`codex-session-parser.test.ts`、`session-meta-parser.test.ts`、`tests/renderer/sessions-pages.test.tsx`、`session-error.test.tsx`

**不波及**: overview.tsx recent sessions (独立行渲染, 仅共享 SessionSummary 类型); 全局 search-dialog; teams/usage/capabilities。

## 任务分类与 debt 校准

- type: feature (重放是新能力; 列表/tab 重设计是改进)
- source.kind: user-request; refs: GH-116
- debt estimate 修正: 重放需要跨 shared 类型 → adapters 解析 → engine → IPC 四方 → renderer 的纵向切面, scope 从 module 升 **cross-process**; incurred 5→8 (新事件模型 + 重放交互态), repaid 2→3 (替换自绘 tab/hover-popover 为 HeroUI 原生, 删 timeline 专属 CSS, detail 接缓存还性能债), net 3→5; risk 保持 medium (有 IPC 四方对账与既有测试网兜底); areas [ui-ux] 保持 (主交付是 UI), confidence low→medium。
- revision: 已追加 INDEX `debt.revisions[0]` (explore, 2026-06-11)。

## 验收标准

1. 列表页提供面向检索的结构化筛选: 至少 agent、时间分组/排序、文本过滤可组合使用; 过滤结果计数可见; 清除路径明确。
2. 列表页信息架构重构后, 用户路径"找到某项目最近的某次会话并打开"≤ 3 次交互; 虚拟化在大量会话下仍生效 (复用 react-virtuoso 或等价)。
3. 详情页顶部 tab 使用 HeroUI Tabs 原生形态 (可见 cursor 动画、官方 variant 之一), 不再 `cursor: hidden` 自绘卡片; 键盘左右键可切换且 ARIA 合规 (组件自带)。
4. 详情页时间线重构为会话重放视图: 事件流包含 user/assistant/thinking/tool/result 等类型徽章 + 单行摘要 + 相对会话起点的时间戳; 选中事件右侧显示详情面板 (含原始 payload); 有时间轴 scrubber 可定位; 有事件类型过滤与搜索。
5. 重放数据链路: 新增/扩展 IPC 暴露完整事件流 (含消息正文、thinking、逐事件 timestamp), IPC 四方对账测试 (handlers/preload/IpcChannels/setup mock) 全绿; Claude 与 Codex 两 agent 的 transcript 都能重放。
6. 性能: 大 transcript 详情打开不阻塞 UI 可感知卡死; detail 解析结果有缓存 (同 fingerprint 不重复解析); 事件列表虚拟化。
7. 既有信息不回退: overview/artifacts tab 信息保留 (形式可变); 列表行原有字段 (agent/skills/mcp/cost/token/model) 在新布局中仍可见或有明确去处。
8. 全部状态覆盖: loading/empty/error/无结果/stale 各态在两页齐备; i18n en/zh 对称; 测试 (unit + renderer) 更新且 `pnpm harness:prepush` 绿。
9. UI 视觉验收: 按 _shared.md 不变量 22, 截图实测 (electron 实测窗口坐标), 主观布局项请用户确认。

## 界面质量与交互验收 (现状基线)

- 设计系统: HeroUI v2 经 `components/ui` 单一入口; 页面密度中等偏密 (列表行 56px); 暗/亮主题 + 7 强调色需全部跟随。
- 主要用户路径: 边栏[会话] → 列表 (滚动/分组跳转/文本过滤) → 行点击 → 详情 (tab 切换 → timeline 滑块过滤)。
- 现存交互债: 详情页手写 hover-popover ×3 处 (无 focus 管理、无碰撞翻转, 未用 HeroUI Tooltip/Popover); timeline range slider 为原生 input 自绘样式; tab 自绘卡片无 cursor 动画。
- 响应式: 列表行右列在 sm/md/lg 逐级隐藏; 详情 tab grid sm:grid-cols-3; 重放视图需定义 <lg 时详情面板的折叠策略 (参考截图为双栏, 窄屏需降级)。
- 可访问性风险: 自绘 hover-popover 不可聚焦内容; range slider aria 已有但视觉对比度未验; 新事件流列表需键盘可导航 (↑↓ 选中事件)。

## 未决问题 (留给 design 澄清)

1. **详情页 tab 形态**: HeroUI Tabs 已在用但被自绘成卡片。倾向方案: 改回官方原生形态 (solid 或 underlined + cursor 动画), 保留计数徽章于 title。需用户选 variant 偏好 (影响验收标准 3)。
2. **重放视图与现有 timeline 的关系**: 参考截图有 Transcript/Debug 双视图。berth 是只读产品 (无"给 agent 发消息"输入框)。替换现有 timeline tab 为 Replay (含事件流+scrubber+详情面板), 还是 timeline/replay 并存? 倾向: 替换 (工具时间轴是重放事件流的子集, 可用类型过滤还原)。
3. **列表页重构形态**: 候选 A) 保留分组虚拟列表 + 增加结构化 filter bar (agent/model/排序/时间); B) Table 化 (列可排序); C) 平铺密集行 + faceted 过滤。agentic 视角倾向 A (项目分组是多 agent 并行开发的心智模型), 但需用户确认。
4. **重放数据传输策略**: 全量事件一次 IPC vs 分页/分块。大 transcript 正文体积可能数 MB; 倾向: 一次返回事件索引(轻) + 按需取单事件 payload(重), 或全量但接 AssetFileCache。design 阶段定。
5. signals/overview 信息是否按截图风格整合进重放头部 (agent 名+状态+元信息行), 还是保持独立 overview tab。
