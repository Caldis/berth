# harness-implement — 实现 (Implementation 阶段)

目标: 按 03-PLAN.md 实现。

前置: INDEX.phase == implement 且存在 02-SPEC.md 与 03-PLAN.md。

步骤:
1. 按 03-PLAN.md 任务顺序逐项实现。
   - 默认流程是 harness workflow; Superpowers 只能作为方法参考, 不执行 `executing-plans` 的用户选择流程, 不创建 active `docs/superpowers/plans` 或 `docs/superpowers/specs`。
   - Agent 自主判断并行或顺序执行: 文件不重叠、模块边界清楚、测试可独立运行时可并行; 同一批文件反复修改、测试强耦合、任务依赖前一步结果、或涉及全局迁移/状态机/脚本入口时顺序执行。不得把 subagent 并行或主 session 执行作为用户选择题。
2. 每项先处理测试, 再写实现:
   - 先定位或新增目标测试文件; feature / bug / 行为变更优先写一个会失败的测试。
   - 后写最小实现, 跑目标测试通过。
   - 如果本项确实不适合自动化测试, 在 03-PLAN 对应项写 `tests: not needed - <reason>` 和替代验证命令/人工验收证据。
   - 每个实现项必须有测试证据或明确例外理由, 否则不得勾选完成。
   - 通过后必须立即小步提交; 每次只暂存自己相关文件, 用 `git diff --cached` 核对 staged 集合。不得把多个已完成项堆到最后一次性提交; 若不能提交, 必须在当轮说明阻塞原因。
3. 将 03-PLAN.md 当作活清单: 完成项勾掉, 与方案的偏差就地记录在 PLAN 中。
4. 遇到工程摩擦 (卡顿、被迫手动补的上下文、被迫的手动修正) 不就地消化, 写入
   `docs/friction/{YYYYMMDD}-implement-{summary}.md` (模板见 docs/friction/_template.md)。
5. 遇到已验证但不属于当前主线验收范围的产品 bug、功能缺口或改进项, 写入
   `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`, 并在当前 PLAN 中交叉引用; 不顺手修, 除非用户明确扩大任务范围。
6. 全部任务完成后, 更新 INDEX.phase = verify。

产出: 代码 + 单测 + 更新后的 03-PLAN.md。完成提示用户: `harness-verify`。
