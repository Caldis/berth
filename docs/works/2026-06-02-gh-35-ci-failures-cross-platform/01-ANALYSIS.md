# 需求分析 (Explore 产物)

## 现状理解

最新 master CI run `26795038258` 在 `pnpm test` 阶段失败:

- ubuntu-latest: `tests/unit/agent-dev-core.test.ts` 失败 7 个测试。
- windows-latest: `tests/harness/sync.test.ts` 失败 5 个测试。

相关模块:

- `scripts/agent-dev-core.mjs`: dev agent 启停、截图、guard before/after、进程识别。
- `tests/unit/agent-dev-core.test.ts`: 使用模拟进程列表测试 dev agent 行为。
- `scripts/harness-sync.mjs`: 生成 `.agents/skills/*/SKILL.md` 与 `.claude/skills/*` 分发。
- `tests/harness/sync.test.ts`: 测试 harness sync 的分发、幂等和旧产物清理。
- `.github/workflows/ci.yml`: CI 在 ubuntu-latest 和 windows-latest 上依次运行 install、lint、typecheck、test、harness:check; ubuntu 额外 build。

Ubuntu 失败根因:

- `agent-dev-core.test.ts` 的 `makeContext()` 使用硬编码 Windows root: `D:\Code\berth`。
- 在 Linux runner 上, `createAgentDevContext()` 会把这个字符串解析成当前目录下的相对路径, 例如 `/home/runner/work/berth/berth/D:\Code\berth`。
- 测试里的模拟 command line 仍是 `D:\Code\berth\...`, 不再包含 `context.root`, 所以 `commandOwnsAgentDevState()` 和 `isProtectedUserDevProcess()` 判定失败。
- 这不是业务逻辑失败, 是测试 fixture 的路径与运行平台不一致。

Windows 失败根因:

- `scripts/harness-sync.mjs` 期望 `.claude/skills/<name>` 链接目标是 POSIX-style `../../.agents/skills/<name>`。
- Windows 上 `readlinkSync()` 返回 `..\..\.agents\skills\<name>`。
- `linkInSync()` 用字符串全等比较, 导致已同步的 symlink 被误判为 drift。
- 测试 `expectSkillDistribution()` 也用字符串全等比较, 因此第一条测试直接失败; 后续幂等和 check 测试跟着失败。

流程问题:

- 本轮多次 push 只看了本地 lint/typecheck/test/harness 和 Project 状态, 没有查看 GitHub Actions 的真实 run 状态。
- 远端 CI 失败后仍继续推送新提交, 导致失败 run 堆积。

## 关联与依赖

- `agent-dev-core` 的运行时逻辑已经做了 `normalizeForCompare()` 处理, 本次主要修测试 fixture, 不扩大运行时行为。
- `harness-sync` 的运行时需要接受 Windows `readlinkSync()` 返回的反斜杠目标, 但 manifest 中的期望 target 仍保持 POSIX-style, 因为 symlink target 是跨平台相对描述。
- workflow 规则需要补上 `gh run list` / `gh run watch` 的推送前后检查, 否则本地检查通过但 CI 红灯的问题还会重复。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. `tests/unit/agent-dev-core.test.ts` 在本地 Windows 继续通过, 且测试 fixture 不再依赖硬编码 Windows repo root。
2. `tests/harness/sync.test.ts` 在 Windows 上通过, symlink target 使用 POSIX/Windows 分隔符都能被视为同步。
3. `pnpm test` 本地通过。
4. `pnpm lint`, `pnpm typecheck`, `pnpm harness:check` 本地通过。
5. workflow 规则明确: push 前检查最新 GitHub Actions 状态; push 后等待本次 SHA 的 CI 结果, 失败则停止新功能推进并修 CI。
6. 本次修复 push 后, GitHub Actions 对新 SHA 的 CI run 成功。

## 界面质量与交互验收

不适用。本任务不改前端界面。

## 未决问题

无。
