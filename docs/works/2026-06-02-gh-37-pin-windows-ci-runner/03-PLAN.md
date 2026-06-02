# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 固定 Windows CI runner label。
  - tests: `Select-String -Path .github/workflows/ci.yml -Pattern "windows-latest"`; `pnpm harness:check`
  - verify: `.github/workflows/ci.yml` 不再使用 `windows-latest`, matrix 使用 `windows-2022`; 非 UI 任务, 界面验收不适用。
  - evidence: `Select-String -Path .github/workflows/ci.yml -Pattern "windows-latest"` 无匹配; matrix 为 `os: [ubuntu-latest, windows-2022]`; `pnpm harness:check` 通过。
- [x] 任务 2: 本地检查。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build`
  - verify: 本地完整检查通过; 非 UI 任务, 界面验收不适用。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm test` (54 files / 419 tests); `pnpm harness:check`; `pnpm build` 均通过。
- [ ] 任务 3: 推送后等待 GitHub Actions。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`; `gh run view <run-id> --job <windows-job-id> --log`
  - verify: 新 SHA 对应 CI run 成功, Windows job 显示固定 label `windows-2022`; 非 UI 任务, 界面验收不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
