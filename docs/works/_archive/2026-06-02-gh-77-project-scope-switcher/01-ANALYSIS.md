# 需求分析 (Explore 产物)

## 现状理解
- 当前应用已有两套不同概念: `agentView` 是 all / claude / codex 的 Agent 过滤; `AssetScope` 是 user / project / enterprise / session 的资产来源层级。它们都不是用户提出的“全局 / 用户域 / 项目域”切换器。
- 左侧栏现在只有 Agent 选择器和设置入口。GH-75 已完成可调宽侧栏、顶部面包屑和 pin 按钮, 可以承载新的 scope 入口。
- `useAppStore` 保存全局 UI 状态和扫描结果, 但没有当前 scope、当前项目路径、项目候选列表或 scope 切换动作。
- `AssetScanner` 构造时接收一个 `projectDir`, `initScanner(projectDir)` 在主进程启动时只调用一次。当前 dev 下 `resolveDefaultProjectDir()` 返回 `undefined`, production 下用 `process.cwd()`。这意味着项目维度目前不是用户可切换状态。
- `AssetScanner.getScanSourceGroups()` 会补 `project.current-candidate` 和 `project.session-derived-candidate`, 说明项目候选已经有基础信息, 但只是 source coverage 的补充展示, 没有成为用户可选的应用状态。
- `sessions:list` 已有 `projectFilter?: string`, 但它是字符串模糊匹配, 用 `project` / `projectPath` / `projectDirName` 过滤。`assets:scan-all`、`assets:scan-category`、`usage:summary`、`hooks:statuses`、`agent-plugins:list` 还没有统一 scope 入参。
- Overview、Sessions、Instructions、Capabilities、Usage 都读取全局 store 或各自 IPC。Instructions / Capabilities 有页面内 `ScopeFilter`, 但它只过滤 asset.scope, 不等于应用级“用户域 / 项目域”。
- Claude Code 官方文档把 Managed / User / Project / Local 作为配置层级, 并列出项目文件位置: `.claude/settings.json`、`.claude/settings.local.json`、项目 `CLAUDE.md` / `.claude/CLAUDE.md`、`.mcp.json`、项目 subagents 等。参考: https://code.claude.com/docs/en/settings
- OpenAI Codex 官方文档说明 user config 在 `~/.codex/config.toml`, 项目级覆盖在 `.codex/config.toml`, 且项目级配置只在 trusted project 中加载; Codex 也会读取 `AGENTS.md` 作为项目说明。参考: https://developers.openai.com/codex/config-reference#configtoml 与 https://developers.openai.com/codex/config-advanced#project-instructions-discovery

## 关联与依赖
- Renderer 状态: `src/renderer/src/stores/app.ts` 需要新增 scope 状态。`Sidebar` 需要新增项目切换入口, 但 Agent 选择器仍要保留, 两者语义不能混淆。
- IPC 契约: `src/shared/types/ipc.ts` 需要定义应用级 scope 请求, 例如 global / user / project 以及 project path。后续 assets、sessions、usage 至少要能接受统一筛选条件。
- 主进程扫描: `src/main/engine/scanner.ts` 当前是单例, 项目切换如果需要扫描不同项目, 需要支持切换 projectDir 后重新扫描 / 重建 search index / 刷新 watcher。
- 项目候选来源: 可以从 session `projectPath`、当前 `scanner.getProjectDir()`、scan source candidates 合并生成。候选项需要稳定 id, 否则 UI 切换和测试会不稳定。
- 页面依赖:
  - Overview: stats、recent sessions、usage、health checks 都要尊重当前 scope。
  - Sessions: 可复用 `projectFilter`, 但应从模糊字符串升级为精确 project path。
  - Instructions / Capabilities: 页面内 scope filter 仍可保留为来源层级过滤, 但应用级 project scope 应先缩小资产集合。
  - Usage: `buildUsageSummary()` 当前只按 Agent 过滤, 需要按 project path 过滤 session assets。
  - Hooks / Health: project scope 下应传当前 projectDir, 但健康检查卡顿问题已有独立 issue, 本任务只避免新增阻塞。

## 验收标准
1. 应用存在统一的 scope 状态: global / user / project; project scope 必须带稳定 project path。
2. 左侧栏或底部区域有稳定可见的项目切换入口, 与 Agent 切换器区分清楚。
3. 项目候选至少来自当前 projectDir 和历史会话 projectPath; 重复路径去重, Windows 路径大小写归一。
4. 切换到 project scope 后, Sessions、Overview recent sessions、Usage 至少按精确 project path 展示数据。
5. Instructions / Capabilities 在 project scope 下只展示该项目相关项目资产以及仍然有效的 user / enterprise 基础层级; 页面内 asset scope filter 不应和应用 scope 冲突。
6. 切换 scope 后需要刷新资产、搜索索引和 watcher 相关状态, 不得保留上一项目的过期结果。
7. UI 有空态、加载态、长路径截断、键盘可达和 collapsed sidebar 状态; 不破坏 GH-75 的 resize / breadcrumb / window controls。
8. 测试覆盖 store 状态、项目候选归一、sessions/usage 过滤、sidebar 入口、至少一个 e2e 切换流程。

## 界面质量与交互验收
- 设计方向: 延续 GH-75 的黑白工具壳。项目切换器应是工作上下文控件, 视觉上靠近设置 / sidebar footer, 不做大卡片或营销式说明。
- 信息密度: 展示当前模式、项目名和短路径; 长路径用中间截断, hover/title 或详情行展示完整路径。
- 主要用户路径: 打开应用 -> 查看当前全局 -> 打开项目切换器 -> 选择项目 -> Sessions/Usage/Overview 同步变化 -> 切回全局。
- 可见状态: global、user、project 三种选中态要清楚; 无项目候选时提供空态, 不禁用整个导航。
- 交互反馈: 切换后显示扫描/loading 状态, 数据刷新失败时保留旧数据并提示 stale, 不清空页面。
- 响应式: Electron minWidth 900, 重点验证 expanded 和 collapsed sidebar; 切换器在 collapsed 状态下以图标入口 + tooltip/弹层呈现。
- 可访问性: 入口用 button/combobox 语义, 当前 scope 用 `aria-current` 或 `aria-pressed`; 弹层可键盘关闭并返回焦点。

## 未决问题
- 无阻塞问题。设计阶段需要决定一次性重扫 scanner, 还是先用现有资产做前端过滤; 若选择后者, 必须明确哪些项目级配置暂不精确。
