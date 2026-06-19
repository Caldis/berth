# 03-PLAN — 活任务清单

## 实现项

- [ ] `pnpm add -D knip` (root) + package.json 加 `knip`/`knip:ci` scripts
  - verify: 安装后 `pnpm-lock.yaml` 更新, package.json + lock 同步 (同 commit)
- [ ] 新建 `knip.json` (单项目 + paths + entry 全集)
  - verify: `pnpm knip` 跑通, **反向核验引擎核心文件不在 unused** (验收点3)
- [ ] `ci.yml`: lint 后加 `pnpm knip:ci` (`if: ubuntu`)
  - verify: 本地 `pnpm knip:ci` 退出码 0
- [ ] `docs/issues/2026-06-10-...gh115-residuals` 第3项: 记录首次扫描摘要 + 标第3项 DONE (硬门禁 + 删码留后续)

## 测试例外
`tests: not needed - tooling 接入, 无产品码改动`。替代验证: `pnpm knip` 跑通 + 反向核验引擎核心文件未被误报 + `pnpm knip:ci` 退出码 0 + 既有门禁不破。

## 验收
`pnpm knip:ci` 退 0 + 反向核验通过 + 既有门禁 (lint/typecheck/test/build) 绿。
