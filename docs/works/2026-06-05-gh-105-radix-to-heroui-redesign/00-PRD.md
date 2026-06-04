# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户请求 (2026-06-05, ultracode 多 agent 编排会话)
- GitHub Issue: https://github.com/Caldis/berth/issues/105
- HeroUI llms.txt: https://heroui.com/en/docs/react/getting-started/llms-txt
- HeroUI 官网: https://heroui.com/
- 风格参考截图: 用户提供两张暗色截图 (HeroUI 官方 dashboard 模板 + 组件总览), 缓存于 image-cache (会话内)

## 正文

> 我希望将应用的 radix ui 库整个重构为 https://heroui.com/
> 不仅是组件替换, 还需要涉及到应用的整体风格统一, 美观度和布局一致性提升, 设计系统沉淀, 主题/强调色系统增强, 过渡动画补全
> 请参考 https://heroui.com/en/docs/react/getting-started/llms-txt
> 风格参考 [Image #1] [Image #3]
> 启动团队开始

### 解读 (拆解为可验收方向, 仅作交接参考, 非回写正文)
1. **组件替换**: 当前渲染层 = shadcn/ui (10 个 @radix-ui 无头 primitives + Tailwind 3.4 + class-variance-authority + clsx + tailwind-merge), ~266 处 Radix 引用。目标整库迁移到 HeroUI (React Aria + Tailwind + Framer Motion)。
2. **整体风格统一**: 暗色 dashboard 风格, 参考截图的卡片化布局、强调蓝、绿色/红色涨跌语义色。
3. **美观度与布局一致性**: 间距、圆角、卡片密度、层级、对齐统一。
4. **设计系统沉淀**: token 化 (spacing/radius/elevation/typography/color), 组件复用约定与文档。
5. **主题 / 强调色系统增强**: HeroUI theme 体系 + 可切换强调色 (accent)。
6. **过渡动画补全**: 进入/退出、hover、focus、状态切换统一 motion。

### 补充要求 (用户追加, 2026-06-05 explore 阶段)
> 我希望我们有规范且一致的共享组件目录, 而不是每个页面各自为战, 公共的组件行为和样式尽可能得到共享。

解读: 在 HeroUI primitive 之上沉淀一层 berth 自有的 design-system 封装层 (统一行为契约 + 样式 token + 变体), 收敛当前散落在 `components/shared/*` 与页面内联样式的"各自为战"实现; 所有页面只消费该共享层。此为设计系统沉淀的核心架构目标, design 阶段一等公民。

### 风格参考截图要点 (描述快照)
- Image #1 (dashboard): 左侧深色 sidebar (头像 + 导航项, 选中项高亮圆角块, "New" badge), 顶部问候标题 + 搜索/通知/Invite 按钮; 内容区 segmented tabs (Overview/Sales/Expenses)、Monthly 下拉、Download 主按钮; 4 个 KPI 卡片 (Revenue/Expenses/Sales/Profit, 带涨跌 chip); 柱状图 + 折线图卡片; 数据表格 (Filter/Sort/Columns + 搜索, 行内头像/角色/操作图标)。整体暗色、圆角卡片、蓝色强调、绿/红语义色。
- Image #3 (组件总览): HeroUI 组件全家桶 — Input/Select/Checkbox/Switch/Radio/Spinner、Slider、Tabs、Button (solid/bordered/light + danger 变体)、OTP input、Modal/Card、Card with avatar、Banner、Toast/Alert、Dropdown menu (含 danger zone)、Avatar group。暗色主题, 蓝色 primary, 圆角统一。
