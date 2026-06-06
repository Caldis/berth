# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

顺序: C1 (用户点名, 先交付验收) → C2 → C3 → C5 → C6 → C4 (共享, blast radius 最大放最后)。
每项独立提交。

- [x] C1: header 搜索框 `<input>` → HeroUI `Input` (`top-navigation.tsx`)
  - tests: tests/renderer/top-navigation-search.test.tsx 4/4 绿 (渲染+placeholder/aria-label / onValueChange / ⌘K kbd / ⌘K ref focus+select); typecheck:web + lint 绿
  - verify: focus-ring/hover/圆角与页头密度; ⌘K 聚焦并全选; Search 图标 + ⌘K/Ctrl+K 提示; sm:w-72 响应式; aria-label; 暗/亮/accent 截图 (verify 阶段)
- [ ] C2: usage cost-mode `<select>` → HeroUI `Select` (`pages/usage.tsx`)
  - tests: typecheck:web + 截图 (例外: 行为简单受控, 无既有单测)
  - verify: 选项/受控值/i18n 不变; 键盘方向键可达; open/选中态
- [ ] C3: hooks `HookActions` `<details>` → HeroUI `Dropdown` (`hooks-lifecycle-view.tsx`)
  - tests: 复用 tests/renderer/hooks-lifecycle-view.test.tsx 改后仍绿 (必要时补 case)
  - verify: 动作项/只读项展示; 开关交互; role=menu 键盘可达
- [ ] C5: memory 搜索 `<input>` → HeroUI `Input` (`memory-view.tsx`)
  - tests: typecheck:web + 截图 (例外: 同 C1 模式受控搜索)
  - verify: placeholder/行为不变; focus-ring
- [ ] C6: 本地 Badge/pill → `ui/Chip` (`memory-view.tsx`/`agent-capability-plugins-section.tsx`/`instructions.tsx`)
  - tests: typecheck:web + 截图 (例外: 纯视觉替换)
  - verify: 语义 tone 一致; ≥text-xs; 密度统一
- [ ] C4: `filter-bar` `ScopeSelect`/`FilterBar` → HeroUI `Select`/`Input` (`filter-bar.tsx`)
  - tests: 3 消费方 (project-scope-switcher/capabilities/overview) 相关 renderer 测试 + 截图
  - verify: 对外 props/testid/i18n 不变; 逐处回归; 键盘可达

## 延后 (本任务不做, 留 followup 交叉引用)
- D1 search-dialog 命令面板 `<input>` → Modal+Input (保留键盘 nav)
- D2 session-detail `<input type=range>` → Slider (自定义样式评估)

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
