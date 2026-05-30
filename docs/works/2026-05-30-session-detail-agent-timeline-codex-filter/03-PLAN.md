# Implementation Plan

- [x] 扩展 shared 类型: AgentView、SessionSummary.agentId、SessionToolEvent、SessionArtifacts、IPC 参数。
- [x] 把 AssetScanner 改为多 adapter 聚合, 加入 CodexAdapter 的 session 扫描。
- [x] 为 Claude session 增加 detail parser, 输出工具时间线和产物摘要。
- [x] 为 Codex rollout 增加 meta/detail parser, 宽容读取本地 JSONL。
- [x] 更新 IPC handlers: agentView 过滤、agentId summary、按 agent 分派 detail parser。
- [x] 更新 preload 类型和 renderer hook, 让 `useSessions` 传递 agentView。
- [x] 在 store/sidebar 中加入 all/claude/codex dropdown。
- [x] 更新 Overview/Sessions/SessionDetail, 展示筛选后的列表、工具时间线和产物。
- [x] 更新配置页资产过滤, 让当前视角对 Instructions/Capabilities 生效。
- [x] 补测试: Claude detail parser、Codex parser、session pages、sidebar agent view。
- [x] 跑完整验证: test/typecheck/lint/build/harness:check。

## 验证中修正

- Codex 本地可能有多个 rollout 共享同一个 session id。已将 Codex session asset id 改成 `sessionId + transcriptPath hash`, 保留 `meta.sessionId` 给界面与后续查询使用。
- Codex timeline 在真实数据中可能超过数百条。已给工具时间线加最大高度与内部滚动, 避免把加载资产与产物区推到很远。
