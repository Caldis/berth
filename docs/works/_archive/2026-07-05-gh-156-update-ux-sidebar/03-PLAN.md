# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (契约自上游向下游流动: main 契约 → 渲染状态 → UI; 单会话, 不并行)。
共享文件撞车防护: `zh.json`/`en.json`/`sidebar.tsx` 与 GH-150 并发 — 每次编辑前重读, Edit "file modified since read" 即重读再改; 新 i18n key 写前 grep 占用。

- [x] T1 main 契约与状态机: `pkg:shared/types/ipc.ts` UpdateState (`notes` → `releaseNotes: UpdateReleaseNote[]`, 先 grep 确认 `notes` 无其他消费者) + `updater.ts` (UpdaterLike.fullChangelog / init 置 true / update-available|downloaded 归一化 20 条×4000 字 / `check({userInitiated})` + error 静默语义) + `index.ts` 启动 check 传 `{userInitiated:false}`
  - tests: `tests/unit/updater-controller.test.ts` 扩: fullChangelog=true 被设置; string→单条归一; 数组→多条 (含截断/上限/空 note 过滤); 自动检查错误→not-available + 恒 log; 用户 check/download 错误→error; catch 分支同语义
  - verify: `pnpm vitest run tests/unit/updater-controller.test.ts tests/unit/ipc-contract.test.ts` 绿 + `pnpm typecheck` (非 UI 项, 界面验收不适用)
- [x] T2 渲染状态单源: `stores/app.ts` 增 `updateState`/`setUpdateState` + `hooks/use-update.ts` state 改读 store (返回形状不变)
  - tests: `tests/renderer/settings-update.test.tsx` 保持绿 (必要时 beforeEach 重置 store, 参照 sidebar-scan-status.test 先例)
  - verify: `pnpm vitest run tests/renderer/settings-update.test.tsx` 绿; update-section 零改动 (git diff 核对)
- [x] T3 提纯纯函数: `lib/release-notes.ts` (`releaseNoteHtmlToText` DOMParser 提纯 + `formatVersionRange`)
  - tests: `tests/renderer/release-notes.test.ts` 新增: br/li/块级换行、纯文本直通、script/img 恶意标签不执行仅取文本、空输入、版本区间单条/多条
  - verify: 目标测试绿 (非 UI 渲染项, 界面验收在 T4)
- [x] T4 侧边栏指示器 UI: `components/layout/sidebar-update-indicator.tsx` (主按钮各态 + FloatingPopover + UpdateNotesPanel 导出 + Modal + 脉冲一轮即停) + `sidebar.tsx` footer 挂载 + i18n `update.*` zh/en 同批
  - tests: `tests/renderer/sidebar-update-indicator.test.tsx` 新增: idle/not-available 零渲染; checking/available/downloading/downloaded/error 各态文案与可点性; 点击 dispatch download/install/check; 折叠态 aria-label; 浮层 click 冒烟; UpdateNotesPanel 直测 (多版本条目/空态/error); Modal 打开
  - verify: 目标测试 + `pnpm vitest run tests/renderer/i18n-plural-convention.test.ts` 绿; 界面质量项按 02-SPEC §4 表 (布局不挤占 footer 行 / 语义色与 token 一致 / 可点态 hover 反馈 / 空态与 error 态文案 / aria-label / motion-safe) 代码走查
- [x] T5 dev 模拟驱动: `src/main/index.ts` dev-only globalShortcut (Ctrl/Cmd+Shift+U) 定时序列发 fake `update:state`
  - tests: not needed — dev-only 调试胶水, 不进打包; 证据 = verify 阶段用它驱动全状态序列
  - verify: dev 运行按快捷键, 指示器完整走 checking→available→downloading(0-100)→downloaded 序列
- [x] T6 收口门禁: 全量 `pnpm typecheck` + `pnpm lint` + `pnpm test` (或 harness:prepush) + 视觉验收截图 (展开/折叠 × 各态 × zh/en × light/dark 关键组合, 实测窗口坐标裁剪)
  - tests: 全量套件
  - verify: AC1-AC11 逐条核对 (04-verify 阶段执行); 主观视觉项交用户确认

## 实现证据 (2026-07-05)

- T1: `2f852fa1` — updater-controller 10 用例 + ipc-contract 4 用例绿, 全仓 typecheck 绿
- T2: `7b265adc` — settings-update 6 用例绿, update-section 零改动
- T3: `3cdf1e70` — release-notes 12 用例绿
- T4: `7b569176` — sidebar-update-indicator 13 用例绿 (含 raw-key 泄漏兜底), i18n-plural-convention 绿, lint 0 警告; e2e 断言面已 grep (footer 断言按 role/name, 无需同步)
- T5: `9f9156e3` — typecheck/lint 绿; 手动驱动验证留 verify 阶段
- T6 (自动化部分): 全量 `pnpm test` 194 文件 / 1467 用例绿; `pnpm typecheck` 绿; `pnpm lint` 绿; `pnpm build` + `tests/e2e/app.e2e.ts` 14/14 绿 (sidebar DOM 改动的 e2e 义务)
- T6 (视觉验收截图 + AC1-AC11 核对): 移交 verify 阶段

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- [x] T7 (用户视觉验收反馈 2026-07-05): downloaded 态浮层/Modal 增加显式 [重启并更新] 主按钮 (调 install), 避免用户只能靠点指示器或手动关应用; 按钮点击不得冒泡触发整卡 onExpand
  - tests: sidebar-update-indicator.test.tsx 新增 panel 直测 (按钮渲染+onInstall+不冒泡 / 非 downloaded 不渲染), 17 用例绿
  - verify: 实机截图 15/16 (浮层+Modal 均见全宽主按钮); 附带把 dev 模拟触发从 globalShortcut 改为窗口级 before-input-event (评审 #4 收口 + 修复与用户 dev 实例抢注, 教训沉淀 friction 20260706-4.0-verify-dev-sim-hotkey-globalshortcut-and-cdp-input)

### verify 记录 (2026-07-05)

- 覆盖审计: T1-T6 全部有测试证据或已记录例外 (T5 dev 胶水 → 实机驱动证据见下)。
- 机械门禁: 评审修复后全量重跑 — typecheck 绿 / lint 0 问题 / `pnpm test` 194 文件 1471 用例绿 / `harness:check` 绿。
- 双轴评审 (cross-process 启用): Standards 轴 7 项 (3 中 4 低) + Spec 轴 9 项 (无阻塞) — 全部处置: 竞态改升级-衰减语义+去重、面板键盘可达、直读 store、checking 空卡补文案、死键删除、dev 快捷键去重、冗余计算提取, 修复提交 `15b382d2`; 2 个 SPEC 外边界记 docs/issues 交叉引用; SPEC 已回写裁决。
- 实机视觉验收 (agent-owned 实例 gh156-update + CDP + Ctrl/Cmd+Shift+U 模拟驱动, 13 张截图存 `%TEMP%\gh156-shots`): checking/available(蓝点+版本)/downloading(条形进度+百分比)/downloaded(绿点+重启文案)/error(红点+真实错误链路 "Please check update first") 展开态全过; available/downloaded hover 浮层 (版本区间 v98→v99 + New/Ready 徽标 + 跨版本提纯条目) 过; 点击浮层放大 Modal (标题+版本区间+dialog 密度) 过; 折叠态圆点 + 浮层右翻过; light/dark 双主题均截图核验; e2e 断言面 `app.e2e.ts` 14/14 本地绿 (build 后实跑)。
- AC1-AC11 逐条: AC1-AC10 全过 (组件测试 + 实机截图 + 契约对账); AC11 用户确认 "视觉效果很棒" (2026-07-05) + 反馈补 T7 按钮 (已落地并重截确认)。
- CI: commit `6aa31243` 三平台 (ubuntu/windows/macos) 全绿含 e2e (run 28745988483 success), 主 Agent 已消费。
- 用户宣布 "其他没有需要改善了, 可以收尾发版" → 进入 archive + 发版。
