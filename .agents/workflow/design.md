# harness-design — 设计 (Design 阶段)

目标: 基于 01-ANALYSIS 产出技术方案与任务清单。人在此澄清意图。

前置: INDEX.phase == design 且存在 01-ANALYSIS.md。

步骤:
1. 阅读 01-ANALYSIS.md 与 docs/ARCHITECTURE.md 约定。
2. 就 ANALYSIS 中的未决问题主动向工程师提问, 由人消解歧义, 不臆测。
3. 若存在 PRD 级歧义 (需 PM 澄清): 将 INDEX.phase 置 blocked, 在 INDEX 标注待澄清项, 停止, 不进 implement。
4. 否则产出:
   - `02-SPEC.md`: 数据契约、模块结构、组件拆分、测试策略; 每条回指 01-ANALYSIS 的验收标准编号。测试策略必须列出测试矩阵: 变更/行为、测试类型、测试文件、命令、不写自动化测试的理由。
   - `03-PLAN.md`: 从 SPEC 拆解的任务清单, 每任务可独立执行/验证, 顺序确定, 用 `- [ ]` 复选框。每个实现项必须写 `tests:` 和 `verify:`; 每个实现项必须有测试证据或明确例外理由。
5. 方案须遵守 ARCHITECTURE 的模块边界与 MVVM/进程隔离约定。
6. 更新 INDEX.phase = implement。

完成提示用户: `harness-implement`。
