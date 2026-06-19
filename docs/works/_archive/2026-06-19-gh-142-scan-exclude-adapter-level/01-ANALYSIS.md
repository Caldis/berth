# 需求分析 (Explore 产物) — GH-142 scan-exclude 下沉 + respectGitignore 接入

## 现状理解 (进程 / 模块 / IPC 契约)

扫描内核运行在 utilityProcess 长驻 helper (GH-135)。扫描链路:
`runtime → scan-coordinator → worker-host → worker (worker_threads) → scanner → adapter`。

两个 adapter 都是 **glob 枚举 → 逐文件 parse** 模式 (理想下沉点):
- claude-code `scanDir`: `adapters/claude-code/scanner.ts:583-598` — `safeGlob(pattern, dir, ctx)` 列文件后逐个 `safeScan(... parser ...)`。
- codex `scanDir`: `adapters/codex/index.ts:304-335` — `glob.sync(pattern, {cwd, absolute:true})` 后逐个 `safeScan`。

**用户项目目录递归扫描 (gitignore 最相关点)**:`adapters/claude-code/scanner.ts:128-136`
`glob.sync('**/CLAUDE.md', {cwd: projectDir, ignore: ['**/node_modules/**','**/.git/**','**/dist/**','**/out/**','**/build/**','**/.next/**']})` —— 遍历整个用户代码仓库找嵌套约定文件,当前**只硬编码忽略 6 个目录**,用户 `.gitignore` 自定义排除目录 (vendored/generated/大数据) 不被尊重。

## excludePaths 现状 — 结果后过滤,不省 IO

- 数据流: `settings.ts:22/157` → `runtime.ts:160/405` → `scan-coordinator.ts:110` → `worker-host.ts:130` → `worker.ts:23` → `scanner.ts:129`。
- 过滤点: `scanner.ts:129` `filterExcludedPaths(...)` (定义 `scanner.ts:432-435`),对 **`Asset[]` (已 parse)** 过滤,用 `isPathInside(..., {includeEqual:true})`。adapter parse 完才剔 → 不省 IO/CPU。
- **断点**: excludePaths **不传给 adapter** (`scanner.ts:71-94` `adapter.scanAll` 不接收)。

## respectGitignore 现状 — 完全断裂 (no-op)

- 定义: `ipc.ts:266` + `settings.ts:23` (默认 true) / `:109` (UI 控件 `boolControl('respect-gitignore',...)`) / `:158` (规范化)。
- **断点**: `settings.ts:158` 后,runtime 加载但**不下传**;coordinator/worker/scanner/adapter 全不消费。设置项 UI 可配但扫描层无感知。

## 关联与依赖

- 路径工具: `shared/path-utils.ts` `isPathInside`(34-47) / `samePath`(13-22),平台感知大小写折叠,已被 `filterExcludedPaths` 复用,适用 adapter 层。
- 忽略基建: 根 `glob@11` / `chokidar@4`;**无 `ignore` 库**,无 `.gitignore` 解析。claude-code nested glob 已用 `ignore` 选项 (硬编码),codex 无任何过滤。
- 跨进程契约: `AssetWorkerData` (`worker-host.ts:14-21`, 有 excludePaths 无 respectGitignore)、`AssetRuntimeScanOptions` (`scan-coordinator.ts:10-17`, 同)。

## Blast radius (符号边界)

berth-scan-engine 包内,跨 2 进程边界 (main→worker→adapter)。非 UI。改动符号:
- 类型契约: `AssetRuntimeScanOptions` (+respectGitignore)、`AssetWorkerData` (+respectGitignore)、worker.ts 解包。
- 数据传递: `runtime.ts` (传 respectGitignore)、`scanner.ts` (透传 excludePaths+respectGitignore 给 adapter)。
- adapter 接收 + 枚举过滤: claude-code `index.ts` scanAll 签名 + `scanner.ts` scanDir;codex `index.ts` scanAll + scanDir。
- 新增: gitignore matcher 模块 + 可能新依赖 `ignore`。
- 测试: `tests/settings.test.ts` 已有;新增 adapter 枚举过滤 + matcher + 跨进程契约测试。

## 任务分类与 debt 校准

- type: maintenance / subtype: performance
- source.kind: docs-issues / refs: 2026-06-15-IMPROVEMENT-scan-exclude-adapter-level.md
- debt.estimate 修正: 初估 incurred 2 / repaid 3 / net -1。explore 后影响面比初估略大 (跨 worker 边界字段 + adapter 双改 + 新依赖 + gitignore matcher 新模块)。修正 → **incurred 3 / repaid 3 / net 0 / scope module / risk medium / areas [performance, dependency] / confidence medium**。
- revision: 2026-06-19 explore, net -1→0, areas +dependency, reason: 新增 ignore 依赖 + gitignore matcher 模块 + 跨进程字段, incurred 上调。

## 验收标准 (编号, SPEC 与 verify 据此核对)

1. **excludePaths 下沉**: 被排除路径下的文件不被 parse (可观测: parser/safeScan 不对被排除文件调用)。
2. **excludePaths 结果一致**: 下沉后扫描资产集合与下沉前 (`scanner.ts:129` 结果后过滤) 完全一致, 无回归。
3. **respectGitignore=true**: 递归项目枚举尊重项目根 `.gitignore` + `.berthignore`, 被忽略路径不出现在结果。
4. **respectGitignore=false**: 回到仅硬编码 ignore + excludePaths, 不读 `.gitignore`。
5. **跨进程传递**: respectGitignore 经 runtime→coordinator→worker→scanner→adapter 完整传递, worker 边界序列化正确。
6. **非 git 目录健壮**: 扫描目录无 `.gitignore` (如 `~/.claude` user scope) 时 respectGitignore=true 不报错、不改变结果。
7. **batchPauseMs 背压**: 补端到端/spy 测证明批间 sleep 生效 (issue 第三项)。
8. **性能可观测**: 被排除/忽略文件不产生 parse 调用 (spy parser 调用次数下降)。

## 界面质量与交互验收

不适用 (引擎/扫描层改动, 无 UI 变更)。

## 未决问题 (design 澄清)

- **D1 过滤机制**: glob `ignore` 选项/函数 (省 readdir, 不进入被忽略目录) vs glob 后路径过滤 (省 parse, 不省 readdir)?glob@11 `ignore` 支持函数 + `childrenIgnored` 剪枝目录 — design 前查 glob@11 文档 (不变量9)。倾向: 能转 glob ignore 的走 ignore (省 readdir)。
- **D2 respectGitignore 实现**: 新增 `ignore` npm 库 (gitignore spec, 准确) vs 手工 pattern 转换 (不准)。倾向 ignore 库;design 前查其 API + 维护状态 (不变量9)。
- **D3 gitignore 作用范围**: 仅项目根 `.gitignore` vs 累积嵌套子目录 `.gitignore` (严格 gitignore 是 per-directory)。倾向首版只读项目根 + `.berthignore`, 嵌套累积列后续。
- **D4 .berthignore**: 语义同 gitignore?位置 (项目根)?
- **D5 filterExcludedPaths 去留**: 下沉后 `scanner.ts:129` 结果后过滤保留作兜底 (双保险) 还是移除?倾向保留 (低成本防御)。
- **D6 excludePaths 语义**: 保持路径前缀 (isPathInside, 向后兼容) 还是支持 glob pattern?倾向保持前缀。

## 测试策略 (概要, 详见 02-SPEC)

- 单元: gitignore matcher (规则解析/匹配/否定规则)、adapter scanDir 过滤 (spy parser 未被调用被排除文件)、settings 规范化。
- 契约: 跨进程字段传递 (AssetWorkerData/AssetRuntimeScanOptions 含 respectGitignore)。
- 集成/e2e: excludePaths 下沉前后结果一致;respectGitignore 真实 `.gitignore` 目录;非 git 目录健壮;batchPauseMs 背压。
