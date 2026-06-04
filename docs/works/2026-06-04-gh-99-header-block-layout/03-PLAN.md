# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

**执行模式**: 核心改动 (任务 1-6) 共享 `--berth-page-top-offset` 契约且强耦合 → **顺序单点**, 不并行。逐页**验证** (任务 8) 6 路由独立 → 可并行子代理。
**多 Agent 前置 (每次编辑共享文件前必做)**: `git status --short -- <file>`; 若 `top-navigation.tsx` / `hooks-lifecycle-view.tsx` 等有其他 Agent 未提交改动, 先等其提交或仅在干净时编辑; 编辑前重新 Read 取最新内容; 提交只暂存本任务相关 hunk, `git diff --cached` 核对。

- [ ] 任务 1: globals.css 新增静态常量 `--berth-page-top-offset: 6rem`
  - tests: 由任务 3/4/5 的 renderer 测试间接覆盖 (变量被消费方断言); 本项为纯 CSS 常量声明, 无独立单测。
  - verify: 不适用 (常量声明); 后续实测截图确认 sticky/内容偏移正确。
- [ ] 任务 2: top-navigation.tsx 改块布局 + 移除测高 (验收 1,3,7)
  - 删 `absolute inset-x-0 top-0 z-20`、`backdrop-blur-xl`; `bg-background/80`→`bg-background`; hidden 态去 `-translate-y-3`; 删 `onHeightChange` prop + ResizeObserver useLayoutEffect + headerRef。
  - tests: `tests/renderer/top-navigation.test.tsx` 更新/确认 (标题渲染、visible/hidden data-state); `pnpm test:renderer top-navigation`。
  - verify: 实测 header 为顶部块级条、滚动时持久可见、标题栏可拖拽 (验收 1,7)。
- [ ] 任务 3: app-layout.tsx 移除补偿链路 + paddingTop→gutter (验收 1,2,3)
  - 删 topNavigationHeight state / pageTopOffset / onHeightChange 传参; scrollRegionStyle 去 `--berth-page-top-offset` 注入、scrollPaddingTop→gutter; contentStyle.paddingTop→gutter; WindowControls 不传 navigationHeight; 保留 scrollbarGutter。
  - tests: `tests/renderer/app-layout.test.tsx` 更新断言 (header 无 absolute/backdrop-blur; paddingTop=gutter; 不再内联 top-offset; scrollPaddingTop=gutter); `pnpm test:renderer app-layout`。
  - verify: 内容紧贴 header 下方无遮挡无空白 (验收 5)。
- [ ] 任务 4: category-jump-nav.tsx sticky top→gutter (验收 4)
  - line 34 `lg:top-[var(--berth-page-top-offset,6rem)]`→`lg:top-[var(--berth-page-gutter,1.5rem)]`; h/max-h 保持。
  - tests: `tests/renderer/category-jump-nav.test.tsx` 更新 top 断言; `pnpm test:renderer category-jump-nav`。
  - verify: sessions/instructions lg+ 左栏正确贴附内容区顶部 gutter 处, 不被遮挡/不重复偏移 (验收 4)。
- [ ] 任务 5: hooks-lifecycle-view.tsx sticky top→gutter (验收 4)
  - line 117 `lg:top-[var(--berth-page-top-offset,6rem)]`→`lg:top-[var(--berth-page-gutter,1.5rem)]`; max-h 保持。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx` 更新 top 断言 (保留 max-h 断言); `pnpm test:renderer hooks-lifecycle-view`。
  - verify: capabilities/hooks lg+ 左栏正确贴顶 (验收 4)。
- [ ] 任务 6: window-controls.tsx 复核 + 测试 (验收 6)
  - 无代码改动 (保留 navigationHeight 默认 72); 确认 AppLayout 停止传参后默认 72 居中。
  - tests: `tests/renderer/window-controls.test.tsx` 确认通过 (prop 默认与显式 96 两路径); `pnpm test:renderer window-controls`。
  - verify: 本机 (Windows) 实测 window-controls 与 header 行垂直对齐 (验收 6)。
- [ ] 任务 7: e2e 断言复核 (验收 8)
  - 检查 `tests/e2e/app.e2e.ts`、`tests/e2e/window-controls.e2e.ts` 是否断言 `absolute`/`backdrop-blur`/top-offset; 有则同步块布局事实。
  - tests: e2e 自身; 按需运行。
  - verify: 断言与新布局一致。
- [ ] 任务 8: 全路由实测验证 (验收 5,1,4,6,7) — verify 阶段并行
  - `pnpm dev` 启动, 主进程实测窗口坐标裁剪, 逐路由截图 (overview/sessions/session-detail/instructions/capabilities·各 section/usage), lg 与 max-lg 两档宽度; 检查首屏无遮挡/无空白、header 持久可见、sticky 贴顶、Windows 控件对齐。
  - tests: manual (Electron 实测截图)。
  - verify: 6 路由全部布局准确 (验收 5); header 块布局 (验收 1); sticky (验收 4); Windows 控件 (验收 6); 拖拽 (验收 7)。
- [ ] 任务 9: 收口门禁 (验收 8)
  - `pnpm harness:check` (全局, 若被他人 active work 阻断则先 `--work` 本任务) + 全量目标 renderer 测试 + `pnpm harness:prepush` (代码提交前)。
  - tests: 汇总。
  - verify: 全绿。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
