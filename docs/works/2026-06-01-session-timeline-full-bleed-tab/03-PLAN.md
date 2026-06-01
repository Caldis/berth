# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 去掉 Timeline tab 外层卡片, 改成独立页面区域
  - 验证: Timeline tab 根节点不再带 `rounded-xl border bg-card` 这类卡片样式。
- [x] 任务 2: 调整工具筛选区和滚动列表, 适配铺满页面的布局
  - 验证: 失败筛选、耗时 slider、工具说明和紧凑列表仍可用, 列表保持 `overflow-x-hidden`。
- [x] 任务 3: 补 renderer 回归测试
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx` 通过。
- [ ] 任务 4: 收口验证与归档
  - 验证: `pnpm typecheck:web`、`pnpm harness:check` 和真实 Electron 视觉验收通过或记录阻塞。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
