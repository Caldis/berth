# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 扩展工具事件耗时契约与 Codex parser, 先补 parser 测试, verify: `pnpm test -- tests/unit/codex-session-parser.test.ts`。
- [x] 任务 2: 扩展 token display 的去重展示能力, 先补 renderer 断言, verify: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。
- [x] 任务 3: 重排会话详情页并补 session signals / 时间线耗时 UI, verify: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。
- [x] 任务 4: 更新 i18n 与任务态, verify: `pnpm typecheck:web` 和 `pnpm harness:check`。
- [x] 任务 5: 进入 verify 阶段做最终检查和视觉验收, verify: 记录目标测试、typecheck、harness、UI 验收结果。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

- 2026-05-31 verify:
  - `pnpm test -- tests/unit/codex-session-parser.test.ts` 通过。
  - `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
  - `pnpm typecheck:node` 通过。
  - `pnpm typecheck:web` 通过。
  - `pnpm harness:check` 通过。
  - 真实界面验收: 使用 `pnpm dev:agent start --id session-detail-observability-verify` 启动 agent-owned Electron 实例; 点击最近会话进入详情页; 已看到运行概览、去重后的 token 图例、连续工具时间线、工具耗时 chip 和右侧会话信号; 无白屏、明显错位或文本重叠。验收后已 `pnpm dev:agent stop session-detail-observability-verify`; `guard after` 确认用户 dev 进程未受影响。

- 2026-05-31 verify feedback:
  - [x] 任务 6: 运行概览 token 指标等高 compact 化, verify: renderer 测试保留 token 总量和 breakdown, 视觉验收无明显高度突兀。
  - [x] 任务 7: 产物面板改为全宽区域, verify: 真实详情页中文件路径不再挤在右侧窄栏。
  - [x] 任务 8: Checkpoints 无文件明细时改为摘要展示, verify: renderer 测试覆盖多个 0 文件 checkpoint 不再逐条刷屏。
  - [x] 任务 9: 工具时间线改成高密度连续 rail 列表, verify: 真实 100+ 工具调用会话可扫描, rail 不再断裂。
  - [x] 任务 10: 增加工具耗时阈值 slider, verify: renderer 测试覆盖滑动后只显示高于阈值的工具。
  - [x] 任务 11: 增加工具说明 tips, verify: 高频工具能看到用途和常见慢因说明。

- 2026-05-31 feedback verify:
  - `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
  - `pnpm typecheck:web` 通过。
  - `pnpm harness:check` 通过。
  - 真实界面验收: 使用 `pnpm dev:agent start --id session-detail-density-verify` 启动 agent-owned Electron 实例。因 5173 被另一个本地页面占用, 该实例主窗口加载到了错误端口; 未清理用户进程, 改用同一 dev server 的 5174 renderer 启动临时 Electron 实例验收。已在真实详情页看到运行概览等高卡片、紧凑工具时间线、连续 rail、耗时 slider、工具说明入口, 并下滚确认产物文件列表占满主内容宽度。验收后已关闭临时 Electron、`pnpm dev:agent stop session-detail-density-verify`; `guard after` 确认用户 dev 进程未受影响。

- 2026-06-01 verify feedback:
  - [x] 任务 12: 运行概览卡片内容放大并重新排版, verify: renderer 测试、`pnpm typecheck:web`、真实界面截图确认卡片不再显空。
  - `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
  - `pnpm typecheck:web` 通过。
  - 真实界面验收: 使用 `pnpm dev:agent start --id session-overview-card-verify` 启动 agent-owned dev server; 因 5173 被占用, 继续使用 5174 renderer 启动临时 Electron 实例验收。截图确认运行概览主值、token 总量和 token 条形均已放大, 卡片内容不再显得过空。验收后已关闭临时 Electron、`pnpm dev:agent stop session-overview-card-verify`; `guard after` 确认用户 dev 进程未受影响。

- 2026-06-01 follow-up feedback:
  - [x] 任务 13: 工具时间线移除横向滚动并按 bobcorn 样式调整滚动条内缩, verify: renderer 测试覆盖时间线容器不使用横向滚动, 真实界面无底部横向条。
  - [x] 任务 14: 工具时间线增加失败工具快速筛选, verify: renderer 测试覆盖只看失败工具。
  - [x] 任务 15: 重新设计耗时 slider, verify: renderer 测试保留最小耗时筛选能力, 真实界面确认控件不贴边且可读。
  - [ ] 任务 16: 模型名称 hover 展示 provider、价格、上下文和 token 缓存来源说明, verify: renderer 测试覆盖模型信息 tooltip。
  - [ ] 任务 17: 运行概览移除项目卡片、时间卡片展示具体日期和相对时间, checkpoint 空明细改成可用解释和可展示字段摘要, verify: renderer 测试覆盖时间卡片与 checkpoint 摘要。
  - `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
  - `pnpm typecheck:web` 通过。
