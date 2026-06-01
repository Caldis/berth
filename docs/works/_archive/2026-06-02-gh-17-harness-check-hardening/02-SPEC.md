# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

无新增数据契约。只验证既有行为:

- `checkWorkflowSources(root): string[]`
- `_archive/.gitkeep` 作为 git 跟踪占位文件

## 模块结构 / 组件拆分

不新增模块。当前实现已经位于正确位置:

- 空 playbook 检查: `scripts/harness-check.mjs`
- 回归测试: `tests/harness/check.test.ts`
- 目录保留文件: `docs/works/_archive/.gitkeep`, `docs/friction/_archive/.gitkeep`

## 界面质量与交互验收

不适用。此任务不改 UI。

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
| 空 playbook 报错 | unit | `tests/harness/check.test.ts` | `pnpm test -- tests/harness/check.test.ts` | 已有测试覆盖 |
| 合规 workflow 源通过 | unit | `tests/harness/check.test.ts` | `pnpm test -- tests/harness/check.test.ts` | 已有测试覆盖 |
| archive 目录被 git 跟踪 | harness/manual | git index | `git ls-files docs/works/_archive/.gitkeep docs/friction/_archive/.gitkeep` | 文件存在性需检查 git index |
| 全局 harness 门禁 | harness | N/A | `pnpm harness:check` | N/A |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 空 playbook 报错 | 1, 4 |
| 合规 workflow 源通过 | 2, 5 |
| archive 目录被 git 跟踪 | 3 |
| issue 状态收束 | 6 |

