# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

无运行时数据模型变化。新增的是 harness 文档契约:

- 稳定规则句: `小改动豁免前必须先声明豁免依据并征得用户确认。`
- 该规则必须同时存在于 `AGENTS.md` 与 `.agents/README.md`。
- `.agents/workflow/_shared.md` 需在“不变量”里说明同一要求, 供各 verb playbook 读取时获得共享约束。

## 模块结构 / 组件拆分

1. 文档入口 (验收 1、2)
   - 改 `AGENTS.md` 的“小改动豁免”条款: 保留豁免合理性, 增加“先声明依据 + 征得确认”。
   - 改 `.agents/README.md` 的“何时进入”: 与根入口保持相同规则。

2. 工作流共享契约 (验收 1、2)
   - 改 `.agents/workflow/_shared.md`: 在不变量中加入小改动豁免沟通要求。

3. 自检防漂移 (验收 3)
   - 改 `scripts/harness-check.mjs`: 新增 `checkEntryRules(root)`, 检查稳定规则句存在于 `AGENTS.md` 和 `.agents/README.md`。
   - 将 `checkEntryRules` 纳入 `checkAll`。
   - 改 `tests/harness/check.test.ts`: 覆盖规则齐备通过、缺根入口报错、缺 README 报错。

4. 摩擦消费 (验收 4)
   - 将已消费的 `docs/friction/20260530-implement-small-change-exemption-overreach.md` 移入 `docs/friction/_archive/`, 保留原文件名与内容。

## 测试策略

- `pnpm test tests/harness/check.test.ts`
- `pnpm harness:check`
- `pnpm test`

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 文档入口同步 | 1, 2 |
| 共享契约更新 | 1, 2 |
| `checkEntryRules` 自检 | 3, 5 |
| 摩擦移入 `_archive` | 4 |
