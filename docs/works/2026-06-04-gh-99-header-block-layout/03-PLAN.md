# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

**执行模式**: 核心改动 (任务 1-6) 共享 `--berth-page-top-offset` 契约且强耦合 → **顺序单点**, 不并行。逐页**验证** (任务 8) 6 路由独立 → 可并行子代理。
**多 Agent 前置 (每次编辑共享文件前必做)**: `git status --short -- <file>`; 若 `top-navigation.tsx` / `hooks-lifecycle-view.tsx` 等有其他 Agent 未提交改动, 先等其提交或仅在干净时编辑; 编辑前重新 Read 取最新内容; 提交只暂存本任务相关 hunk, `git diff --cached` 核对。

> 偏差记录: SPEC 测试命令写作 `pnpm test:renderer <pattern>`, 实际仓库无该脚本; 正确命令为 `pnpm test <pattern>` (vitest run + 文件名过滤)。
> 实现备注: GH-102 在实现前已提交其 top-navigation.tsx (guide 弹层改 FloatingPopover) / hooks-lifecycle-view.tsx 改动; 实现前已重读最新内容, 我的改动与之无冲突。tasks 1-6 为共享 CSS 契约的强耦合原子单元, 一次性提交 (分开提交会产生 header 块布局但内容仍带旧偏移的破坏性中间态)。

- [x] 任务 1: globals.css 新增静态常量 `--berth-page-top-offset: 6rem`
  - tests: 由任务 3/4/5 的 renderer 测试间接覆盖 (变量被消费方断言); 本项为纯 CSS 常量声明, 无独立单测。
  - verify: 不适用 (常量声明); 后续实测截图确认 sticky/内容偏移正确。
- [x] 任务 2: top-navigation.tsx 改块布局 + 移除测高 (验收 1,3,7)
  - 删 `absolute inset-x-0 top-0 z-20`、`backdrop-blur-xl`; `bg-background/80`→`bg-background`; hidden 态去 `-translate-y-3`; 删 `onHeightChange` prop + ResizeObserver useLayoutEffect + headerRef。
  - tests: `tests/renderer/top-navigation.test.tsx` 更新/确认 (标题渲染、visible/hidden data-state); `pnpm test:renderer top-navigation`。
  - verify: 实测 header 为顶部块级条、滚动时持久可见、标题栏可拖拽 (验收 1,7)。
- [x] 任务 3: app-layout.tsx 移除补偿链路 + paddingTop→gutter (验收 1,2,3)
  - 删 topNavigationHeight state / pageTopOffset / onHeightChange 传参; scrollRegionStyle 去 `--berth-page-top-offset` 注入、scrollPaddingTop→gutter; contentStyle.paddingTop→gutter; WindowControls 不传 navigationHeight; 保留 scrollbarGutter。
  - tests: `tests/renderer/app-layout.test.tsx` 更新断言 (header 无 absolute/backdrop-blur; paddingTop=gutter; 不再内联 top-offset; scrollPaddingTop=gutter); `pnpm test:renderer app-layout`。
  - verify: 内容紧贴 header 下方无遮挡无空白 (验收 5)。
- [x] 任务 4: category-jump-nav.tsx sticky top→gutter (验收 4)
  - line 34 `lg:top-[var(--berth-page-top-offset,6rem)]`→`lg:top-[var(--berth-page-gutter,1.5rem)]`; h/max-h 保持。
  - tests: `tests/renderer/category-jump-nav.test.tsx` 更新 top 断言; `pnpm test:renderer category-jump-nav`。
  - verify: sessions/instructions lg+ 左栏正确贴附内容区顶部 gutter 处, 不被遮挡/不重复偏移 (验收 4)。
- [x] 任务 5: hooks-lifecycle-view.tsx sticky top→gutter (验收 4)
  - line 117 `lg:top-[var(--berth-page-top-offset,6rem)]`→`lg:top-[var(--berth-page-gutter,1.5rem)]`; max-h 保持。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx` 更新 top 断言 (保留 max-h 断言); `pnpm test:renderer hooks-lifecycle-view`。
  - verify: capabilities/hooks lg+ 左栏正确贴顶 (验收 4)。
- [x] 任务 6: window-controls.tsx 复核 + 测试 (验收 6)
  - 无代码改动 (保留 navigationHeight 默认 72); AppLayout 已停止传参, 默认 72→top:36px。
  - tests: `tests/renderer/window-controls.test.tsx` 新增默认 36px 断言 + 原 96px 断言, 均通过; `pnpm test window-controls`。
  - verify: 本机 (Windows) 实测 window-controls 与 header 行垂直对齐 (验收 6) — 留 verify。
- [x] 任务 7: e2e 断言复核 (验收 8)
  - 已查 `tests/e2e/app.e2e.ts`、`tests/e2e/window-controls.e2e.ts`: 仅以 testId 定位 `top-navigation`, 无 `absolute`/`backdrop-blur`/top-offset/positioning 断言; testId 与 data-state 语义保留 → e2e 无需改动。
- [x] 任务 8: 全路由实测验证 (验收 5,1,4,6,7)
  - 用 `pnpm dev:agent start --id gh99-verify --debug-port 9242` 启 agent-owned 实例 (独立 user-data-dir, 不动用户 dev PID 277068); Playwright `connectOverCDP` 点击侧栏导航 (MemoryRouter, 非 URL 路由), `agent-dev.mjs screenshot` 按真实窗口句柄裁剪。验毕仅 `stop gh99-verify`, 用户 dev 存活已确认。
  - tests: manual (Electron 实测截图)。
  - verify 证据 (截图存 $TEMP):
    - overview: header 块级条 + 内容紧随其下, 无遮挡/无多余空白 (验收 1,5)。
    - sessions: CategoryJumpNav sticky 左栏贴 header 下方 gutter; 滚动后 header 持久不动、左栏钉附原位、右侧列表独立滚动 (验收 1,4)。
    - capabilities/hooks: hooks-lifecycle sticky 左栏正确贴顶 (验收 4)。
    - usage: 带 subtitle 的 header 自然增高, 内容衔接正常 (验收 5)。
    - session-detail: 嵌套面包屑 + 返回按钮 header 正确 (验收 1)。
    - instructions/Skills: 空态卡片在块 header 下正确 (验收 5)。
    - Windows window-controls 各页与 header 行对齐 (验收 6); titlebar 拖拽区保留 (验收 7); macOS 红绿灯在 sidebar 不受影响 (代码确认)。
- [x] 任务 9: 收口门禁 (验收 8)
  - `pnpm typecheck` 绿; `pnpm lint` 绿; `pnpm test` 全量 90 文件/652 tests 绿; 全局 `pnpm harness:check` 绿。
  - 推送前: `pnpm harness:prepush` + CI baseline + `harness:ci:wait`。
  - verify: 全绿。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
