# opsx-implement — 实现 (Implementation 阶段)

目标: 按 03-PLAN.md 落地实现。

前置: INDEX.phase == implement 且存在 02-SPEC.md 与 03-PLAN.md。

步骤:
1. 按 03-PLAN.md 任务顺序逐项实现。
2. 每项: 先写单元测试, 后写最小实现, 跑测试通过, 频繁提交。
3. 将 03-PLAN.md 当作活清单: 完成项勾掉, 与方案的偏差就地记录在 PLAN 中。
4. 遇到工程摩擦 (卡顿、被迫手动补的上下文、被迫的手动修正) 不就地消化, 写入
   `docs/friction/{YYYYMMDD}-implement-{summary}.md` (模板见 docs/friction/_template.md)。
5. 遇到已验证但不属于当前主线验收范围的产品 bug、功能缺口或改进项, 写入
   `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`, 并在当前 PLAN 中交叉引用; 不顺手修, 除非用户明确扩大任务范围。
6. 全部任务完成后, 更新 INDEX.phase = verify。

产出: 代码 + 单测 + 更新后的 03-PLAN.md。完成提示用户: `opsx-verify`。
