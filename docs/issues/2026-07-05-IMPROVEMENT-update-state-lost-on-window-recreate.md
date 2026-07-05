# IMPROVEMENT: 窗口重建后 update:state 不重发, 更新指示器状态丢失

状态: OPEN (低优, 非阻塞; 主要影响 macOS 关窗不退出 → activate 重开的路径)

## 描述

`update:state` 是 main → renderer 的即时广播 (`src/main/index.ts` emit 遍历 `BrowserWindow.getAllWindows()`), main 侧**不缓存**最后一次状态, 新建窗口也不会收到补发。GH-156 已把渲染层状态收进 app store, 修复了**同一 renderer 内**组件晚挂载/重挂的 stale idle; 但**窗口重建** (macOS 关窗后 dock 点击 activate 重开) 会得到全新 renderer, store 从 `{phase:'idle'}` 起步 → 已 downloaded 的更新在侧边栏指示器与 Settings 里都"消失", 直到下一次 updater 事件。

## 影响

- Windows/Linux 关窗即退出, 基本无此路径。
- macOS: downloaded 后关窗再开, 指示器不见; 但 `autoInstallOnAppQuit=true` 兜底, 退出时仍会安装, 功能不丢, 只是可见性断档。

## 建议

main 侧缓存最后一次 `UpdateState` (updater runtime 内一个变量), 在 `BrowserWindow` `did-finish-load` 时对该窗口补发一次; 或增加 `update:get-state` invoke 供 renderer 启动时拉取 (注意 IPC 四方同批)。缓存补发方案不动契约, 更省。

## 来源

GH-156 verify 阶段 Spec 轴评审发现 (2026-07-05, `docs/works/2026-07-05-gh-156-update-ux-sidebar/`); 不在该任务验收范围 (AC6 只覆盖同 renderer 状态一致), 交叉引用记录。
