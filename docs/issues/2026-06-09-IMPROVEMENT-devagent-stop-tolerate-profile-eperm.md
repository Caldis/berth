# 描述
- `pnpm dev:agent stop <id>` 在 Windows **首次报 EPERM** (删 `%TEMP%\berth-agent-dev\<id>` profile 目录时撞 electron 退出的文件锁), 退出码 1, 误导"实例没停"。实际 electron 主进程已被 kill, 失败只在随后的 rmdir。

# 证据
- GH-113 verify 真跑后清理: `dev:agent stop verify-gh113` EPERM; `Get-CimInstance Win32_Process` 按 `--berth-agent-instance=verify-gh113` 确认已无主进程; 稍等重试 stop 返回 `{ "status": "missing" }`, 目录也删除成功。
- friction `20260609-4.0-verify-devagent-stop-eperm-windows`。

# 预期 / 建议
- `scripts/agent-dev-core.mjs` 的 stop: **进程 kill 成功即视为 stop 成功** (status=stopped); profile 目录删除的 EPERM 降级为 best-effort 清理 + warning, 不返回非 0。可选: rmdir 前 retry-with-backoff 几次等 Windows 释放文件锁。
- 收益: 消除"stop 失败但实际已停"的误导, 避免 agent 误判后改用危险的批量 kill。

# 来源 / 关联
- GH-113 verify (friction `20260609-4.0-verify-devagent-stop-eperm-windows`)。
- 状态: OPEN。
