# 需求分析 (Explore 产物)

> 2026-06-11。来源: 00-PRD.md (issue electron-window-hardening, GH-115 R10)。
> 性质: defense-in-depth — R10 已对抗验证证伪高危 exploit 链 (reference.url 经 manifest 强制 https、evidence.url 硬编码闭集), 本任务消灭"出口直通/默认全放行"的结构性缺口, 非修活漏洞。

## 现状理解

六缺口逐一实勘 (2026-06-11 代码核实), 版本: electron ^33.2.0 / electron-vite ^5.0.0 / @electron-toolkit/preload ^3.0.1。

### G1 sandbox: false (src/main/index.ts:64)
- preload 全文 101 行 (src/preload/index.ts), 仅消费 `contextBridge` + `ipcRenderer` + `@electron-toolkit/preload` 的 `electronAPI` — 全部在 sandboxed preload 的 polyfilled require 白名单内 (Electron 官方: contextBridge/crashReporter/ipcRenderer/nativeImage/webFrame/webUtils + events/timers/url)。
- 唯一障碍 (R10 已验证): `electron.vite.config.ts:23` preload 段 `externalizeDepsPlugin()` 把 `@electron-toolkit/preload` 留作外部 require — sandbox 下 require 第三方包必失败。官方解法 (electron-vite docs "fully bundle dependencies"): `externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })`。
- 产物格式: package.json 无 `type: module` → `out/preload/index.js` 为 CJS, 满足 sandboxed preload 的 CJS 要求, 无需动格式。

### G2 setWindowOpenHandler 直通 (src/main/index.ts:86-89)
- `shell.openExternal(details.url)` 对任意字符串直通, 仅窗口本身 deny。官方推荐: 校验函数 + `setImmediate(() => shell.openExternal(url))`。

### G3 shell:openExternal 直通 (src/main/ipc/handlers.ts:84-86)
- 任意 url 直通。renderer 现役调用入参全集 (符号级审计, 7 处): settings-content.tsx:286/294 硬编码 https ×2 · agent-capability-plugins-section.tsx:293 reference.url (manifest 强制 https) · feature-guide-panel.tsx:50 文档 url · overview.tsx:608/614 evidence.url (硬编码闭集)。
- → 白名单 https/mailto: 现役零误伤 (零 http 调用; mailto 现无调用, 按 issue 建议保留意图)。

### G4 shell:openPath 直通 (src/main/ipc/handlers.ts:80-82) — ⚠ 实勘修正
- **通道名 openPath, 真实行为是 `shell.showItemInFolder(p)`** (文件管理器中显示并高亮, 不打开/执行文件)。issue 与 R10 按字面 openPath 记述; 实际风险低一级 (无执行面), 但任意路径直通仍允许文件系统探测/弹任意目录窗口, 守卫仍做, 按真实行为设计。
- renderer 现役调用入参全集 (9 处): instructions.tsx ×3 / overview.tsx:120 / hooks-lifecycle-view.tsx ×2 → 资产 path; memory-view.tsx:289 → note.path; project-scope-switcher.tsx:453 → source.path (ScanRoot)。
- **白名单数据源必须三方并集** (漏一方即误伤现役按钮):
  1. adapter 扫描根 `adapter-registry.scanRoots()/scanSourceCoverage()` (含 missing/not-scanned 候选);
  2. memory 源根: united-memory `~/.united-memory` (united-memory.ts:213, **不在 adapter 根集合内**) + claude-native `resolveClaudeDirs()/projects` (被 ~/.claude 根覆盖);
  3. 活动项目目录 (runtime projectDir)。
- 包含判定复用 `shared/path-utils.ts` 的 `isPathInside({includeEqual: true})` (GH-115 T7 收敛的平台感知单源, win32 大小写折叠)。

### G5 无 will-navigate 守卫 — 策略已实证
- renderer 路由是 **MemoryRouter** (main.tsx:10), 纯内存零真实导航 → **prod 不存在任何合法 will-navigate, 一律 preventDefault**。
- ⚠ issue 原文"一律 preventDefault"在 dev 不成立: vite full-reload 走 `location.reload()`, 属页面发起导航, **触发 will-navigate** — 一律拦会破坏 dev 整页重载。dev 形态: 放行与 `ELECTRON_RENDERER_URL` 同 origin 的导航 (官方推荐 `new URL()` 解析比较, 不用字符串前缀)。
- file: URL 的 origin 为 "null" 不可比 origin — prod 守卫不依赖 origin 比较, 直接一律拦 (拖拽文件替换 SPA 即此攻击面)。

### G6 无 permission handler — ⚠ 实勘修正: 合法集合非空
- issue 原文"合法集合为空"不准确: renderer 有 **4 处 `navigator.clipboard.writeText`** (overview.tsx:130 / usage.tsx:381 / hooks-lifecycle-view.tsx:923 / file-viewer-drawer.tsx:55, 均复制按钮) → Chromium 权限 `clipboard-sanitized-write`, deny-all 会致复制按钮 NotAllowedError。
- → allow-list = `{clipboard-sanitized-write}`, 其余 (notifications/geolocation/media/...) deny。`setPermissionRequestHandler` 挂 `session.defaultSession` (whenReady 一次)。
- 真机验证必含: 四个复制按钮实际可用。

### G7 CSP 缺次级指令 (src/renderer/index.html:7-9)
- 现状 `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`; 缺 object-src/base-uri/form-action。
- 补 `object-src 'none'; base-uri 'none'; form-action 'none'` — **只增不改**, 现有指令不动 (静态 meta dev/prod 共用, 现状 dev HMR 兼容性不受影响)。

## 关联与依赖

blast radius (符号边界判定):

| 文件 | 改动 | 性质 |
|---|---|---|
| `src/main/url-guard.ts` | **新建** 纯判定模块: `isSafeExternalUrl(url)` + `isAllowedRevealPath(path, allowedRoots)`; **零 electron import** | 根级中立件 |
| `src/main/index.ts` | sandbox:true · setWindowOpenHandler 接 guard · createWindow 内挂 will-navigate · whenReady 挂 permission handler | electron 白名单文件 |
| `src/main/ipc/handlers.ts` | 两个 shell handler 接 guard, 拒绝落 main log | electron 白名单文件 |
| `electron.vite.config.ts` | preload externalizeDepsPlugin exclude | 两行 |
| `src/renderer/index.html` | CSP 追加三指令 | 一行 |
| `tests/unit/url-guard.test.ts` | **新建** 放行/拒绝矩阵直测 | 测试 |
| 不动 | preload / renderer / shared 类型 — IPC 通道签名不变, 拒绝即 no-op (renderer 不消费 shell 返回值) | 向后兼容 |

- **架构硬约束** (docs/ARCHITECTURE.md): electron 值 import 白名单仅 `index.ts`/`dev-instance.ts`/`devtools.ts`/`ipc/` — url-guard 必须纯函数 (shell 动作留白名单文件), 同 `log.ts` "根级中立件"先例; 顺带满足可直测性 (无 mock)。
- **回归网**: 7 个 e2e (GH-117 统一隔离 launch helper) 全走真实 preload→window.api→IPC 链 — sandbox:true 若破坏 preload, e2e 即红, 是 G1 现成验收资产; window-controls.e2e 直接覆盖 window IPC。
- **可观测先例**: installProcessGuards (GH-115 T5) — guard 拒绝事件落 `getMainLog().log('url-guard', ...)`, 不静默吞。
- **多窗口语义**: macOS dock activate 经 createWindow 重建窗口 (index.ts:188-190) — will-navigate/setWindowOpenHandler 挂 createWindow 内 (每窗口), permission handler 挂 session.defaultSession (全局一次)。

## 任务分类与 debt 校准

- type / maintenance.subtype: maintenance / architecture — 维持。
- source.kind / refs: docs-issues / electron-window-hardening issue — 维持。
- debt estimate 修正: 数值维持 incurred 1 / repaid 4 / net -3。
- scope / risk / areas / confidence: cross-process / medium / [architecture] 维持; **confidence low→medium** (六缺口全部代码实勘 + 官方契约确认 + 两处输入修正落定)。
- revision: 已追加 INDEX `debt.revisions[]` (explore, confidence low→medium)。

## 验收标准

1. **AC-1 sandbox**: webPreferences.sandbox=true + preload exclude 打包; `pnpm build` 后 e2e 全量绿 (真实 preload 链), dev 模式正常启动。
2. **AC-2 openExternal 白名单**: https/mailto 放行; file:/smb:/任意串拒绝且落 main log; 现役 7 处调用零误伤 (真机抽测 settings GitHub 链接)。
3. **AC-3 openPath(showItemInFolder) 白名单**: 扫描根 ∪ memory 根 ∪ 活动项目目录内放行; 集合外拒绝且落 log; 真机抽测 instructions 资产卡 / memory note / scan sources 三处"在访达/资源管理器中显示"。
4. **AC-4 setWindowOpenHandler** 与 openExternal 共用同一 guard; `window.open('file:///...')` 被拒。
5. **AC-5 will-navigate**: prod 一律 preventDefault (拖拽文件不替换页面, 真机验证); dev 同 origin 放行 (vite full-reload 不破坏)。
6. **AC-6 permission handler**: clipboard-sanitized-write 放行 (4 处复制按钮真机可用), 其余权限拒绝。
7. **AC-7 CSP**: 含 object-src 'none' / base-uri 'none' / form-action 'none'; dev HMR 与 prod 加载零回归。
8. **AC-8 url-guard 纯度**: 零 electron import (架构白名单不变量); 单测覆盖放行/拒绝矩阵 (协议/路径边界/win32 大小写)。
9. **AC-9 门禁**: typecheck / lint / unit / e2e 全量双轮绿。

## 界面质量与交互验收

非 UI 任务 (主进程装配层), 无界面改动。但有用户可感知行为面, 真机交互验收三项 (并入 AC-2/3/5/6): 外链按钮可打开浏览器、"在访达/资源管理器中显示"按钮可用 (instructions/memory/scan-sources 三处)、复制按钮可用 (overview/usage/hooks/file-viewer 四处)、拖拽文件到窗口不替换页面。

## 未决问题

- **Q1 拒绝行为对 renderer 的可见性**: 倾向 log-only 静默 no-op (现役 handler 返回 void, renderer 不消费返回值, 合法调用永不触发拒绝); 是否返回 boolean 供未来消费 — design 定, 不阻塞。
- **Q2 setPermissionCheckHandler (同步检查) 是否与 RequestHandler 同设**: navigator.permissions.query / clipboard 同步路径走 check; 官方清单只强制 request handler — design 查 Electron 33 行为后定。
- **Q3 openPath 白名单"活动项目目录"的动态性**: 项目切换后 allowedRoots 需随 runtime 当前 projectDir 更新 — 倾向每次调用现取 (无缓存失效问题), design 定取值时机。

## 旁支发现 (不入本任务范围)

- R31 分发链加固 (fuses/签名/ABI 冒烟) 与本任务同属安全域但属打包链, 已记录于 GH-115 01-ANALYSIS (R31), 未单独立 issue, 不混入本任务。
- `shell:openPath` 通道名与 showItemInFolder 行为不一致 — 本任务只守卫不改名 (改名动 preload/renderer/类型表, 超范围); 后续如要语义化重命名, 归 IPC 契约清理。
