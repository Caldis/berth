# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] 任务 1: 扩展导航模型和路由
  - scope: `nav-config.ts`, `App.tsx`, `top-navigation.tsx`, i18n
  - tests: renderer 路由/面包屑相关测试, 或在 sidebar/navigation 测试中覆盖路径匹配
  - verify: 新路径可直接打开; 旧 `/configuration/*` 路径按 tab/query 跳转; i18n 无缺失 key
- [ ] 任务 2: 迁移 Instructions 页面为 route-driven section
  - scope: `instructions.tsx`
  - tests: `pnpm test tests/renderer/instructions-guidance.test.tsx`
  - verify: 页面内不再出现主 `TabGroup`; `/instructions/skills`、`/instructions/commands` 等直接显示对应内容; filter/empty/guide 保持
- [ ] 任务 3: 迁移 Capabilities 页面为 route-driven section
  - scope: `capabilities.tsx`
  - tests: `pnpm test tests/renderer/capabilities-guidance.test.tsx`
  - verify: 页面内不再出现主 `TabGroup`; `/capabilities/hooks`、`/capabilities/permissions` 等直接显示对应内容; hooks 生命周期视图、permissions 无搜索过滤逻辑保持
- [ ] 任务 4: 重做侧边栏展示和 Agent 视角位置
  - scope: `sidebar.tsx`, i18n, sidebar renderer tests
  - tests: `pnpm test tests/renderer/sidebar-agent-view.test.tsx` 或新增导航测试
  - verify: 展开态菜单有短说明; 折叠态图标和 title/aria-label 可用; Agent 视角位于底部过滤区且不和项目范围混用; 长菜单滚动正常
- [ ] 任务 5: 更新搜索跳转与相关测试
  - scope: `search-dialog.tsx`, tests
  - tests: `pnpm test tests/renderer/search-dialog.test.tsx`
  - verify: hook/mcp/permission/plugin/statusline/env 搜索结果跳转新 capabilities 路径; instruction-like 结果跳转新 instructions 路径
- [ ] 任务 6: 类型、harness 和视觉验证
  - scope: 全部本任务触达文件
  - tests: `pnpm typecheck:web`; `pnpm harness:check`; 目标 renderer tests; 必要时 `pnpm harness:prepush`
  - verify: Electron 实测展开/折叠侧边栏、新路径页面、旧路径 redirect、Agent/Project 底部过滤区; 截图或 CDP 证据记录在 verify

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
