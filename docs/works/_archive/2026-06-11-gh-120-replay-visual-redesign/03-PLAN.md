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
- [x] T7 集成收口 — i18n + 全量门禁 + 真机视觉验收 [AC8/9 + 全 AC 复核]
  - i18n: 各任务已同批加 key (kindFilterSummary/timelineLabel/detailExpand·Collapse·Resize/exportMenu·Event·Stream×2 desc); scrubberLabel 已删连带清引用; en/zh 对称检查过 (en-only 仅 i18next `*_one` 复数派生, 正常)
  - 门禁: prepush (lint+typecheck+test 1050 绿) + 第二轮 pnpm test 1050 绿 + pnpm build 成功
  - 真机 (agent-dev CDP): 7 截图序列 — light 全貌 / 滚轮缩放 (等待带 16m48s 标签可见) / 拖曳平移 / 筛选器 Check 左置+图标+计数 / 面板全屏 / 导出菜单 / dark 主题 (canvas MutationObserver 重取色正确)。timeline 偏差: 等待带标签在低 zoom 时按宽度阈值隐藏 (>44px 才画), 符合设计
  - tests: 全量双轮绿 (上两行)
  - verify: AC1-AC9 正式核对移交 verify 阶段; 主观视觉项截图已留存 $env:TEMP\berth-gh120-v1..v7

## 用户实时反馈修正 (implement 期, 2026-06-12)

- [x] F1 时间轴全白 (hover tips 正常) — 根因: React StrictMode 双挂载下 cleanup `cancelAnimationFrame` 后未复位 `rafRef.current`, markDirty 去重分支永久短路, draw 永不执行。修复: cleanup 复位 id + 置 dirty。CDP 真机探针定位 (size update 跑/draw enter 不跑) + 修复后 canvas 1476×96 38k 非透明像素确认。
- [x] F2 拖宽锚点改两栏中间 + indicator — 手柄从面板左 border 的"虚空"热区 (absolute -left-1) 重构为列表与面板之间的独立 `PanelResizeHandle` 分隔条 (w-3 列 + 居中 h-10 w-1 圆条 indicator, hover/active/focus 变 primary); panel 卸下 width/onResize props; 测试迁移。真机布局确认。

## verify 客观核对 (2026-06-12, Agent 自验部分)

- 测试覆盖审计: T1-T7 + F1/F2 全部有测试证据或已声明例外 (canvas 像素 manual; 真机 7 截图序列留存 $env:TEMP\berth-gh120-v1..v7)。diff 内行为变更 ↔ 测试映射: interrupted (adapter 单测×2 + ipc-contract) / 7 色 (chip 10 测) / 视口数学 (model 23 测) / 筛选器 (3 测) / 时间轴 DOM 语义 (7 测) / 面板+手柄 (6 测) / download (2 测) / 集成 (sessions-pages 29 测)。
- 机械门禁: lint/typecheck/test 双轮 1050 绿 + build 成功; CI master 全绿 (24ef74ec success, conclusion 判定)。
- Code review: AC1-AC9 逐条过 — AC1✓ (同源 7 色 light/dark, danger 保留) AC2✓ (Check 行首测试+真机) AC3✓ (DPR 1.5 真机/锚点缩放/平移/1026 事件流畅) AC4✓ (window 双向, rangeChanged 单写) AC5✓* AC6✓ (胶囊删除/框选真机可见) AC7✓ (拖宽手柄重构/全屏/导出菜单真机) AC8✓ (slider aria 契约延续/状态全保留/reduced-motion) AC9✓ (双轮绿)。架构边界: 零新 IPC 通道 (加可选字段), renderer 准入合规 (@/components/ui 单入口), 无 electron 越界 import。
- *AC5 已知限制: 中断线真机视觉未用真实中断数据走查 (验收会话无 Esc 中断事件); 数据层 adapter 单测×2 覆盖, 渲染与等待带同管线 (等待带真机已见 16m48s 标签)。用户验收时若有含中断的会话可顺带确认。
- debt.final 已校准 (6/2/4 cross-process medium high), 与 estimate 一致无 revision; harness:stats total=16 ok; Project strict check 过 (scope/confidence 字段漂移已 ensure 同步)。
- **待用户裁判的主观项**: 时间轴整体观感与信息密度 / 手柄 indicator 样式 / 缩放跟手感 / 全屏过渡 — 截图已发, 等确认后 archive。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
