# PRD 快照 (只读)

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/32
- Friction: docs/friction/20260601-4.0-verify-powershell-drawing-screenshot.md

## 正文

Windows 视觉验收经常需要截取真实 Electron 主进程窗口。当前做法依赖临时 PowerShell/C# helper, 需要手动处理 PowerShell 7 和 Windows PowerShell 5.1 的 `System.Drawing` 差异, 也容易在遮挡窗口存在时误用 `CopyFromScreen`。

期望:

- 增加可复用的 `pnpm dev:agent screenshot` helper, 面向 agent-owned Electron 实例。
- 通过 `--berth-agent-instance=<id>` 找到真实 Electron 主窗口。
- 默认用 `PrintWindow` 捕获, 并输出窗口 bounds 元数据。
- 默认输出到 agent dev 临时目录, 允许显式指定输出路径。
- 单元测试覆盖 CLI 解析和 helper 命令构造; runtime verify 对 agent-owned 窗口完成截图。
