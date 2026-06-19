# 任务清单 (Design 产物 / 活清单) — GH-142

从 02-SPEC 拆解。引擎契约改动, **顺序执行** (字段契约 → 模块 → 注入 → 验证), 文件链式依赖不并行。
每项有测试证据或明确例外。implement 阶段维护此清单。

- [x] 任务 1: 加 `ignore` 依赖 + 跨进程 `respectGitignore` 字段打通
  - 范围: 根 `package.json` dependencies + `ignore` (pnpm 9 `pnpm add ignore`);`AssetRuntimeScanOptions` (scan-coordinator.ts) + `AssetWorkerData` (worker-host.ts) + worker.ts 解包 + runtime.ts:405 传 `respectGitignore: this.settings.respectGitignore`。
  - tests: `tests/settings.test.ts` 扩展 respectGitignore 规范化断言 (若未覆盖);跨进程字段经 typecheck + 现有 worker/coordinator 测不破。
  - verify: 不适用 UI。`pnpm --filter @berth/scan-engine typecheck` + 字段单测绿;`ignore` 解析 (vite/tsup external) 经 build 验证。
- [x] 任务 2: `engine/scan-ignore.ts` 模块 (loadProjectIgnore + buildScanIgnore)
  - 范围: `loadProjectIgnore(projectDir,{respectGitignore})` 读 .gitignore/.berthignore → Ignore|null;`buildScanIgnore({projectDir,excludePaths,projectIgnore})` → IgnoreLike (ignored/childrenIgnored, fullpath excludePaths + relPosix gitignore + isPathValid 预过滤)。
  - tests: `tests/scan-ignore.test.ts` (新): respectGitignore=false→null;无 ignore 文件→null;.gitignore 排除匹配;.berthignore 合并;excludePaths fullpath 命中;gitignore relPosix 命中;childrenIgnored 剪枝;isPathValid 拒绝非法路径。
  - verify: 不适用 UI。新单测全绿 (AC1/3/4/6/8 单元层)。
- [x] 任务 3: claude-code 项目树递归 glob 注入 buildScanIgnore
  - 范围: `adapters/claude-code/scanner.ts:128-136` 硬编码 ignore → 合并 buildScanIgnore (6 项默认 + excludePaths + projectIgnore);adapter scanAll/ScanContext 携带 excludePaths+respectGitignore (scanner.ts:71-94 续传)。
  - tests: `tests/adapters/claude-code-nested-ignore.test.ts` (新): 被 excludePaths/gitignore 命中的 nested CLAUDE.md 路径**不产生 parser 调用** (spy parseClaudeMd);未命中正常 parse。
  - verify: 不适用 UI。spy 断言被忽略文件 parse 次数为 0 (AC1/AC8 真实剪枝)。
- [x] 任务 4: filterExcludedPaths 兜底确认 + 下沉前后结果一致 (覆盖核实)
  - 兜底: `scanner.ts:129 filterExcludedPaths` 保留 (未删), 覆盖未下沉 adapter 的 excludePaths 正确性; 由 `tests/scanner-backpressure.test.ts` (4 tests) 验证。
  - AC2 (下沉无回归): claude-code-nested-ignore 验证 glob 层剪枝正确 (被排除资产不出现) + scanner-backpressure 验证兜底不误删未排除资产, 两者保证前后一致。
  - AC3/AC4/AC6: 已由 claude-code-nested-ignore (真跑临时目录 .gitignore on/off + excludePaths) + scan-ignore (非 git 返回 null) 覆盖。
  - 结论: 无需额外 integration 测试, 已充分覆盖 (nested-ignore 真实 fs+glob, 符 runtime-behavior-needs-real-run)。
- [x] 任务 5: batchPauseMs 背压 (AC7) — 实现已落地, 测试标例外
  - 实现已落地 (GH-135, `scanner.ts:118-120` `if batchPauseMs>0 await sleep`), 本 work 不改实现。
  - tests: not needed - `sleep` 是 `scanner.ts:433` 私有函数无注入点; 时序 spy 需构造完整 AssetScanner + mock adapter registry (现无此基建), 脆弱且 "时序节流不改扫描结果" (issue 原话)。替代验证: GH-135 真机 spike 已验证背压生效, 逻辑直白 (条件 + await) 由 review 保证。
  - verify: 不适用。
- [x] 任务 6 (收尾, 非实现): 记后续 issue → docs/issues/2026-06-19-IMPROVEMENT-scan-exclude-remaining-adapters-and-nested-gitignore.md
  - 其他 7 adapter excludePaths 枚举层下沉 + 嵌套累积子目录 gitignore (02-SPEC 聚焦边界外)。写 `docs/issues/`, 本 work 交叉引用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
