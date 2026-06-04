# 需求分析 (Explore 产物)

## 现状理解

纯 renderer 任务, 不涉及 main / preload / IPC 契约。

涉及文件:
- `src/renderer/src/components/memory/memory-view.tsx`
  - `FilterGroup`(`:438-524`)— 通用筛选 chip 组, 同时服务「记忆类型 (importance)」与「标签 (tags)」两处。
  - `collapsed` 分支(`:483-516`)— **只有标签筛选使用** (`:714-722` 传 `collapsed testId="memory-tags-filter"`); importance 走非折叠分支 (`:518-523`)。
  - `MemoryView`(`:555+`)持有 `tagFilter` 单选 string 状态 (`:562`), `tagOptions`(`:576-581`, 按 count 降序、label 升序), 过滤逻辑 `tagFilter === 'all' || n.tags.includes(tagFilter)`(`:588`), `clearFilters`(`:662-667`)与 `hasFilters`(`:618`)。
- `src/renderer/src/i18n/locales/{en,zh}.json` — `memory.tags` / `memory.allTags` / `memory.clearFilters` 等 key 已存在。
- `tests/renderer/memory-view.test.tsx` — 含针对当前 hover 浮层的断言 (`:352-392` `keeps tag filters to one row and shows all tags in a scrollable hover layer`) 与中文 chip 断言 (`:553-571`)。

### 冗余的结构性根因
`FilterGroup` 折叠态用**同一个 `renderChips()`** 渲染两处:
1. 折叠行: `renderChips()` → 外层 `max-h-8 overflow-hidden` 物理截断成一行 (`:496-501`)。
2. hover 浮层: 再次 `renderChips()`, 渲染**完整全集** (含 `[全部标签]` chip + 首行已可见标签) (`:509-511`)。

因此浮层第一行必然等于折叠行 —— 这是结构性重复, 非样式 bug。截图中浮层顶部那条 `全部标签 esp32 feedback react …` 即折叠行的逐字复制。

### 交互不便的根因
- 触发: `onPointerEnter/onPointerLeave`(`:488-489`)纯 hover, 无法 pin; 鼠标移出立即 `setPopoverOpen(false)`, 折叠行↔浮层间移动易误触开合。
- 信息密度: 100+ 标签平铺成一面 chip 墙, 无检索/分组, 难以定位具体标签 (截图实测一屏放不下, 需滚动)。
- 键盘/焦点: 仅 `onFocus/onBlur` 配合, 无搜索框、无方向键导航、无 active option 语义。

## 关联与依赖

- **设计系统范式**: 本项目 search/filter 一律手写 (Tailwind + `cn` + 原生 `<input>`/`<button>`), 见 `search-dialog.tsx`(手动 ArrowUp/Down/Enter + `role=listbox`/`role=option` + 半透明遮罩)与 `filter-bar.tsx`。`cmdk` 虽在依赖中但 renderer 全程未使用 → **重设计沿用手写范式, 不新引组合库**。
- **neutral 单色主题 (GH-52/53/54)**: active = `border-foreground bg-foreground text-background`, inactive = `border-border text-muted-foreground hover:bg-muted/70`, count 徽标 `bg-muted` / active 时 `bg-background/15`。新组件必须落在此单色系统, 不引彩色高亮。
- **可用原语**: 已装 `@radix-ui/react-scroll-area`、`react-dropdown-menu`、`react-select`、`react-tooltip`、`react-dialog`; 但既有页面手写为主。是否引 Radix popover 由 design 权衡 (倾向手写 click-popover + outside/Esc 关闭, 与 search-dialog 一致)。
- **功能重叠**: 顶栏全局搜索已 `n.tags.some(tag => tag.includes(q))`(`:594`)—— 标签文本本就可被搜索命中。标签筛选不可与之冗余, 其独特价值 = **精确单选某标签 + 显示计数**, 重设计须保留该契约。
- **前序任务**: GH-97 引入当前折叠+hover 浮层方案 (其 `02-SPEC` 明确「默认一行 + hover 可滚动浮层」)。本任务在标签部分取代该交互, 不触碰 GH-97 抽出的 `FileViewerDrawer/FileViewerButton` 等其他产物。
- **孤儿清理**: 若标签改用独立组件/分支, `FilterGroup` 的 `collapsed` 分支将成为**仅本任务变更产生的死代码**, 应一并移除 (importance 不用它)。

## 任务分类与 debt 校准
- type / maintenance.subtype: `feature`(交互重设计, 非纯还债; 不设 maintenance subtype)。
- source.kind / refs: `github-issue` / https://github.com/Caldis/berth/issues/100。
- debt estimate 修正: 初始 net 3 / scope module / risk medium / areas [ui-ux] / confidence low。explore 后确认改动完全落在 renderer 单文件 (+ 测试 + i18n), 无 IPC/main; 且会移除 `collapsed` 死分支与重复渲染 → 略有还债。
- scope / risk / areas / confidence: scope `module`, risk `low`(隔离、测试充分、无跨进程), areas `[ui-ux]`, confidence `medium`。
- revision: 记入 INDEX `debt.revisions[]` (explore, net 3→2, risk medium→low, confidence low→medium)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. **消除冗余**: 折叠行与展开层不再重复同一批 chip; 不存在「展开后第一行 == 折叠行」的现象。
2. **可检索**: 标签数较多 (≥ 阈值, 如 >12) 时, 展开层提供文本搜索, 输入即过滤标签列表 (按 label 子串匹配)。
3. **可控触发**: 展开由点击触发 (非纯 hover); 支持点击外部 / `Esc` 关闭; 不因鼠标在触发器与面板间移动而误触开合。
4. **保留单选 + 计数契约**: 仍是单选 (`tagFilter` string), 选中某标签后过滤生效, 每个标签显示其 count; 提供「全部标签」复位项。`importance` FilterGroup 行为不变。
5. **状态联动**: `clearFilters` / `hasFilters` 对标签筛选仍正确; 选中态在触发器上有可见回显 (当前选了哪个标签 / 全部)。
6. **空态/边界**: 无标签时整个标签筛选不渲染 (沿用 `options.length === 0` 返回 null); 搜索无匹配时展开层显示空态文案。
7. **键盘可达 + a11y**: 触发器与选项可 Tab/方向键到达并激活; 选中项有 `aria-pressed`/`aria-selected` 语义; 展开层可由键盘关闭。
8. **i18n**: 中英文案完整 (复用现有 key + 必要时新增, 如搜索占位/空态), 无硬编码英文。
9. **视觉一致**: 落在 neutral 单色 chip 系统, 与 importance 行、页面密度协调; 暗色模式正常。
10. **可测试性**: renderer 测试覆盖「无冗余 / 搜索过滤 / 单选生效 / 清除 / 空态 / 键盘 / 中文文案」; 替换或移除针对旧 hover 浮层的过时断言。

## 界面质量与交互验收

- **现有页面结构**: 记忆页顶部为筛选区 (SourceFilter 行 → importance FilterGroup 行 → tags FilterGroup 折叠行 → Clear filters), 下方为虚拟分组列表 + 右侧分类跳转导航。搜索框在顶栏 (page-chrome)。
- **设计系统用法**: 全 Tailwind + `cn`; chip 为 `rounded-full border px-2.5 py-1 text-xs`; count 徽标 `rounded-full px-1.5 text-[10px]`; 浮层 `rounded-lg border bg-popover p-2 shadow-2xl`。
- **信息密度**: importance 通常 ≤4 项 (一行足够); tags 实测 100+, 是密度爆点 —— 重设计的核心矛盾在标签, importance 保持原状。
- **主要用户路径**: 用户想「只看带某标签的记忆」→ 当前需 hover 展开 → 在 chip 墙里肉眼找标签 → 点击。重设计目标路径: 点开 → 输入若干字符过滤 → 点选, 全程可键盘完成。
- **可见状态**: 需覆盖 默认(全部)/ 已选某标签 / 展开 / 搜索中 / 搜索无结果 / 无标签 / 禁用(无)/ focus 环。
- **交互反馈**: 触发器需回显当前选中标签 (文本+计数), 展开/收起有明确开合, 选中项高亮。
- **响应式**: 触发器与面板宽度需适配窄窗 (记忆页在分栏布局下宽度受限); 面板最大高度 + 内部滚动, 不撑破视口 (沿用 `max-h-[min(20rem,45vh)]` 量级)。
- **可访问性风险**: 当前纯 hover + 仅 focus/blur 对键盘/触摸不友好; 重设计须补 click + 键盘 + ARIA 语义。

## 未决问题
留给 design 向人澄清 (brainstorming, 最多 3 个, 仅限影响范围/方案/验收的关键项):
1. **单选 vs 多选**: 当前 `tagFilter` 为单选 string。是否借此次重设计升级为多选 (可同时按多个标签求交/并)? 多选会改状态契约与过滤逻辑、扩大范围与测试面。倾向: 默认保持**单选** (最小范围、贴合现有契约), 除非用户明确要多选。
2. **展开形态**: 倾向「触发器按钮 + 点击弹出带搜索框的可滚动单选面板」(类 combobox, 手写, 与 search-dialog 一致)。是否接受这一形态, 还是更希望「就地 inline 展开/折叠」而非浮层?
3. **importance 行是否一并调整**: 倾向**保持 importance 原样** (项少、无痛点), 仅重做标签。确认无需统一两者形态。
