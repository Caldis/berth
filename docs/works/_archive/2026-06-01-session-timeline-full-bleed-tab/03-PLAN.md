# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 去掉 Timeline tab 外层卡片, 改成独立页面区域
  - 验证: Timeline tab 根节点不再带 `rounded-xl border bg-card` 这类卡片样式。
- [x] 任务 2: 调整工具筛选区和滚动列表, 适配铺满页面的布局
  - 验证: 失败筛选、耗时 slider、工具说明和紧凑列表仍可用, 列表保持 `overflow-x-hidden`。
- [x] 任务 3: 补 renderer 回归测试
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
- [x] 任务 4: 收口验证与归档
  - 验证: `pnpm typecheck:web`、`pnpm harness:check` 和真实 Electron 视觉验收通过或记录阻塞。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过, 15 个用例。
- `pnpm typecheck:web` 通过。
- `pnpm harness:check` 通过。
- 真实界面验收: 使用 `pnpm dev:agent start --id session-timeline-full-bleed-verify` 启动独立 dev server, renderer 端口为 5174。另用 Playwright Electron 临时实例进入含 86 条工具调用的会话详情 Timeline tab, DOM 指标显示 Timeline 根节点类为 `min-w-0 space-y-3`, 不含 `rounded-xl` / `border` / `bg-card`; `documentOverflowX=0`, `bodyOverflowX=0`, `timelineOverflowX=0`。Win32 + DWM 截图输出到 `C:\Users\mail\AppData\Local\Temp\berth-session-timeline-full-bleed-clean.png`, 确认时间线内容铺满 tab 页面、筛选区和列表没有外层卡片。验收后已停止本轮 agent dev 实例, `guard after` 通过, 用户 dev 进程未受影响。
