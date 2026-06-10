# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

顺序执行 (理由见 SPEC「执行顺序」): T1→T2→T3→T4→T5→T6→T7→T8→T9。每项完成即小步提交。

- [x] T1 共享类型 + Claude replay 解析器 (tests: session-replay-claude 5 用例绿; commit 66550508)
  - 内容: ipc.ts 新增 SessionReplayEventKind/SessionReplayTokens/SessionReplayEvent/SessionReplayResult/SessionReplayEventPayload 类型 (暂不加通道); 新建 adapters/claude-code/session-replay.ts (事件映射见 SPEC; id=L{line}B{block}; summary≤160; cap 由 engine 层做, 解析器全量返回)
  - tests: tests/unit/session-replay-claude.test.ts — fixture 覆盖: 标量 content、text/thinking/tool_use 块、tool_result 配对 (含 is_error)、usage→model 事件、sidechain 标记、meta 类型跳过、坏行容错
  - verify: pnpm vitest run tests/unit/session-replay-claude.test.ts 绿; typecheck 绿
- [x] T2 Codex replay 解析器 (tests: session-replay-codex 3 用例绿; 实证发现 event_msg 才是用户面通道, response_item/message 是注入上下文或重复 assistant; commit f12ffb0e)
  - 内容: adapters/codex/session-replay.ts (message/reasoning/工具族/输出配对/token_count→model; 类型清单对齐现有 parseCodexSessionDetail)
  - tests: tests/unit/session-replay-codex.test.ts
  - verify: 目标测试绿; typecheck 绿
- [x] T3 engine 编排 + 缓存 + payload 反查; detail 解析接缓存 (repaid) (tests: session-replay-engine 6 + session-detail 7 用例绿; 偏差: 缓存存未截断事件、cap 调用期参数化; utimesSync 毫秒精度 → 测试钉整毫秒 mtime; commit bde5d2c5)
  - 内容: engine/session-replay.ts (buildSessionReplay: AssetFileCache + 20k cap + truncated; readSessionReplayEventPayload: eventId→line 行反查); engine/session-detail.ts parseSessionExecutionDetail 接独立 AssetFileCache
  - tests: tests/unit/session-replay-engine.test.ts (缓存命中不重解析/payload 反查/坏 id null/文件消失安全); tests/unit/session-detail.test.ts 扩展缓存断言
  - verify: 目标测试绿
- [x] T4 IPC 四方同批 (tests: ipc-contract + ipc-registration 绿; commit 01ed7c1d; prepush 全绿后推送)
  - 内容: IpcChannels 加 sessions:events / sessions:event-payload; preload sessions.events/eventPayload; handlers session 域两薄 handler (runtime 找 asset → engine); tests/setup.ts mock 键
  - tests: tests/unit/ipc-contract.test.ts + ipc-registration.test.ts 绿 (现有四方对账自动强制)
  - verify: pnpm vitest run tests/unit/ipc-contract.test.ts tests/unit/ipc-registration.test.ts 绿
- [x] T5 renderer hook + 纯逻辑库 (tests: replay-model 11 用例绿 含 json-highlight; commit 86e12824)
  - 内容: hooks/use-ipc.ts 加 useSessionReplay (CachedResource TTL 60s); lib/replay-model.ts (filterReplayEvents/nearestEventIndex/buildReplayPositions/formatOffset/kind 顺序); lib/json-highlight.ts (纯词法 token)
  - tests: tests/renderer/replay-model.test.ts (含 json-highlight 用例)
  - verify: 目标测试绿
- [x] T6 Replay UI 替换 timeline tab (tests: replay-scrubber 3 + sessions-pages 27 用例绿; 偏差: 选中事件被类型过滤滤掉时详情面板随之收起 (设计确认); payload 渲染 100k 截断防 base64 截图拖垮; commit fef62201)
  - 内容: components/sessions/session-replay.tsx + replay-scrubber.tsx + replay-detail-panel.tsx; session-detail.tsx 删 ToolTimeline/duration slider/ToolTipButton/toolTips 逻辑, timeline tab→replay tab (选中/过滤态提升到页组件跨 tab 存活); globals.css 删 .duration-filter-range; i18n 增 sessions.replay.* 删 sessions.toolTimeline*/toolFilter.*/toolTips.*/tabs.timeline* (en+zh 对称)
  - tests: tests/renderer/replay-scrubber.test.tsx (新); tests/renderer/sessions-pages.test.tsx 更新 (replay tab 事件渲染/点选→详情面板+payload mock/kind 过滤/搜索/空态/truncated 提示/↑↓ 键盘)
  - verify: 目标测试绿; 界面验收项: 事件流徽章五 tone 映射、选中高亮、详情面板 loading/错误态、scrubber aria(role=slider)、空态文案
- [x] T7 详情页 Tabs → solid 分段式 (带图标) (tests: sessions-pages 含 cursor 未隐藏 + 三 tab svg 图标断言; 偏差: 原 tab 描述降级为 title 提示, i18n 描述键保留; commit 725f7b1a)
  - 内容: session-detail.tsx Tabs 改 variant=solid 原生 cursor 动画, 每 tab 图标+label+计数 (replay 计数加载后显示); 删自绘卡片 SessionTabTitle 样式
  - tests: tests/renderer/sessions-pages.test.tsx 更新 (三 tab 图标存在、切换面板、键盘←/→ HeroUI 行为冒烟)
  - verify: 目标测试绿; 界面验收项: cursor 滑动动画存在 (真机)、tab 图标齐全、计数徽章、focus ring
- [x] T8 列表页重设计 (tests: session-list-filters 6 + sessions-pages 29 用例绿, 含 agent 分段/模型多选/费用排序/平铺隐藏跳转导航/筛选空态)
  - 内容: components/sessions/session-filter-bar.tsx (agent Tabs+model Select 多选+排序 Select+分组 Tabs(项目/时间/平铺)+结果计数) + session-row.tsx 两行制; lib/session-list-filters.ts (过滤/排序/日期分桶 today/yesterday/thisWeek/thisMonth/earlier); pages/sessions.tsx 接线 (none 模式隐藏 jump nav); i18n sessions.filters.*/dateBuckets.* (en+zh)
  - tests: tests/renderer/session-list-filters.test.ts (新, 注入 now); tests/renderer/sessions-pages.test.tsx 更新 (筛选条交互/行两行渲染/三分组模式/筛选无结果态/计数)
  - verify: 目标测试绿; 界面验收项: 筛选组合即时生效+计数、行信息密度 (字段全保留 AC7)、无结果态区分空库、响应式列隐藏
- [ ] T9 文档收尾 + 旁支 issues
  - 内容: docs/ARCHITECTURE.md (engine 模块行补 session-replay; 例外行补 replay 解析); docs/issues 新增: ①重放/详情解析 worker 下沉+分块流式 (IMPROVEMENT) ②详情页手写 hover-popover 迁 HeroUI Tooltip (IMPROVEMENT)
  - tests: not needed - 纯文档; pnpm harness:check 过闸门
  - verify: harness:check 绿
- [ ] T10 verify 阶段 (harness-4.0)
  - 内容: pnpm harness:prepush 全绿; 真机 dev 运行: 真实 Claude+Codex 会话重放交互 (CDP 观察 payload 按需加载), 实测窗口坐标截图 (列表亮/暗、详情 replay、tabs) 留档任务目录
  - tests: 全量门禁
  - verify: AC1–AC9 逐条核对回写

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
