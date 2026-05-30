# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

verify

## 现象

本次侧边栏 UI 验收需要真实 Electron 窗口截图。第一次用 Playwright `_electron.launch()` 返回的 app 进程 PID 去取 `MainWindowHandle`, 得到空句柄。改用窗口裁剪后, 又因为 Windows 150% 显示缩放, 普通 `GetWindowRect` 返回的逻辑尺寸和 `CopyFromScreen` 需要的物理像素不一致, 截图裁到了错误区域或只截到窗口局部。

## 工程师介入动作

改用真实 `electron.exe` 启动当前 `out/main/index.js`, 加 `--remote-debugging-port` 供 Playwright 只做页面交互。截图时用 Win32 枚举该 Electron 主进程的可见窗口, 再用 DWM `DWMWA_EXTENDED_FRAME_BOUNDS` 获取物理像素窗口边界, 最后按该矩形裁剪屏幕。

## 应沉淀的上下文或规则

Windows 下 Electron UI 视觉验收不能只依赖 Playwright `_electron.launch()` 的 PID 或 `GetWindowRect`。需要区分两个问题:

- `_electron.launch()` 暴露的进程不一定持有主窗口句柄。
- 高 DPI/显示缩放下, 截图裁剪应优先用 DWM 扩展窗口边界拿物理像素坐标。

## 建议的流程改进

把 Windows 截图规则写入 `.agents/workflow/verify.md`: UI 截图需要启动真实 Electron 主进程, 用 CDP/Playwright 只做交互, 用 Win32 + DWM 取真实窗口物理边界再裁剪。Playwright screenshot 可以作为辅助, 但不能替代真实窗口裁剪。
