# 描述
berth 扫描内核迁独立 helper 进程后 (GH-135), mac/linux 已能对 helper pid 施加 OS 级 I/O / CPU 降优先级 (`taskpolicy` / `ionice`+`renice`)。Windows 对应能力 `SetPriorityClass(PROCESS_MODE_BACKGROUND_BEGIN)` 需 native binding 或 PowerShell 旁路, GH-135 范围内列为 future 以控风险。当前 Windows 仅靠应用层 backoff (排除路径 / 批间 sleep / 降并发 / 电源门控)。

# 现状缺口
- **mac**: `taskpolicy -b -p <helperPid>` → IOPOL_THROTTLE + DARWIN_BG (GH-135 落地)
- **linux**: `ionice -c3 -p <pid>` + `renice -n 19 -p <pid>` (GH-135 落地)
- **windows**: `SetPriorityClass` 未接入 — helper 进程在 Windows 上拿不到 OS 级 I/O 降级, 重负载下系统影响高于 mac/linux

# 预期 / 建议
- 评估 Windows native 方案: ① 轻量 N-API addon 调 `SetPriorityClass(GetCurrentProcess(), PROCESS_MODE_BACKGROUND_BEGIN)` (helper 进程内自降, Windows BACKGROUND 模式只能对自身进程); ② PowerShell/wmic 旁路对 pid 降优先级 (无 native 但能力弱, 拿不到 I/O background); ③ 现成 npm 进程优先级库评估。
- helper 自降 (进程内调用) 优于父进程对 pid 施加 (Windows `PROCESS_MODE_BACKGROUND_BEGIN` 限自身进程)。

# 来源 / 关联
- GH-135 explore 识别: `docs/works/_archive/2026-06-15-gh-135-index-progress-visibility/01-ANALYSIS.md` §2.1 / §8.1。
- 用户 `/goal` 选定 "helper + mac/linux 节流" 档, 明确 Windows 列后续。
- 状态: OPEN (future, 非阻塞 GH-135 主线)。
