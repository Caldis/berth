# 需求分析 (Explore 产物)

## 现状理解
- 这是 renderer 展示问题, 不涉及 main / preload / IPC 契约变更。
- 截图中的“约定 / 项目规则文件”来自 `src/renderer/src/pages/instructions.tsx` 的 conventions tab。列表行显示 `truncatePath(asset.path)`, 展开详情显示原始 `asset.path`。
- `src/renderer/src/lib/utils.ts` 的 `truncatePath()` 当前用 `/[/\\]/` 同时拆分正斜杠和反斜杠, 但固定用 `/` 拼回截断结果。这会把 `D:\Code\...\CLAUDE.md` 显示为 `D:/.../project/CLAUDE.md`。
- `truncatePath()` 还被 overview、session detail、memory view、file viewer drawer 复用。因此修共享 helper 能覆盖用户说的“部分页面”, 不只修单页。
- `src/renderer/src/lib/session-location-groups.ts` 会把 session project path 归一成 `/` 用于分组 key、parent label 和已测试的 group title, 不是文件路径原文展示。本任务不修改它, 避免破坏会话页分组契约。

## 关联与依赖
- 数据源: `Asset.path` / `SessionSummary.projectPath` / file viewer path 等保持原值输入 renderer。
- 展示层: 多个页面通过 `truncatePath()` 做短路径展示; 详情区通常展示原始路径。
- scope 差异: user / project / enterprise 资产同走 `asset.path`; 问题与 scope 无关。
- UI 可见字段审计:
  - 标题、scope badge、数量、说明文案不受影响。
  - 路径短展示是主问题; 展开详情里的完整路径作为对照, 应与短展示使用同一类分隔符。
  - 加载态、空态、错误态不依赖路径格式。

## 任务分类与 debt 校准
- type / maintenance.subtype: `bug`, 无 maintenance subtype。
- source.kind / refs: `user-request`, GitHub Issue #127。
- debt estimate 修正: 初始 `net=2` 合理; 影响面是共享 renderer helper + 页面测试, 不跨 IPC。
- scope / risk / areas / confidence: `module` / `medium` / `ui-ux,testability` / `medium`。
- revision: 仅把 confidence 从 low 修正为 medium。
- `pnpm harness:stats`: total=12, status=ok, 不需要维护任务 override。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Windows drive path 被截断时使用反斜杠, 不出现 `D:/...` 与 `D:\...` 同屏混用。
2. POSIX path 被截断时继续使用正斜杠。
3. mixed / forward-slash Windows drive path 被截断时按 Windows 路径显示为反斜杠。
4. `instructions` conventions 卡片折叠行和展开详情路径分隔符一致。
5. 不改变 IPC、扫描数据模型和 session project grouping 的 `/` 归一契约。

## 界面质量与交互验收
- 页面结构: conventions / memory / session / overview 等页面只消费短路径文本, 不新增 UI 容器。
- 设计系统: 不引入新组件; 保留现有 `font-mono`、`truncate`、卡片展开交互。
- 信息密度: 短路径仍保留首段、`...` 和末两段, 不增加行高。
- 主要用户路径: 用户先扫列表短路径, 再展开看完整路径; 两处不能给出不同路径风格。
- 可见状态: loading / empty / error 不受影响。
- 响应式和可访问性: 文本仍通过 CSS truncate 控制, 不新增键盘交互。

## 未决问题
留给 design 向人澄清。
- 无。用户要求是修复混用, 代码链路已能定位。
