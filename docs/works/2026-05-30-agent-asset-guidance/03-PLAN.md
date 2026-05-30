# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 新增 `asset-guidance` 数据定义、`AssetGuidePanel` 组件和中英文 i18n 文案。验证: `pnpm test -- tests/renderer/asset-guide-panel.test.tsx`; `pnpm typecheck:web`。
- [x] 任务 2: 在 Instructions / Capabilities 页面接入说明面板, 不改现有扫描和 IPC。验证: `pnpm typecheck:web`。
- [x] 任务 3: 修复 PermissionsSection / EnvSection 对当前 parser meta 的兼容展示。验证: `pnpm test -- tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`。
- [x] 任务 4: 跑 typecheck、相关 tests、harness:check; 如启动 Electron, 按 verify 规则做视觉检查。验证: `pnpm test -- tests/renderer/asset-guide-panel.test.tsx tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`; `pnpm harness:check`。
- [x] 任务 5: 说明面板增加当前证据、provider 对照和可折叠详情, 保持顶部文案克制。验证: `pnpm test -- tests/renderer/asset-guide-panel.test.tsx tests/renderer/asset-guidance.test.ts tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`。
- [x] 任务 6: 权限页增加有效权限摘要、来源分布和宽泛规则风险提示。验证: `pnpm test -- tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`。
- [x] 任务 7: 环境变量页按 runtime / MCP / hooks / telemetry / provider 分组, 保持敏感值隐藏。验证: `pnpm test -- tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`。
- [x] 任务 8: 增加入门路径提示, 帮新用户理解 Instructions → Capabilities → Permissions / Env → Sessions 的查看顺序。验证: `pnpm test -- tests/renderer/asset-guide-panel.test.tsx tests/renderer/asset-guidance.test.ts`。
- [x] 任务 9: 给所有 guide 的官方文档链接加维护性测试, 确保每个资产类型至少有 doc link。验证: `pnpm test -- tests/renderer/asset-guidance.test.ts`。
- [x] 任务 10: 更新中英文文案, 保持抽象层表述, 不把 Berth 锁死在单一 coding agent。验证: JSON parse 检查; `pnpm typecheck:web`。
- [x] 任务 11: 跑相关测试、typecheck、harness:check。验证: `pnpm test -- tests/renderer/asset-guide-panel.test.tsx tests/renderer/asset-guidance.test.ts tests/renderer/capability-assets.test.ts`; `pnpm typecheck:web`; `pnpm harness:check`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- 2026-05-31: 相关 renderer 测试 3 个文件 10 个用例通过; `pnpm typecheck:web` 通过; `pnpm harness:check` 通过。未启动 Electron 做人工视觉截图, 留到正式 verify / archive 前补做。
