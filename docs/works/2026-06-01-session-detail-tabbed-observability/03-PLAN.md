# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [ ] 任务 1: 引入 Radix Tabs 并建立 `SessionDetailTab` 状态、tab bar 和计数 badge, verify: renderer 测试覆盖默认 Overview tab 和 tab label/count。
- [ ] 任务 2: 把 summary、session signals、loaded assets 移入 Overview tab, verify: renderer 测试确认默认页只展示概览/信号/加载资产。
- [ ] 任务 3: 把工具时间线移入 Timeline tab 并保留失败筛选、耗时 slider、tips、无横向滚动, verify: renderer 测试先切 tab 再覆盖筛选行为。
- [ ] 任务 4: 把 plans/todos/files/checkpoints 移入 Artifacts tab 并保持全宽展示, verify: renderer 测试先切 tab 再覆盖文件路径和 checkpoint 摘要。
- [ ] 任务 5: 补齐 en/zh i18n 和无障碍属性, verify: `pnpm typecheck:web`。
- [ ] 任务 6: 真实 Electron 视觉验收 overview/timeline/artifacts 三个 tab, verify: agent-owned dev instance 截图记录无横向滚动、tab bar 不贴边、产物全宽。
- [ ] 任务 7: 收口验证与任务态更新, verify: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`, `pnpm harness:check`。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
