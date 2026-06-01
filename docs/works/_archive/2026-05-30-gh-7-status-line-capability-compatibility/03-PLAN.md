# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 完成官方文档与当前实现 Explore, 写入 `01-ANALYSIS.md`。
- [x] 任务 2: 设计 Claude Code / Codex statusline asset meta 契约和 UI 展示结构, 写入 `02-SPEC.md`。
- [x] 任务 3: 实现 Claude Code `statusLine` / `subagentStatusLine` 扫描与测试。
- [x] 任务 4: 实现 Codex `tui.status_line` 扫描与测试。
- [x] 任务 5: 改造 Status Line 页面展示, 覆盖无配置和 agent 差异说明。
- [x] 任务 6: 运行相关 unit / renderer / typecheck / harness 检查, 按可独立验证增量小步提交。

## verify 回写

通过:

- `pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/codex-config-parser.test.ts tests/renderer/status-line-section.test.tsx`
- `pnpm typecheck`
- `pnpm harness:check`
