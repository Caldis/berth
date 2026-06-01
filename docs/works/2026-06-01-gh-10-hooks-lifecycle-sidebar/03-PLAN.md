# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 先更新 renderer 测试, 固定要保留/删除的 UI 行为
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 旧实现下 `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 失败 3 项; 实现后 14 项通过
- [x] 任务 2: 精简 `HooksLifecycleView` 功能区和密度参数
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过
- [x] 任务 3: 调整生命周期索引为桌面 sticky 侧栏, 小屏保留横向索引
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过
- [x] 任务 4: 收口验证
  - tests: target renderer test, `pnpm typecheck:web`, `pnpm harness:check`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过; `pnpm lint` 通过; `pnpm typecheck` 通过; `pnpm test` 50 个文件 / 324 项通过; `pnpm harness:check` 通过; `pnpm dev:agent start --id hooks-sidebar-verify --json` 启动 agent-owned Electron, PID 242052, 截图确认 Hooks 顶部无密度切换和全部禁用入口, 下滚后左侧生命周期索引保持 sticky, 最后 `pnpm dev:agent stop hooks-sidebar-verify --json` 已停止。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- [x] 任务 5: 调整生命周期侧栏信息层级与阶段建议操作
  - feedback: 左侧 Hook 数量改为数字 tag, 副标题展示阶段简短说明; 右侧长段 guide 改为 “建议操作” + 短标签。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 15 项通过
- [x] 任务 6: 对照 Claude Code / Codex 官方 Hooks reference 固定完整事件分类
  - source: https://code.claude.com/docs/en/hooks; https://developers.openai.com/codex/hooks
  - tests: `tests/unit/hook-lifecycle.test.ts`
  - verify: `pnpm test -- tests/unit/hook-lifecycle.test.ts` 14 项通过

## verify 回写 2026-06-01
- `pnpm lint` 通过
- `pnpm typecheck` 通过
- `pnpm test` 50 个文件 / 327 项通过; 仍有既有 Recharts 0 宽高 warning, 不影响结果
- `pnpm harness:check` 通过
- Electron 视觉验收: 启动独立 agent-owned 实例 `hooks-feedback-remote`, 带 `--remote-debugging-port=9333`; CDP 点击进入 Hooks 页面; `PrintWindow` 截图 `C:\Users\mail\AppData\Local\Temp\berth-hooks-feedback-hooks-top.png` 和 `C:\Users\mail\AppData\Local\Temp\berth-hooks-feedback-hooks-scrolled.png`; 下滚后左侧生命周期侧栏仍固定在页内, 数量为数字 tag, 副标题为阶段短说明, 右侧显示“建议操作”短标签; 最后按精确 PID 停止该实例。

- [x] 任务 7: 删除对照 Agent 视图, 将 Agent 差异改为 hover tips
  - feedback: 生命周期卡片内不再平铺 Claude Code / Codex 说明; 用户 hover 在 Agent 名称上时再展示支持状态、事件和差异说明; Hooks 顶部不再需要“生命周期 / 对照 Agent”切换器。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 13 项通过; `pnpm typecheck:web` 通过

## verify 回写 2026-06-01 agent tips
- `pnpm lint` 通过
- `pnpm typecheck` 通过
- `pnpm test` 50 个文件 / 327 项通过; 仍有既有 Recharts 0 宽高 warning, 不影响结果
- `pnpm harness:check` 通过
- Electron 视觉验收: 启动独立 agent-owned 实例 `hooks-agent-tips-verify`, 带 `--remote-debugging-port=9334`; CDP 点击进入 Hooks 页面, 确认顶部不再有“生命周期 / 对照 Agent”切换器, 生命周期卡片内不再平铺 Claude Code / Codex 说明; CDP 移动鼠标到 Agent 名称 `Codex` 后出现支持状态、事件和差异说明浮层; `PrintWindow` 截图 `C:\Users\mail\AppData\Local\Temp\berth-hooks-agent-tips-hover.png`; 左侧生命周期侧栏在滚动后仍固定在页面内。

- [x] 任务 8: 重设 Hooks 健康检查展示方式
  - feedback: 现有健康检查所在区域和卡片已经过时; 需要改为更贴近当前生命周期页结构的轻量展示, 健康检查逻辑保留。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 旧实现下新增测试失败 2 项; 实现后 `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过

## verify 回写 2026-06-01 health display
- `pnpm lint` 通过
- `pnpm typecheck` 通过
- `pnpm test` 50 个文件 / 328 项通过; 仍有既有 Recharts 0 宽高 warning, 不影响结果
- `pnpm harness:check` 通过
- 补测 `tests/renderer/capabilities-guidance.test.tsx` 2 项通过, 防止旧健康检查文案断言残留
- Electron 视觉验收: 先执行 `pnpm dev:agent guard before --id hooks-health-display-verify --json`, 记录用户 dev PID 226164 和 Electron 主进程 PID 493864; `pnpm dev:agent start --id hooks-health-display-verify --json` 可启动但无调试端口, Windows 150% DPI 下系统点击未命中侧栏, 已记录 friction `docs/friction/20260601-4.0-verify-dev-agent-debug-port.md`; 停止该实例并执行 `pnpm dev:agent guard after --id hooks-health-display-verify --json`, 用户 dev 保护通过。
- Electron 视觉验收续测: 手动启动独立实例 `hooks-health-display-remote`, 带 `--remote-debugging-port=9335`; CDP 进入 Hooks 页面, 断言 `Hook 检查 / 正常` 出现, 旧的“当前视角没有需要处理的 Hook 健康检查”文案和 `Hook 检查详情` 卡片不再出现, `#hook-health-checks` 在无问题时不渲染; `PrintWindow` 截图 `C:\Users\mail\AppData\Local\Temp\berth-hooks-health-display-clean.png`; 最后按精确 PID 停止该实例。

- [ ] 任务 9: 将共享引导 tips 与统计 tag 改为 hover 说明
  - feedback: 每个模块的三块小介绍不再平铺占空间, 改为 hover/focus 才展示; 资产、来源、provider、风险等统计 tag 需要 hover 解释含义; 适用于所有使用共享引导面板的页面。
  - tests: `tests/renderer/feature-guide-panel.test.tsx`
  - verify: pending
