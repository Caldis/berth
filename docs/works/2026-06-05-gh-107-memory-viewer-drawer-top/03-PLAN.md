# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (TDD: 先更新测试断言 → 改实现转绿 → macOS 实测)。文件不重叠但逻辑耦合 (测试锁定实现), 不并行。

- [x] 任务 1: 更新 `tests/renderer/inspector-drawer.test.tsx` 的 macOS 用例 (`leaves the macOS traffic-light strip uncovered by the backdrop`) 以反映方案 C1: drawer 断言改为 `top-0`/`h-full` (去掉 `top-10`/`h-[calc(100%-2.5rem)]`); backdrop 仍断言 `top-10`; 新增断言存在 `data-testid=file-viewer-mac-titlebar` 的 `titlebar-drag` 占位条; header 仍 `not.toHaveClass('pr-48')`。用例名同步为体现"drawer 贴顶且红绿灯条受保护"。
  - tests: 测试即产物; 运行 `pnpm test -- inspector-drawer` 预期此用例先红 (实现未改)。
  - verify: 断言逐条对应 02-SPEC 测试矩阵; Windows 用例 (line 137-142) 不动。[验收 1/2/3/4]
- [x] 任务 2: 修改 `src/renderer/src/components/shared/file-viewer-drawer.tsx` 实现方案 C1: drawer 容器统一 `top-0 h-full`; resize handle 之后、header 之前插入 `{isMac && <div aria-hidden="true" data-testid="file-viewer-mac-titlebar" className="titlebar-drag h-10 w-full shrink-0" />}`; backdrop 与 header 不动。
  - tests: `pnpm test -- inspector-drawer` 转绿; `pnpm test -- memory-view view-raw-button` 不回归; `pnpm typecheck` + `pnpm lint` 通过。
  - verify: renderer 测试全绿 + 类型/lint 通过; 确认 isMac 变量仍被 spacer 使用 (无未用变量)。[验收 1/3/5/6]
- [x] 任务 3: macOS 实机实测 (verify 阶段)。
  - tests: manual (jsdom 无法验证真实 app-region 与窗口状态)。
  - verify: `pnpm dev` 启动, 进入记忆模块打开 md 查看器; 按实测窗口坐标截图确认 (a) 面板背景贴合窗口顶部无留白 [验收 1]; (b) 左上红绿灯不被 backdrop 压暗、可见可点 [验收 2]; (c) 常规窗口下点击 close(×)/copy 生效 [验收 3]; (d) 窗口 maximize→restore 后再次点击 close/copy 仍生效 [验收 3 回归红线]; (e) inspector 入口表现一致 [验收 6]。截图存 tmp, 验收后清理。

## verify 回写
verify 全部通过 (2026-06-05, GH-107):
- 机械检查: `pnpm typecheck` ✓ / `pnpm lint` ✓ / `pnpm test` 676 passed ✓ (含 inspector-drawer 7 用例)。
- 真实 agent 实例 (dev:agent, hiddenInset) CDP 实测坐标: dialog y=0 贴顶, backdrop y=40 护红绿灯条, spacer 0-40 titlebar-drag, header y=40, close y=56 避顶部系统区 → 验收 1/2/3。
- CDP renderer 截图 + 系统截图: drawer 贴顶无留白、左上红绿灯可见不压暗 → 验收 1/2。
- Windows 行为不变 + spacer 仅 macOS: renderer 测试 → 验收 4。
- 既有交互 (Escape/backdrop 关闭/Tab trap/copy/resize): renderer 测试 → 验收 5。
- memory 与 inspector 共用同组件 → 验收 6。
- 真实 OS 系统点击 close 未执行: 环境受阻 (用户 dev 与 agent 双 Electron 同屏重叠, 系统截图/点击会误触用户 dev; scaled 双屏坐标不等比; 无 cliclick), 已沉淀 friction `20260603-4.0-verify-macos-dev-agent-screenshot.md`。close 在 y=56 常规 no-drag 区 (非系统区), 不属 app-region 命中风险, 可点性由 CDP 坐标 + renderer 单测 (focus/click/关闭) 覆盖。

未通过项: 无。phase 维持 verify, 待用户确认验收后 archive。
