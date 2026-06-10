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
- [x] T9 文档收尾 + 旁支 issues
  - 内容: docs/ARCHITECTURE.md (engine 模块行补 session-replay; 例外行补 replay 解析)。偏差: 两个旁支点均已有归属 issue, 按"有则合并"增补而非新建 — ①worker 下沉/分块流式/缓存内存 → `2026-06-07-IMPROVEMENT-session-streaming-parse.md` GH-116 增补节; ②hover-popover → `2026-06-05-IMPROVEMENT-heroui-migration-followup.md` 增补行
  - tests: not needed - 纯文档; pnpm harness:check 过闸门
  - verify: harness:check 绿
- [x] T10 verify 阶段 (harness-4.0) — 2026-06-11 通过
  - 机械门禁: pnpm harness:prepush 145 文件 973 测试全绿; lint/typecheck 绿; 全部 6 个推送 SHA CI conclusion=success (harness:ci:wait)
  - 真机验收 (agent-owned 实例 gh116-verify + CDP 9333, 真实数据 234 会话):
    - 列表: agent 分段过滤 234→192 (Codex) 行集合实时变化; 平铺隐藏跳转导航; 费用排序生效; 模型多选/结果计数正常
    - 重放 (Claude, 本会话自身 transcript): 977→989 条事件 (验收期间 transcript 增长, 指纹缓存失效重解析端到端正确); 事件可见 217ms; payload 按需 115ms (file-history-snapshot 原始 JSON 高亮正确); ↓ 键选中 L1B0→L6B0; scrubber 80% 点击 aria-valuenow 1→734 + 列表跳转; 类型过滤 989→270 (工具) aria-selected=true (首轮脚本 977/977 为弹层动画期点击的脚本时序伪影, 交互探查确认产品行为正确); 搜索正常
    - 重放 (Codex 019ea7b4): 276 条事件, user_message/thinking 占位/shell_command 工具对/result/system 全类呈现, payload 面板正常 (AC5 双 agent)
    - Tabs: solid 分段式 + 图标 + 计数 (重放计数惰性加载后出现), cursor 滑块存在且未隐藏
    - 主题: 暗色列表+重放截图正常跟随; 真实窗口截图 (print-window, pid 39888) 留档
    - 截图: %TEMP%\berth-gh116-shots\01-11 + real-window.png (系统临时目录, 按规不入项目)
  - AC 核对: AC1✓(结构化筛选组合+计数) AC2✓(3 次交互可达+虚拟化) AC3✓(solid 原生+cursor+图标) AC4✓(七类事件+详情面板+scrubber+过滤搜索) AC5✓(双通道四方对账+双 agent) AC6✓(20k cap+双指纹缓存+按需 payload+虚拟化, 217ms/115ms) AC7✓(overview/artifacts 保留+行字段全保留) AC8✓(全状态+i18n 对称+prepush 绿) AC9✓(截图自验, 用户已授权自主)
  - debt.final 已定稿 (8/3/5 cross-process high); harness:stats total=18 ok; projects check --strict 通过

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。(2026-06-11: 无不通过项)
