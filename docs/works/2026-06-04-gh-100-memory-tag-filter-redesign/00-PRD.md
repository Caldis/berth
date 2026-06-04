# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户口头反馈 + 截图 (2026-06-04): [记忆] 页面下 [标签] 区域的 hover 展开存在内容冗余和交互不便, 要求重新设计整个标签组件。
- GitHub Issue: https://github.com/Caldis/berth/issues/100
- 相关前序任务: GH-97 (引入当前「一行 + hover 可滚动浮层」方案)

## 正文

### 用户原话
> 目前 [记忆] 页面下的 [标签] 有 hover 展开功能, 但是如图所示存在内容冗余和交互不便的问题。请重新设计这里的整个标签组件。

### 截图观察 (2026-06-04)
- 折叠行显示一行 chips: `[全部标签] esp32(6) feedback(5) react(5) apple-music(4) git(4) harness(4) vite(4) workflow(4) agent(3)`。
- hover 后弹出的浮层顶部第一行与折叠行**完全相同** (再次出现 `[全部标签]` 及上述同一批标签), 随后继续向下平铺全部 100+ 标签 (ai-loop、aurora、cli … 直到 codesign 等)。
- 浮层是一面可滚动的 chip 墙, 标签数量过百。

### 已识别问题 (用户反馈 + 代码佐证)
1. **内容冗余**: 当前实现 `FilterGroup` 折叠态 (`src/renderer/src/components/memory/memory-view.tsx:483-516`) 中, `renderChips()` 在折叠行渲染一次 (被 `max-h-8 overflow-hidden` 截断为一行), hover 浮层里又把**包含 `[全部标签]` chip 与首行已可见标签在内的同一份全集**完整重渲一次, 导致浮层顶部与折叠行重复。
2. **交互不便**:
   - 纯 `onPointerEnter / onPointerLeave` 触发, 浮层无法固定 (pin), 鼠标移出即关闭;
   - 标签数量过百, 平铺成 chip 墙, 难以扫读 / 检索 / 定位具体标签;
   - 折叠行与浮层间的鼠标移动易误触开合。

### 目标 (来自 Issue)
重新设计记忆页标签筛选组件, 消除折叠行与浮层的内容冗余, 为「上百个标签」提供可检索、可控、不易误触的筛选交互; 保持与现有设计系统 (chip 样式、neutral 主题、i18n)、键盘可达性与现有 `tagFilter` 状态契约一致。

### 范围
- 主要文件: `src/renderer/src/components/memory/memory-view.tsx` (`FilterGroup` 折叠态及其调用处)。
- 关联: GH-97 — 本任务在标签部分取代其交互设计, 不改动该任务已抽出的文件查看器等其他产物。

### 约束 / 验收方向 (待 explore/design 细化)
- 不破坏现有 `tagFilter` / `setTagFilter` 状态契约与 `重要度 (importance)` 等其他 FilterGroup 用法。
- 必须有可测试性 (renderer 测试覆盖筛选、检索、空态、键盘可达)。
- 前端任务需满足界面质量与交互验收 (见 _shared.md 不变量 22)。
