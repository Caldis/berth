# PRD 快照 (只读)

来源:
- 用户请求, 2026-06-13
- GitHub Issue: https://github.com/Caldis/berth/issues/131
- 关联现有 issue: `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md`

## 正文

将扫描引擎架构分析扩展为完整任务, 并按“后台索引服务 + 长驻 worker + scope 切换只过滤 + 插件接口收敛”的方向开始重构。

同时关注两个功能点:

1. 扫描引擎目前在整个应用中不可见。需要在设置中暴露统一入口, 展示扫描引擎版本、当前工作状态、索引文件总数、控制面参数、可调整策略和信息面。这个入口应成为扫描引擎的统一设置入口, 能如实反映扫描引擎的控制面和参数。
2. 扫描引擎接口定义需要具备开放性和独立可维护性。后续要接入更多 agent 能力插件, 包括但不限于 Gemini CLI、GitHub Copilot CLI、OpenClaw、Cursor、OpenCode、Hermes Agent。每个插件应可独立维护、独立发布、独立管理版本、独立更新; 每个插件在官网中有独立介绍和下载页。

Explore / Design 要派出多个子代理探索这些 agent 的协议和文件归档形式, 并参考官方文档、primary source 和可信开源项目的扫描策略完善插件与扫描策略。

## 初始工程判断

- 这是 feature, 同时偿还扫描引擎架构债。
- 必须保持 Claude Code / Codex 现有扫描、watcher、SQLite 冷启动、scope 过滤、健康检查和 session 相关能力不回退。
- 外部 agent 行为和文件格式必须用英文检索官方文档或 primary source; 官方无公开契约时, 才可标注为经验性策略。
