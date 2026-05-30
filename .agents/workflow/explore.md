# opsx-explore — 探索 (Explore 阶段)

目标: 把外部需求与内部现实对齐, 建立对现状的真实理解。

前置: INDEX.phase == explore。

步骤:
1. 读取 00-PRD.md / 00-BUG.md 原始输入。
2. 用 `.agents/tools.md` 列出的工具拉取关联上下文 (代码、关联模块、历史设计)。
3. 阅读 `docs/ARCHITECTURE.md` 项目地图与相关模块文档。
4. 产出 `01-ANALYSIS.md`:
   - 现状理解 (涉及哪些进程/模块/IPC 契约)
   - 关联与依赖 (谁调用谁, region/scope 差异)
   - 验收标准 (逐条编号, 后续 SPEC 与 verify 据此核对)
   - 未决问题 (留给 design 向人澄清)
5. 更新 INDEX.phase = design。

不编码。摩擦记入 docs/friction。若探索中发现已验证但不属于当前主线验收范围的产品问题, 记入 docs/issues 并在 01-ANALYSIS.md 交叉引用。完成提示用户: `opsx-design`。
