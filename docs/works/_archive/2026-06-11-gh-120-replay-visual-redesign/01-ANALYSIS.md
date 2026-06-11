# 需求分析 (Explore 产物)

## 现状理解

重放模块 = 会话详情页 (`pages/session-detail.tsx`) Replay tab 下的事件流视图, GH-116 落地。数据链路 (本任务不动):

- **main**: `engine/session-replay.ts` `buildSessionReplay` — per-agent 解析 (`adapters/claude-code|codex/session-replay.ts`) + 指纹缓存 + `REPLAY_EVENT_CAP = 20_000` (超出取最近一段, `truncated`); `readSessionReplayEventPayload` 按事件 id → JSONL 行按需反查。
- **IPC**: `sessions:events` → `SessionReplayResult { startedAt, endedAt, events[], totalEvents, truncated }`; `sessions:event-payload` → 单行原始 JSON。`SessionReplayEvent { id, kind, timestamp, summary, toolName?, status?, tokens?, sidechain? }`, kind 7 种: `user | assistant | thinking | tool | result | model | system`。
- **renderer** (`components/sessions/`):
  - `session-replay.tsx` — 主视图: 控制行 (kind 多选 Select + 搜索 Input + 计数) → `ReplayScrubber` → 虚拟化事件列表 (react-virtuoso, 36px 行) + 右侧 `ReplayDetailPanel` (固定 `lg:w-[400px] xl:w-[440px]`)。视图状态 (`SessionReplayViewState { selectedEventId, kindFilter, searchQuery }`) 提升到页面层防 tab 切换丢失。payload 组件内 Map 缓存。
  - `replay-scrubber.tsx` — **现时间轴**: DOM 绝对定位刻度 (`MAX_TICKS=1200` 抽样) + 轨道 + **定位胶囊手柄** (本次移除对象)。`role=slider` + 完整 aria + ←/→/Home/End 键盘 + pointer 拖拽吸附。
  - `replay-kind-chip.tsx` — `KIND_META` 每 kind 已有独立 lucide 图标; 但 tone 共享 5 个语义 ChipTone (`tool/result/model/system` 四种挤在 `neutral`), **无独立主题色**。tool/result 失败升 danger。
  - `replay-detail-panel.tsx` — 右栏: 头部 (KindChip + toolName + 关闭) + 元信息 grid + JSON payload 语法着色 (`lib/json-highlight.ts`, 截断渲染)。**无宽度拖曳 / 全屏 / 导出**。
  - `lib/replay-model.ts` — 纯逻辑层 (无 React, 直测): `filterReplayEvents` / `replayOffsetMs` / `formatReplayOffset` / `buildReplayPositions` (0..1 归一, 时间比例 + 索引 fallback) / `nearestReplayIndex`。
- **筛选器现状**: HeroUI `Select` multiple — 选项只有文案 + 计数, **无图标无主题色**; HeroUI Select 选中 Check 默认渲染在行尾 (最右), 与 PRD 要求相反。
- **等待/中断的数据形态** (两家 adapter 均有信息, 形态不同):
  - Claude Code: 用户 Esc 中断 → user 消息文本 `[Request interrupted by user]` / `…for tool use]` (经验性, 本机样本观察, 官方无公开契约);
  - Codex: `turn_aborted` 事件 (`SYSTEM_EVENT_TYPES`, adapters/codex/session-replay.ts:18-23), 现归为 `kind: system`。
  - 长时间等待: 相邻事件 timestamp 差, renderer 纯推导, 无需数据层支持。
- **导出技术路径** (Electron 行为, 已查官方): main 进程无 `will-download` 自定义 handler; Electron 默认对 anchor `download` + Blob URL 下载弹系统保存对话框 ([DownloadItem docs](https://www.electronjs.org/docs/latest/api/download-item), [PR #16640](https://github.com/electron/electron/pull/16640))。即导出可零 IPC 纯 renderer 实现, 不扩大主进程写能力, 不碰 IPC 四方对账。
- **canvas 先例**: 项目内无 canvas 组件 (仅 ResizeObserver 用法 ×2)。本任务引入首个 canvas 绘制组件。React wheel 缩放需原生 `addEventListener('wheel', …, { passive: false })` 才能 `preventDefault` (Chromium 对滚动容器 wheel 默认 passive)。
- **主题系统**: Tailwind HSL CSS 变量 (light/dark + `data-accent` 六色切换); `--chart-1..5` 为既有分类色 (蓝/绿/амber/紫/粉, dark 提亮一档)。HeroUI 语义色经 `--heroui-*`。canvas 取色需在 JS 读 CSS 变量 (getComputedStyle) 并响应主题切换。

## 关联与依赖

符号边界 (import / JSX 使用点):

| 符号 | 使用点 | 影响 |
|---|---|---|
| `ReplayScrubber` | session-replay.tsx (JSX ×1) + tests/renderer/replay-scrubber.test.tsx + tests/renderer/sessions-pages.test.tsx:828 (testid 断言) | 整体替换为 canvas 时间轴, 测试重写 |
| `ReplayKindChip` / `replayKindTone` | session-replay.tsx + replay-detail-panel.tsx | 主题色系统落点 |
| `lib/replay-model` | session-replay.tsx / replay-scrubber.tsx / replay-detail-panel.tsx + tests/renderer/replay-model.test.ts | 扩展视口/等待/中断纯函数 |
| `SessionReplayViewState` | pages/session-detail.tsx (状态提升) | 若扩展字段, 此处同步 |
| `ReplayDetailPanel` | session-replay.tsx (JSX ×1) + sessions-pages.test.tsx (testid 断言) | 宽度拖曳/全屏/导出 |
| i18n `sessions.replay.*` | en.json / zh.json | 新增键 |

main 进程零改动 — 除非 design 采纳「中断标志 adapter 层标准化」(见未决 1), 则 `SessionReplayEvent` 加可选字段 + 两家 adapter 各几行 + 对应单测 (加可选字段不动 IPC 通道, 四方对账无感)。

历史取舍: GH-116 评注「参考 ClaudeConsole Sessions Debug 界面」— 本次升级为 DevTools Performance 面板范式 (缩放/平移/minimap window), 信息密度与紧凑度保持现有水准 (text-xs / h-9 控件 / 36px 行)。

## 任务分类与 debt 校准

- type / maintenance.subtype: `feature` (新增 canvas 时间轴、面板交互、导出能力), 无 subtype
- source.kind / refs: `user-request`, refs = issue #120
- debt estimate 修正: 维持 incurred 6 / repaid 2 / net 4。影响面与 new 估算一致 (renderer sessions 模块 + lib + 测试; canvas 组件为新增自管代码)。
- scope / risk / areas / confidence: scope `module` (若 design 采纳 adapter 层中断标志, 升 `cross-process` 并加 revision — 改动本身是加可选字段, risk 不变); risk `medium` (首个 canvas 组件, 交互面大); areas `[ui-ux]`; confidence `low → medium` (explore 后边界已核实)
- revision: 无 (估算未变, confidence 提升不单独记 revision)

## 验收标准

1. **AC1 事件主题色**: 7 种事件 kind 各有独立主题色且与既有图标绑定; light/dark 双主题下可读 (对比度达标); 列表行、筛选器、canvas 时间轴、详情面板使用同一色源; tool/result 失败态仍可辨识 (danger 语义保留)。
2. **AC2 筛选器**: 筛选器选项呈现事件图标 + 主题色; 选中 Check 指示在行首 (左侧), 不在最右; 计数保留。
3. **AC3 Canvas 时间轴**: 顶部时间轴由 canvas 绘制 (DPR 适配); 鼠标滚轮以指针位置为锚缩放, 按住拖曳左右平移; 事件标记使用主题色; 20k 事件交互流畅 (rAF 节流, 无逐事件 DOM)。
4. **AC4 Window 视口区域**: 时间轴上有 "window" 矩形, 实时同步底部事件列表当前可见范围 (列表滚动 → 矩形移动)。
5. **AC5 等待/中断样式**: 相邻事件间超阈值的等待区段在时间轴有专属样式; 用户中断 (Claude `[Request interrupted…]` / Codex `turn_aborted`) 有专属样式呈现。
6. **AC6 选中框选高亮**: 定位胶囊手柄移除; 选中事件在 canvas 时间轴上以框选样式高亮; 点击时间轴事件标记可选中事件并同步列表滚动。
7. **AC7 右侧面板**: 拖曳左边缘调宽 (含最小/最大约束); 一键放大全屏与还原; 导出当前数据 (范围见未决 2) 经系统保存对话框落盘。
8. **AC8 状态与可访问性不回归**: 时间轴保留键盘逐事件步进与 slider aria 语义; loading/error/empty/no-results/truncated 状态保留; tab 切换视图状态不丢失; reduced-motion 尊重。
9. **AC9 测试**: replay-model 新纯函数直测; canvas 时间轴交互测试 (键盘/点击选中/视口同步可断言部分); 详情面板新交互测试; 既有 988+ 测试双轮全绿。

## 界面质量与交互验收

- **页面结构**: 详情页 → Tabs (overview/replay/artifacts) → Replay panel: 控制行 → scrubber → 列表+右栏两栏 (`lg:h-[calc(100vh-21rem)]`, max-lg 纵向堆叠)。
- **设计系统**: HeroUI v2 经 `@/components/ui` 单一入口 (页面禁直连 `@heroui/react`); 语义 `Chip` 5-tone; `MOTION/TRANSITION` token; Tailwind HSL 变量 + `data-accent`。新颜色体系须挂入 CSS 变量层, 跟随 light/dark 与 accent 切换。
- **信息密度**: 紧凑 — text-xs 正文 / text-[11px] mono / h-9 控件 / 36px 虚拟行 / 8px 级 gap。本次重设计保持该密度水准。
- **用户路径**: 列表 → 详情 → Replay tab → (筛选/搜索) → scrubber 或列表定位 → 选中行 → 右栏读 payload → (新) 调宽/全屏细读、导出。
- **可见状态**: 全局 loading/error(+retry)/empty; 过滤后 no-results; truncated 警告 Chip; payload loading/error/truncated。全部保留。
- **交互反馈**: 行 hover/selected 着色; scrubber 拖拽吸附 + 键盘步进; 详情关闭按钮。新增: canvas hover 反馈、缩放/平移、window 拖动、面板拖宽手柄 hover、全屏过渡。
- **响应式**: max-lg 纵向堆叠 (面板 max-h-[420px]); 面板宽度拖曳仅 lg+ 生效的取舍 → design 定。
- **可访问性风险**: canvas 无 DOM 语义 — 必须保留 `role=slider` + `aria-value*` + 键盘操作于宿主元素; 主题色对比度 (尤其 light 下 warning/amber 系) 需校验; 全屏模式 Esc 退出与 focus 管理; 拖宽手柄需 `role=separator` + 键盘可调。

## 未决问题

1. **中断标志的归属**: A) renderer 文本启发式 (`summary` 前缀匹配, adapter 知识泄漏到 UI, codex/claude 两套规则); B) adapter 层标准化 — `SessionReplayEvent` 加可选 `interrupted?: true`, 两家 adapter 各自判定 (claude: user 文本前缀; codex: `turn_aborted`)。倾向 B (语义干净, 加可选字段不动 IPC 通道); design 拍板。
2. **导出范围**: 仅当前选中事件 payload (.json)? 还是过滤后事件流 (.jsonl/.json)? 或两者 (面板导出当前事件 + 控制行导出全部)? design 给方案。
3. **面板宽度持久化**: localStorage 记忆 or 会话内记忆 (页面状态)? 既有 `SessionReplayViewState` 不含 UI 偏好。
4. **window 区域交互方向**: 只读指示 (列表→时间轴单向) or 可拖动 window 反向驱动列表滚动 (双向)? DevTools 是双向, 成本更高。
