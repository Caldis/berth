# BUG 快照 (只读)

来源: https://github.com/Caldis/berth/issues/70

## 复现步骤
- 推送一个新提交, 让 GitHub Actions `CI` run 正常触发并完成。
- 用短 SHA 执行 `pnpm harness:ci:wait -- --sha <short-sha>`。

## 期望 vs 实际
- 期望: 短 SHA 能匹配完整 `headSha`, 并等待对应 CI run。
- 实际: `findWorkflowRunForSha` 要求 `headSha === sha`, 短 SHA 会误报 `no CI run found`。

## 关联记录
- `docs/friction/20260602-4.0-verify-ci-wait-short-sha.md`
