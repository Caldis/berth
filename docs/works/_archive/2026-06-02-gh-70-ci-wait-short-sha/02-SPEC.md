# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- `findWorkflowRunForSha(runs, { workflowName, sha })`:
  - 对输入 `sha` 和 `run.headSha` 做 trim/lowercase。
  - 当输入长度短于完整 `headSha` 时, 使用 `headSha.startsWith(sha)`。
  - 空 sha 仍不匹配。

## 模块结构 / 组件拆分
- 修改 `scripts/harness-ci-gate.mjs`。
- 修改 `tests/harness/ci-gate.test.ts`。
- 不改 CLI 参数结构。

## 界面质量与交互验收
不适用。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| short SHA 匹配完整 headSha | harness unit | `tests/harness/ci-gate.test.ts` | `pnpm vitest run tests/harness/ci-gate.test.ts` |  |
| wait retry 使用短 SHA 返回 run | harness unit | `tests/harness/ci-gate.test.ts` | `pnpm vitest run tests/harness/ci-gate.test.ts` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| startsWith 匹配 | 1, 2, 3 |
| retry 测试 | 4 |
