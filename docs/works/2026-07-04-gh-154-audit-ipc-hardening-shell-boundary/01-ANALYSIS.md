# 01-ANALYSIS — GH-154 批次四 (IPC 机制加固 + shell 边界)

> Explore 产物。基于 2026-07-04 master (17976d68 → e6310401) 实读源码; 00-BUG 七项为耐久清单, 本轮逐项核实, **两项状态修正** (⑦ 已实现 / ④ 结构层已闭环)。⑤ 由 Explore 子代理全量扫查 (src/main + adapters + engine, 排除 tests)。

## 1. 现状理解 (逐项核实结论)

### ① typed registerHandler — 确认缺失, 且类型钩子已预留
- `src/main/ipc/handlers.ts` (330 行, 6 个域注册函数, 45 通道) 全部裸 `ipcMain.handle('literal', ...)`, 参数/返回类型手写, 与 `IpcChannels` 表零编译期绑定。
- preload 侧已是 typed `invoke<C>`/`subscribe<E>` (GH-115 T1); `shared/types/ipc.ts:711-713` 的 `IpcChannelArgs/IpcChannelResult` 别名注释明示 "与未来 handlers 类型化共用" — 本项就是补齐该预留。
- 影响面: 迁移 45 个注册点为 typed 包装; **两个对账测试的 regex 提取面必须同批更新** (`ipc-contract.test.ts:27` 提取 `ipcMain.handle('...')` 字面量; `ipc-registration.test.ts` 走运行时 mock, 包装器内部仍调 `ipcMain.handle` → 不受影响)。

### ② sender 校验 — 确认缺失
- 45 个 handler 无一校验来源; window 域用 `BrowserWindow.fromWebContents(event.sender)` 是功能性取窗, 非门禁。
- 窗口面已核实: 单窗口 (`createWindow`), sandbox+contextIsolation+nodeIntegration:false, `setWindowOpenHandler` 全 deny, 导航全阻断 (GH-119) — sender 校验是其上的纵深防御 (防 iframe/子帧调特权通道)。
- 方案锚点: `isTrustedIpcSender(event)` = `BrowserWindow.fromWebContents(event.sender) !== null && event.senderFrame === event.sender.mainFrame`; 违例 throw (renderer promise reject) + main log 记账。集成进 ① 的 typed 包装 → 一处落 45 通道。

### ③ typed emit — 确认缺失, 实发面已枚举
- 实发共 5 点, 全在 `src/main/index.ts` (96/100 maximized-change 裸 boolean; 263 assets:changed WatchEvent; 275 assets:progress; 316 update:state) — 与 `IpcEvents` 表注释记载一致 (表←实现方向已在 GH-115 校准, 本轮 grep 复核无漂移)。
- 方案锚点: `sendToWindow<E extends keyof IpcEvents>(win, event, payload: IpcEvents[E])` 薄 helper (电子值 import 合法区: ipc/ 或 index.ts); `ipc-contract.test.ts:30` 的 eventsSent regex (`webContents\.send\('...'`) 同批更新提取面。

### ④ mock 对账 — **状态修正: 结构层已双向闭环, 真缺口是签名层**
- `tests/setup.ts:280` mockApi 已 `satisfies { [G in keyof BerthAPI]: { [M in keyof BerthAPI[G]]: unknown } }` — satisfies 对对象字面量做 excess-property 检查, **组与方法名的双向全等在编译期已强制** (审查条目的 "mock 可含多余方法不报" 已过期)。
- 真缺口: 方法类型是 `unknown` — mock 返回形状漂移 (如 getPreferences 缺 autoCheck/allowPrerelease 字段) 不报; `setup.ts:125` 注释即 GH-115 T2 遗留 TODO "收紧为 satisfies BerthAPI 全等"。
- 本项改述: **mockApi 收紧为 `satisfies BerthAPI`** (逐方法补齐真实返回形状), 运行时单向 contains 测试保留作 belt。落地时逐个修 mock payload, 以 typecheck 红名单驱动。

### ⑤ 正则提取加固 — 扫查定量: 1 硬命中 + 3 存疑 (面远小于预估)
子代理全量扫查 (grep .match/.exec/matchAll + 逐点读上下文 ±15 行):
- **硬命中 (需修)**: `src/main/memory/sources/claude-native.ts:80` `parseMemoryIndex` — MEMORY.md 逐行提取, **部分行匹配时** `indexEntries()` 返回非空 → `listFromIndex()` 不回退目录扫描 → 格式漂移行对应的 note 静默消失, `detect()` 计数偏低; 全程无 log。修复方向: 未匹配的非空 bullet 行计数, >0 时 `logDomainFailureOnce` 记账 (复用 GH-152 T4 的 domain-log 助手), 或直接回退合并目录扫描。
- **豁免补注 (2 处)**: claude-native.ts:63 / united-memory.ts:114 两份 `splitFrontmatter` 的 yaml catch{} — GH-152 T4 已裁决豁免 (优雅降级正文可见 + characterization 钉住), 但缺 `_shared/markdown.ts:24` 同款豁免注释 → 本批只补注释对齐裁决, 不改行为。
- **低危存疑 (1 处, 不修)**: `adapters/command-entry-paths.ts:121` 脚本路径白名单漏采 — 最佳努力发现 + existsSync 兜底, 记录不动。
- 合法可选 14 处 (空结果即合法语义), 不动。

### ⑥ openPath realpath — 确认缺口
- `url-guard.ts:29 isAllowedRevealPath` → `isPathInside` (`path-utils.ts:34`) 纯词法 (`path.resolve` 处理 `..`, **不解 symlink**); 白名单根内的恶意 symlink 可指向根外, showItemInFolder 跟随。
- 方案锚点: handler 侧 (`handlers.ts:104`, electron/fs 合法区) 对 candidate 与 roots 先 `fs.realpathSync` 归一 (candidate 不存在 → deny; root realpath 失败 → 保留原值), 再进纯谓词; url-guard 保持 electron-free 纯度不变。既有 `url-guard.test.ts` (13 例) 扩展。

### ⑦ openExternal scheme 白名单 — **状态修正: 已实现, 本批无事可做**
- `url-guard.ts:10-21` `SAFE_EXTERNAL_PROTOCOLS = {http, https, mailto}` + 解析失败 deny; `handlers.ts:112` 与 `setWindowOpenHandler` (index.ts:103) 双消费, 拒绝均记 log (GH-119)。测试已有。审查条目基于 GH-119 之前的状态或误判。**本批仅在 verify 复核测试覆盖, 不改代码。**

## 2. 关联与依赖 (符号边界 blast radius)

| 改动面 | 直接消费者 |
|---|---|
| `src/main/ipc/handlers.ts` (①② 迁移 45 注册点) | ipc/index.ts 装配; ipc-contract (regex 更新) / ipc-registration (不受影响) |
| 新 typed 包装 + sender 谓词 (ipc/ 内新小模块) | handlers.ts; 新直测 |
| `src/main/index.ts` 5 个 send 点 (③) | ipc-contract eventsSent regex 更新 |
| `tests/setup.ts` mockApi (④ satisfies BerthAPI) | 全 renderer 测试共享 mock — payload 形状补齐可能连锁改多个测试的预期值 (只补缺字段, 不改既有断言语义) |
| `src/main/memory/sources/claude-native.ts` (⑤) | memory 域测试 (`memory-service` 族) + domain-log 直测 |
| `handlers.ts` openPath + `url-guard.test.ts` (⑥) | shell 域; realpath 注入式测试 (symlink 用 tmpdir 构造, win32 需管理员/开发者模式 → 测试用注入 realpath fn 规避平台差异) |
| renderer / preload / engine | **零改动** (① 的类型收紧若暴露 handler 签名漂移则就地修正签名, 契约表照实) |

## 3. 任务分类与 debt 校准

- type=bug / P2 / source.kind=docs-issues — 不变。
- **debt.estimate 修正**: ⑦ 出批 (已实现)、④ 收窄 (签名层)、⑤ 定量 (1 修 + 2 注释) → 面比 0.0-new 估算小; scope 从 cross-process 收窄为 **module** (main 进程 + tests/setup, renderer/preload 零改动; 类型链影响编译期不改运行时契约)。incurred 2 (typed 包装/emit helper 新机制) / repaid 4 (类型漂移面、sender 纵深、mock 签名层、memory 静默丢数据) / net -2; risk=medium (45 注册点机械迁移 + mock 形状连锁); confidence low→medium (design 锁定 D1-D5 后升 high)。追加 revisions[]。

## 4. 验收标准

- **A1 (①)**: 45 通道全部经 typed 包装注册, channel 名/入参/返回由 IpcChannels 推导 (故意写错参数类型 → typecheck 红, 以临时探针验证后移除); ipc-contract/ipc-registration 全绿 (regex 面同批校准)。
- **A2 (②)**: 非主帧/非窗口 sender 调用任意通道 → reject + main log 记账; 正常主帧调用行为不变 (window 域功能回归)。先红后绿直测。
- **A3 (③)**: 5 个实发点全部经 `sendToWindow` typed helper; payload 类型与 IpcEvents 绑定 (错误 payload → typecheck 红); eventsSent 提取面更新后对账测试绿。
- **A4 (④)**: mockApi `satisfies BerthAPI` 编译通过 (方法签名/返回形状全绑定); 运行时对账测试保留且绿; 全 renderer 测试回归绿。
- **A5 (⑤)**: parseMemoryIndex 部分匹配场景 — 未匹配非空条目行被记账 (logDomainFailureOnce) 且列表不静默缺项 (回退/合并策略 design 定), 先红后绿; 两处 splitFrontmatter 补豁免注释 (行为零变, 既有 characterization 仍绿)。
- **A6 (⑥)**: symlink 指向白名单外时 openPath deny (注入 realpath 的谓词直测先红后绿); 正常路径/根本身 reveal 不回归; candidate 不存在 → deny。
- **A7 (⑦)**: 无代码改动; verify 复核 url-guard 测试覆盖 scheme 白名单 (含解析失败 deny) 即勾。
- **A0**: typecheck / lint / test (根+包内) / harness:check 全绿; prepush + CI 三平台。

## 5. 未决问题 (design 裁决, 不 block)

- **D1 (①②)**: typed 包装的落点与形态 — 独立 `src/main/ipc/typed-handle.ts` (倾向, 可直测) vs handlers.ts 内联; sender 违例 throw 的错误文案与 log scope 命名。
- **D2 (③)**: maximized-change 实发裸 boolean 与 IpcEvents 表一致 (表已照实), helper 直接沿用; 是否顺带把 "声明但未实发" 检查补进对账 (现 sent ⊆ subscribed 单向) — 倾向不扩 (dead-event 检查属对账测试增强, 非本批目标)。
- **D3 (④)**: mock payload 补齐时的最小改动策略 — 只补缺字段用类型最小值, 不动测试已断言的值; 若某方法签名收紧引发大面积测试改动 (>5 文件), 回报 design 重估。
- **D4 (⑤)**: parseMemoryIndex 修复语义 — 仅记账 (最小) vs 记账 + 未匹配行回退合并目录扫描 (更完整但改列表行为); 倾向仅记账 + issues 追踪回退策略 (列表行为变更影响面另评)。
- **D5 (⑥)**: realpath 失败语义 — candidate ENOENT 一律 deny (倾向, reveal 不存在路径无意义) vs 回退词法判定。

## 6. 界面质量与交互验收

不适用 (纯 main 进程/类型层/测试层, 无 renderer 行为变化; A2 的 window 域回归经单测 + 冷启动 smoke 覆盖)。

## 7. 旁支发现 (不入本批)

- **敏感键脱敏 fail-open** (⑤ 扫查顺带): `engine/search.ts:219 isSensitiveSearchKey` 及各 adapter SENSITIVE_KEY 是黑名单制 — 未命中键 (如 `authToken`/`bearer`) 的值会进搜索索引。已核实机制属实; 实际泄漏需 adapter 先违反 "凭证只存在性" 主约束, 属二层防御缺口。→ 记 `docs/issues/2026-07-04-IMPROVEMENT-sensitive-key-blocklist-fail-open.md`。
