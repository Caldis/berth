# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不变。不新增 IPC、配置字段或持久化数据。

## 模块结构 / 组件拆分

- 不修改生产代码。当前代码已满足验收标准。
- 只在验证阶段运行现有目标测试:
  - `tests/unit/project-dir.test.ts`
  - `tests/unit/watcher.test.ts`
- 若验证失败, 再回到 implement 补修 `resolveDefaultProjectDir` 或 watcher 输入。

## 界面质量与交互验收

不适用。此任务只处理 main 进程扫描范围与 watcher 输入。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| dev 模式不使用 cwd 作为 projectDir | unit | `tests/unit/project-dir.test.ts` | `pnpm test -- tests/unit/project-dir.test.ts` |  |
| watcher 只在显式 projectDir 时加入项目路径 | unit | `tests/unit/watcher.test.ts` | `pnpm test -- tests/unit/watcher.test.ts` |  |
| main/node 类型完整性 | typecheck | main process | `pnpm typecheck:node` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 不修改生产代码, 使用现有 project-dir 和 watcher 测试证明行为 | 1, 2, 3, 4 |
