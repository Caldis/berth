# 需求分析 (Explore 产物)

## 现状理解
本任务只涉及 GitHub Actions workflow, 不涉及 Electron 主进程、渲染进程、IPC 或本地数据模型。

当前 `.github/workflows/ci.yml` 的 `verify` job 使用 matrix:

```yaml
os: [ubuntu-latest, windows-latest]
```

CI run 26796386517 的 Windows job 日志显示:
- job 名称仍为 `verify (windows-latest)`;
- 操作系统为 Microsoft Windows Server 2025;
- Runner Image 为 `windows-2025`;
- GitHub Actions 页面提示 `windows-latest` 请求会在 2026-06-15 前被重定向到 `windows-2025-vs2026`。

官方依据:
- GitHub Docs 列出 Windows runner label 包含 `windows-latest`, `windows-2025`, `windows-2025-vs2026`, `windows-2022`: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- `actions/runner-images` README 说明为避免非预期迁移, 可以在 YAML 中指定具体 OS version: https://github.com/actions/runner-images
- GitHub runner-images 公告 #14017 说明 `windows-latest` 与 `windows-2025` 将在 2026-06-08 到 2026-06-15 逐步迁移到 Windows Server 2025 with Visual Studio 2026, 需要 Visual Studio 2022 的用户应使用 `windows-2022`: https://github.com/actions/runner-images/issues/14017

## 关联与依赖
`.github/workflows/ci.yml` 已固定 action major 到:
- `actions/checkout@v5`
- `pnpm/action-setup@v6`
- `actions/setup-node@v5`

项目运行时 Node 版本仍由 `actions/setup-node` 的 `node-version: 20` 控制, 与 runner image label 是两个不同问题。本任务不调整 Node 版本、不调整 pnpm 版本、不改变 CI 命令序列。

Windows job 当前不会执行 `pnpm build`, build smoke 仍只在 Ubuntu 执行。runner label 变更需要确保 Windows 上 `pnpm install`, `lint`, `typecheck`, `test`, `harness:check` 仍通过。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. `.github/workflows/ci.yml` 不再使用 `windows-latest`。
2. Windows CI runner 使用官方稳定 label, 避免 2026-06-08 到 2026-06-15 的 VS2026 迁移影响。
3. CI 的 Node/pnpm/action 版本与命令序列不因本任务改变。
4. 本地检查通过: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, `pnpm build`。
5. 推送后新 SHA 对应 GitHub Actions run 通过, 且 Windows job 名称显示固定 label。

## 界面质量与交互验收
不适用。本任务没有 UI 改动。

## 未决问题
留给 design 向人澄清。
无。范围为 CI runner label 修复。
