# 任务清单 (Design 产物 / 活清单) — GH-110

从 02-SPEC 拆解。hybrid 节奏: **P1 先建包骨架+CLI+E2E 闭环 → P2 扫描覆盖增量 → P3 性能 → P4 UI/折叠 issue → P5 测试收口**。
顺序/并行边界已标注。每个实现项含 `tests:` 与 `verify:`。implement 阶段维护此清单。

## P1 — 引擎包骨架 + CLI + E2E 闭环 (基础, 严格顺序; global/high-risk)

- [x] **P1.1** 建 pnpm workspace + `packages/berth-scan-engine` 骨架: `package.json`(@berth/scan-engine, bin berth-scan, exports)、`tsup.config.ts`、`vitest.config.ts`、`tsconfig`; `src/index.ts` + `src/capabilities.ts`(agent CLI 命令清单单一真源, 供 P1.3 CLI 与 status 消费)。根 `pnpm-workspace.yaml`(仅 `packages/*`, 不动 website)。
  - tests: ✅ `pnpm --filter @berth/scan-engine test` 3/3 绿 (tests/capabilities.test.ts); `typecheck` 干净; `build` 产出 dist (ESM+CJS+dts)。根 `pnpm typecheck:node` 通过 (无回归)。
  - verify: 不适用 (无 UI)。
  - 偏差/友: 引擎包 vitest 需本地 `vitest.config.ts` 隔离 (否则继承根 renderer setup 报错)。Windows 本地 `pnpm install` 的 `electron-builder install-app-deps` postinstall 因 esbuild 平台 optional 包 ENOENT 退出 1 —— 预存 Windows 本地摩擦, 不阻塞 dev/test/build, CI(Linux) 不复现; 记 `docs/friction/20260606-3.0-implement-pnpm-postinstall-esbuild-windows.md`。
- [ ] **P1.2** watcher 解耦: `AssetWatcher` 去 `BrowserWindow`/`webContents.send`, 改注入 `onChange(evt)`; `src/main/index.ts` 注入回调; IPC handler 退化为薄代理引擎 selectors。
  - tests: tests/unit/watcher.test.ts 用回调断言事件; 现有 watcher 测试更新通过。
  - verify: 不适用。`pnpm dev` 启动应用、assets:changed 仍到渲染层(手测一次)。
- [ ] **P1.3** CLI `berth-scan`: scan/snapshot/assets/sessions/search/inspect/health/usage/sources/status; 全 `--json`、`--home-dir/--codex-home/--project` 注入、退出码 0/2/3、只读。
  - tests: packages/.../tests/e2e/cli.e2e.ts 断言各命令 JSON schema + 退出码。
  - verify: 不适用 (CLI)。`berth-scan scan --json | jq .stats` 人工抽验一次。
- [ ] **P1.4** fixture HOME 树 `packages/.../fixtures/e2e/{home,project}` (覆盖 约定/skill/agent/command/output-mode/mcp/hook/plugin+组件/sessions, claude+codex) + golden-snapshot E2E harness(路径归一化)。先以现有引擎产出 baseline golden。
  - tests: packages/.../tests/e2e/scan.e2e.ts `toMatchSnapshot`; `pnpm --filter @berth/scan-engine test` 绿。
  - verify: 不适用。

## P2 — 扫描覆盖增量 (描述符先行; 其后多项可并行, 各自 fixture+golden 守护)

- [ ] **P2.1** 描述符模型升级 (tier/emits/parserKey/ignore) + 描述符驱动 orchestrator: `scanner.ts` 从硬编码改为遍历描述符派生扫描与覆盖; 补 BuiltInScanSourceCode 新值。**[P2 其余项依赖此, 顺序]** (C9/A6)
  - tests: tests/unit/scan-descriptors.test.ts (tier/parserKey/ignore 派生 + 覆盖矩阵每行有描述符)。
  - verify: 不适用。golden snapshot 不回退 (行为等价)。
- [ ] **P2.2** Claude 插件下钻 + 关联 (A1/B7/B8): 读 installed_plugins.json/known_marketplaces.json/settings.enabledPlugins; 枚举 cache/marketplaces/data; `.claude-plugin/plugin.json`; 下钻 commands/agents/skills/hooks/mcp 产出组件资产 + contains/belongs-to 关系。**[依赖 P2.1; 与 P2.3 并行(不同文件)]**
  - tests: tests/unit/plugin-scan.test.ts + e2e fixture 含 cache/<mk>/<plugin>/<ver>; 断言组件资产数 + 关系。
  - verify: 不适用 (UI 在 P4)。golden 更新经审阅。
- [ ] **P2.3** Codex 插件下钻 (A2): `~/.codex/plugins/<mk>/<plugin>/manifest.toml` + skills/hooks/mcp。**[依赖 P2.1; 与 P2.2 并行]**
  - tests: tests/unit/codex-plugin-scan.test.ts + fixture manifest.toml。
  - verify: 不适用。
- [ ] **P2.4** 第三方 manifest 描述符驱动只读扫描 (A3): orchestrator 按 manifest sourceDescriptors + 内置 parser 产出真实资产(替换元数据桩); 断言 implementation 不执行。**[依赖 P2.1]**
  - tests: tests/unit/manifest-scan.test.ts (断言只读、不 require 第三方入口)。
  - verify: 不适用。
- [ ] **P2.5** MCP 多来源补全 (A4): `~/.claude.json` projects[].mcpServers、`.claude/settings.json`/`settings.local.json` mcpServers、插件 .mcp.json; 去重 (name,scope,sourcePath)。**[与 P2.2/2.3/2.6 并行(parsers 局部)]**
  - tests: tests/unit/mcp-sources.test.ts (各来源 + 去重)。
  - verify: 不适用。
- [ ] **P2.6** 约定嵌套 + @import 关系 (A5): 子目录 CLAUDE.md(受 ignore)、CLAUDE.local.md; @import 经 buildImportChain 成 imports 关系 + meta.importedBy; Codex profiles/project config 优先级。**[与 P2.5 并行]**
  - tests: tests/unit/instructions-imports.test.ts (嵌套发现 + import 链 + 环检测)。
  - verify: 不适用。

## P3 — 性能 (秒级切换 + 无瓶颈; 顺序, 触及 runtime 高 risk)

- [ ] **P3.1** 分层缓存 store (global + per-project Map) + scope 切换纯过滤 + global 真聚合: `runtime`/`project-scope-runtime` 改造; global/user 切换不重扫只改 selection; 项目层缓存常驻。**[依赖 P2 完成的扫描产出]** (E14)
  - tests: tests/unit/layered-store.test.ts (spy scanAll: global/user 切换 0 次重扫; 项目复选命中缓存)。
  - verify: 切换感知 < 1s(P4 接 UI 后端到端实测 + 截图)。
- [ ] **P3.2** 增量 watcher + 全类型 fingerprint cache + worker 池化 + 基准: file-cache 扩到所有 parser; watcher 局部重扫; 1k skills+1k sessions 首扫/切换计时。 (E15)
  - tests: tests/unit/file-cache-incremental.test.ts (命中率) + bench 计时断言阈值。
  - verify: 不适用 (基准数据记入 verify)。

## P4 — UI / 统一 loading / 折叠 issue (渲染层; 多数按页面顺序)

- [ ] **P4.1** 边栏统一 loading + 乐观 scope 切换 UI (F16): 统一 Spinner/骨架组件; 切换立即切 UI 后台补扫。
  - tests: tests/renderer/scope-switch-loading.test.tsx。
  - verify: 界面质量项「交互反馈/状态切换、loading 态」; 切换 < 1s; 截图请用户确认。
- [ ] **P4.2** 插件↔组件关系 UI (B7/F17): capabilities plugins tab 改 HeroUI Card + Accordion 分组(skills/agents/commands/hooks/mcp)+ Chip; 组件可跳转。
  - tests: tests/renderer/capabilities-plugins.test.tsx (展开 + 组件计数 + 关系链接)。
  - verify: 界面质量项「布局层级/信息密度、组件选择/设计系统一致性」; 截图请用户确认。
- [ ] **P4.3** 折叠 session-error-channel (F18): useSessions/useSessionDetail 加 error 通道; HeroUI Alert+retry; 扫描错误 (snapshot.errors) 可见。
  - tests: tests/renderer/session-error.test.tsx (模拟 IPC 失败显示 error)。
  - verify: 界面质量项「error 态」; 截图请用户确认。
- [ ] **P4.4** 折叠 sessions-list-virtualization (E/F18): GroupedVirtuoso/复用 VirtualGroupedList + 分类跳转; 大列表无卡顿。 **[与 P4.3 不同文件, 可并行]**
  - tests: tests/renderer/sessions-virtualization.test.tsx (1k 行渲染 + 跳转)。
  - verify: 界面质量项「响应式/可访问性」; 1k+ 行流畅; 截图确认。
- [ ] **P4.5** 折叠 heroui-migration-followup (F17): 仅对本任务触及页面把残留手搓控件迁 HeroUI(cards/select/modal/accordion/chip); 不扩大到无关页。
  - tests: 复用受影响页 renderer 测试; 代码审计无业务层直接 `@heroui/react`。
  - verify: 界面质量项「设计系统一致性」; 截图确认。

## P5 — 测试收口 + 全量回归

- [ ] **P5.1** 输出模式/命令/子代理无副作用用例 (G19): 构造 fixture, 断言扫描只读、产出正确。
  - tests: tests/unit/output-mode-command-agent.test.ts。
  - verify: 不适用。
- [ ] **P5.2** 全量回归 + 引擎提取行为不变 (C10/C11): `pnpm typecheck && pnpm build && pnpm test` + `pnpm --filter @berth/scan-engine test` + CLI E2E golden; 全局 `pnpm harness:check`。
  - tests: 上述全绿; golden snapshot 终态。
  - verify: `pnpm dev` 启动应用端到端抽验 (扫描呈现/切换/关联/loading); 截图请用户确认主观项。

## 并行/顺序边界小结
- 顺序: P1.1→P1.2→P1.3→P1.4; P2.1 先于 P2.2–P2.6; P3.1→P3.2; P3 在 P2 后; P5.2 最后。
- 可并行: P2.2 ∥ P2.3 ∥ (P2.5 ∥ P2.6); P4.3 ∥ P4.4。P2.4 依赖 P2.1 可与 2.2/2.3 并行。
- 高 risk 顺序点: P1.2(胶水解耦)、P2.1(扫描重构)、P3.1(runtime 分层)——单独推进 + golden/单测守护。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
