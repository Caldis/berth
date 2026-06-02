# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 扩展导航模型和路由
  - scope: `nav-config.ts`, `App.tsx`, `top-navigation.tsx`, i18n
  - tests: `pnpm test tests/renderer/app-routing.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/sidebar-agent-view.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/search-dialog.test.tsx` passed
  - verify: 新路径可直接打开; 旧 `/configuration/capabilities?tab=statusLine` 跳转到 `/capabilities/status-line`; i18n key 由 renderer 测试覆盖
- [x] 任务 2: 迁移 Instructions 页面为 route-driven section
  - scope: `instructions.tsx`
  - tests: `pnpm test tests/renderer/instructions-guidance.test.tsx` passed
  - verify: 页面内不再出现主 `TabGroup`; `activeSection` 直接选择模块; filter/empty/guide 保持
- [x] 任务 3: 迁移 Capabilities 页面为 route-driven section
  - scope: `capabilities.tsx`
  - tests: `pnpm test tests/renderer/capabilities-guidance.test.tsx` passed
  - verify: 页面内不再出现主 `TabGroup`; `/capabilities/hooks`、`/capabilities/permissions` 等通过 route-driven section 显示; hooks 生命周期视图、permissions 无搜索过滤逻辑保持
- [x] 任务 4: 重做侧边栏展示和 Agent 视角位置
  - scope: `sidebar.tsx`, i18n, sidebar renderer tests
  - tests: `pnpm test tests/renderer/sidebar-agent-view.test.tsx` passed
  - verify: 展开态菜单有短说明; 折叠态图标和 title/aria-label 可用; Agent 视角位于底部过滤区且不和项目范围混用; Electron screenshot `C:\Users\mail\AppData\Local\Temp\berth-gh83-sidebar-env.png`
- [x] 任务 5: 更新搜索跳转与相关测试
  - scope: `search-dialog.tsx`, tests
  - tests: `pnpm test tests/renderer/search-dialog.test.tsx` passed
  - verify: hook 搜索结果跳转 `/capabilities/hooks`; instruction-like 结果路由已按类型映射到新 instructions 路径
- [x] 任务 6: 类型、harness 和视觉验证
  - scope: 全部本任务触达文件
  - tests: `pnpm typecheck:web` passed; `pnpm harness:check` passed; target renderer tests passed; `pnpm harness:prepush` passed with 74 test files / 559 tests
  - verify: Electron CDP 实测 Hooks 与环境变量入口、Agent 视角、Project scope; screenshots `C:\Users\mail\AppData\Local\Temp\berth-gh83-sidebar-ia.png`, `C:\Users\mail\AppData\Local\Temp\berth-gh83-sidebar-env.png`

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
