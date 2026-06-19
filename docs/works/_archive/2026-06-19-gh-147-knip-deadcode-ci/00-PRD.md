# 来源快照 (只读输入)

## 源 issue
- `docs/issues/2026-06-10-IMPROVEMENT-gh115-residuals.md` (第3项: 死代码扫描工具入 CI)

## 目标
knip/ts-prune 对本仓多入口 + 双 tsconfig 零配置失配。接入死代码扫描 + CI 软门禁, 阻止死代码再沉积。

## 边界
本批只接工具 + 配置 + CI 步骤; 首次报告 allowlist/记录, **不删码**。`knip.json` + `package.json` + `ci.yml` + `pnpm-lock.yaml`, 零产品源码。

由 harness-5.2-issues A 组稳健批并行处理生成。
