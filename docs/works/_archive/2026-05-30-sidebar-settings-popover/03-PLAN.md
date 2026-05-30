# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 调整导航配置, 移除 Settings 普通侧边栏项和搜索入口。
- [x] 任务 2: 抽出设置弹窗组件, 保留现有设置能力。
- [x] 任务 3: 改造侧边栏底部控制区, 设置按钮打开弹窗, 折叠按钮保留。
- [x] 任务 4: 运行 typecheck/lint/test。
- [x] 任务 5: 启动或复用 Electron 应用, 完成侧边栏与设置弹窗截图验收。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

## 验证记录

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm test` 通过, 14 个测试文件, 77 个用例。
- `pnpm build` 通过。
- `pnpm test:e2e -- tests/e2e/app.e2e.ts --project=electron` 通过, 13 个用例。
- Win32 + DWM 物理窗口矩形截图通过:
  - `C:\Users\mail\AppData\Local\Temp\berth-sidebar-default.png`
  - `C:\Users\mail\AppData\Local\Temp\berth-settings-dialog.png`
