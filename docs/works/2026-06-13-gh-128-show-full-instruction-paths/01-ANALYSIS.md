# 需求分析 (Explore 产物)

## 现状理解
- 这是 renderer 展示问题, 不涉及 main / preload / IPC 契约变更。
- 用户点名的“约定页”来自 `src/renderer/src/pages/instructions.tsx` 的 conventions tab。该 tab 使用 `MemoryCard` 渲染 `claude-md` / `agents-md` 资产。
- 折叠态路径当前是 `<p className="truncate ...">{truncatePath(asset.path)}</p>`。这有两层省略:
  - 文本层: `truncatePath()` 把长路径变成 `D:\...\project\CLAUDE.md`。
  - CSS 层: `truncate` 单行截断会继续隐藏尾部。
- 展开态详情已经通过 `DetailRow mono` 使用 `break-all` 显示完整 `asset.path`, 但用户需要在列表扫描时理解完整路径, 不应强迫逐条展开。
- `truncatePath()` 还被 overview、session detail、memory view、file viewer drawer 复用。这些是摘要区或标题区, 与约定页规则文件清单不同。本任务先不改变共享 helper 语义, 避免扩大影响面。

## 关联与依赖
- 数据源: `Asset.path` 保持原值进入 renderer。
- 展示层: 只调整 conventions 卡片折叠态路径。skills / subagents / commands 折叠态展示描述, 不展示 path; 展开态 path 已完整显示。
- 虚拟列表: `VirtualGroupedList` 使用 `react-virtuoso` 和 `defaultItemHeight` 估算, 支持实际 item 高度测量。完整路径换行会增加单个卡片高度, 但不会破坏滚动模型。
- UI 可见字段审计:
  - 标题、scope badge、数量不变。
  - 路径改为完整原文, 使用换行和 `break-all` 避免横向溢出。
  - 展开详情、导入链、按钮、加载态、空态、错误态不变。

## 任务分类与 debt 校准
- type / maintenance.subtype: `bug`, 无 maintenance subtype。
- source.kind / refs: `user-request`, GitHub Issue #128。
- debt estimate 修正: 初始 net=1 合理, 改动集中在单页展示和 renderer test。
- scope / risk / areas / confidence: `module` / `medium` / `ui-ux,testability` / `medium`。
- revision: 将 confidence 从 low 修正为 medium。
- `pnpm harness:stats`: total=11, status=ok, 不需要维护任务 override。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 约定页折叠卡片直接显示完整 `asset.path`, 不包含 `...` 中间省略。
2. 长 Windows 反斜杠路径在卡片内换行显示, 不产生横向溢出。
3. 展开详情的完整路径、查看文件、在资源管理器中显示等行为不变。
4. 不改变 `truncatePath()` 共享语义, 不影响总览、会话详情、文件抽屉等摘要路径。

## 界面质量与交互验收
- 页面结构: 保留现有卡片结构和展开交互, 只让路径文本从单行摘要改为可换行完整文本。
- 设计系统: 不引入新 primitive; 沿用 `font-mono`、`text-muted-foreground`、卡片边框与 spacing。
- 信息密度: 长路径会增加单条卡片高度, 这是为了保留关键信息; 其他行仍保持紧凑。
- 主要用户路径: 用户扫约定列表时即可看到完整文件位置, 不必逐条展开。
- 可见状态: loading / empty / error 不受影响。
- 响应式和可访问性: 路径作为文本可复制、可换行, 不新增键盘交互。

## 未决问题
留给 design 向人澄清。
- 无。用户明确要求显示完整路径。
