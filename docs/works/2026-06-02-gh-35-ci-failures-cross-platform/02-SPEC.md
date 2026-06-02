# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不改产品数据契约。

测试 fixture 约定:

- `agent-dev-core.test.ts` 使用当前临时 state root 下的 repo-like 路径生成 `context.root`, 不再硬编码 `D:\Code\berth`。
- 模拟 dev server / Electron command line 使用 `context.root` 和 `context.electronViteCli` 拼接, 保证在 Linux / Windows runner 上都与 `createAgentDevContext()` 的解析结果一致。

Harness sync 约定:

- `desiredArtifacts()` 中 link target 继续保持 POSIX-style `../../.agents/skills/<name>`。
- `linkInSync()` 比较 symlink target 时把 `\` 转成 `/`。
- 测试读取 symlink target 时同样做分隔符归一化。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `tests/unit/agent-dev-core.test.ts`
  - 增加测试 helper, 从 `context` 生成模拟 command line。
  - 覆盖原有截图、guard、owned command line 行为。
- `scripts/harness-sync.mjs`
  - 增加 link target 归一化 helper。
  - `linkInSync()` 使用归一化比较。
- `tests/harness/sync.test.ts`
  - `expectSkillDistribution()` 使用归一化比较 symlink target。
- `.agents/workflow/_shared.md`
  - 更新 push 规则: local checks + CI 状态检查。
- `.agents/workflow/4.0-verify.md` / `5.0-archive.md`
  - verify/archive 的完成路径写明 GitHub Actions 观察点。
- `docs/friction/20260602-4.0-verify-push-without-ci-status.md`
  - 记录这次用户纠正和流程改进。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 不适用 |
| 组件选择 / 设计系统一致性 | 不适用 | 不适用 |
| 交互反馈 / 状态切换 | 不适用 | 不适用 |
| loading / empty / error / disabled / focus | 不适用 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 不适用 | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| agent-dev-core 测试 fixture 跨平台 | unit | `tests/unit/agent-dev-core.test.ts` | `pnpm vitest run tests/unit/agent-dev-core.test.ts` | 不适用 |
| harness sync symlink target 分隔符归一化 | harness unit | `tests/harness/sync.test.ts` | `pnpm vitest run tests/harness/sync.test.ts` | 不适用 |
| 本地完整测试 | unit / renderer / harness | 全部测试 | `pnpm test` | 不适用 |
| 静态检查 | lint / typecheck / harness | 全仓库 | `pnpm lint`; `pnpm typecheck`; `pnpm harness:check` | 不适用 |
| 远端 CI 结果 | GitHub Actions | CI workflow | `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| agent-dev-core fixture 改造 | 1 |
| harness-sync link target 归一化 | 2 |
| 本地检查矩阵 | 3, 4 |
| push / CI workflow 规则 | 5 |
| 推送后 CI 监控 | 6 |
