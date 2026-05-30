# WEB_INFO_SEARCH
- 始终使用英文检索内容

# VERSION_MANAGEMENT
- 不使用 worktree

# DOCS
存放冷文档目录

# PLANS
存放任务计划和执行清单, 每次启动时先检索该目录, 并询问用户是否继续最近任务

# ISSUES
存放发现的 bug、需要改进的功能、以及其他任何需要跟踪的问题

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
当用户对先前的任务或指令进行纠正或指示时, 你需要在验证其有效性后将其写入 issues
- 在 harness 工作流 (opsx-*) 任务过程中, 用户给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction (docs/friction/), 并在当轮落地优化, 无需用户提示 "记下来"。详见 `.agents/workflow/_shared.md` 不变量 6。
- 判定归属: 针对当前任务执行过程的反馈 → friction; 针对产品功能/缺陷的反馈 → issues。
- 沉淀产物本身 (friction / works / 文档) 必须先过 `pnpm harness:check` (命名/阶段/结构合规) 才能提交; 不可未验证就 commit。沉淀指令的完备性 = 主动记录 + 产物过闸门。

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
- 任务态 (操作目录, 非冷文档): `docs/works/{date}[-{jira}]-{summary}/`
- 工程摩擦: `docs/friction/{yyyymmdd}-{phase}-{summary}.md`
- 自检/分发: `pnpm harness:check` / `pnpm harness:sync` (CI 强制)

## 何时进入 (强制)
- feature / bug 开发任务: 落代码前必须先用 `opsx-new` 建任务态, 再按 explore → design → implement → verify 推进; 禁止跳过 new 直接 Read/Edit 进实现或调试。
- 小改动豁免: 单行/拼写/纯文案注释, 或满足"单一文件·单一关注点·标准门禁 (typecheck/lint/test) 即可验收·无需跨文件根因分析或人工意图澄清"的小改动 (如弃用 API 替换、局部重构), 可直接处理 + 跑门禁 (含可测试性), 不建任务态。小改动豁免前必须先声明豁免依据并征得用户确认。
- 边界存疑按非平凡处理, 默认走 harness; 进行中的任务用 `opsx-continue` 续跑, 不重新 new。

入口: opsx-new · opsx-continue · opsx-explore · opsx-design · opsx-implement · opsx-verify · opsx-archive · opsx-optimization
