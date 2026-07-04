# BUG: window-controls pin e2e 在本机 Win11 持续红 (基线亦红, 非代码回归)

状态: OPEN (低优 — 仅本地开发机复现, CI windows-2022 绿)

## 现象

`tests/e2e/window-controls.e2e.ts:58` "pin toggles always-on-top": 点击 pin 后轮询 `BrowserWindow.isAlwaysOnTop()` 持续 false, 5s 超时。本机 (Windows 11 Pro 26200) 连续 3 次红 + retry 亦红; 同文件 maximize 与 native-click 测试绿。

## 归因证据 (GH-155 verify, 四步归因)

- ① 失败域 (窗口置顶 IPC/Win32) 与 GH-155 改动域 (scan engine / renderer banner) 不相交。
- ④ **基线铁证**: checkout 到零代码改动的 design 提交 `3a449fc3` 重建 out/ 后单跑该测试, 同样红 — 与 GH-155 无关, 为本机环境既有问题。
- 疑似方向: Win11 对 `SetWindowPos(HWND_TOPMOST)` 的前台窗口限制 / focus assist / 同桌面其他 topmost 窗口干扰; 或点击未落 (poll 在 aria-pressed 断言之前失败, 未能区分)。

## 建议

- 复现排查时先在 poll 前补 `aria-pressed` 断言区分 "点击未落" vs "OS 拒绝置顶"。
- 若确认 OS 侧限制, 测试可改为断言 IPC 已达主进程 (`setAlwaysOnTop` 调用) + `isAlwaysOnTop` 的 poll 放宽为 soft (环境相关)。

## 来源

GH-155 verify 阶段全量 e2e 本地回归 (2026-07-05); 按不变量 10 立据, 不入 GH-155 修复范围。
