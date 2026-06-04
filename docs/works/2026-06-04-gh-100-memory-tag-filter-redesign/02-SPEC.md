# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

> 用户定向 (2026-06-04, AskUserQuestion):
> - 交互形态 = **可搜索就地面板** (搜索框 + 有界滚动区, 始终就地, 单一来源, 无需点击展开)。
> - 选择模式 = **升级为多选** (`tagFilter: string → string[]`, 求交 AND)。
> - importance 行保持不变 (未提出, 默认沿用单选 FilterGroup)。

## 数据契约

renderer 内部状态契约变更, 无 IPC/main 改动:
- `tagFilter`: `string ('all' | tagId)` → `string[]` (已选标签集合, `[]` = 全部/未筛选)。
- 过滤逻辑 (`memory-view.tsx` notes useMemo): `tagFilter === 'all' || n.tags.includes(tagFilter)` → `tagFilter.length === 0 || tagFilter.every((tag) => n.tags.includes(tag))` (求交 AND)。[验收 4]
- `hasFilters`: `tagFilter !== 'all'` → `tagFilter.length > 0`。[验收 5]
- `clearFilters` / `navigate`: `setTagFilter('all')` → `setTagFilter([])`。[验收 5]
- 新增 `toggleTag(id)`: id 已在集合则移除, 否则加入 (用函数式 setState, 不可变更新)。[验收 4]
- `MemoryNote` / `MemoryListResult` 等 shared 类型不变。

## 任务分类与 debt
- type / maintenance.subtype: feature / —
- source.kind / refs: github-issue / https://github.com/Caldis/berth/issues/100
- debt.estimate: incurred 3, repaid 1, net 2, scope module, risk low, areas [ui-ux], confidence medium (explore 已校准并写入 revisions)。
- debt.final 预期: 约 net 1~2 — 多选属新增行为 (incurred), 但移除 `FilterGroup.collapsed` 死分支 + `renderChips()` 重复渲染 (repaid); verify 后据实际改动量定稿。
- revisions: 见 INDEX (explore 一条); design 不再改估算 (与 explore 一致), 不追加。
- Project 字段同步: ensure 已写入真实 item_id; verify/archive 时 done 同步 final。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定 (renderer `components/memory`)。

1. **新增 `TagFilter` 组件** (同文件 `memory-view.tsx` 内, 与 `FilterGroup`/`SourceFilter` 并列, 不新建文件 — 仅本视图使用)。props:
   - `label`, `allLabel`, `searchPlaceholder`, `emptyText`: string
   - `selected`: string[]
   - `options`: `Array<{ id; label; count }>` (复用现有 `tagOptions`, 已按 count 降序、label 升序)
   - `onToggle(id)`, `onClear()`, `testId?`
   - 内部 state: `query` (本地搜索串)。
2. **就地面板渲染逻辑** [验收 1/2/3/6]:
   - 顶部搜索 `<input>` (复用 filter-bar 输入样式 + 前置 `Search` 图标, `h-8 text-xs`)。
   - 下方有界滚动区 `max-h-[13rem] overflow-y-auto rounded-md border bg-muted/20 p-2`, 内部 `flex flex-wrap gap-2`。**单一来源**: 不再有"折叠行 + 浮层"两份渲染 → 结构上消除冗余 [验收 1]。
   - 可见集合: `options.filter((o) => selectedSet.has(o.id) || query==='' || o.label.toLowerCase().includes(q))` —— **已选标签不被搜索过滤掉** (活动过滤器始终可见可摘除); 搜索只过滤未选池 [验收 2]。
   - 排序: 已选优先 (selected-first), 同组内沿用 count 降序、label 升序 [验收 4 可见性]。
   - "全部标签" 复位 chip: 仅在 `query===''` 时渲染于最前, `aria-pressed={selected.length===0}`, 点击 `onClear()` [验收 4/5]。搜索态隐藏 (它是控件而非搜索目标), 保证无查询时中文测试 `全部标签` 按钮存在。
   - 空态: `query!=='' && 可见集合为空` → 显示 `emptyText` (无匹配标签), 不显示空白滚动框 [验收 6]。
   - 无标签 (options 为空): 整个组件返回 null (沿用 `FilterGroup` 的 `options.length===0` 早退) [验收 6]。
3. **chip 样式**: 复用现有 neutral 单色 token —— active `border-foreground bg-foreground text-background`, inactive `border-border text-muted-foreground hover:bg-muted/70`; count 徽标 active `bg-background/15` / inactive `bg-muted`; `aria-pressed` 表达多选态 [验收 7/9]。
4. **接入** (`MemoryView` render): 用 `<TagFilter .../>` 替换 `<FilterGroup ... collapsed testId="memory-tags-filter"/>`; importance 仍用 `<FilterGroup/>` [验收 4]。
5. **孤儿清理**: 移除 `FilterGroup` 的 `collapsed` prop、`popoverOpen` state、`handleBlur`、hover 浮层整段 (`memory-view.tsx:483-516` 区) — 仅本任务变更产生的死代码 [debt repaid]。
6. **i18n 新增 key** (`memory.*`, en + zh): `tagSearchPlaceholder` (Filter tags… / 筛选标签…)、`noMatchingTags` (No matching tags / 无匹配标签); 复用 `tags`/`allTags`/`clearFilters` [验收 8]。

## 界面质量与交互验收
前端或 UI 相关任务填写。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 左 `w-16` 标签列 + 右 (搜索框 / 有界滚动 chip 区); 滚动区 `max-h-[13rem]` 限高, 不撑破; importance 行不变 | renderer 断言面板存在且 `overflow-y-auto`; 视觉截图 |
| 组件选择 / 设计系统一致性 | 手写 (沿用 search-dialog/filter-bar 范式), 不引 cmdk; neutral 单色 chip token | 代码评审 + 视觉对比 importance 行一致 |
| 交互反馈 / 状态切换 | 多选 toggle 即时回显 (filled chip + aria-pressed); 选中置顶; 全部标签复位 | renderer: 点两标签求交; 点全部标签复位; aria-pressed 断言 |
| loading / empty / error / disabled / focus | 无标签→不渲染; 搜索无匹配→emptyText; 输入框 focus ring; 无 loading/error/disabled 特例 | renderer: 空态文案; 无标签不渲染 |
| 响应式 / 可访问性 / 键盘可达 | 面板/输入 `w-full` 适配窄栏; input + chip 均原生可聚焦, Tab 可达, 方向键由浏览器默认; 搜索框 aria-label | renderer: Tab/role 断言; 键盘输入过滤 |
| 文案 / i18n / 数字和路径格式 | en/zh 双语; count 直接显示原值 | renderer 中英两语断言 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 就地面板渲染 (无 hover)、无折叠行/浮层冗余 | renderer | tests/renderer/memory-view.test.tsx | `pnpm test:renderer` (vitest) | — |
| 标签搜索过滤 (子串)、已选不被过滤掉 | renderer | 同上 | 同上 | — |
| 多选求交 (AND) 生效 | renderer | 同上 | 同上 | — |
| 全部标签复位 / Clear filters | renderer | 同上 | 同上 | — |
| 搜索无匹配空态 | renderer | 同上 | 同上 | — |
| 中文文案 (标签 / 全部标签 / 搜索占位) | renderer | 同上 | 同上 | — |
| 替换/移除旧 hover 浮层断言 (`keeps tag filters to one row...`) | renderer | 同上 | 同上 | 旧行为已废弃 |
| typecheck / lint | harness | — | `pnpm typecheck` / `pnpm lint` | — |

> `pnpm harness:prepush` 在 implement/verify 收口跑全量 (typecheck+lint+test)。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 单一来源就地面板 (无双渲) | 1 |
| 搜索过滤 + 已选不过滤 | 2 |
| 就地、无 hover、无误触 (无浮层开合) | 3 |
| 多选求交 + 计数 + 全部标签; importance 不变 | 4 |
| hasFilters/clearFilters/选中回显 | 5 |
| 无标签不渲染 + 搜索空态 | 6 |
| aria-pressed + 键盘可达 | 7 |
| i18n 双语 + 新增 key | 8 |
| neutral 单色一致 + 暗色 | 9 |
| renderer 测试覆盖 + 移除过时断言 | 10 |
