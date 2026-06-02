# 描述
- 设置里的“本地来源”应整合进项目功能。
- 用户在切换项目时应该能直接看到这个项目有哪些来源, 不应只在设置里维护孤立列表。

# 重现步骤
- 打开设置里的本地来源。
- 再查看主页面中项目或 agent 相关内容。

# 预期结果
- 本地来源成为项目选择和项目详情的一部分。
- 设置页只保留必要的全局配置入口。

# 实际结果
- 本地来源位于设置页, 与主工作流中的项目检视割裂。

# 解决方案
- 结合项目切换器一起设计。
- 将来源列表、扫描状态、路径解释和项目绑定关系迁移到项目功能内。

---
# 完成 (2026-06-03)
- 已在 `docs/works/_archive/2026-06-03-gh-85-local-sources-project-integration/` 完成。
- 项目范围切换器现在会加载项目候选和来源组, 候选行展示来源数量与扫描状态摘要。
- 选中项目后, 下拉内展示该项目的 Claude Code / Codex 来源明细、状态、路径解释和可打开动作。
- Settings 页面已移除旧的 Local Sources 区块, 不再触发 `assets.scanSources`。
- 验证: `pnpm harness:prepush`; `pnpm build`; GitHub Actions CI#26851960400、CI#26852233761; dev agent `gh85-sources` CDP 断言与 `print-window` 截图。
