# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- `AppState` 增加:
  - `sidebarWidth: number`
  - `setSidebarWidth(width: number): void`
  - `setSidebarCollapsed(collapsed: boolean): void`
- 宽度常量放在 renderer layout 模块内:
  - collapsed: 64
  - default expanded: 248
  - min expanded: 200
  - max expanded: 360
- IPC 增加:
  - `window:set-always-on-top(flag: boolean): void`
  - `window:is-always-on-top(): boolean`
- preload 和 shared IPC 类型同步暴露:
  - `window.setAlwaysOnTop(flag)`
  - `window.isAlwaysOnTop()`
- i18n 增加:
  - `windowControls.pin` / `windowControls.unpin`
  - `nav.resizeSidebar`
  - `nav.breadcrumbRoot` 如需要可直接复用现有 `nav.*`。

## 模块结构 / 组件拆分
- `src/renderer/src/components/layout/sidebar.tsx`
  - 从固定 `w-60` 改为 style width, 使用 store 宽度。
  - 增加顶部折叠按钮, 保留底部设置入口。
  - 增加右侧 resize handle, 展开态显示, 折叠态隐藏。
  - Agent 选择器保持当前位置, 后续由 sidebar IA issue 迁移。
- `src/renderer/src/components/layout/app-layout.tsx`
  - 主体 `marginLeft` 改为当前 sidebar width。
  - 增加 `TopNavigation` 组件, 替代空白 drag strip。
- `src/renderer/src/components/layout/top-navigation.tsx`
  - 根据 `useLocation` 和 `navSections` 生成面包屑。
  - `/sessions/:id` 展示 `Sessions / Detail`。
  - 顶部容器负责 drag 区域, 面包屑本身 no-drag。
- `src/renderer/src/components/layout/window-controls.tsx`
  - 增加 pin 按钮, 调用 always-on-top IPC。
  - 保持 maximize 状态监听和现有按钮顺序: pin / minimize / maximize / close。
- `src/main/ipc/handlers.ts`、`src/preload/index.ts`、`src/preload/index.d.ts`、`src/shared/types/ipc.ts`
  - 增加 always-on-top 的 main/preload/type 契约。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 左侧栏 + 顶部栏 + 主体三层, 顶部栏只放面包屑和 drag 空间 | e2e 截图 / DOM box 检查 |
| 组件选择 / 设计系统一致性 | 使用现有 lucide、Tailwind token、`cn`; 不引入新 UI 库 | renderer test + 视觉检查 |
| 交互反馈 / 状态切换 | resize handle hover 高亮, 拖曳时 body `col-resize`, pin 用 pressed state | renderer test + e2e |
| loading / empty / error / disabled / focus | 本任务无数据加载; focus 覆盖 collapse、settings、pin、nav buttons | renderer test |
| 响应式 / 可访问性 / 键盘可达 | 宽度 clamp; pin `aria-pressed`; resize handle 有 label | renderer test + e2e |
| 文案 / i18n / 数字和路径格式 | 新增 en/zh 文案, 路由面包屑复用 nav label | i18n renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| sidebar width state and collapse | renderer | `tests/renderer/sidebar-agent-view.test.tsx` 或新增 layout test | `pnpm test tests/renderer/sidebar-agent-view.test.tsx` |  |
| top navigation breadcrumbs | renderer | 新增 `tests/renderer/top-navigation.test.tsx` | `pnpm test tests/renderer/top-navigation.test.tsx` |  |
| pin window control | renderer + e2e | `tests/renderer/window-controls.test.tsx`, `tests/e2e/window-controls.e2e.ts` | `pnpm test tests/renderer/window-controls.test.tsx`; `pnpm test:e2e tests/e2e/window-controls.e2e.ts` |  |
| shell layout visible and resizable | e2e | `tests/e2e/app.e2e.ts` | `pnpm build`; `pnpm test:e2e tests/e2e/app.e2e.ts` |  |
| full gate | harness / typecheck / lint | existing | `pnpm harness:prepush` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| sidebar width / resize / collapse | 1, 2, 5 |
| top navigation breadcrumb | 3, 5 |
| pin IPC and button | 4, 5 |
| tests and CI gate | 6 |
