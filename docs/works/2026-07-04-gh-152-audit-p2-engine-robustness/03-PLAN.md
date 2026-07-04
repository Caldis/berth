# 任务清单 (Design 产物 / 活清单) — GH-152

从 02-SPEC 拆解。顺序 T1→T7 (T5/T6 同文件顺序, 可合一提交); 每项过目标测试后提交。

- [x] T1 (A-B1): session-replay.ts NUL 字面转义 `'\0'` (commit 0211bb60)
  - tests: session-replay 三测试文件回归 15/15; 替代验证 `git ls-files --eol` 工作树转 `w/lf` 文本, NUL 计数 1→0
  - verify: 不适用 (非 UI)
- [x] T2 (A-B2): search 判脏引用化, 删签名机制, addAsset/removeAsset 只提不删并同步清 indexedAssets (commit dc3ca0f0)
  - tests: search.test.ts 6/6 — 同引用不重建 (spy addAll) + 新引用立即可搜
  - **偏差 (测试形态)**: 两条新用例为 characterization (旧实现下也绿) 而非先红 — 判脏机制替换是行为守恒的性能改动, 行为级红灯不可构造; 以行为钉 + 机制评审为证据
  - verify: 不适用
- [x] T3 (A-B3): 三个安慰剂控件 supported:false (commit 78773789)
  - tests: scan-engine-settings.test.ts 先红后绿 4/4
  - **偏差 (方案内)**: 不联动 editable=false — 渲染面板 `isDisabled={!control.supported||saving}` 由 supported 单独驱动禁用 (osThrottle win32 先例), 保持与先例一致
  - verify: dev 实例设置面板截图 (归 4.0-verify)
- [x] T4 (A-B4): domain-log.ts 助手 + 三文件 10 个记账点 (commit c4f493b4)
  - tests: domain-log 直测 (去重/ENOENT 分类) + agent-teams 坏 config + united-memory 坏 index, 6 文件 54/54 (含 frontmatter characterization 钉)
  - **偏差 (归类修正)**: 两处 splitFrontmatter YAML 容错从记账改归豁免 — 优雅降级正文仍可见 (无数据消失), 且为 characterization 钉住的纯函数, 不注副作用; parseUnitedIndex 经可选 onMalformed 回调保持纯度、读取方记账
  - verify: 不适用
- [x] T5 (A-B5): SnapshotStore.close 契约 + sqlite checkpoint+close+closed + before-quit cancel→kill→close (commit 0feecc1d)
  - tests: sqlite-snapshot-store.test.ts 先红后绿; 装配顺序 tests: not needed — electron 装配, 替代验证 = 代码评审 + e2e 关停回归
  - verify: 不适用
- [x] T6 (A-B6): getDb 瞬态错误分类 + 5s 退避重试 (commit 0feecc1d, 与 T5 同文件合并提交)
  - tests: BUSY 退避后重试成功 / 窗口内不 hammer / 非瞬态永久放弃 — 先红后绿 17/17
  - verify: 不适用
- [x] T7 (A-B7/B8): error-dialog-gate + 弹框接入; 电池 isOnBatteryPower() seed (commit ac1de5e9)
  - tests: error-dialog-gate.test.ts 3/3; 电池 seed tests: not needed — 装配单行无逻辑分支, 替代验证 typecheck+评审
  - verify: 不适用
- [ ] 收口: 全局门禁 + 推送 + CI 旁路 + (verify 阶段) 设置面板禁用态截图
  - tests: 全量
  - verify: 设置面板三控件禁用呈现无布局破坏

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- [x] T8 (A-B3 verify 缺口): renderer `ControlInput` 对 `!supported` 统一早退到只读 "暂不支持" (number 分支此前忽略该标志, dev 实例 CDP 实测输入+保存仍可见)
  - tests: `settings-page.test.tsx` 新用例先红后绿 16/16; 全量 renderer 94 文件 533 绿
  - verify: CDP 重跑 — 4 个"暂不支持"可见 (三目标控件 + win32 osThrottle), 三控件 IPC supported:false 核对, 截图确认可用项 (批次间停顿/遵循 .gitignore) 保持可编辑、布局无破坏
