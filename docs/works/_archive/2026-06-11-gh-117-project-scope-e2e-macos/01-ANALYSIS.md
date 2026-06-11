# 需求分析 (Explore 产物)

> GH-117, 2026-06-11, macOS 真机调查。结论: **e2e harness fixture 隔离缺失, 非产品 bug, 非 macOS 平台差异**。

## 根因 (已实证定性)

`tests/e2e/project-scope.e2e.ts` 的 fixture 只隔离了 `CODEX_HOME` 与 `--user-data-dir`, **没有隔离 HOME** — berth 主进程经 `src/main/agent-homes.ts` 的 `os.homedir()` 解析 claude home (`~/.claude`) 等 home 级扫描根, 直接扫到宿主机真实数据。在本机 (主力开发机, `~/.claude` 数据量大):

1. 弹层 candidates 16 项 (fixture 仅造 1 项目, 其余为宿主真实项目)。
2. 点击 `app` option **36ms 即命中** (spinner 立即出现, `selectScope` 已触发) — 点击事件没有丢失。
3. `selectScope` 的 `activate`(全量重扫, 实测 **10047ms**, 产出 393 资产) + `snapshot`(93ms) 链路总计 **~10.3s**, 而 `expect(trigger).toContainText('app')` 默认只等 **5s** → 稳定超时。
4. 杀手验证: launch env 加 `HOME=<fixture 空目录>` 后, 同一 UI 序列 **133ms** 完成 (78 倍差), option 列表 3 项 (纯 fixture)。

Windows 本地与 CI 绿的原因: 那些环境的 home 干净, 同链路秒级。"macOS 失败" 是表象, 真实变量是**宿主 home 数据量** — 任何 `~/.claude` 大的机器 (无论平台) 都会红。"重试 7 次稳定失败" 与数据污染的确定性一致。

### 证据链 (探针脚本, 均在系统临时目录运行后清理)

| 探针 | 内容 | 结果 |
|---|---|---|
| A (IPC 直通) | 绕过 UI: candidates → setScope → activate → search | 全绿: candidates 派生出 `app`, activate 正常返回, search 命中 `e2e-skill` → 产品 IPC 链路无 bug |
| B (UI 时间线) | 重演点击序列, 50ms 采样 | click +36ms spinner 出现 → t+10330ms trigger 变 `app` 弹层关闭 → 功能正确, 只是慢于断言窗口 |
| B --isolate-home | 同上 + `HOME=fixture/home` | t+133ms 完成; optionCount 16→3 |
| C (分解计时) | 未隔离下分别计时 | setScope 3ms / **activate 10047ms** / snapshot 93ms |

复现性: 原样跑 (摘 skip) 失败形态与 2026-06-08 记录逐字一致 (trigger 停 `Global`, `aria-expanded=true` 弹层仍开, retry 同败)。

## 现状理解

- **renderer**: `src/renderer/src/components/layout/project-scope-switcher.tsx` — 手写弹层 (button + 条件渲染 `role=listbox`, 无 HeroUI/framer-motion 动画), `selectScope` 对 project 模式串行 `setScope` → `activate` → `snapshot` → `setScopeSelection`; 全程 loading spinner, 失败显示 error 块。组件行为正确, 本任务不改。
- **IPC**: `project-scope:candidates` / `project-scope:set-scope` (无重扫, 3ms) / `project-scope:activate` (触发重扫) — `src/main/ipc/handlers.ts:115-128`。契约正确, 本任务不改。
- **main home 解析**: `src/main/agent-homes.ts` — claude dirs = `path.join(os.homedir(), '.claude')`; `os.homedir()` POSIX 下优先 `$HOME` env (探针实证隔离生效), win32 下读 `USERPROFILE`。另有 `BERTH_EXTRA_CODEX_HOMES` / `BERTH_EXTRA_CLAUDE_DIRS` 追加机制, 无覆盖型专用 env。
- **e2e 隔离面审计** (6 文件, `electron.launch` 调用点为符号边界):

| 文件 | user-data-dir | CODEX_HOME | HOME | 备注 |
|---|---|---|---|---|
| project-scope.e2e.ts | ✅ | ✅ | ❌ | 本案; 全仓唯一 darwin skip (line 12) |
| global-shallow-scope.e2e.ts | ✅ | ✅ | ❌ | 绿 (arrayContaining 容忍宿主多余项 + 不走 activate 慢链路) |
| incremental-watch.e2e.ts | ✅ | ✅ | ❌ | 绿 (断言不依赖宿主数据) |
| snapshot-persistence.e2e.ts | ✅ | ✅ | ❌ | 绿 (同上) |
| app.e2e.ts | ✅ | ❌ | ❌ | 连 CODEX_HOME 都没隔离 |
| window-controls.e2e.ts | ✅ | ❌ | ❌ | win32-only, 不依赖数据 |

未隔离 HOME 的共性风险: 这些测试的运行时间与确定性都依赖宿主数据状态 (本次 project-scope 被击中; 其余只是断言恰好宽松)。

## 关联与依赖

- darwin skip 全仓只有 `project-scope.e2e.ts:12` 一处 (window-controls 的 skip 是 win32-only 语义, 不属本案)。
- 关联 friction: `_archive/20260608-3.0-implement-e2e-build-artifact-stale-platform-baseline` (当时 baseline 对比已排除代码改动, 结论"既有平台差异" — 本次修正: 是**环境数据差异**, 非平台差异); `_archive/20260606-3.0-implement-scope-filter-broke-search-e2e` (同测试, 历史上由改动引起, 与本次无关)。
- 旁支产品发现 (不属本任务验收范围, 已追记): **真实数据量下 activate 全量重扫 10s** — 真实用户切 project scope 时 spinner 转 ~10 秒, 与 indexer 主线「切换仅 narrow-down 过滤、不触发扫描」的目标模型冲突。已追记至 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` (本任务只交叉引用)。

## blast radius (符号边界)

修复仅触及 `tests/e2e/*.e2e.ts` 的 `electron.launch` env 构造 (6 个调用点) + 移除 1 行 skip。**产品代码零改动** (`src/` 不动)。门禁影响: e2e 仅本地跑 (prepush 不含 e2e), CI 的 Windows e2e 行为预期不变 (保守方案不动 win 路径, 见未决问题 1)。

## 任务分类与 debt 校准

- type / maintenance.subtype: bug 维持 (来源 BUG issue, 修复对象为 e2e harness 缺陷); 无 subtype。
- source.kind / refs: docs-issues 维持; refs 不变。
- debt estimate 修正: incurred 2→1 (产品零改动), repaid 1→2 (移除 skip 偿还 macOS 覆盖洞 + 6 文件隔离根除宿主依赖), net 1→-1。
- scope / risk / areas / confidence: scope=module 维持 (tests/e2e 单模块); **risk medium→low**; areas=[testability] 维持; **confidence low→high** (根因三重实证)。
- revision: 已追加 `debt.revisions[0]` (1.0-explore, 2026-06-11)。

## 验收标准

1. **AC-1**: `project-scope.e2e.ts` 不再含 `test.skip(darwin)`; macOS 本地 `pnpm build && pnpm test:e2e project-scope` 绿 (含原失败断言 `toContainText('app')`, 不放宽任何断言、不延长断言超时)。
2. **AC-2**: 全部 6 个 e2e 文件的 `electron.launch` env 完成 home 隔离 (POSIX `HOME` 指向 fixture 空目录; Windows 方案按 design 决策); `app.e2e.ts` 同时补齐 `CODEX_HOME` 隔离。
3. **AC-3**: 隔离后 e2e 不再受宿主 `~/.claude` 数据影响 — 验证手段: project-scope 测试中弹层 option 数 = fixture 预期 (3: Global/User/app), 或等价断言/日志证据。
4. **AC-4**: macOS 本地全量 `pnpm test:e2e` 通过 (window-controls 的 win32-only skip 除外); 推送后 CI (Windows) 保持绿。
5. **AC-5**: `docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md` 按 5.0-archive 硬项补根因结论与关联 commit 后移 `resolved/`。

## 界面质量与交互验收

不适用 — 本任务仅改 e2e harness 隔离 (tests/e2e), 产品 UI 零改动; 探针 B 已确认 ProjectScopeSwitcher 交互行为正确 (点击命中、loading 反馈、完成后关闭弹层)。

## 未决问题

1. **Windows 是否同步隔离 `USERPROFILE`**: 保守方案只设 `HOME` (win32 `os.homedir()` 不读 `HOME`, Windows 行为零变化, CI 维持现状绿); 激进方案双平台隔离 (一致性更好, 但 `USERPROFILE` 影响 Electron 自身路径推导, 有未经实证的新风险, 且本机无法验证 win)。倾向保守方案 + 代码注释言明 win 未隔离的已知差异。
2. **隔离写法**: 6 处各自加 env 行 vs 抽共享 launch helper (`tests/e2e/` 内)。6 处 env 构造已轻度漂移 (app.e2e 缺 CODEX_HOME), helper 可根除漂移但属小重构; 最小改动则逐文件补 env。倾向 helper (一次收敛, 杜绝下次新 e2e 再漏)。
3. (非阻塞) `global-shallow-scope` 等测试隔离后断言是否顺手收紧 (如 candidates 精确计数) — 默认不动 (不扩大断言面), 仅记录。
