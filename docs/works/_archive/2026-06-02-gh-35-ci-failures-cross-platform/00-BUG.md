# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/35
- GitHub Actions latest failed run: https://github.com/Caldis/berth/actions/runs/26795038258
- User correction on 2026-06-02: push 之前必须关注 GitHub Actions 状态, 不只看本地测试。

## 复现步骤

1. 查看 master 最新 CI:
   `gh run list --branch master --limit 20`
2. 打开最新失败 run:
   `gh run view 26795038258 --json status,conclusion,jobs`
3. 查看日志:
   `gh run view 26795038258 --log`

观察到最近 master push 对应的 CI 均为 failure。

## 期望 vs 实际

期望:

- push 前本地检查应覆盖会影响 CI 的测试。
- push 后应检查 GitHub Actions 任务状态, 如失败则停止新功能推进并优先修复。
- master 上 CI 应通过。

实际:

- 本地 Windows `pnpm test` 通过, 但 GitHub Actions 同时在 ubuntu-latest 和 windows-latest 上失败。
- ubuntu-latest: `tests/unit/agent-dev-core.test.ts` 有 7 个失败, 与 Windows-only 截图 helper / 进程 guard 测试没有按平台隔离有关。
- windows-latest: `tests/harness/sync.test.ts` 有 5 个失败, 核心原因是 symlink target 使用 Windows 反斜杠, 测试和漂移检查期望 POSIX-style 相对路径。
