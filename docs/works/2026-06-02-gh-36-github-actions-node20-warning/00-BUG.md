# 00-BUG — GitHub Actions Node 20 runtime warning

## 原始问题

最新 master CI 已通过, 但 GitHub Actions 在 Ubuntu 和 Windows job 里提示 JavaScript actions 正在使用 Node.js 20 runtime。提示指出 GitHub Actions runner 会在 2026-06-16 起默认强制 JavaScript actions 使用 Node.js 24, 之后移除 Node.js 20。

## 当前证据

- 最新通过的 CI run: https://github.com/Caldis/berth/actions/runs/26796029452
- GitHub 官方公告: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- 当前 CI workflow: `.github/workflows/ci.yml`
- 当前 deploy workflow 已使用 `actions/checkout@v5` 与 `actions/setup-node@v5`, 但 CI workflow 仍是 v4。

## 期望结果

- CI workflow 不再因为 action runtime 使用 Node.js 20 产生可避免警告。
- 项目自身运行 Node 版本暂不扩大修改范围; `node-version: 20` 保持不变。
- 修改后本地检查通过, push 后新 SHA 的 GitHub Actions 通过。
