# 任务清单 (Design 产物 / 活清单) — GH-152

从 02-SPEC 拆解。顺序 T1→T7 (T5/T6 同文件顺序, 可合一提交); 每项过目标测试后提交。

- [ ] T1 (A-B1): session-replay.ts NUL 字面转义 `'\0'`
  - tests: session-replay 三测试文件回归; 替代验证 `git ls-files --eol` 转文本
  - verify: 不适用 (非 UI)
- [ ] T2 (A-B2): search 判脏引用化, 删签名机制 (孤儿), addAsset/removeAsset 只提不删并同步清 indexedAssets
  - tests: search.test.ts — 同引用二次 search 不重建 (spy addAll); 新数组重建且新资产可搜; 既有用例回归
  - verify: 不适用
- [ ] T3 (A-B3): 三个安慰剂控件 supported:false + editable:false (numControl 加参)
  - tests: scan-engine-settings.test.ts 断言三控件 + 其余不变
  - verify: dev 实例设置面板截图 (归 4.0-verify)
- [ ] T4 (A-B4): domain-log.ts 助手 + 三文件 8 个记账点 (12 个豁免点不动)
  - tests: 三个域测试文件加损坏 fixture 用例 (log 记账/去重/ENOENT 零 log/容错语义不变)
  - verify: 不适用
- [ ] T5 (A-B5): SnapshotStore.close 契约 + sqlite 实现 (checkpoint+close+closed 防复用) + index.ts before-quit 顺序 cancel→kill→close
  - tests: sqlite-snapshot-store.test.ts close 行为; 装配顺序 tests: not needed — electron 装配, 替代验证 = 代码评审 + e2e 关停回归
  - verify: 不适用
- [ ] T6 (A-B6): getDb 瞬态错误分类 + 5s 退避重试 (注入 now)
  - tests: sqlite-snapshot-store.test.ts — BUSY 窗口内 no-op/窗口后重试成功/非瞬态永久放弃
  - verify: 不适用
- [ ] T7 (A-B7/B8): error-dialog-gate 纯函数 + index.ts 接入; 电池 isOnBatteryPower() seed
  - tests: error-dialog-gate.test.ts (新); 电池 seed tests: not needed — 装配单行, 替代验证 typecheck+评审
  - verify: 不适用
- [ ] 收口: 全局门禁 + 推送 + CI 旁路 + (verify 阶段) 设置面板禁用态截图
  - tests: 全量
  - verify: 设置面板三控件禁用呈现无布局破坏

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
