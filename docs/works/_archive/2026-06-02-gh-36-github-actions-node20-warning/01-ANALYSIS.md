# 01-ANALYSIS — Explore

## 事实

1. `.github/workflows/ci.yml` 当前使用:
   - `actions/checkout@v4`
   - `pnpm/action-setup@v4`
   - `actions/setup-node@v4`
   - 项目运行时 `node-version: 20`
2. `.github/workflows/deploy-website.yml` 当前已经使用:
   - `actions/checkout@v5`
   - `actions/setup-node@v5`
   - `pnpm/action-setup@v4`
3. 最新 CI annotation 指向 action runtime 的 Node.js 20 弃用, 不是项目自身 `node-version: 20` 的直接失败。
4. GitHub 官方公告说明 runner 已支持 Node20 和 Node24, 未来会默认使用 Node24 运行 JavaScript actions。
5. GitHub Marketplace 当前展示 `pnpm/action-setup@v6` 用法; CI 里仍是 v4。

## 判断

最小修复是升级 CI workflow 的 action major:

- `actions/checkout@v4` -> `actions/checkout@v5`
- `actions/setup-node@v4` -> `actions/setup-node@v5`
- `pnpm/action-setup@v4` -> `pnpm/action-setup@v6`

不修改 `node-version: 20`, 因为这会改变项目安装、测试和构建使用的 Node 版本, 超出当前 warning 修复范围。

## 风险

- `pnpm/action-setup@v6` 可能改变默认行为。当前 workflow 明确传 `version: 9.15.4`, 风险较低。
- 升级 action major 可能影响缓存或 runner 兼容。需要 push 后等待 Ubuntu 和 Windows CI。

## 验收标准

1. `.github/workflows/ci.yml` 使用 Node 24 compatible action major。
2. 本地 `pnpm harness:check` 通过。
3. 当前分支 push 前最新 CI 为 success。
4. push 后新 SHA 对应 CI run 通过。
