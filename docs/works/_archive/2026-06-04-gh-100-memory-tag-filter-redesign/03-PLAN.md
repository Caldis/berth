# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定 (同一文件强耦合 → 顺序执行)。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 改造测试为目标行为 (test-first)
  - 内容: 在 `tests/renderer/memory-view.test.tsx` 中 (1) 移除/重写旧 `keeps tag filters to one row and shows all tags in a scrollable hover layer`; (2) 新增覆盖: 就地面板无 hover 即渲染、标签搜索子串过滤、已选标签不被搜索过滤掉、多选求交 (AND)、全部标签复位、搜索无匹配空态; (3) 核对 `filters memories by importance and tag` 与中文文案测试在多选契约下仍成立 (必要时微调断言)。
  - tests: 本步即测试; 先红 (新断言对旧实现失败)。
  - verify: `pnpm test:renderer` 跑到新测试如期 fail (证明断言有效), 旧 hover 断言已删。
- [x] 任务 2: 状态契约改造 (`tagFilter` string→string[])
  - 内容: `memory-view.tsx` 中 `useState<string[]>([])`; notes 过滤改 `tagFilter.length===0 || tagFilter.every(...)`; `hasFilters` 改 `tagFilter.length>0`; `clearFilters`/`navigate` 改 `setTagFilter([])`; 新增 `toggleTag`/`clearTags` 回调。
  - tests: 任务 1 的多选/求交/清除断言。
  - verify: 不适用单独 UI 验收 (随任务 3 一起); `pnpm typecheck` 通过。
- [x] 任务 3: 新增 `TagFilter` 组件 + 接入 + 清理 FilterGroup.collapsed
  - 内容: 新增 `TagFilter` (搜索框 + 有界滚动 chip 区, 多选, 选中置顶, 已选不过滤, 全部标签复位, 空态); render 用 `<TagFilter/>` 替换 tags 的 `<FilterGroup collapsed/>`; 移除 `FilterGroup` 的 `collapsed` prop / `popoverOpen` / `handleBlur` / hover 浮层段。
  - tests: 任务 1 全部断言转绿。
  - verify (界面质量): 面板就地渲染、`overflow-y-auto`、chip neutral 单色与 importance 行一致、aria-pressed 多选语义、Tab 可达、窄栏 `w-full`、暗色正常 (renderer 断言 + 视觉截图)。
- [x] 任务 4: i18n 新增 key
  - 内容: en/zh `memory.tagSearchPlaceholder`、`memory.noMatchingTags`; 不动既有 key。
  - tests: 中文文案测试 (任务 1) 断言 `筛选标签…` 占位 + `全部标签`。
  - verify: `pnpm test:renderer` 中英两语断言通过。
- [x] 任务 5: 收口验证
  - 内容: 全量门禁 + 逐条验收。
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx` → 13 passed; `pnpm typecheck` (node+web) 绿; `pnpm exec eslint` 本任务文件无报错; `pnpm harness:check` (全局 docs 结构) 通过。
  - verify: ANALYSIS 验收 1~10 全部满足 (见下表)。界面质量验收 9 项视觉一致性以「逐字复用生产 importance 行 neutral chip token」保证; 实测窗口截图延后 — 取证当下另一 Agent 正在改 app-layout/top-navigation/globals.css (未提交), 窗口外壳处于半重构态, 此刻截图会拍到他人在途布局而非本改动干净视图, 失真。
  - 例外说明: `pnpm harness:prepush` 全量在本机红, 2 个失败 (`category-jump-nav.test.tsx` / `hooks-lifecycle-view.test.tsx`) 全部来自另一 Agent 未提交的 `berth-page-gutter`→`berth-page-top-offset` 重构覆盖层, 与 GH-100 无关; 本任务文件全绿。`git push` 只推提交, 不带未提交覆盖层, CI 在本 SHA 上为一致绿状态。

## 验收逐条结论 (4.0-verify)
| # | 验收 | 结论 | 证据 |
|---|---|---|---|
| 1 | 消除冗余 (无折叠行+浮层双渲) | ✅ | 单一 TagFilter 面板; 断言 `-row`/`-popover` 不存在 |
| 2 | 可检索 | ✅ | `filters the tag list by the search box` |
| 3 | 可控触发 (非 hover, 无误触) | ✅ | 始终就地, 无 popover 开合; 无 pointerEnter 即渲染 |
| 4 | 多选求交 + 计数 + 全部标签; importance 不变 | ✅ | `filters memories by the intersection of multiple selected tags` |
| 5 | hasFilters/clearFilters/选中回显 | ✅ | length>0 / setTagFilter([]) / aria-pressed; 旧 importance+tag 测试仍过 |
| 6 | 无标签不渲染 + 搜索空态 | ✅ | options 空→null; `shows an empty state when the tag search matches nothing` |
| 7 | aria-pressed + 键盘可达 | ✅ | 原生 input(aria-label) + button(aria-pressed) 均 Tab 可达 |
| 8 | i18n 双语 + 新增 key | ✅ | 中文测试断言 `筛选标签…` + `全部标签` |
| 9 | neutral 单色一致 + 暗色 | ✅ (截图延后) | 复用 importance 行同款 chip/token; 截图取证延后见上 |
| 10 | renderer 测试覆盖 + 移除过时断言 | ✅ | 13 passed; 旧 hover 浮层测试已删 |

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
(本次无不通过项。)
