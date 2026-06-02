# 需求分析 (Explore 产物)

## 现状理解
- `src/renderer/src/components/memory/memory-view.tsx` 的 `ImportanceBadge` 直接渲染 `importance`。
- `importanceOptions` 直接用 `{ id: importance, label: importance }` 生成 filter chip。
- locale 已有 `memory.importanceHint`，说明 hover copy 已存在，只缺短 label。
- `tests/renderer/memory-view.test.tsx` 当前断言 `core 1`，需要改成可读 label。

## 关联与依赖
- 只依赖 renderer locale。
- 筛选仍以 enum id 过滤，不改数据结构。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Memory badge 显示可读 importance label。
2. Importance filter chip 显示可读 label，但仍按原 enum id 筛选。
3. 英文和中文页面都不展示裸 `core` / `active` / `archive` 作为主要标签。
4. Hover title 仍展示现有说明。

## 界面质量与交互验收
这是 UI 文案改进。badge 和 filter chip 是扫视入口，应展示短标签，说明放在 hover title 中，避免平铺占空间。

## 未决问题
无。
