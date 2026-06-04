# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定 (同一文件强耦合 → 顺序执行)。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 改造测试为目标行为 (test-first)
  - 内容: 在 `tests/renderer/memory-view.test.tsx` 中 (1) 移除/重写旧 `keeps tag filters to one row and shows all tags in a scrollable hover layer`; (2) 新增覆盖: 就地面板无 hover 即渲染、标签搜索子串过滤、已选标签不被搜索过滤掉、多选求交 (AND)、全部标签复位、搜索无匹配空态; (3) 核对 `filters memories by importance and tag` 与中文文案测试在多选契约下仍成立 (必要时微调断言)。
  - tests: 本步即测试; 先红 (新断言对旧实现失败)。
  - verify: `pnpm test:renderer` 跑到新测试如期 fail (证明断言有效), 旧 hover 断言已删。
- [ ] 任务 2: 状态契约改造 (`tagFilter` string→string[])
  - 内容: `memory-view.tsx` 中 `useState<string[]>([])`; notes 过滤改 `tagFilter.length===0 || tagFilter.every(...)`; `hasFilters` 改 `tagFilter.length>0`; `clearFilters`/`navigate` 改 `setTagFilter([])`; 新增 `toggleTag`/`clearTags` 回调。
  - tests: 任务 1 的多选/求交/清除断言。
  - verify: 不适用单独 UI 验收 (随任务 3 一起); `pnpm typecheck` 通过。
- [ ] 任务 3: 新增 `TagFilter` 组件 + 接入 + 清理 FilterGroup.collapsed
  - 内容: 新增 `TagFilter` (搜索框 + 有界滚动 chip 区, 多选, 选中置顶, 已选不过滤, 全部标签复位, 空态); render 用 `<TagFilter/>` 替换 tags 的 `<FilterGroup collapsed/>`; 移除 `FilterGroup` 的 `collapsed` prop / `popoverOpen` / `handleBlur` / hover 浮层段。
  - tests: 任务 1 全部断言转绿。
  - verify (界面质量): 面板就地渲染、`overflow-y-auto`、chip neutral 单色与 importance 行一致、aria-pressed 多选语义、Tab 可达、窄栏 `w-full`、暗色正常 (renderer 断言 + 视觉截图)。
- [ ] 任务 4: i18n 新增 key
  - 内容: en/zh `memory.tagSearchPlaceholder`、`memory.noMatchingTags`; 不动既有 key。
  - tests: 中文文案测试 (任务 1) 断言 `筛选标签…` 占位 + `全部标签`。
  - verify: `pnpm test:renderer` 中英两语断言通过。
- [ ] 任务 5: 收口验证
  - 内容: 全量门禁。
  - tests: `pnpm harness:prepush` (typecheck+lint+test) 全绿。
  - verify: 4.0-verify 逐条核对 ANALYSIS 验收 1~10 + 界面质量表; 视觉截图 (实测窗口坐标裁剪) 佐证就地面板与多选回显。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
