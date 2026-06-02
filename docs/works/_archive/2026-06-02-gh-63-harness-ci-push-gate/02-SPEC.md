# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增脚本 `scripts/harness-ci-gate.mjs`:

- `baseline`: 读取当前分支最近 `CI` run。默认要求 `status=completed` 且 `conclusion=success`。
- `baseline --allow-failed-baseline`: CI 修复提交专用例外, 远端不是 success 时输出 warning 但退出 0。
- `wait`: 解析当前 `HEAD`, 轮询查找该 SHA 的 `CI` run, 找到后调用 `gh run watch <run-id> --exit-status`。
- 通用参数: `--branch <name>`, `--workflow <name>`, `--sha <sha>`, `--timeout <seconds>`, `--poll <seconds>`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `scripts/harness-ci-gate.mjs`: 新增 CLI 和可测试 helper。
- `tests/harness/ci-gate.test.ts`: 测试 run 选择、baseline 判定、wait 查询参数和例外路径。
- `package.json`: 增加 `harness:ci:baseline`, `harness:ci:wait`, `harness:prepush`。
- `.agents/workflow/_shared.md`, `.agents/workflow/5.0-archive.md`, `.agents/tools.md`: 增加固定命令引用。
- `scripts/harness-check.mjs`: 检查 package script 和 workflow 命令引用仍存在。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 不适用 |
| 组件选择 / 设计系统一致性 | 不适用 | 不适用 |
| 交互反馈 / 状态切换 | CLI 输出明确说明 pass / warning / fail | 目标测试 + 手动运行 |
| loading / empty / error / disabled / focus | `wait` 找不到 run 时有明确错误 | 目标测试 |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 输出保留 run id、SHA、URL、workflow 名称 | 目标测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| baseline run 选择和状态判定 | harness unit | `tests/harness/ci-gate.test.ts` | `pnpm vitest run tests/harness/ci-gate.test.ts` |  |
| wait 根据 SHA 查找 run 并调用 watch | harness unit | `tests/harness/ci-gate.test.ts` | `pnpm vitest run tests/harness/ci-gate.test.ts` |  |
| package script / workflow 引用不回退 | harness | `tests/harness/check.test.ts` + `pnpm harness:check` | `pnpm harness:check` |  |
| 真实 GitHub Actions 基线读取 | manual CLI | 不适用 | `pnpm harness:ci:baseline` | 依赖远端 Actions 和 gh 登录, 用手动命令验收 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `baseline` 命令默认阻塞红灯 / pending | 1 |
| `wait` 命令等待当前 SHA run | 2 |
| package scripts | 3 |
| workflow + harness-check 引用 | 4 |
| vitest 覆盖核心逻辑 | 5 |
