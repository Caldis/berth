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

# EVOLUATION
当用户对先前的任务或指令进行纠正或指示时, 你需要在验证其有效性后将其写入 issues

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

命令: /opsx:new · continue · explore · design · implement · verify · archive · optimization