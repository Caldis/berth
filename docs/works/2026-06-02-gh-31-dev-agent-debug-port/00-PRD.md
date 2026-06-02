# PRD 快照 (只读)

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/31
- Friction: docs/friction/20260601-4.0-verify-dev-agent-debug-port.md

## 正文

`pnpm dev:agent start` 已能启动独立的 agent-owned Electron 实例, 但不能把 `--remote-debugging-port` 传给 Electron。Renderer 验证因此会退回真实鼠标点击或临时 `Start-Process` 命令, 在 Windows 高 DPI 环境下不稳定。

期望:

- `pnpm dev:agent start` 支持可选调试端口参数。
- 端口以 `--remote-debugging-port=<port>` 传给 Electron。
- state/status 输出记录端口和可用的 DevTools URL 信息。
- 无效端口在启动前被拒绝。
- 单元测试覆盖解析、spawn 参数、state 输出和无效输入。
