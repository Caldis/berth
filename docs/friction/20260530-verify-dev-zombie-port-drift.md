# 工程摩擦记录

## 发生阶段
verify (启动 app 做视觉验收时)。

## 现象
多次 `pnpm dev` 留下僵尸 electron-vite orchestrator 进程, 占住 5173/5174, 端口逐次漂移到 5175;
新一轮 dev 的 electron 子进程起不来 (electron_procs=0)。截图一度只拿到全屏 fallback。
此外 Agent 工具输出在本会话严重延迟/乱序, 轮询进程状态多次误判。

## 工程师介入动作
pkill 清理 berth 的 electron-vite + electron 残留进程后重启; 用窗口 id 截图; 最终靠一个早先
存活、已 HMR 热更新到新代码的窗口实例取得有效截图, 确认修复。

## 应沉淀的上下文或规则
1. verify 启动 app 前应先 pkill 同项目残留 electron-vite/electron, 避免端口漂移与子进程冲突。
2. 截图前必须轮询确认 electron 主进程 (Contents/MacOS/Electron) 存活, 而非仅看 vite 端口。
3. 本机另一项目 interview-script 长期占用 5173, berth 正常落到 5174+。

## 建议的流程改进 (已落地)
.agents/workflow/verify.md: 前端视觉验收步骤前置 "清理同项目残留 dev 进程 + 轮询 electron 主进程就绪"。
