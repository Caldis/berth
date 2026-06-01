# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 核对 main -> project-dir -> scanner/watcher 调用链。
  - tests: not needed - 纯代码路径确认, 由任务 2/3 的目标测试覆盖行为。
  - verify: `src/main/index.ts` 已通过 `resolveDefaultProjectDir` 计算 `projectDir`, 不再裸传 `process.cwd()`。
- [x] 任务 2: 验证 dev 模式不把 cwd 作为 projectDir。
  - tests: `pnpm test -- tests/unit/project-dir.test.ts`
  - verify: 通过, `resolveDefaultProjectDir({ isDev: true })` 返回 `undefined`。
- [x] 任务 3: 验证 watcher 在无 projectDir 时不加入项目路径。
  - tests: `pnpm test -- tests/unit/watcher.test.ts`
  - verify: 通过, watcher 仅在显式 projectDir 时加入项目 `.claude` / `.mcp.json`。
- [x] 任务 4: Node 类型检查。
  - tests: `pnpm typecheck:node`
  - verify: 通过。

## verify 回写

- 2026-06-02: `pnpm test -- tests/unit/project-dir.test.ts tests/unit/watcher.test.ts` 通过。
- 2026-06-02: `pnpm typecheck:node` 通过。
- 2026-06-02: `pnpm harness:check --work docs/works/2026-06-02-gh-18-dev-cwd-scan-scope` 通过。
