# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不涉及应用数据契约。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
只修改 `.github/workflows/ci.yml`:

```yaml
matrix:
  os: [ubuntu-latest, windows-2022]
```

选择 `windows-2022` 的理由:
- 官方公告明确 `windows-latest` 和 `windows-2025` 都会迁移到 VS2026。
- 官方公告给出的保留 Visual Studio 2022 方案是 `windows-2022`。
- 本项目当前 Windows CI 只跑 Node/pnpm 层检查, 不需要依赖 `latest` 的滚动系统镜像。

不改:
- `ubuntu-latest`
- `node-version: 20`
- pnpm 版本 `9.15.4`
- CI steps 顺序
- Windows job 是否执行 `pnpm build`

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 无 UI 改动 |
| 组件选择 / 设计系统一致性 | 不适用 | 无 UI 改动 |
| 交互反馈 / 状态切换 | 不适用 | 无 UI 改动 |
| loading / empty / error / disabled / focus | 不适用 | 无 UI 改动 |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 无 UI 改动 |
| 文案 / i18n / 数字和路径格式 | 不适用 | 无 UI 改动 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| workflow matrix 使用固定 Windows label | manual / harness | `.github/workflows/ci.yml` | `Select-String -Path .github/workflows/ci.yml -Pattern "windows-latest"`; `pnpm harness:check` | YAML label 变更不需要新增单元测试 |
| 本地门禁仍通过 | lint / typecheck / unit / harness / build | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build` | 已由现有命令覆盖 |
| 推送后 CI 使用固定 Windows label 并通过 | CI | GitHub Actions | `gh run watch <run-id> --exit-status`; `gh run view <run-id> --job <windows-job-id> --log` | 需要远端 runner 实际执行验证 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 修改 matrix Windows label 为 `windows-2022` | 1, 2, 3 |
| 本地门禁全部通过 | 4 |
| 推送后 GitHub Actions 通过并显示固定 Windows job | 5 |
