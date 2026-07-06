# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 捕获 production 现场并复现根因
  - tests: manual evidence (`ps`, `sqlite3`, `sample`, `lsof`, `/tmp/berth-gh-157-20260706-160837`)
  - verify: DB `projectDir="/"`, main.log 连续 120s watchdog, helper sample 在 `uv_fs_scandir`
- [x] 任务 2: 修复 packaged 默认 projectDir 选择
  - tests: `PATH=/Users/caldis/.nvm/versions/node/v24.3.0/bin:$PATH pnpm vitest run tests/unit/project-dir.test.ts tests/unit/main-log.test.ts tests/unit/helper-host.test.ts tests/unit/domain-log.test.ts tests/unit/typed-ipc.test.ts`
  - verify: unsafe cwd (`/`, `.app`, Windows drive root) -> `undefined`; real project cwd preserved
- [x] 任务 3: 增加 levelled log writer 与配置
  - tests: 同任务 2
  - verify: `verbose/info/warning/error`, `minLevel`, legacy `log()` 兼容
- [x] 任务 4: 增加 scan helper 事务日志
  - tests: 同任务 2
  - verify: helper host 既有 15 项 unit 通过; 新日志不改变协议

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
