# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

`INDEX.md` frontmatter 扩展为:

```yaml
type: feature | bug | maintenance
priority: P0 | P1 | P2 | P3
target_date: 2026-06-03
maintenance:
  subtype: ui-ux | performance | architecture | testability | tooling-ci | dependency | docs
source:
  kind: user-request | github-issue | docs-issues | docs-friction | ci | harness
  refs:
    - docs/friction/...
debt:
  estimate:
    incurred: 13
    repaid: 0
    net: 13
    scope: global
    risk: high
    areas:
      - tooling-ci
      - architecture
    confidence: medium
    rationale: "..."
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions:
    - at: implement
      date: 2026-06-02
      from:
        incurred: 9
        scope: module
      to:
        incurred: 13
        scope: global
      reason: "..."
  override_reason:
```

规则:
- `maintenance` block 只允许在 `type: maintenance` 时出现, 且 subtype 必填。对应验收 1、2。
- `source.kind` 必填; `source.refs` 可空。`issue` 和 `friction` 不作为 subtype, 只作为 source。对应验收 1、2。
- `debt.estimate` 在 active work 中建议填写; 旧任务缺失时不报错, stats 记为 `unscored`。对应验收 1、3。
- `debt.final` 在 archive 前必须可统计; 本轮先在 check 中校验字段形状, archive hard gate 由 workflow 文档声明, 后续 `5.0-archive` 阶段执行。对应验收 6、7。
- debt 统计口径: 若 `final.net` 是有限数字, 用 `final.net`; 否则若 `estimate.net` 是有限数字, 用 `estimate.net`; 否则记 `unscored` 且按 0 计入 total。对应验收 3。
- `estimate.net` / `final.net` 应等于 `incurred - repaid`; `harness:check` 在字段完整时校验该关系。对应验收 2。

枚举:

```js
TASK_TYPES = ['feature', 'bug', 'maintenance']
MAINTENANCE_SUBTYPES = ['ui-ux', 'performance', 'architecture', 'testability', 'tooling-ci', 'dependency', 'docs']
SOURCE_KINDS = ['user-request', 'github-issue', 'docs-issues', 'docs-friction', 'ci', 'harness']
PRIORITIES = ['P0', 'P1', 'P2', 'P3']
DEBT_SCOPES = ['file', 'module', 'cross-process', 'global']
DEBT_RISKS = ['low', 'medium', 'high']
DEBT_CONFIDENCES = ['low', 'medium', 'high']
DEBT_AREAS = ['ui-ux', 'performance', 'architecture', 'testability', 'tooling-ci', 'dependency', 'docs']
```

GitHub Project 字段定义:

| 本地字段 | Project 字段 | 类型 | 选项 / 格式 |
|---|---|---|---|
| `type` | `Task Type` | single-select | `feature`, `bug`, `maintenance` |
| `priority` | `Priority` | single-select | `P0`, `P1`, `P2`, `P3` |
| `created` | `Start date` | date | `YYYY-MM-DD` |
| `target_date` | `Target date` | date | `YYYY-MM-DD` |
| `debt.*.incurred` | `Debt Incurred` | number | finite number |
| `debt.*.repaid` | `Debt Repaid` | number | finite number |
| `debt.*.net` | `Debt Net` | number | finite number |
| `debt.*.scope` | `Debt Scope` | single-select | debt scopes |
| `debt.*.risk` | `Debt Risk` | single-select | debt risks |
| `debt.*.confidence` | `Debt Confidence` | single-select | debt confidences |
| `debt.*.areas` | `Debt Areas` | text | comma-separated |
| `maintenance.subtype` | `Maintenance Subtype` | single-select | maintenance subtypes |
| `source.kind` | `Source Kind` | single-select | source kinds |

同步口径:
- 优先同步 `debt.final`; 若没有 final, 同步 `debt.estimate`。
- `harness-projects fields ensure` 创建缺失字段; 若同名 single-select 字段已存在但缺选项, 明确报错, 不猜测替代选项。
- `ensure` / `done` 调用 Project 字段同步。`done` 额外设置 `Archived at` 为当天日期。
- 当前用户仓库不支持组织级 Issue Type API; 本轮不写真实 Issue Type, 只同步 Project `Task Type`。组织仓库可用时再加可选 Issue Type 层。对应验收 4、5。

维护 subtype 自动选择 v1:
- `harness:stats` 只有在 `recommend-maintenance` / `requires-override` 时输出 maintenance 推荐。
- 推荐规则取正分最高的 debt area; 同分按 `tooling-ci > ui-ux > testability > performance > dependency > docs > architecture`。
- `architecture` 只有自身 area debt `>=40` 时可自动选择; 否则跳过到下一个 area, 避免频繁结构调整。
- 用户明确指定 feature/bug 时不被自动维护任务覆盖; 用户未指定时, `0.0-new` 使用 `harness:stats` 的推荐 subtype。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `scripts/harness-lib.mjs`
  - 增加 shared enums 和小型工具函数, 供 check/stats/projects 复用。
  - 保持 workflow action 分发不变。
- `scripts/harness-check.mjs`
  - `checkWorks()` 接受 `maintenance`。
  - 增加 priority/source/maintenance/debt 字段校验。
  - `requiredArtifacts()` 对 maintenance 使用 `00-PRD.md`, 因为维护任务通常来自设计输入或队列来源, 不是 bug 快照。
- `scripts/harness-stats.mjs`
  - 增加 debt 聚合: total、threshold、unscored、byArea、byType。
  - CLI 输出保留旧行, 追加 debt 行。
- `scripts/harness-projects.mjs`
  - 增加字段定义、字段发现、字段创建、字段值同步。
  - 新增命令: `fields ensure`。
  - `check --strict` 校验本地与远端可读字段值一致; 读取不到字段时给出 `fields ensure` 提示。
- `.agents/workflow/*.md`, `.agents/README.md`, `.agents/tools.md`
  - 写清任务分类、debt 修正、阈值、Project 字段同步。
- `docs/works/_template/*`
  - 更新模板字段和说明。
- `tests/harness/*.test.ts`
  - 增加 check/stats/projects 单测。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 |  |  |
| 组件选择 / 设计系统一致性 |  |  |
| 交互反馈 / 状态切换 |  |  |
| loading / empty / error / disabled / focus |  |  |
| 响应式 / 可访问性 / 键盘可达 |  |  |
| 文案 / i18n / 数字和路径格式 |  |  |

本任务不改 renderer UI, 上表不适用。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| maintenance/source/debt 本地 schema 校验 | harness unit | `tests/harness/check.test.ts` | `pnpm vitest run tests/harness/check.test.ts` | 不适用 |
| debt pool 统计、unscored、area/type 分组 | harness unit | `tests/harness/stats.test.ts` | `pnpm vitest run tests/harness/stats.test.ts` | 不适用 |
| maintenance subtype 自动推荐 | harness unit | `tests/harness/stats.test.ts` | `pnpm vitest run tests/harness/stats.test.ts` | 不适用 |
| Project 字段定义、创建、同步、strict 校验 | harness unit | `tests/harness/projects.test.ts` | `pnpm vitest run tests/harness/projects.test.ts` | 不适用 |
| workflow/template 分发与入口规则 | harness check | n/a | `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow`; `pnpm harness:check` | 不适用 |
| 类型影响范围 | typecheck | n/a | `pnpm typecheck` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| INDEX schema 扩展与校验 | 1, 2, 6, 7 |
| debt pool stats | 3 |
| GitHub Project field sync | 4, 5 |
| workflow/template 更新 | 6, 7 |
| harness tests 与全局检查 | 8 |
