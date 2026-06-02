# 需求分析 (Explore 产物)

## 现状理解
能力页和指令页中多个卡片直接内联实现 View Raw:
- `McpServerCard`, `PluginCard`, `StatusLineCard` 调用 `window.api.assets.get(asset.id)` 后只在 `full?.raw` 存在时打开 InspectorDrawer。
- `MemoryCard`, `SkillCard`, `GenericAssetCard` 也有相同模式。
- 取不到 raw、IPC 报错或 preload API 不可用时, 当前按钮仍看起来可点击, 但没有视觉反馈。

InspectorDrawer 本身已在 GH-68 修复 modal 语义和 focus trap。本任务只处理入口按钮状态。

## 关联与依赖
- Renderer 只通过 preload `window.api.assets.get(id)` 读取完整 asset, 不直接读文件。
- 不改变主进程 scanner 与 asset 类型契约。
- 需要保持中文/英文文案可翻译。

## 验收标准
1. View Raw 入口在 raw 可用时仍打开 InspectorDrawer。
2. raw 不可用或读取失败时, 按钮不再静默失败, 用户能看到明确状态。
3. 共享实现覆盖能力页和指令页同类入口, 避免同类 bug 继续复制。
4. 按钮 loading、error、disabled/focus 状态符合现有紧凑工具按钮风格。

## 界面质量与交互验收
现有按钮是小尺寸边框按钮, 位于展开卡片底部操作区。新状态应保持相同尺寸和视觉层级, 不新增大面积说明块。loading 期间按钮禁用并显示短文案; raw 不可用时按钮保持可见但禁用, 通过 title 与 aria-label 提供原因。

## 未决问题
无。
