# 03-PLAN — 任务清单 (v3: 混合 dashboard 引擎)

宽度档保留 + 高度数值 span + dense 引擎 + resize。回指 02-SPEC v3 / 05-DECISIONS。

## 已完成 (引擎 + resize 全链)
- [x] P1 混合契约 — widget-types: 保留 WidgetWidth; WidgetSize 加 h; WidgetMeta 加 minH/maxH; WidgetRenderProps.h?。[用户维护 gitignore]
- [x] P2 catalog — 16 条 defaultSize.h (内容最小贴合, 消留白) + minH/maxH (固定类 min=max)
- [x] P3 持久化 — dashboard-layout v3: WidgetLayoutItem 含 h, 迁移旧 W 档保留+补 h, version 3
- [x] P4 网格工具 — widget-grid: gridRowSpanStyle。[用户维护 gitignore]
- [x] P5 布局状态 — use-dashboard-layout: setHeight (镜像 setWidth)
- [x] P6 resize hook — use-resize-handle: deltaToSpan (纯函数, 可测) + 拖拽实时回写
- [x] P7 引擎 — dashboard-grid: grid-auto-rows 88px + auto-flow dense + grid-row span + 透传 onSetHeight; 宽度档/拖拽/framer 保留
- [x] P8 卡壳 — widget-shell: 底边高度 resize 手柄 (编辑态), 宽度档切换器保留
- [x] P9 透传 — overview: setHeight

## 待办 (依赖运行时, 两 gitignore 文件就绪后)
- [ ] P10 16 widget 层2 内容自适应 — 图表 height:100% 填满 + 列表 rows=f(h); tests: f(h) 纯函数单测; verify: CDP 逐组件填满无溢出 + 各尺寸密度可分
- [ ] P11 verify CDP — dense 网格 + 响应式 + resize + 默认最小无留白 + 过渡; 校准 row-unit / 各 widget default h / minH / maxH
- [ ] 测试 — deltaToSpan / widget-catalog / dashboard-layout 迁移 单测

## 门禁
typecheck (待两文件) + lint + test + harness:check 全绿。
