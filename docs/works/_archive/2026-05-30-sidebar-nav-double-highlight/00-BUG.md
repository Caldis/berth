# 缺陷快照 (只读输入)

> 来源: 用户报告 + 截图。建立后不回写。

## 现象
侧边栏左侧导航中, "Claude Code" (AGENTS 分组) 与 "Sessions" 两个导航项**同时**显示橙色 active 高亮。正常情况下同一时刻应仅一个导航项高亮。

## 复现步骤
1. 启动 berth, 进入主窗口。
2. 导航至 `/sessions` (点击 "Claude Code" 或 "Sessions", 二者均跳转 `/sessions`)。
3. 观察侧边栏: "Claude Code" 与 "Sessions" 两项均处于橙色高亮态。

## 期望
同一时刻侧边栏仅一个导航项处于 active 高亮态。

## 证据
`bug-screenshot.png` (用户提供, 2026-05-30): AGENTS 分组的 "Claude Code" 与下方 "Sessions" 同为橙色实心高亮。

## 环境
macOS; berth dev (electron-vite); react-router-dom HashRouter; 当前路由 `/sessions`。
