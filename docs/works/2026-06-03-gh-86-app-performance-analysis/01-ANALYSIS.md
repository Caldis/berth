# 需求分析 (Explore 产物)

## 现状理解
涉及 Electron main、preload、renderer 三层:
- 启动: `src/main/index.ts` 创建 `BrowserWindow({ show: false })`, 在 `ready-to-show` 后显示窗口; 同时初始化 `AssetScanner` 与 `AssetWatcher`。
- renderer 首次加载: `AppLayout` 调用 `useAssets()`, 触发 `window.api.assets.scanAll()`。
- 默认 Overview: 同时触发 `sessions:list`、`usage:summary`、`assets:health-check` 三类派生 IPC。
- main 侧扫描: `AssetScanner.scanAll()` 串行调用 Claude 与 Codex adapter, 然后 `assets:scan-all` handler 构建 MiniSearch index。
- 数据热点: Claude 扫 `~/.claude/projects/*/*.jsonl`; Codex 扫 `~/.codex/sessions/**/rollout-*.jsonl` 与 `~/.codex/archived_sessions/**/rollout-*.jsonl`。

官方约束:
- Electron performance docs 要求避免在 main process 执行长任务与同步 I/O, 并建议把 CPU-heavy 工作转移到 worker threads / 独立进程 / renderer worker。来源: https://www.electronjs.org/docs/latest/tutorial/performance
- Electron `BrowserWindow.ready-to-show` 在复杂应用中可能过晚, 官方建议复杂应用可立即显示窗口并设置接近背景色的 `backgroundColor`。来源: https://www.electronjs.org/docs/latest/api/browser-window
- Electron IPC 是 main/renderer 通信路径; 当前 heavy scan 通过 `ipcMain.handle` 从 renderer 触发。来源: https://www.electronjs.org/docs/latest/tutorial/ipc

## 关联与依赖
调用关系:
1. `AppLayout -> useAssets -> assets:scan-all -> AssetScanner.scanAll -> ClaudeCodeAdapter.scanAll + CodexAdapter.scanAll -> search.buildIndex`。
2. `Overview -> useSessions/useUsageSummary/useHealthChecks -> sessions:list/usage:summary/assets:health-check -> ensureScanned()`。
3. `ProjectScopeSwitcher -> project-scope:activate -> activateProjectScope -> initScanner/scanAll/search.buildIndex/watcher.restart`。
4. `Sessions` 与 `Usage` 页面各自重新请求 `sessions:list` / `usage:summary`, 没有复用 store 中已有 `recentSessions` / `usageSummary`。

历史设计取舍:
- GH-77 已引入 project scope runtime, 项目切换会重建 scanner、search index 与 watcher。
- GH-79 已处理 health check 重复刷新, renderer 有 60 秒 health cache 与 in-flight 去重。
- GH-81 已让 `assets:scan-all` 构建 search index, `assets:search` 读取当前 scanner 资产。
- GH-85 继续复用 `assets:scan-sources` 与 project candidates, 未新增扫描契约。

本机证据:
- 数据规模: Claude JSONL 177 个文件 / 335,289,783 bytes; Codex rollout 635 个文件 / 778,014,060 bytes。
- JSONL 逐行 parse 采样: Claude 全量 1,462.1 ms; Codex 前 100 个文件 1,059.4 ms; Codex 全量 2,763.8 ms。
- Electron 首屏实测: `firstWindowMs=1245`, `domMs=1347`, `heroMs=14459`, `overviewDataMs=44479`。
- IPC 分解: `assets.scanAll=5333 ms`, `sessions.list.limit5=17.4 ms`, `usage.summary.7d=41.3 ms`, `usage.summary.all=815.3 ms`, `assets.healthCheck.noRefresh=18.3 ms`。
- `assets.scanAll` payload: 857 assets, JSON payload 1,214,895 bytes, raw 217,216 bytes, meta 735,493 bytes; session asset 812 个。

主要性能问题:
- main process 内大量同步文件读取、glob 与 JSONL parse, 与 Electron 官方性能建议冲突。
- 首屏 `show: false + ready-to-show` 会把 main process 阻塞放大为“窗口迟迟不可见”。
- scanner 只做 in-flight 去重, 不做“已扫描且数据未变”的复用; renderer 页面重载或手动刷新会重新全量扫描。
- Codex session meta 每次全量读取 rollout JSONL, 当前没有基于 mtime/size 的增量索引。
- renderer store 已有 assets/stats/recentSessions/usageSummary 字段, 但页面 hook 大量使用本地 state, 页面切换时继续走 IPC 派生计算。

## 任务分类与 debt 校准
- type / maintenance.subtype: `maintenance / performance` 仍准确。
- source.kind / refs: `user-request`, refs 为空。
- debt estimate 修正: 数值不变; explore 证据将 confidence 从 low 调整为 medium。
- scope / risk / areas / confidence: `cross-process / medium / performance,testability,architecture / medium`。
- revision: 已在 INDEX 记录 confidence 校准。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 首屏显示不再被全量扫描阻塞; Electron 窗口应在 2 秒内显示可见 shell 或明确加载态。
2. `assets:scan-all` 在本机同等数据规模下不再每次读取全部 JSONL; 二次扫描应使用 mtime/size/hash 索引或等价缓存。
3. Codex rollout 与 Claude session meta 解析必须有单元测试覆盖缓存命中、缓存失效、活动文件变化与 parse error。
4. Overview 不应同时造成多条重复 heavy scan; scan in-flight 与已完成结果复用要有测试证明。
5. Usage/Sessions 页面切换不应重新做可复用的全量派生计算; 若仍请求 IPC, 必须有明确的输入变化。
6. Search index 构建不能在无资产变化时重复执行; project scope 变化除外。
7. verify 阶段需要保留基准与优化后 benchmark: JSONL parse、`assets.scanAll`、首屏 `heroMs`、Overview 数据完成时间。
8. 不改变安全边界: 仍只读本地数据, 不把凭据或 session 内容送到 renderer 之外。

## 界面质量与交互验收
- 现有结构: sidebar + top navigation + Overview cards/panels; 启动期间 Overview 依赖 loading skeleton / health loading。
- 用户路径: 启动应用 -> 查看 Overview; 切换 Sessions / Usage; 切换 project scope。
- 状态风险: 如果扫描移到后台, Overview 必须展示稳定 shell、扫描中状态、旧数据 stale 状态和错误状态。
- 交互风险: project scope 切换期间要禁用重复选择或显示明确 loading, 避免多次触发重建 scanner。
- 可访问性风险: loading/stale 状态需要 `role=status` 或可读文本; 不能只靠 spinner。

## 未决问题
无需用户澄清。Design 阶段需要决定首个实现切面:
1. 先修窗口显示与首屏加载态。
2. 先做 session meta 增量索引。
3. 先做 renderer store/IPC 派生数据复用。
