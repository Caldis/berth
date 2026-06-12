# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户当前目标: 使用 `C:\Users\mail\.agents\skills\improve-codebase-architecture\SKILL.md` 对项目架构做进一步分析和优化。
- GitHub Issue: https://github.com/Caldis/berth/issues/126

## 正文
在执行完上面内容之后，我需要你使用 `improve-codebase-architecture` 对项目架构做进一步分析和优化。

本次架构分析不仅注重于底层应用的架构，本次重点关注的还有 UI 层本身的架构，例如组件复用、交互一致性、视觉设计一致性、数据流向问题、信息架构一致性问题、性能问题、功能类似的组件在不同页面之间呈现了不同内容、信息缺失或冗余问题，以及其他架构问题等。请分析后修复。

执行约束:
- 使用指定技能的术语做架构候选分析: Module / Interface / Implementation / Depth / Seam / Adapter / Leverage / Locality。
- 不把任务缩小成纯后端或纯代码清理; renderer/UI 层是一等范围。
- 先用真实代码证据定位候选，再选择高把握、边界清楚的候选做小步修复。
