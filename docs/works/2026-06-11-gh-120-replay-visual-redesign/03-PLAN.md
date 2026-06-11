# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

执行模式: **顺序执行** (T2/T3 文件不重叠但 T4-T7 依赖其产物, 共享工作区小步提交优先; 不并行 subagent)。每项完成即提交一次。

- [x] T1 数据契约 — interrupted 标志 adapter 层标准化 [AC5] (commit 0963f20a; claude/codex/engine/ipc-contract 19 测绿 + typecheck 绿)
  - `src/shared/types/ipc.ts` `SessionReplayEvent` + `interrupted?: boolean`
  - `adapters/claude-code/session-replay.ts` user 文本前缀 `[Request interrupted by user` → interrupted
  - `adapters/codex/session-replay.ts` `turn_aborted` → interrupted
  - tests: tests/unit/session-replay-claude.test.ts + session-replay-codex.test.ts 各加中断 case
  - verify: pnpm test (unit) 绿; INDEX debt scope→cross-process + revision 同批 (非 UI 项, 界面验收不适用)
- [x] T2 颜色系统 — replay 7 色 CSS 变量 + tailwind + kind-chip 主题化 [AC1] (commit bbf9c06f; chip 10 测 + sessions-pages 29 测回归绿)
  - globals.css `--replay-*` ×7 (light/dark); tailwind.config.ts colors.replay.*
  - replay-kind-chip.tsx KIND_META → { icon, 染色 class }; danger 覆盖保留
  - tests: sessions-pages.test.tsx 既有断言不回归; chip 染色 class 轻断言
  - verify: pnpm test 绿; 界面验收: 7 色与图标绑定、双主题可读 (真机截图待 T7 统一)
- [x] T3 replay-model 纯函数扩展 — 视口/聚合/gap/tick [AC3-6 数学层] (replay-model 23 测绿: timePoints/zoom 锚点往返/pan clamp/nearest 容差/tick 步长/waitGaps/三泳道 bucket error 升级)
  - buildReplayTimePoints / zoomViewportAt / panViewportBy / timeToX / xToTime / nearestTimeIndex / computeWaitGaps (REPLAY_WAIT_THRESHOLD_MS=60_000) / selectTickStep / bucketEvents
  - tests: tests/renderer/replay-model.test.ts 扩 (每函数边界: clamp/空列表/null 时间戳/单事件/锚点缩放往返)
  - verify: pnpm test 绿; 函数纯度 (无 DOM/React import); 非 UI 项, 界面验收不适用
- [x] T4 筛选器 — replay-kind-filter.tsx (Check 左置 + 图标 + 主题色) [AC2] (filter 3 测 + sessions-pages 29 测回归绿; kindFilterSummary key en/zh 同批)
  - 新组件: Select multiple + SelectItem hideSelectedIcon + 左 Check 槽 + kind 图标染色 + 计数; renderValue 色点摘要
  - session-replay.tsx 控制行替换接入
  - tests: tests/renderer/replay-kind-filter.test.tsx (新): 选中 Check 槽呈现/位置、全选=null 语义、计数渲染
  - verify: pnpm test 绿; 界面验收: Check 在行首、图标主题色、触发器摘要、密度与 h-9 控件一致 (真机 T7 复核)
- [x] T5 Canvas 时间轴 — replay-timeline.tsx 替换 replay-scrubber.tsx [AC3/4/5/6] (timeline 7 测 + model 19 测 + sessions-pages 29 测绿; 偏差: window 拖动不抑制 rangeChanged 回写 — window 位置始终由列表真实视口驱动, 拖动只发 scrollToIndex 意图, 单写无环路, 比 SPEC 的抑制方案更简; scrubberLabel→timelineLabel key 同批迁移; 附 CI 红灯修复 db0d3232 + HeroUI 弹层 friction 沉淀)
  - canvas DPR + ResizeObserver + rAF 脏标记; 三泳道 + 刻度尺 + bucket 聚合绘制
  - 原生 wheel (passive:false) 锚点缩放; pointer 平移/window 拖动/事件点选; cursor 切换
  - window 矩形 (visibleRange props); 等待带 + 中断线 + 选中框选; hover tooltip (DOM overlay)
  - 键盘 ←/→/Home/End/+/-/0 + role=slider aria 全集; 主题 MutationObserver 重取色
  - 删除 replay-scrubber.tsx + replay-scrubber.test.tsx; session-replay.tsx 接线 (rangeChanged→visibleRange, onWindowDrag→scrollToIndex 环路抑制)
  - tests: tests/renderer/replay-timeline.test.tsx (新): slider aria 契约、键盘步进/缩放回调、点选拾取 (mock rect+pointer)、jsdom null-ctx 容错; sessions-pages.test.tsx testid replay-scrubber→replay-timeline
  - verify: pnpm test 绿; 界面验收: 缩放跟手 (锚点正确)、拖曳惯性手感、window 同步、等待/中断样式、选中框选、hover 反馈、键盘可达 — 真机走查 (T7)
- [x] T6 详情面板 — 拖宽 + 全屏 + 导出 [AC7] (panel 6 测 + download 2 测 + sessions-pages 29 测回归绿; 宽度经 --replay-panel-w CSS 变量驱动 lg:w-[var(…)], localStorage 持久化; 全屏 absolute inset-0 + Esc + animate-in; 导出 Dropdown 两档 payload 未 ready 时单事件项 disabled; 附 tests/setup.ts canvas getContext null stub 消 jsdom 噪音)
  - 左缘手柄 (role=separator, 键盘 ±16px, clamp [320,720]∧≤60%, lg+ 限定); localStorage 持久化
  - 全屏 toggle (absolute inset-0, Esc 退出, focus 归还, 150ms opacity, reduced-motion 降级)
  - lib/download.ts downloadTextFile; 头部 Dropdown 导出两档 (当前事件 payload / 过滤后事件流摘要); 文件名 sanitize
  - tests: tests/renderer/replay-detail-panel.test.tsx (新): 手柄 aria/键盘 clamp/persist mock、全屏 toggle+Esc、导出回调与 disabled 态; tests/renderer/download.test.ts (新)
  - verify: pnpm test 绿; 界面验收: 拖宽手感与 clamp、全屏过渡与 Esc/focus、导出菜单层级、disabled 态 — 真机 (T7)
- [ ] T7 集成收口 — i18n + 全量门禁 + 真机视觉验收 [AC8/9 + 全 AC 复核]
  - i18n en/zh 新 key 同批 (timeline/waiting/interrupted/expand/collapse/exportEvent/exportStream/resize); 删 scrubberLabel 等弃 key 连带清引用
  - pnpm lint + typecheck + test 双轮 + build
  - 真机 (pnpm dev): 双主题截图 — 时间轴缩放/拖曳/window 同步/等待中断样式/选中框选/筛选器 Check 左置/面板拖宽全屏导出全路径走查
  - tests: 全量 pnpm test 双轮绿
  - verify: AC1-AC9 逐条核对; 界面验收: 02-SPEC 六行验收表全过; 主观视觉项整理截图供用户裁判 (INDEX phase→verify)

## 用户实时反馈修正 (implement 期, 2026-06-12)

- [x] F1 时间轴全白 (hover tips 正常) — 根因: React StrictMode 双挂载下 cleanup `cancelAnimationFrame` 后未复位 `rafRef.current`, markDirty 去重分支永久短路, draw 永不执行。修复: cleanup 复位 id + 置 dirty。CDP 真机探针定位 (size update 跑/draw enter 不跑) + 修复后 canvas 1476×96 38k 非透明像素确认。
- [x] F2 拖宽锚点改两栏中间 + indicator — 手柄从面板左 border 的"虚空"热区 (absolute -left-1) 重构为列表与面板之间的独立 `PanelResizeHandle` 分隔条 (w-3 列 + 居中 h-10 w-1 圆条 indicator, hover/active/focus 变 primary); panel 卸下 width/onResize props; 测试迁移。真机布局确认。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
