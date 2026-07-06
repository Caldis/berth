# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- `resolveDefaultProjectDir`:
  - dev: always `undefined`
  - prod: return normalized cwd only when cwd is a plausible project path
  - prod unsafe cwd: filesystem root, `.app` bundle segment, empty string -> `undefined`
- `LogWriter`:
  - levels: `verbose | info | warning | error`
  - default `minLevel=info`
  - legacy `log(scope, err)` remains and writes `error`
  - line format: ISO timestamp + `[level] [scope] detail`
- `ScanHelperHost` logs:
  - queue scan / project-deep with project root and timeout
  - spawned helper pid
  - verbose progress/partial/post when enabled
  - done with asset/error/source/candidate counts
  - warning on watchdog and helper exit
  - error on child error message

## 任务分类与 debt
- type / maintenance.subtype: bug / n/a
- source.kind / refs: user-request / GH-157
- debt.estimate: net 7, cross-process/high
- debt.final 预期: verify 后填写
- revisions: explore 已校准一次
- Project 字段同步: tracked, In Progress

## 模块结构 / 组件拆分
- `src/main/project-dir.ts`: 只负责 packaged 默认 projectDir 选择策略。
- `packages/berth-scan-engine/src/log.ts`: engine-shared logging primitive, 保持本地文件无遥测边界。
- `src/main/helper-host.ts`: Electron utilityProcess host, 补事务日志, 不改变 scan protocol。
- tests: unit-level guard, 不引入 e2e 作为本轮唯一验证。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 UI | 不适用 |
| 组件选择 / 设计系统一致性 | 不改 UI | 不适用 |
| 交互反馈 / 状态切换 | 数据恢复后 agent selector 自然恢复; 不改组件 | unit + 后续 production smoke |
| loading / empty / error / disabled / focus | 不改 UI 状态文案 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 UI | 不适用 |
| 文案 / i18n / 数字和路径格式 | 日志格式为本地文件, 非 UI 文案 | unit |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| unsafe cwd 不进入 projectDir | unit | `tests/unit/project-dir.test.ts` | `pnpm vitest run tests/unit/project-dir.test.ts` |  |
| 日志等级、过滤和旧 log 兼容 | unit | `tests/unit/main-log.test.ts` | `pnpm vitest run tests/unit/main-log.test.ts` |  |
| helper host watchdog/事务路径仍可用 | unit | `tests/unit/helper-host.test.ts` | `pnpm vitest run tests/unit/helper-host.test.ts` |  |
| log writer interface mock consumers | unit | `tests/unit/domain-log.test.ts`, `tests/unit/typed-ipc.test.ts` | `pnpm vitest run ...` |  |
| 生产现场重现 | manual evidence | `/tmp/berth-gh-157-*`, `~/Library/Application Support/berth/logs/main.log`, SQLite `snapshot_meta` | `ps`, `sqlite3`, `sample`, `lsof` | 现场数据来自 installed app, 不适合写入自动测试 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| S1 cwd 防护 | AC1, AC2 |
| S2 levelled logs | AC3, AC4 |
| S3 helper transaction logs | AC3, AC6 |
| S4 tests | AC5 |
