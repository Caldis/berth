# 描述
- `components/shared/filter-bar.tsx` 导出的 `FilterBar` 组合组件当前**全仓无任何引用** (grep `<FilterBar` / `FilterBar\b` 排除定义后为空); 只有同文件的 `ScopeSelect` 被 `pages/capabilities.tsx` 使用。
- 发现于 GH-109 (审计手写控件迁 HeroUI) 实施 C4 时。GH-109 已把 `ScopeSelect` 与 `FilterBar` 内部控件都迁到 HeroUI Input/Select, 但未删除 `FilterBar` 本身 (共享工作区死代码按"只记录不删除"处理)。

# 重现步骤
- 搜索 `FilterBar` 的 JSX 使用处, 无结果。

# 预期结果
- 共享组件层不保留无引用的组合组件, 或明确其为对外预留 API。

# 实际结果
- `FilterBar` 为死代码, 增加维护面 (其内部已随 GH-109 迁 HeroUI, 但运行时从不渲染)。

# 解决方案 (候选, 待确认)
- 选项 A: 删除 `FilterBar` 函数与 `FilterBarProps`, 仅保留 `ScopeSelect` + `ScopeFilter`。
- 选项 B: 若有意作为对外/未来 API, 保留并补一处使用或注释说明。
- 交叉引用: GH-109 (docs/works/_archive/2026-06-06-gh-109-heroui-handwritten-controls)。
