# 任务清单 (Design 产物 / 活清单)

顺序执行。搜索引擎、IPC 和 UI 都会触及同一个查询契约, 不拆并行任务。

- [ ] 任务 1: 扩展搜索引擎的安全元数据索引, 并增加索引 freshness 保护。
  - tests: `pnpm test tests/unit/search.test.ts`
  - verify: session project/model/path、hook command/event、MCP/skill/command 描述能命中; 不索引 `asset.raw`。

- [ ] 任务 2: 修正 `assets:search` IPC 查询路径和 preload 类型。
  - tests: `pnpm typecheck`
  - verify: 未提前扫描时也通过 `ensureScanned()` 使用当前资产; `window.api.assets.search` 类型为 `Promise<SearchResult[]>`。

- [ ] 任务 3: 将搜索弹窗接入真实查询结果。
  - tests: `pnpm test tests/renderer/search-dialog.test.tsx`
  - verify: 非空输入触发 IPC; loading/empty/error/result 状态都有中英文文案; 空输入保留快捷入口。

- [ ] 任务 4: 完成结果行信息、导航和键盘操作。
  - tests: `pnpm test tests/renderer/search-dialog.test.tsx`
  - verify: 结果展示 title/type/agent/scope/path/match; ArrowUp/ArrowDown 切换 `aria-selected`; Enter 和 click 导航并关闭弹窗; Tab trap 和 Escape 保留。

- [ ] 任务 5: 完成 GH-81 验证与归档。
  - tests: `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`
  - verify: Electron 实测全局搜索, 截图确认 command palette 信息密度、结果行截断、状态反馈和键盘可达; archive 前同步 Project Done。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
