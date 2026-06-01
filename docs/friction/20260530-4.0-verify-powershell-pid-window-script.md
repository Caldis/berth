# 工程摩擦记录

## 发生阶段

verify

## 现象

Windows UI 截图脚本枚举窗口时使用 `$pid` 作为局部变量。PowerShell 变量名不区分大小写, `$pid` 会命中只读内置变量 `$PID`, 导致 `GetWindowThreadProcessId(..., [ref]$pid)` 报错, 截图流程中断。

## 工程师介入动作

将局部变量改为 `$windowPid`, 继续使用 DWM bounds + `CopyFromScreen` 截取 agent-owned Electron 窗口。

## 应沉淀的上下文或规则

Windows PowerShell 脚本里不要使用 `$pid` 作为普通变量名。需要保存窗口进程 id 时使用 `$windowPid`、`$targetProcessId` 等明确名称。

## 建议的流程改进

把 verify 截图示例里的窗口枚举变量统一写成 `$windowPid`, 并避免复用 PowerShell 内置变量名。
