# 技术方案 (Design 产物)

> 2026-06-12。决策已全部在 01-ANALYSIS 落定 (mac 定界/通道映射/装配模式/gate 形态); 本文为执行细化契约。

## 数据契约

**IPC (四方同批, AC-4)**:
```ts
// IpcChannels 新增 (invoke):
'update:check':           { args: [];                       result: void }   // 触发检查, 结果走 update:state
'update:download':        { args: [];                       result: void }   // mac 上 no-op + platformLimited 推送
'update:install':         { args: [];                       result: void }   // quitAndInstall; mac no-op
'update:get-preferences': { args: [];                       result: UpdatePreferences }
'update:set-preferences': { args: [UpdatePreferences];      result: void }
// IpcEvents 新增 (push, broadcast 全窗口):
'update:state': UpdateState
// shared/types/ipc.ts:
interface UpdatePreferences { autoDownload: boolean }
interface UpdateState {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string          // available/downloaded 时的远端版本
  notes?: string            // release notes (纯文本截断)
  percent?: number          // downloading
  error?: string
  platformLimited?: boolean // mac 未签名降级: download/install 不可用, UI 显示前往下载页
}
```

**主进程装配 (AC-3)**:
- `src/main/update-preferences.ts` (新, 纯 fs 中立件): read/write userData JSON (`update-preferences.json`), 默认 `{ autoDownload: false }`; 注入 userDataDir (可直测)。
- `src/main/updater.ts` (新, 中立件): `createUpdaterController({ autoUpdater, platform, prefs, emit, log })` — 依赖全注入 (autoUpdater 实例注入 → 单测用 fake; 零 electron import):
  - 接 autoUpdater 事件 → 归一为 UpdateState 经 emit 推送; error 同时 log('updater', err)。
  - `check()`: 全平台可用 (try-catch → error state); mac 时 state 附 platformLimited: true。
  - `download()` / `install()`: platform === 'darwin' → 仅推 platformLimited 状态不执行; 其余执行 autoUpdater.downloadUpdate() / quitAndInstall()。
  - 应用偏好: autoUpdater.autoDownload = prefs.autoDownload; autoInstallOnAppQuit = true; !app.isPackaged → forceDevUpdateConfig (由 index.ts 传入 isPackaged)。
- `src/main/index.ts` 接线 (白名单文件): import { autoUpdater } from 'electron-updater'; whenReady 后 createUpdaterController(...) 注入 broadcast emit (BrowserWindow.getAllWindows 推送, progressListener 先例); 启动后延迟自动 check 一次 (5s, 不阻启动)。
- `src/main/ipc/handlers.ts`: registerUpdateHandlers (5 通道 → controller 方法/偏好模块)。
- `dev-app-update.yml` (新, 仓库根): provider github owner Caldis repo berth — dev 真机 check 链路。

**electron-builder.yml**: 末尾增 `publish: {provider: github, owner: Caldis, repo: berth}`。
**package.json**: dependencies + electron-updater ^6.8.3 (main 运行时依赖, 打包语义规则 10 — 必须 dependencies 非 dev)。

**renderer (AC-5)**: settings-content.tsx About 区下方"更新"卡:
- 行 1: 当前版本 + 状态文案 (按 phase) + 操作按钮: idle/not-available/error → "检查更新"; available → win/linux "下载更新" / mac "前往下载页" (window.api.shell.openExternal RELEASES, https 经 url-guard); downloading → 进度 %; downloaded → "重启并安装"。
- 行 2: autoDownload Switch (ui/ 层组件) ↔ update:get/set-preferences。
- hook: `useUpdateState` (订阅 update:state + 触发动作; 沿 use-ipc 模式)。
- i18n: settings.update.* 家族 en/zh 对称。

**release.yml (AC-1)**: 按 ANALYSIS 适配段执行 — 触发 `tags: ['v*']`; Phase1 test gate (ubuntu, pnpm 9.15.4/node20: lint+typecheck+test+包三连+harness:check+build); Phase2 matrix (win/mac/linux, `pnpm exec electron-builder --win|--mac|--linux --publish never`, 前置 `pnpm build`, 产物校验含 latest*.yml, upload-artifact retention 7); Phase3 publish (ubuntu, fetch-depth 0, 三平台齐验含 latest 三件 → changelog (feat/fix/other + fallback) → 清 draft → release create (含 -beta/-alpha prerelease 检测) → find 上传 exe/dmg/zip/AppImage/deb/blockmap/latest*.yml → 完整性校验)。

**明确不做**: mac 签名修复 (issue 既有); beta 渠道偏好; 更新 UI 进全局通知 (仅 settings 内); deb/AppImage 之外的 linux 目标。

## 任务分类与 debt
- feature / user-request; estimate 4/1/3 cross-process/high/[tooling-ci] medium — design 维持。debt.final 预期 verify 后 risk 降 (dev 链路真跑 + workflow 静态完备)。Project 已绑定。

## 模块结构 / 组件拆分
T1 契约+主进程 (types/preferences/updater/handlers/index/builder/deps) → T2 renderer (hook+UI+i18n) → T3 release.yml + dev-app-update.yml → T4 收口 (真机 dev check + 截图 + 门禁 + 文档)。顺序执行 (T2 依赖 T1 契约, T4 依赖全部)。

## 界面质量与交互验收
更新卡布局沿 About 区行风格; 7 状态全显; 按钮禁用态 (checking/downloading); Switch 即时持久化; en/zh; 真机截图走查 (idle→checking→not-available/available 至少 3 态)。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| updater controller 状态机 (事件归一/mac 分支/偏好应用/错误 log) | unit (fake autoUpdater 注入) | tests/unit/updater-controller.test.ts (新) | `pnpm test` | — |
| update-preferences 读写/默认值/损坏文件 | unit | tests/unit/update-preferences.test.ts (新) | `pnpm test` | — |
| IPC 四方对账 | 既有强制 | ipc-contract / ipc-registration | `pnpm test` | — |
| 更新卡渲染 (phase→文案/按钮/mac limited) | renderer | tests/renderer/settings-update.test.tsx (新) | `pnpm test` | — |
| dev check 链路 | manual (真机) | — | dev 实例 + CDP 观测 update:state | 真实网络/latest.yml 依赖, e2e 不稳 |
| release.yml 全链 | manual + 静态 | — | push 后 workflow 解析 + AC-8 实弹路径 | tag 实弹发版不在 verify 强制 (外发) |

## 验收标准映射
| SPEC 项 | AC |
|---|---|
| release.yml 三阶段 | AC-1 |
| publish 配置 + 本机 latest.yml 实证 | AC-2 |
| updater.ts 中立件 + mac 分支单测 | AC-3 |
| 5+1 通道四方 | AC-4 |
| 更新卡 + i18n | AC-5 |
| dev-app-update + 真机 | AC-6 |
| 门禁/CI | AC-7 |
| 操作序文档 (PLAN T4) | AC-8 |
