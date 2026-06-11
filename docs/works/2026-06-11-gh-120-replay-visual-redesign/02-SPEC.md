# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号 (AC1–AC9)。

## 设计方向 (frontend-design 参考, 以 berth 现有语言为准)

**精密仪器感 (precision instrument)**: berth 既有基调是紧凑安静的 HeroUI 仪表盘; 重放时间轴对标 DevTools Performance/示波器 — 高数据密度、克制但语义鲜明的色彩、直接跟手的交互。不引入装饰性渐变/玻璃拟态; 记忆点 = 三泳道语义时间轴 + 等待区段与中断标记的叙事性呈现。动效只用于状态变化 (选中、悬停、面板展开), 全部走 `MOTION` token 并尊重 reduced-motion。

## 未决问题决议 (01-ANALYSIS § 未决, 设计假设, 无 PRD 级歧义)

1. **中断标志归 adapter 层** (方案 B): `SessionReplayEvent` 加可选 `interrupted?: true`; claude 判 user 文本前缀 `[Request interrupted by user`, codex 判 `turn_aborted`。理由: adapter 知识不泄漏 renderer, 加可选字段不动 IPC 通道 (四方对账无感)。
2. **导出两档**: 详情面板头部 Dropdown — "导出此事件 (.json)" (当前 payload, 已在内存) + "导出事件流 (.json)" (过滤后 `SessionReplayEvent[]` 摘要 + 会话元信息, renderer 内存序列化)。两档均零新 IPC, 经 Electron 默认保存对话框落盘 (探索已核实)。完整 transcript 导出不做 (源文件本身即是)。
3. **面板宽度 localStorage 持久化** (`berth-replay-panel-width`), 与主题存储模式一致; 全屏态为瞬时 UI 态不持久。
4. **window 双向同步**: 列表滚动 → window 矩形 (Virtuoso `rangeChanged`); 拖动 window → 列表 `scrollToIndex`。拖动中抑制反向回写防环路。理由: 用户点名 DevTools 范式, 双向是该范式核心。

## 数据契约

- `src/shared/types/ipc.ts`: `SessionReplayEvent` 增可选字段 `interrupted?: boolean` (仅在 true 时由 adapter 置位)。通道签名不变, handlers/preload/mock 不动。[AC5]
- `adapters/claude-code/session-replay.ts`: user 字符串内容与 user text block 两处, `content.startsWith('[Request interrupted by user')` → `interrupted: true` (经验性判定, 注释标注来源)。[AC5]
- `adapters/codex/session-replay.ts`: `turn_aborted` system 事件 → `interrupted: true`。[AC5]
- renderer 不新增 IPC; 等待区段纯由相邻事件 timestamp 差推导。[AC5]

## 颜色系统 [AC1]

`styles/globals.css` 新增 7 个 replay 语义变量 (light/dark 双份, HSL 裸三元组, 与 `--chart-*` 同惯例; 注释标明与 chart 的同源关系但独立演化):

| 变量 | kind | light | dark | 语义 |
|---|---|---|---|---|
| `--replay-user` | user | `217 91% 60%` | `213 94% 68%` | 蓝 — 人的输入 |
| `--replay-assistant` | assistant | `160 84% 39%` | `160 65% 52%` | 绿 — Agent 产出 |
| `--replay-thinking` | thinking | `258 90% 66%` | `255 92% 76%` | 紫 — 内省推理 |
| `--replay-tool` | tool | `38 92% 50%` | `43 96% 56%` | 琥珀 — 动作执行 |
| `--replay-result` | result | `187 80% 42%` | `187 70% 55%` | 青 — 执行回执 |
| `--replay-model` | model | `330 81% 60%` | `329 87% 70%` | 粉 — 计量遥测 |
| `--replay-system` | system | `240 5% 46%` | `240 5% 65%` | 灰 — 元信息 |

- `tailwind.config.ts` `colors.replay.{user,assistant,thinking,tool,result,model,system}` → `hsl(var(--replay-*))`, 获得 `bg-replay-user/15`、`text-replay-tool` 等 utility。
- `replay-kind-chip.tsx`: `KIND_META` 改为 kind → `{ icon, textClass, bgClass, dotClass }`; Chip 改 `variant="flat"` + classNames 染色 (`bg-replay-*/12 text-replay-*` 形态, 文字全饱和)。错误态保留: tool/result `status==='error'` 仍走 danger (覆盖主题色)。`replayKindTone` 保留导出兼容既有调用或一并迁移 (检查使用点)。
- canvas 经 `getComputedStyle(document.documentElement)` 读变量, 主题/accent 切换经 MutationObserver (documentElement `class`/`data-accent`) 触发重取色重绘。
- 等待样式色 = `--muted-foreground` 低透明度; 中断 = `--destructive`。

## 模块结构 / 组件拆分

```
src/renderer/src/
  lib/replay-model.ts          (扩) 视口/聚合/gap/tick 纯函数族 [AC3-6 数学层]
  lib/download.ts              (新) downloadTextFile(filename, text, mime) — Blob+a[download] [AC7]
  components/sessions/
    replay-kind-chip.tsx       (改) 7 色主题化 [AC1]
    replay-kind-filter.tsx     (新) 筛选器: Select multiple + hideSelectedIcon + 左侧 Check 槽 + 图标 + 色点 [AC2]
    replay-timeline.tsx        (新) canvas 时间轴, 替换 replay-scrubber.tsx (删除) [AC3-6]
    replay-detail-panel.tsx    (改) 拖宽 + 全屏 + 导出 [AC7]
    session-replay.tsx         (改) 接线: 筛选器/时间轴/rangeChanged/面板宽度 [集成]
  pages/session-detail.tsx     (不动 — SessionReplayViewState 契约不变)
```

### lib/replay-model.ts 新纯函数 (全部直测) [AC3-6]

```ts
interface TimelineViewport { startMs: number; endMs: number }   // 视口时间窗
interface TimelineBounds { minMs: number; maxMs: number }        // 会话全程 (含 1% padding)

buildReplayTimePoints(events, startedAt, endedAt): { bounds, times: (number|null)[] }
  // 绝对 ms; 无 timestamp 事件为 null (不上时间轴, 列表仍可见)
zoomViewportAt(vp, anchorMs, factor, bounds, minSpanMs=1000): vp   // 锚点缩放, clamp
panViewportBy(vp, deltaMs, bounds): vp                              // 平移, clamp
timeToX(ms, vp, width): number / xToTime(x, vp, width): number      // 坐标互换
nearestTimeIndex(times, ms, toleranceMs): number                    // 点击拾取 (-1 容差外)
computeWaitGaps(times, thresholdMs=REPLAY_WAIT_THRESHOLD_MS): {startMs,endMs,afterIndex}[]
  // REPLAY_WAIT_THRESHOLD_MS = 60_000 (常量导出; 阈值参数化)
selectTickStep(spanMs, targetTicks≈6): number   // nice 步长: 1s/5s/15s/30s/1m/5m/15m/30m/1h/...
bucketEvents(times, kinds, vp, width): Map<laneIdx, {x, count, kind, firstIndex}[]>
  // 像素聚合: 同泳道同 px 合一, count 表密度 (高度增量), firstIndex 供拾取
```

既有 `buildReplayPositions`/`nearestReplayIndex` 被 timeline 取代后删除 (连带测试改写); `filterReplayEvents`/`replayOffsetMs`/`formatReplayOffset` 不动。

### replay-timeline.tsx [AC3-6]

**视觉** (总高 h-16=64px, rounded-xl border bg-card, 内 padding 横向 0):
```
┌────────────────────────────────────────────────────────┐
│ 0:00      0:30      1:00      1:30      2:00     (16px) │ 刻度尺: 时间标签 text-[10px] muted + 1px 网格竖线
│ ▍▍ ▍   ▍▍▍▍ ░░░░░░ ▍ ▍▍                    (12px) │ 泳道1 Conversation: user/assistant/thinking
│   ▍  ▍▍   ▍▍     ░░░░░░ ▍▍▍   ┃                (12px) │ 泳道2 Tools: tool/result
│  ▍      ▍▍     ▍ ░░░░░░    ▍▍ ┃    ▍           (12px) │ 泳道3 Meta: model/system
└────────────────────────────────────────────────────────┘
  ▍=事件块(2px 宽, 主题色, 同 px 聚合加高)  ░=等待带(muted 8% 填充+上下边缘虚线, zoom 足够时居中标时长)
  ┃=中断竖线(destructive, 贯穿三泳道, 顶部 2px 旗标)
  [window 矩形: primary 8% 填充 + 1px primary/40 边框, 全高 overlay, 拖动 grab]
  [选中框选: 事件块外扩 3px 圆角矩形 1.5px primary 边框 + 全高 primary/20 细竖线]
  [hover: 事件块加亮 + DOM tooltip (色点+kind+offset+summary≤60 字), pointer-events-none]
```

**实现要点**:
- canvas DPR 适配 (`width=cssW*dpr`, ctx.scale); ResizeObserver 跟容器宽。
- 渲染调度: 脏标记 + rAF; 静止零绘制; 交互 (wheel/drag) 期间连续帧。20k 事件每帧裁剪视口内 + bucket 聚合, O(n) 单趟。
- viewport 存 ref (不进 React state, 避免拖动期间 re-render); hover/tooltip 低频走 state。
- wheel: 宿主 div 原生 `addEventListener('wheel', h, { passive: false })` + `preventDefault` (React onWheel 是 passive, 无法阻止页面滚动 — explore 已核实); 缩放因子 `1.0015^(-deltaY)`, 锚点=指针时间。
- drag: pointerdown 命中 window 矩形 → 拖 window (驱动 `onWindowDrag(startMs)`); 命中事件块 (≤5px) → click 选中; 其余 → 平移视口。pointer capture; cursor: grab/grabbing/pointer 切换。
- 键盘 (沿用 slider 契约, 测试可延续): `role=slider` + `aria-valuemin/max/now/text`, ←/→ 逐事件, Home/End, `+`/`-` 缩放, `0` 重置全程。
- props: `{ events, times, bounds, kinds, selectedIndex, visibleRange: {startIndex, endIndex} | null, waitGaps, onSelect(index), onWindowDrag(startMs), ariaLabel, ariaValueText }`。
- jsdom 容错: `getContext('2d')` 返回 null 时跳过绘制, DOM 语义层 (role/aria/键盘/pointer 接线) 可测。
- testid: 保留 `replay-scrubber` → 改 `replay-timeline` (sessions-pages.test.tsx 同批更新)。

### replay-kind-filter.tsx [AC2]

- HeroUI `Select` multiple 保持 (含 `kindFilter` null=全部语义); `SelectItem` 设 `hideSelectedIcon` (本地 listbox 2.3.31 已核实存在), 内容自渲染: `[Check 槽 14px (选中显 ✓, 未选中空)] [kind 图标 (text-replay-*)] [名称] [计数右对齐]`。
- 触发器 renderValue: 选中 ≤2 显示色点+名, >2 显示 "N types"。
- 从 session-replay.tsx 抽出为独立组件 (该文件将变大, 拆分降耦)。

### replay-detail-panel.tsx [AC7]

- **拖宽**: 面板左缘 6px 手柄 (`role=separator` `aria-orientation=vertical` `aria-valuenow=width` min/max, 键盘 ←/→ ±16px); pointer capture 拖动; 宽度 clamp [320, 720] 且 ≤ 容器 60%; 仅 lg+ 生效 (max-lg 纵向堆叠时隐藏手柄)。宽度状态在 session-replay.tsx (style width 内联), localStorage `berth-replay-panel-width` 读写 (异常容错回默认 400)。
- **全屏**: 头部按钮 (Maximize2/Minimize2) toggle `isExpanded`; 展开时面板 `absolute inset-0 z-10` 覆盖重放区域 (父 section relative), Esc 退出 (面板内 keydown), focus 移回触发按钮; 过渡 150ms opacity (MOTION token, reduced-motion 降级直切)。
- **导出**: 头部 `Dropdown` (Download 图标 Button): 两项 — 当前事件 (payload.json, 仅 ready 态可用) / 事件流 (过滤后 events 摘要 + {sessionId, agentId, startedAt, endedAt, exportedAt, filter 状态}); `lib/download.ts` `downloadTextFile(name, text, 'application/json')`; 文件名 `berth-replay-{sessionId 截 8}-{eventId}.json` / `berth-replay-{sessionId 截 8}.json` (sanitize 非法字符)。
- 新 props: `onWidthChange?`/`width?`/`expanded`/`onToggleExpanded`/`onExportEvent`/`onExportStream` — 或把导出逻辑留面板内 (events/filter 经 props 下传)。倾向: 面板只发意图回调, 数据组装留 session-replay.tsx (面板保持展示组件)。

### session-replay.tsx (集成)

- 控制行: `ReplayKindFilter` 替换内联 Select; 其余不动。
- `ReplayScrubber` → `ReplayTimeline`; `buildReplayPositions` 调用替换为 `buildReplayTimePoints`+`computeWaitGaps` (useMemo)。
- Virtuoso `rangeChanged` → `visibleRange` state (节流至 rAF 粒度) → timeline window 矩形; `onWindowDrag(startMs)` → 该时间后首个事件 index → `scrollToIndex({ align:'start' })`, 拖动中抑制 rangeChanged 回写 (ref 标志)。
- 面板宽度/全屏 state + localStorage; 两栏布局右栏 width 内联 style。
- 删除 import: ReplayScrubber。

## 任务分类与 debt

- type / maintenance.subtype: `feature`, 无 subtype
- source.kind / refs: `user-request`, issue #120
- debt.estimate: incurred 6 / repaid 2 / net 4 → **scope 升 `cross-process`** (决议 1 落 adapter+shared, 加可选字段, risk 不变 medium); areas `[ui-ux]`; confidence `medium`
- debt.final 预期: net ≈ 4 (新 canvas 组件自管代码 + 偿还筛选器/胶囊交互债)
- revisions: 追加 `design: scope module→cross-process (中断标志 adapter 层标准化)`
- Project 字段同步: archive 时 `harness-projects.mjs done` 自动同步
- `pnpm harness:stats` 总 debt 12 (<40), 无需 override 说明

## 界面质量与交互验收 [AC8 全表]

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 控制行→时间轴(h-16)→列表+面板两栏; 保持紧凑 (text-xs/h-9/36px 行); 时间轴三泳道语义分组 | 截图比对密度与既有页面一致 |
| 组件选择 / 设计系统一致性 | 全部经 `@/components/ui` (Select/Dropdown/Button/Chip); 颜色挂 CSS 变量层随 light/dark+accent; canvas 取色同源 | 双主题截图; accent 切换抽查 |
| 交互反馈 / 状态切换 | 时间轴 hover 加亮+tooltip / grab/grabbing/pointer cursor; 行选中 bg; 手柄 hover 高亮; 全屏过渡 150ms; 选中框选高亮 | 真机交互走查 (缩放/拖曳/window 拖动/点选) |
| loading / empty / error / disabled / focus | 既有 LoadingState/ErrorState/EmptyState/no-results/truncated 全保留; 导出"当前事件"在 payload 非 ready 时 disabled; focus ring 沿用 ring token | 组件测试 + 真机走查 |
| 响应式 / 可访问性 / 键盘可达 | max-lg 纵向堆叠 (拖宽禁用); timeline 保留 slider aria + 键盘全集 (←/→/Home/End/+/-/0); 手柄 role=separator 键盘可调; 全屏 Esc 退出 + focus 归还; 色彩对比度 light/dark 校验 | aria/键盘组件测试 + 真机 Tab 走查 |
| 文案 / i18n / 数字和路径格式 | 新 key en+zh 同批 (timeline/window/waiting/interrupted/expand/collapse/export×2/resize); 时长沿用 formatReplayOffset; 文件名 sanitize | i18n key 完整性 (en/zh diff) + 截图 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| adapter interrupted 标志 (claude 前缀/codex turn_aborted) | unit | tests/unit/session-replay-claude.test.ts / session-replay-codex.test.ts (扩) | pnpm test | — |
| 视口数学 (zoom/pan/clamp/坐标)/gap/tick/bucket/nearest | renderer unit | tests/renderer/replay-model.test.ts (扩) | pnpm test | — |
| timeline aria/键盘/点选/window 拖动接线 | renderer component | tests/renderer/replay-timeline.test.tsx (新, 替换 replay-scrubber.test.tsx) | pnpm test | canvas 像素不断言 (jsdom 无 2d ctx); 绘制正确性经纯函数+真机覆盖 |
| kind-filter Check 左置/图标/计数/全部语义 | renderer component | tests/renderer/replay-kind-filter.test.tsx (新) | pnpm test | — |
| 面板拖宽 (clamp/键盘/persist)/全屏 (toggle/Esc)/导出回调 | renderer component | tests/renderer/replay-detail-panel.test.tsx (新) | pnpm test | — |
| downloadTextFile | renderer unit | tests/renderer/download.test.ts (新, mock createObjectURL/click) | pnpm test | — |
| kind-chip 7 色映射 | renderer | 既有 sessions-pages.test.tsx 行染色经 testid class 断言 (轻) | pnpm test | 视觉对错由截图验收 |
| session-replay 集成 (testid 迁移/筛选/选中流) | renderer | tests/renderer/sessions-pages.test.tsx (改) | pnpm test | — |
| canvas 绘制视觉 / 缩放流畅度 / 主题切换重绘 | manual (真机) | — | pnpm dev + 截图 (electron 实测窗口坐标裁剪) | 像素级绘制与帧率不适合 jsdom; 按 _shared 22 真机验收, 主观项用户裁判 |
| e2e 回归 | e2e | 既有 tests/e2e (不新增) | pnpm test:e2e | replay 无既有 e2e; 交互深度由组件层覆盖 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 颜色系统 (CSS 变量+tailwind+kind-chip) | AC1 |
| replay-kind-filter.tsx | AC2 |
| replay-timeline.tsx canvas/缩放/拖曳 | AC3 |
| visibleRange↔window 双向同步 | AC4 |
| interrupted 契约 + waitGaps + 时间轴样式 | AC5 |
| 胶囊移除 + 选中框选高亮 | AC6 |
| 面板拖宽/全屏/导出 + lib/download | AC7 |
| aria/键盘/状态保留/reduced-motion | AC8 |
| 测试矩阵全量 | AC9 |
