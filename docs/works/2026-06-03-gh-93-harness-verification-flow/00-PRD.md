# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户请求: “目前整个测试和验证流程耗时过长, 你认为耗时最长的问题在哪些部分? 如何优化?” 之后要求 “请执行, 并确保不会影响 macos 下的兼容性”
- GitHub Issue: https://github.com/Caldis/berth/issues/93

## 正文

目标:
- 修复 Windows 下 `pnpm harness:prepush` 调用 `pnpm.cmd` 时的 `spawn EINVAL`, 但 macOS / Linux 仍保持直接 spawn `pnpm` 的行为。
- 增加当前任务范围的 GitHub Project 检查模式, 让无关 active work 的 Project 字段漂移不会阻塞当前任务级验证。
- 保持 archive / 全仓 strict check 的严格语义不变。

验收:
- 单元测试覆盖 Windows 与 macOS/Linux 的 prepush 命令选择。
- 单元测试覆盖 Project check 的当前 work 范围过滤。
- 本地目标测试、typecheck、harness 检查通过。
- 在 Windows 本机实际运行 `pnpm harness:prepush` 不再因 `spawn EINVAL` 提前退出; 若失败, 应显示真实失败项。
