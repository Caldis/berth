# 02-SPEC — GH-154 IPC 机制加固 + shell 边界 (Design 产物)

每条回指 01-ANALYSIS 验收标准 (A1-A7/A0)。⑦ 已出批 (verify 复核即勾)。

## D 裁决

- **D1 (→A1/A2)**: 新模块 `src/main/ipc/typed-ipc.ts` (electron 值 import 合法区):
  - `isTrustedIpcSender(event)` = `BrowserWindow.fromWebContents(event.sender) !== null && event.senderFrame === event.sender.mainFrame` (senderFrame 为 null/子帧/非窗口 webContents 一律 false)。
  - `handleIpc<C extends keyof IpcChannels>(channel: C, handler: (event, ...args: IpcChannelArgs<C>) => IpcChannelResult<C> | Promise<IpcChannelResult<C>>)` — 内部 `ipcMain.handle`; 违例时 `getMainLog().log('ipc-guard', ...)` + throw (renderer promise reject; 合法调用永不触发)。
  - handlers.ts 45 注册点 `ipcMain.handle(` → `handleIpc(` 纯前缀批量替换 (符合 friction 20260612 纯前缀条件) + 双向 grep 核验 (旧模式归零)。
  - `ipc-contract.test.ts:27` registered 提取 regex 扩为 `/(?:ipcMain\.handle|handleIpc)\(\s*'([^']+)'/g` (残留裸注册仍被计入, 漂移即红); `ipc-registration.test.ts` 运行时 mock 不受影响 (handleIpc 内部仍调 ipcMain.handle)。
  - 类型收紧若暴露 handler 签名与表不一致: 表已照实 (GH-115 校准 + 本轮复核), 修 handler 侧签名。
- **D2 (→A3)**: 同模块加 `sendToWindow<E extends keyof IpcEvents>(win, channel, payload: IpcEvents[E])` — 吸收 `isDestroyed()` 检查; index.ts 5 个实发点迁移。`ipc-contract.test.ts:30` eventsSent regex 扩为同时匹配 `webContents\.send\('...'` 与 `sendToWindow\(\s*[^,]+,\s*'([^']+)'`。不扩 "声明未实发" 检查 (非本批目标)。
- **D3 (→A4)**: `tests/setup.ts` mockApi 收紧 `satisfies BerthAPI` (GH-115 T2 遗留 TODO): 以 typecheck 红名单驱动逐方法补齐返回形状; 只补缺字段取类型最小值, 不改测试已断言的既有值; 若连锁改动 >5 测试文件, 停下回 design 重估。运行时单向 contains 测试保留作 belt。
- **D4 (→A5)**: `parseMemoryIndex` 增可选 `onMalformed(line)` 回调 (镜像 GH-152 parseUnitedIndex 先例, 保持纯度); `indexEntries()` 语义改为 **malformed>0 → logDomainFailureOnce 记账且返回 null** → `listFromIndex` 整体回退目录扫描 — 部分匹配不再静默丢条目 (索引不可靠即弃用, 比 merge 简单且无一致性问题)。两处 `splitFrontmatter` yaml catch 补 GH-152 裁决豁免注释 (行为零变)。
- **D5 (→A6)**: url-guard 增纯函数 `isAllowedRevealPathReal(candidate, roots, { realpath, platform })` — realpath 注入 (保持 electron/fs-free 可直测): candidate realpath 失败 → false (deny, 不回退词法); root realpath 失败 → 保留原值参与比对。`handlers.ts` openPath 注入 `fs.realpathSync`。既有 `isAllowedRevealPath` 保留 (语义: 词法谓词, 供无 fs 语境复用)。

## 数据契约

- IPC 通道/事件**集合零增删** (四方对账集合不变, 仅提取 regex 面更新); 通道参数/返回类型不变 (编译期绑定收紧; 运行时新行为仅 sender 门禁与 openPath realpath)。
- `IpcChannels`/`IpcEvents` 表不改 (表←实现已照实)。

## 任务分类与 debt

- type=bug / P2 / source.kind=docs-issues; estimate (explore 修正后): incurred 2 / repaid 4 / net -2 / scope=module / risk=medium / areas=[architecture]; design 锁定后 confidence medium→high, 追加 revisions[]。
- debt pool 25 (notice, <40), 继续理由: 本批净偿还。

## 模块结构

- 新: `src/main/ipc/typed-ipc.ts` + `tests/unit/typed-ipc.test.ts`。
- 改: `src/main/ipc/handlers.ts` (45 注册点), `src/main/index.ts` (5 send 点), `src/main/memory/sources/claude-native.ts` (+united-memory.ts 豁免注释), `src/main/url-guard.ts`, `tests/setup.ts`, `tests/unit/{ipc-contract,url-guard,memory 域}.test.ts`。
- renderer/preload/engine 零改动。

## 界面质量与交互验收

不适用 (纯 main/类型/测试层)。verify 以冷启动 agent 实例 smoke 确认窗口控制 (最小化/最大化)、reveal、外链三类通道在 sender 门禁下运行正常 (真机回归, 非视觉验收)。

## 测试策略 (测试矩阵)

| 变更/行为 | 类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| A1 typed 注册 + 对账面 | unit + typecheck | ipc-contract / ipc-registration 回归 | `pnpm test` / `pnpm typecheck` | 类型收紧由 typecheck 证 (临时错误探针红→移除, 过程记 PLAN); 集合等式由既有对账测试证 |
| A2 sender 门禁 | unit | `typed-ipc.test.ts` (新) — 子帧/非窗口 sender reject+log, 主帧放行透传, 先红后绿 | `pnpm test` | — |
| A3 typed emit | unit + typecheck | ipc-contract eventsSent 回归 + 错 payload 探针 | 同上 | send 运行时行为不变 |
| A4 mock satisfies BerthAPI | typecheck + 回归 | tests/setup.ts | `pnpm typecheck && pnpm test` | 编译期契约; 全量回归防 payload 补齐破既有断言 |
| A5 malformed 回退+记账 | unit | memory 域测试 — 部分匹配场景先红后绿 | `pnpm test` | — |
| A6 realpath 谓词 | unit | url-guard.test.ts 扩展 (注入 fake realpath), 先红后绿 | 同上 | 注入式规避平台 symlink 构造差异 |
| A7 复核 | — | 既有 scheme 用例点名核对 | — | 已实现项无新代码 |

## 验收标准映射

| SPEC 项 | ANALYSIS 验收标准 |
|---|---|
| D1 | A1 + A2 |
| D2 | A3 |
| D3 | A4 |
| D4 | A5 |
| D5 | A6 |
| 复核 | A7 |
| 门禁 | A0 |
