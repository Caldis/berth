# 需求分析 (Explore 产物)

## 现状理解
- 事故现场是本机 production `/Applications/Berth.app`, 版本 `0.5.0`, bundle id `com.berth.app`。
- 现场进程从 2026-07-06 约 10:36 CST 运行到捕获时超过 5.5 小时。userData: `/Users/caldis/Library/Application Support/berth`。
- 现场快照复制到 `/tmp/berth-gh-157-20260706-160837`, 包含 `main.log`, `scan-engine-settings.json`, SQLite `.backup` 和 App Info.plist 摘要。
- SQLite `snapshot_meta.envelope` 显示 `projectDir: "/"`, `status.state: "error"`, error 为 `Asset scan helper sent no message for 120000ms; killed as wedged`。
- `scan-history` 50 条全是失败, 多数 `durationMs≈120000`, `projectDir="/"`, `sourceCount=0`, 资产数从 21 缓慢涨到 28。
- `main.log` 从 2026-07-06T02:19:04Z 到 08:04:26Z 反复记录同一 `asset-runtime` watchdog 错误。
- `sample` helper pid 显示主要时间在 `uv_fs_scandir/scandir/readdir/open`, 与全盘根目录遍历一致。
- 当前发布源码 `resolveDefaultProjectDir({ isDev:false, cwd: process.cwd() })` 直接返回 cwd; macOS 双击 `.app` 时 cwd 为 `/`, 因此 production 默认把根目录当项目深扫。

## 关联与依赖
- `src/main/index.ts` 初始化 runtime 与 watcher 时使用 `resolveDefaultProjectDir`。
- `AgentAssetRuntime` 将 `projectDir` 下沉到 `HelperAssetScanner` 和 background deep index queue; `projectDir="/"` 会扩大 watcher/project roots 与 project deep scan 范围。
- `ScanHelperHost` 有 120s full-scan inactivity watchdog 和 600s project-deep watchdog, 但当前日志只有错误 stack, 缺少 request type / project root / helper pid / transaction result。
- 左侧 agent 选择器依赖 `agent-plugins:list` 与 scan sources; 现场 `sourceCount=0`, 所以 agent 列表未达到可切换条件。

## 任务分类与 debt 校准
- type: bug
- source.kind / refs: user-request / GH-157
- debt estimate 修正: 8 -> 7
- scope / risk / areas / confidence: cross-process / high / performance,testability,architecture / medium
- revision: 生产现场已复现核心根因, 风险从未知全局收敛为 packaged cwd/root 防护 + helper 可观测性。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. production/macOS packaged app 的 unsafe cwd (`/`, `.app` bundle 内路径, Windows drive root) 不会被默认设置为 `projectDir`。
2. 真实项目 cwd 仍可作为 projectDir, dev 模式仍不设置默认项目。
3. scan helper 日志包含可配置等级 `verbose/info/warning/error`, 且事务 start/progress/done/watchdog/exit/error 有可定位字段。
4. 日志默认保留 info/warning/error, 可通过配置启用 verbose, error 仍兼容旧 `log()` 调用。
5. 目标 unit tests 覆盖默认目录、日志等级过滤和 helper host 行为。
6. 现场重现证据能解释用户症状: 索引极慢、120s timeout、agent selector 不出现。

## 界面质量与交互验收
本轮不改 UI 布局。左侧 agent selector 缺失是数据链路症状: scan sources 未完成导致 detected agents 少于 2 个。验收通过 runtime 数据恢复间接覆盖。

## 未决问题
无阻塞澄清。后续可选: 发布后在 production app 中重新触发 rebuild 观察完成时间与新日志。
