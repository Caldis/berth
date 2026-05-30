# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

不改变 IPC、Asset model 或配置文件格式。

## 模块结构 / 组件拆分

- 新增 `src/main/project-dir.ts`, 提供纯函数 `resolveDefaultProjectDir`.
- `src/main/index.ts` 只负责调用该函数, 并把结果传给 `initScanner` 与 `watcher.start`。
- 新增 `tests/unit/project-dir.test.ts` 覆盖 dev / non-dev 两种分支。

## 测试策略

- 运行 `pnpm test -- tests/unit/project-dir.test.ts` 验证新增 helper。
- 运行 `pnpm harness:check` 验证任务态与 harness 结构。
- 能力允许时运行 `pnpm test` 或全量门禁; 若受当前工作区他人改动影响, 明确记录。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| dev 模式返回 `undefined` | 1, 3 |
| non-dev 模式返回传入 cwd | 2, 3 |
| `src/main/index.ts` 复用同一个 resolved projectDir | 1, 2 |
| 只触碰干净目标文件与本任务态 | 4 |

