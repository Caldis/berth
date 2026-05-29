# 工程摩擦记录

## 发生阶段
verify (反复启动 app 做视觉验收时)。严重级别: 高 (用户两次强烈指出)。

## 现象
1. 根因 A — 应用无单实例锁: Electron 默认允许同一 app 多开, 每次 `pnpm dev` 都起一个独立 electron 实例,
   屏幕上累积出 3 个 Berth 窗口。
2. 根因 B — Agent 进程检测命令写错: `pgrep` 模式漏了 pnpm 的 `.pnpm/electron@33.4.11/` 路径段,
   导致"检查运行实例"恒返回 0, 于是"检查→误判无实例→重启"恶性循环, 每轮又多一个窗口。
3. 叠加本会话工具输出严重延迟/乱序, Agent 多次误判进程状态。

## 工程师介入动作
用户两次截图强烈要求重视。Agent (a) 用精确 berth 限定模式 pkill 清零所有实例;
(b) 查 Electron 官方单实例方案, 在 src/main/index.ts 加 `app.requestSingleInstanceLock()` +
`second-instance` 事件 (第二实例自杀并聚焦已有窗口); (c) 实测确认: 跑 2 次 pnpm dev 时
electron 主进程仍只有 1 个 (修复前会是 2+)。

## 应沉淀的上下文或规则
1. **代码层根治**: Electron app 必须有 `requestSingleInstanceLock`, 否则 dev/生产都会多开。已落地 index.ts。
2. **检测命令必须用完整路径模式**: berth 的 electron 主进程路径含 `.pnpm/electron@<ver>/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`,
   且需 `grep -v -- '--type='` 排除 helper 子进程。简写 `pgrep -f 'berth/node_modules/electron'` 会漏掉 (.pnpm 软链)。
3. **启动前先查、能复用就复用**: 见 [[verify-dev-instance-not-checked]]; 本条是其代码层根因补全。
4. 任何"反复启动同一服务"出现 2 次以上, 立即停手查根因, 不靠加 pkill 打补丁。

## 建议的流程改进 (已落地)
- src/main/index.ts: 加单实例锁 (代码根治, 最重要)。
- .agents/workflow/verify.md: 进程检测命令更正为完整 .pnpm 路径模式 + 排除 helper; 启动前必查实例数。
