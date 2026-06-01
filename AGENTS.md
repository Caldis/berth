# WEB_INFO_SEARCH
- 始终使用英文检索内容

# VERSION_MANAGEMENT
- 不使用 worktree

# COMMIT_POLICY
- **最高优先级: 已验证、边界清楚的增量必须小步频繁提交。** 任何 feature / bug / harness 任务中, 完成一个可独立验证的子步骤并通过对应检查后, 立即只暂存自己相关文件、用 `git diff --cached` 核对 staged 集合、提交一次。
- 不允许把多个已完成阶段长时间堆在工作区最后一次性提交。若因为风险或依赖关系不能提交, 必须在当轮说明阻塞原因。
- archive / 收尾提交不能替代 implementation 过程中的小步提交。

# DOCS
存放冷文档目录; harness 操作态例外为 `docs/works/`、`docs/friction/`、`docs/issues/`

# ISSUES
产品 bug、功能与改进项统一存放在 `docs/issues/`

# TEST
必须满足可测试性

# BUILD_ENV
本地构建/运行的非显然约束 (从代码无法直接得出, 交接与起步必读):
- **必须 pnpm 9.x**。corepack 默认拉 pnpm 11, 会无视 `package.json` 的 `pnpm.onlyBuiltDependencies`, 跳过 better-sqlite3/electron/esbuild 构建脚本 (原生模块不编译、Electron 二进制不下载), 且生成无效 `pnpm-workspace.yaml` 导致所有 pnpm 命令报 `packages field missing`。起步先 `corepack prepare pnpm@9.15.4 --activate`; 已在 package.json 钉 `packageManager`。
- **node 经 nvm** `~/.nvm/versions/node/v24.3.0/bin` (非交互 shell 默认无 pnpm, 需 prepend PATH)。
- **dev 端口**: 5173 常被同机另一项目占用, electron-vite 自动跳 5174+。
- **单实例**: 应用已加 `requestSingleInstanceLock` (src/main/index.ts), 重复 `pnpm dev` 不会多开窗口; 第二个实例自杀并聚焦已有窗口。
- **UI 视觉验收截图**: 必须用 electron 主进程**实测窗口坐标**裁剪 (osascript 取 `{position, size}` of front window → 按显示器缩放比换算物理像素裁剪); 不可猜坐标。进程检测见 `.agents/workflow/verify.md` (完整 .pnpm 路径模式 + 排除 helper)。

# EVOLUATION
当用户对先前的任务或指令进行纠正或指示时, 你需要在验证其有效性后将其写入 `docs/issues/`
- 在 harness 工作流 (harness-*) 任务过程中, 用户给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction (docs/friction/), 并在当轮改进规则, 无需用户提示 "记下来"。详见 `.agents/workflow/_shared.md` 不变量 6。
- **friction 沉淀是 Agent 自主职责, 不是需审批的动作**: 识别到可复用工程摩擦后, 直接检查 `docs/friction/` 是否已有相关记录 — 有则合并、无则新建, 记录后过 `pnpm harness:check` 并在当轮事后向用户汇报即可。**严禁回头征求"是否要记录 friction"的同意** — 征求同意本身即一种元摩擦, 违背 "无需用户提示" 的既定规则。
- 判定归属: 针对当前任务执行过程的反馈 → friction; 针对产品功能/缺陷的反馈 → `docs/issues/`。
- 执行当前任务时发现已验证但不属于当前主线验收范围的产品 bug、功能缺口或改进项, 主动记录到 `docs/issues/`, 当前任务只做交叉引用; 不顺手修旁支问题, 除非用户明确扩大任务范围。
- **最高优先级**: 已验证、边界清楚的增量必须小步频繁提交; 每次只暂存和提交自己相关文件, 提交前必须用 `git diff --cached` 核对 staged 集合。不得用最后 archive/收尾提交替代 implementation 过程中的小步提交。
- 沉淀产物本身 (friction / works / issues / 文档) 必须先过 `pnpm harness:check` (命名/阶段/结构合规) 才能提交; 不可未验证就 commit。沉淀指令的完备性 = 主动记录 + 产物过闸门。

# Behavioral guidelines
to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# AI NATIVE WORKFLOW HARNESS
Agent 工作流体系, 单一真源在 `.agents/`, 同时服务 Claude Code 与 Codex。
- 总览与调用: `.agents/README.md`
- 流程 playbook: `.agents/workflow/` (Explore → Design → Implementation → Verify)
- 工具索引: `.agents/tools.md`; 项目地图: `docs/ARCHITECTURE.md`
- 任务态 (操作目录, 非冷文档): `docs/works/{date}-gh-{number}-{summary}/`
- 工程摩擦: `docs/friction/{yyyymmdd}-{phase}-{summary}.md`
- 产品问题: `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`
- 自检/分发: `pnpm harness:check` / `pnpm harness:sync` (CI 强制)

## 何时进入 (强制)
- feature / bug 开发任务: 落代码前必须先用 `harness-new` 建任务态, 再按 explore → design → implement → verify 推进; 禁止跳过 new 直接 Read/Edit 进实现或调试。
- 小改动豁免: 单行/拼写/纯文案注释, 或满足"单一文件·单一关注点·标准门禁 (typecheck/lint/test) 即可验收·无需跨文件根因分析或人工意图澄清"的小改动 (如弃用 API 替换、局部重构), 可直接处理 + 跑门禁 (含可测试性), 不建任务态。小改动豁免前必须先声明豁免依据并征得用户确认。
- 边界存疑按非平凡处理, 默认走 harness; 进行中的任务用 `harness-continue` 续跑, 不重新 new。
- 默认流程是 harness workflow。只有用户明确要求使用 Superpowers 流程时, 才允许 Superpowers 接管任务流程; 否则 feature / bug / harness 任务都按 harness 执行。
- 走 harness 时, Superpowers 只能作为方法参考, 不得创建 active `docs/superpowers/plans` 或 `docs/superpowers/specs` 产物, 不得要求 worktree, 不得覆盖 INDEX.phase, 不得把 `writing-plans` / `executing-plans` 的流程问答注入当前任务。
- `brainstorming` 可作为 design 的受控方法: 最多 3 个关键问题, 且问题必须影响范围、方案或验收标准。
- Agent 自主判断并行或顺序执行: 按文件是否重叠、模块边界、任务依赖和测试耦合度决定; 不把 subagent 并行或主 session 执行作为用户选择题。

入口: harness-new · harness-continue · harness-explore · harness-design · harness-implement · harness-verify · harness-polish · harness-archive · harness-optimization
