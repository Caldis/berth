# PRD 快照 (只读)

来源: 用户对话, 2026-05-31

## 正文

- 用户问: "我本地启动 NPN run dev 的时候，为什么没有一起打开 dev tools 面板？"
- 已查明现状: `dev` 启动脚本只启动 electron-vite; 主进程没有自动调用 `openDevTools`; 现有 `optimizer.watchWindowShortcuts(window)` 只支持开发模式下按 `F12` 切换 DevTools。
- 用户随后要求: "帮我补充"。
