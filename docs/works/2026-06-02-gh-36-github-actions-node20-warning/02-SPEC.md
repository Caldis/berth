# 02-SPEC — Design

## 范围

只修改 `.github/workflows/ci.yml` 的 action 版本:

- `actions/checkout@v5`
- `pnpm/action-setup@v6`
- `actions/setup-node@v5`

不修改:

- `node-version: 20`
- CI job matrix
- CI 命令顺序
- deploy workflow

## 验证

- 目标验证: `pnpm harness:check`
- 本地补充: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`
- 远端验证: push 后 `gh run watch <run-id> --exit-status`

## 成功条件

新 CI run 在 Ubuntu 和 Windows 上通过。若仍有 Node 20 action runtime warning, 继续检查 action 版本或改用 GitHub 公告建议的 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`。
