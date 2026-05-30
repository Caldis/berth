# 活任务清单 (Implementation 驱动)

> 勾选制。verify 不通过项回写为新任务。

## 任务
- [ ] 1. 新建 `nav-config.ts`: 移出 `NavItem`/`NavSection` 类型 + `navSections` (去掉 AGENTS 分组), export。
- [ ] 2. `sidebar.tsx`: 改为 `import { navSections } from './nav-config'`; 删除内联类型与 navSections 定义; 删除未用的 `Bot` import。
- [ ] 3. i18n: 删除 `nav.agents`、`nav.claudeCode` (zh.json + en.json)。
- [ ] 4. 删除空目录 `components/agents/claude-code`、`components/agents/sessions`、`components/agents`。
- [ ] 5. 写 `tests/renderer/nav-config.test.ts`: 断言 navSections 内所有 item.path 唯一 (Set size === count)。
- [ ] 6. 运行 `pnpm test` (vitest) → 通过; `pnpm typecheck`; `pnpm lint`。
- [ ] 7. 视觉验收: 先 pgrep 查实例 (有则复用), `/sessions` 实测坐标截图 → 确认无双亮。
- [ ] 8. INDEX phase→verify→archive; 提交 (显式路径); gh item 置 Done; 移入 _archive。
