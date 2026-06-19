# 技术方案 (Design 产物) — GH-142 scan-exclude 下沉 + respectGitignore 接入

每条回指 01-ANALYSIS 验收标准编号 (AC1-8)。

## 决策汇总 (对应 01-ANALYSIS 未决问题)

- **D1 过滤机制**: 统一走 glob `ignore` 的 `IgnoreLike` 对象 (`{ignored(p), childrenIgnored(p)}`)。`childrenIgnored` 剪枝目录遍历 → 省 readdir;`ignored` 过滤 → 省 parse。证据: glob@11 文档 (childrenIgnored 支持函数, p 为 Path 对象含 `.fullpath()`/`.relative()`)。
- **D2 ignore 库**: 引入 `/kaelzhang/node-ignore` (纯 JS gitignore spec, ESLint 同款, 无原生构建)。**约束**: `ignores()` 要求相对 + posix 路径, 绝对/`./`/`/abc` 会 throw;用 `isPathValid` 预过滤 + `path.relative` + 转 `/`。
- **D3 gitignore 作用范围**: 首版只读**项目根** `.gitignore` + `.berthignore`;嵌套累积子目录 gitignore 列后续 issue。respectGitignore 仅作用于 cwd=projectDir 的项目树递归枚举。
- **D4 .berthignore**: 同 gitignore 语义, 项目根, 与 `.gitignore` 规则合并进同一 ignore 实例 (`.berthignore` 后 add, 可覆盖)。
- **D5 filterExcludedPaths 去留**: **保留** `scanner.ts:129` 作兜底 (覆盖未下沉 adapter 的 excludePaths 正确性), 主过滤在 glob ignore。双保险, 低成本。
- **D6 excludePaths 语义**: 保持绝对路径前缀 (`isPathInside`, 向后兼容), 不改 glob pattern。

## 聚焦策略 (范围边界)

8 个 adapter 都用 glob 枚举, 但成本与 gitignore 价值集中在 **claude-code 的项目树递归** (`scanner.ts:128-136` `glob.sync('**/CLAUDE.md', {cwd: projectDir})`, 遍历整个用户仓库)。GH-117 实测 scope 切换全量重扫 10s 的主成本即在深递归。

**首版**: excludePaths+gitignore 的 glob ignore 注入只落 claude-code 项目树递归 glob;其他 adapter (codex/cursor/gemini/copilot/opencode/openclaw/hermes + claude-code 的固定目录 scanDir) 保持 `filterExcludedPaths` 结果后过滤 (正确性不变, 固定目录枚举本身快, 下沉收益递减)。
**后续 issue** (收尾记录): 其他 adapter excludePaths 枚举层下沉 + 嵌套累积 gitignore。

## 数据契约

跨进程新增 `respectGitignore` (excludePaths 已贯通至 scanner, 仅需续传给 adapter):

| 边界 | 文件 | 类型 | 改动 |
|---|---|---|---|
| runtime → coordinator | `scan-coordinator.ts:10-17` | `AssetRuntimeScanOptions` | + `respectGitignore?: boolean` |
| coordinator → worker | `worker-host.ts:14-21` | `AssetWorkerData` | + `respectGitignore?: boolean` |
| worker 解包 | `worker.ts:23` | workerData | + 读 `respectGitignore` |
| runtime 取值 | `runtime.ts:405` | scan opts | + `respectGitignore: this.settings.respectGitignore` |
| scanner → adapter | `scanner.ts:71-94` | `adapter.scanAll(opts)` / ScanContext | 续传 `excludePaths` + `respectGitignore` 给 adapter |

> AC5 (跨进程传递)。adapter.scanAll 当前不接收 excludePaths — 需扩展 adapter 接口 (adapter-api) 或 ScanContext 携带。

## 模块结构

新增 `packages/berth-scan-engine/src/engine/scan-ignore.ts` (引擎内, 不在 adapter, 供 scanner 构造后传 adapter):

1. `loadProjectIgnore(projectDir, { respectGitignore }): Ignore | null`
   - respectGitignore=false → null (AC4)。
   - 读 `projectDir/.gitignore` + `projectDir/.berthignore` (缺失跳过);都无 → null (AC6 非 git 目录健壮)。
   - `ignore().add(gitignoreText).add(berthignoreText)`。
2. `buildScanIgnore({ projectDir, excludePaths, projectIgnore }): IgnoreLike`
   - `ignored(p)` = excludePaths 命中 (`isPathInside(p.fullpath(), ex, {includeEqual:true})`) || (projectIgnore && gitignoreHit(p))。
   - `childrenIgnored(p)` = 同 ignored 逻辑 (剪枝目录, AC1/AC8 省 readdir+parse)。
   - `gitignoreHit(p)`: `rel = toPosix(path.relative(projectDir, p.fullpath()))`;`isPathValid(rel) && projectIgnore.ignores(rel)` (D2 约束)。

注入点 (claude-code `scanner.ts:128-136`): 现硬编码 `ignore: [6 项]` → 合并为 `ignore: buildScanIgnore(...)` (保留 6 项硬编码 default 作为 projectIgnore 之外的恒定剪枝, 或并入)。

兜底: `scanner.ts:129 filterExcludedPaths` 保留 (D5)。

依赖: 根 `package.json` `dependencies` + `ignore`;electron.vite `externalizeDepsPlugin` + tsup external 均从 node_modules 解析 (AC 无关, 构建前置)。

## 界面质量与交互验收

不适用 (引擎/扫描层, 无 UI 变更)。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外 |
|---|---|---|---|---|
| loadProjectIgnore: 加载 .gitignore/.berthignore, 非 git 返回 null, respectGitignore=false 返回 null | unit | `tests/scan-ignore.test.ts` (新) | `pnpm --filter @berth/scan-engine test` | - |
| buildScanIgnore: excludePaths(fullpath) 命中 + gitignore(relPosix) 命中 + childrenIgnored 剪枝 + isPathValid 边界 | unit | 同上 | 同上 | - |
| claude-code nested glob 注入: 被忽略/排除路径不产生 parser 调用 (spy) | unit | `tests/adapters/claude-code-nested-ignore.test.ts` (新) | 同上 | - |
| excludePaths 下沉前后结果集合一致 (AC2 无回归) | integration | `tests/scanner.test.ts` (扩展) | 同上 | - |
| respectGitignore 真实临时目录 (.gitignore 排除子目录) 扫描结果 | integration | 同上 (临时 dir fixture) | 同上 | - |
| 跨进程 respectGitignore 字段规范化/传递 | unit | `tests/settings.test.ts` (扩展) | 同上 | - |
| batchPauseMs 背压 sleep 生效 (AC7) | unit | `tests/scanner-backpressure.test.ts` (新) | 同上 | sleep spy, 不真等 |

## 验收标准映射

| SPEC 项 | AC |
|---|---|
| buildScanIgnore.ignored excludePaths + 注入 | AC1, AC8 |
| 下沉前后结果一致 integration | AC2 |
| loadProjectIgnore + gitignore 注入 | AC3 |
| respectGitignore=false → null | AC4 |
| 跨进程 respectGitignore 字段 | AC5 |
| 非 git 目录 loadProjectIgnore 返回 null | AC6 |
| batchPauseMs spy 测 | AC7 |
| childrenIgnored 剪枝 + parser 未调 spy | AC1, AC8 |

## 任务分类与 debt

- type maintenance / subtype performance;source docs-issues。
- debt.estimate: incurred 3 / repaid 3 / net 0 (explore 已校准, design 方案聚焦后维持)。areas [performance, dependency]。confidence medium。
- debt.final 预期: net ≈ 0 (新依赖+matcher 的 incurred 被深递归省 IO + 修 no-op 的 repaid 抵消)。
- Project 字段: 随 archive `done` 同步。
