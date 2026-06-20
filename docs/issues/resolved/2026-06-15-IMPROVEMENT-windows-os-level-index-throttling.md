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

## 收口 (2026-06-20, RESOLVED — CPU 降级已落, I/O native-addon 留可选)
- `helper-host.ts defaultApplyThrottle` 加 win32 分支 (commit 98c894bc): `powershell (Get-Process -Id <pid>).PriorityClass='BelowNormal'`, 镜像 mac (taskpolicy) / linux (ionice+renice) 结构, 严格 `process.platform==='win32'` 守卫 (mac/linux 字节不变)。Windows scan-helper 现获 **CPU 优先级降级**, 减重负载系统影响。
- **已知局限 (代码注释 + 此处记)**: 选了 issue 的旁路方案② (PowerShell 父进程对 pid 降 CPU), 非首选方案① (native N-API addon 让 helper 自调 `SetPriorityClass(PROCESS_MODE_BACKGROUND_BEGIN)` 含 I/O background)。真 I/O 降级需进程对自身设, 须 native build (本批 autonomous 不引入新 native 构建步骤)。故 Windows 当前只 CPU 降级、无 I/O background, 弱于 mac/linux。
- 验收: typecheck:node + eslint + helper-host 7 测试绿; **Windows 运行时未验证** (mac 主机, PowerShell 命令仅代码审查; 需 Windows 机/CI 实测)。
- 结论: 核心 Windows OS 级优先级降级已交付, 关闭。I/O-background native-addon 作可选未来精修 (如未来引入 native 模块时顺带), 不为此单独建 native 构建。
