# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**顺序执行** (runtime.ts 同文件反复修改)。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate` 并追加 `debt.revisions[]`。

- [x] T1 selector-cache.ts 出文件 (AC-1 部分) — DONE: 类+接口纯平移, runtime 删声明改 import; 新直测 3 断言绿 + 锚点文件零改动全过 + 全量 1053 绿 (+3) + typecheck
  - 内容: SnapshotSelectorCache 类 + AssetSelectorCache 接口纯平移至 `engine/assets/selector-cache.ts`; runtime import 之, 不再声明 (接口零外部消费, grep 已证)。
  - tests: tests/unit/selector-cache.test.ts (新): 同 snapshot.id 命中不重 derive / 换 id 重 derive / clear 后重 derive; 锚点 24 逐字不动绿。
  - verify: `pnpm test` 全量绿 + typecheck; 非 UI 不适用。

- [ ] T2 project-snapshot-cache.ts (AC-1 部分)
  - 内容: 新建 ProjectSnapshotCache (has/get/set, projectKey 私有内聚); runtime 的 snapshotCache Map + projectKey() + 5 处裸操作 (restore/setProjectDir 命中/runRefresh set/applyFileChange set/hasSnapshotFor) 全部改经协作者。
  - tests: tests/unit/project-snapshot-cache.test.ts (新): set/get/has、normalizeProjectPathKey 归一同键 (大小写/斜杠变体)、undefined=global 键、miss undefined; 锚点 24 逐字不动绿。
  - verify: `pnpm test` 全量绿 + typecheck; 非 UI 不适用。

- [ ] T3 scan-coordinator.ts + runtime 重组 (AC-1/2 主体, Q1=B)
  - 内容: 新建 ScanCoordinator (swap/isScanning/wait/run(sink)/current, 代际检查内化 R4); runtime: refresh() 改 isScanning+wait+transitionToScanning+run(makeSink); setProjectDir() 改 coordinator.swap; runRefresh 拆解 — 执行体进 coordinator.run, 数据提交进 makeSink (onProgress/onPartial/onCompleted/onFailed); 持久化谓词收敛 persistIfDefaultView; scanner 字段/inFlight/isCurrent 从 runtime 删除。
  - tests: tests/unit/scan-coordinator.test.ts (新): run 期间二次 run 返回同 inFlight (去重) / wait 语义 / swap 后旧扫描 onProgress/onPartial/onCompleted/onFailed 全部不派发 / 异常走 onFailed / finally 清 inFlight 可再扫; **锚点 24 逐字不动绿** (R4/P4.6/id 稳定/in-flight 复用等价性核心证据)。
  - verify: `pnpm test` 全量双轮绿 + typecheck; 非 UI 不适用。

- [ ] T4 收口 (AC-2/4/5/6)
  - 内容: runtime.ts 行数核对 (目标 ≤~400) + 职责自查 (无类体/裸 Map/执行体残留); ARCHITECTURE pkg:engine 行补 "assets/ 三协作者" 一句; 全量门禁 + e2e + 包三连 + dev 冷启动探活; prepush + push + ci:wait。
  - tests: 全量 `pnpm test` ×2 + `pnpm build && pnpm test:e2e` + `--filter` 三连 + agent 实例探活 (资产/扫描状态/项目切换)。
  - verify: AC-1~6 逐条核对; 消费面 git diff 零改动实证 (AC-3); debt.final 回填。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
