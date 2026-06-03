# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增 Berth 产品数据契约。
- Harness 流程契约新增执行规则:
  - `pnpm harness:ci:wait --sha <full-sha>` 可交给子代理阻塞等待。
  - `node scripts/harness-projects.mjs ensure/check/done ...` 可交给子代理执行。
  - 主 Agent 在阶段过门禁、archive 移目录、声明完成前必须消费子代理成功结果。
  - 子代理失败时, 主 Agent 停止完成声明并进入修复。
- Vitest 配置契约:
  - 默认测试环境改为 `node`。
  - `tests/renderer/**` 使用 `jsdom`。
  - `tests/setup.ts` 只在 DOM 环境安装 `window.api`、`matchMedia`、`ResizeObserver` 与 layout mock。
  - 测试 include 范围保持 `tests/**/*.test.ts` 和 `tests/**/*.test.tsx`。

## 任务分类与 debt
- type / maintenance.subtype: `maintenance / tooling-ci`
- source.kind / refs: `user-request`
- debt.estimate: `incurred=2, repaid=7, net=-5, scope=global, risk=medium`
- debt.final 预期: 若实现通过, 维持 `net=-5`
- revisions: 无
- Project 字段同步: design 阶段保持 In Progress; verify/archive 可由子代理执行 Project 同步, 主 Agent 消费结果。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `.agents/workflow/_shared.md`: 写入子代理与非本地门禁的通用规则。
- `.agents/workflow/0.0-new.md`: 明确 Project ensure 可由子代理执行, 但真实 item id 是进入 explore 的门禁。
- `.agents/workflow/4.0-verify.md`: 明确 Project strict 与 CI wait 可由子代理执行, 但 success 是 verify 结论门禁。
- `.agents/workflow/5.0-archive.md`: 明确 Project done 可由子代理执行, 但 Done 回读是 archive 移目录门禁。
- `.agents/tools.md`: 标注 CI wait 与 Project 同步可作为子代理任务。
- `vitest.config.ts`: 配置默认 node + renderer jsdom。
- `tests/setup.ts`: DOM 环境守卫。
- `scripts/harness-prepush.mjs`: 并行执行本地 prepush 门禁, 保留全部原有检查。
- `package.json`: `harness:prepush` 改为调用并行脚本。
- `tests/harness/check.test.ts`: 让规则自检覆盖新增子代理门禁说明。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不适用 | 不修改 UI |
| 组件选择 / 设计系统一致性 | 不适用 | 不修改 UI |
| 交互反馈 / 状态切换 | 不适用 | 不修改 UI |
| loading / empty / error / disabled / focus | 不适用 | 不修改 UI |
| 响应式 / 可访问性 / 键盘可达 | 不适用 | 不修改 UI |
| 文案 / i18n / 数字和路径格式 | 不适用 | 不修改 UI |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 子代理门禁规则出现在共享 workflow 与 tools | harness | `tests/harness/check.test.ts` | `pnpm test -- tests/harness/check.test.ts` |  |
| Vitest 默认 node, renderer 专用 jsdom, 覆盖范围不变 | test config | 全量测试 | `pnpm test`; 对比 JSON 报告 | 配置行为由全量测试验证 |
| prepush 并行执行原有本地门禁 | harness | `tests/harness/prepush.test.ts` | `pnpm test -- tests/harness/prepush.test.ts`; `/usr/bin/time -p pnpm harness:prepush` |  |
| Project/CI 子代理执行规则 | manual + harness docs | workflow 文档 | `pnpm harness:check` | 多代理调度是 Codex 运行时行为, 仓库内以规则自检约束 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 子代理门禁规则 | 1, 2 |
| Vitest 环境分配 | 3, 4 |
| harness/test 证据 | 5 |
