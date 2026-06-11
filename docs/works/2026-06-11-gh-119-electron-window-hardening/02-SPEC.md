# 技术方案 (Design 产物)

> 2026-06-11。基于 01-ANALYSIS 六缺口实勘。每条回指 AC 编号。
> 未决问题消解 (均无需用户裁决, 依据见各节): Q1→log-only 保持 void 签名; Q2→request+check 双 handler 共用同一谓词; Q3→allowed roots 每次调用现取。

## 数据契约

**IPC 通道签名零变更** (AC 全部): `shell:openExternal(url: string): void` / `shell:openPath(path: string): void` 维持 void — renderer 7+9 处现役调用不消费返回值, 拒绝行为 = 不执行出口动作 + `getMainLog().log('url-guard', ...)` 一行 (installProcessGuards 可观测先例); preload / shared/types/ipc.ts / renderer 零改动。

**url-guard 纯判定契约** (新建 `src/main/url-guard.ts`, 零 electron import, AC-8):
```ts
isSafeExternalUrl(url: string): boolean
// new URL() 解析 (官方: 不用字符串前缀); protocol ∈ {http:, https:, mailto:} → true
// 解析失败 / file: / javascript: / data: / 其余协议 → false

isAllowedRevealPath(path: string, allowedRoots: string[]): boolean
// 复用 shared/path-utils 的 isPathInside({ includeEqual: true }) (win32 大小写折叠已内置);
// roots 任一包含即 true; 空 roots / 空 path → false

isAllowedPermission(permission: string): boolean
// allow-list = {'clipboard-sanitized-write'} (G6 实勘: 4 处复制按钮); 其余 false
```

**allowedRoots 聚合契约** (handlers.ts 内私有 async 函数, 每次调用现取 — Q3):
```
collectAllowedRevealRoots(): Promise<string[]> =
    getAssetRuntime().getScanSourceGroups() 各组 source.path   // adapter 扫描根+候选, 快照内取不重扫
  ∪ getAssetRuntime().getSnapshot().projectDir                 // 活动项目目录 (冗余兜底)
  ∪ getMemoryRoots()                                           // memory 模块新增导出, 见模块结构
```
- memory 根: `sources/united-memory.ts` 新增 `export function defaultUnitedMemoryRoot(): string` (与构造函数共用 `~/.united-memory` 路径知识, 消除重复); `memory/index.ts` 新增 `export function getMemoryRoots(): string[]` = [defaultUnitedMemoryRoot(), ...resolveClaudeDirs().map(d => join(d, 'projects'))] (后者被 ~/.claude 扫描根覆盖, 冗余无害)。

**装配契约** (src/main/index.ts, AC-1/4/5/6):
- `webPreferences.sandbox: true` (G1; preload 产物 CJS 已兼容)。
- `electron.vite.config.ts` preload 段: `externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })` (官方 bundle 解法)。
- setWindowOpenHandler: `isSafeExternalUrl(details.url)` 通过才 `setImmediate(() => shell.openExternal(url))` (官方模式), 恒 `{ action: 'deny' }`; 拒绝落 log。
- will-navigate (createWindow 内挂, 每窗口 — 多窗口语义): dev (`is.dev && ELECTRON_RENDERER_URL`) 放行与 RENDERER_URL 同 origin (`new URL()` 比较, 保 vite full-reload); 其余 (含 prod 全部, MemoryRouter 零合法导航) `event.preventDefault()` + log。
- permission handler (whenReady 内挂 session.defaultSession, 全局一次): `setPermissionRequestHandler` → `callback(isAllowedPermission(permission))`; `setPermissionCheckHandler` → `return isAllowedPermission(permission)` — 双 handler 共用谓词防 query/request 不一致 (Q2; 官方清单强制 request, check 同设一行成本)。

**CSP** (src/renderer/index.html, AC-7): 现值追加 `; object-src 'none'; base-uri 'none'; form-action 'none'` — 只增不改。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / architecture (维持)。
- source.kind / refs: docs-issues / electron-window-hardening issue。
- debt.estimate: incurred 1 / repaid 4 / net -3, scope cross-process, risk medium, confidence medium — design 后无变化, 不新增 revision。
- debt.final 预期: 与 estimate 一致 (verify 后按实落)。
- revisions: explore 一条 (confidence low→medium), 见 INDEX。
- Project 字段同步: 已绑定 PVTI_lAHOADXbEs4BZHvQzgvcfLI, archive 时 done 同步。

## 模块结构 / 组件拆分

| 模块 | 职责 | 边界依据 |
|---|---|---|
| `src/main/url-guard.ts` (新) | 三个纯谓词 (URL/路径/权限), 零 electron import | ARCHITECTURE electron 白名单 (仅 index/dev-instance/devtools/ipc); log.ts 根级中立件先例; 可直测 |
| `src/main/index.ts` | 消费谓词做装配 (sandbox/window-open/will-navigate/permission) | electron 白名单文件 |
| `src/main/ipc/handlers.ts` | 两 shell handler 接谓词 + collectAllowedRevealRoots 聚合 + 拒绝 log | electron 白名单文件; handler 薄读约定 (聚合是薄 IO 组合, 无域逻辑) |
| `src/main/memory/` | 新增根导出 (defaultUnitedMemoryRoot / getMemoryRoots) | 路径知识留在 memory 模块内, 不泄漏到 ipc 层 |
| `src/renderer/index.html` | CSP 三指令 | 静态 meta |

## 界面质量与交互验收

不适用 (主进程装配层, 无 UI 改动)。用户可感知行为面的交互验收并入测试策略 manual 行与 AC-2/3/5/6: 外链按钮、三处"在资源管理器中显示"、四处复制按钮、拖拽文件不替换页面。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| isSafeExternalUrl 协议矩阵 (http/https/mailto 放; file/javascript/data/smb/畸形/空/大小写/前后空格) | unit | tests/unit/url-guard.test.ts (新) | `pnpm test -- url-guard` | — |
| isAllowedRevealPath 路径矩阵 (根内/根本身/根外/../穿越/win32 大小写/空) | unit | 同上 | 同上 | — |
| isAllowedPermission (clipboard-sanitized-write 放, notifications/geolocation/media 拒) | unit | 同上 | 同上 | — |
| sandbox:true 下 preload→window.api→IPC 链完好 (AC-1) | e2e (现有全量回归网) | tests/e2e/*.e2e.ts ×7 | `pnpm test:e2e` | — |
| will-navigate prod 拦截 (location.href 赋值后 page.url() 不变) + window.open(file://) 拒 (窗口数不变) + permission deny 可观测 (permissions.query geolocation → denied) + CSP meta 含三指令 (AC-4/5/6/7) | e2e (新) | tests/e2e/window-hardening.e2e.ts (新, 复用 GH-117 launch helper) | `pnpm test:e2e` | — |
| collectAllowedRevealRoots 聚合 | — | — | — | 薄 IO 聚合 (三个现成 getter 的并集), 无分支逻辑; 判定矩阵已由 unit 全覆盖, 端到端由真机三处按钮验收 (AC-3) |
| handler 接线正确性 (shell handler 调谓词) | manual (真机) | — | verify 阶段 | main 侧 handler 无 electron mock 单测基建, 新建超本任务必要性; 接线为单行 if, 真机正反例覆盖 (合法按钮可用 + devtools 注入非法调用被拒落 log) |
| clipboard 放行 (4 复制按钮) | manual (真机) | — | verify 阶段 | e2e 内 page.evaluate 无 user gesture, writeText 的 gesture-gating 会干扰断言 (失败原因不可区分); 真机点击验证 |
| dev full-reload 不破坏 (AC-5 dev 形态) | manual (真机 dev) | — | verify 阶段 | vite full-reload 需 dev server 进程, e2e 跑 out/ 产物无 dev 形态 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| sandbox + preload exclude 装配 | AC-1 |
| isSafeExternalUrl + openExternal handler 接线 | AC-2 |
| isAllowedRevealPath + collectAllowedRevealRoots + openPath handler 接线 | AC-3 |
| setWindowOpenHandler 共用谓词 | AC-4 |
| will-navigate dev/prod 两形态 | AC-5 |
| isAllowedPermission + 双 permission handler | AC-6 |
| CSP 三指令 | AC-7 |
| url-guard 零 electron import + 单测矩阵 | AC-8 |
| 全量门禁 + e2e | AC-9 |
