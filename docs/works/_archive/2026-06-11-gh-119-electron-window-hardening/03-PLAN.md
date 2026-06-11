# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**全程顺序执行** (改动集中 index.ts/handlers.ts 强耦合, T2/T3 依赖 T1 谓词, T4 e2e 依赖 T3 装配齐; 不并行)。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] T1 url-guard 纯模块 + 单测矩阵 (AC-2/3/6/8 判定层) — DONE: 29 测试绿 (协议 13/路径 9/权限 7), TDD 红→绿, isPathInside includeEqual 单调用 (samePath 冗余已简化); typecheck/lint 过
  - 内容: 新建 `src/main/url-guard.ts` (isSafeExternalUrl / isAllowedRevealPath / isAllowedPermission, 零 electron import, 复用 shared/path-utils isPathInside); 先写 `tests/unit/url-guard.test.ts` 红 → 实现绿 (TDD)。
  - tests: tests/unit/url-guard.test.ts — 协议矩阵 (http/https/mailto 放; file/javascript/data/smb/畸形/空/大小写 HTTPS/前后空格) + 路径矩阵 (根内/根本身 includeEqual/根外/.. 穿越/win32 大小写/空 roots) + 权限矩阵 (clipboard-sanitized-write 放; notifications/geolocation/media 拒)。
  - verify: `pnpm test -- url-guard` 绿; 文件零 electron import (AC-8)。非 UI 不适用界面验收。

- [x] T2 shell handler 接谓词 + allowedRoots 聚合 + memory 根导出 (AC-2/3 接线层) — DONE: defaultUnitedMemoryRoot/getMemoryRoots 导出 + collectAllowedRevealRoots 三方并集 (groups roots∪sources + projectDir + memoryRoots, 每次现取) + 两 handler 拒绝即 return + log('url-guard'); 签名 void 不变; typecheck/lint/全量 1016 测试绿
  - 内容: united-memory.ts 增 `defaultUnitedMemoryRoot()` (构造函数共用); memory/index.ts 增 `getMemoryRoots()`; handlers.ts 增私有 `collectAllowedRevealRoots()` (scanSourceGroups ∪ snapshot.projectDir ∪ memoryRoots, 每次现取); `shell:openExternal`/`shell:openPath` 接谓词, 拒绝不执行 + `getMainLog().log('url-guard', ...)`。
  - tests: T1 单测覆盖判定; 聚合为薄 IO 并集无分支, 例外理由见 02-SPEC 测试策略表; `pnpm test` 全量回归 (memory 模块测试不破坏)。
  - verify: typecheck/lint/test 绿; handler 签名 void 不变 (preload/renderer 零改动确认)。

- [x] T3 窗口装配: sandbox:true + preload exclude + window-open/will-navigate/permission (AC-1/4/5/6 装配层) — DONE: e2e 20/21 绿 (sandbox 链路全过); 唯 1 败 project-scope.e2e 为预先存在的 win32 宿主隔离缺口 (stash baseline 双侧同失败复证非本任务回归, GH-117 决策已知限制), 记 docs/issues/2026-06-11-IMPROVEMENT-e2e-win32-host-isolation.md; typecheck/lint 过
  - 内容: electron.vite.config.ts preload `externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })`; index.ts `sandbox: true`; setWindowOpenHandler 接 isSafeExternalUrl + setImmediate (官方模式) + 拒绝 log; createWindow 内挂 will-navigate (dev 同 origin 放行 / 其余 preventDefault + log); whenReady 挂 session.defaultSession 双 permission handler (request+check 共用 isAllowedPermission)。
  - tests: `pnpm build` 后 `pnpm test:e2e` 现有 7 个全量 — sandbox 链路回归网 (AC-1 核心证据)。
  - verify: e2e 全绿; dev 模式 `pnpm dev` 启动正常 + window.api 可用。

- [x] T4 CSP 三指令 + window-hardening e2e (AC-4/5/6/7 行为网) — DONE: CSP 追加 object-src/base-uri/form-action 'none'; 新 e2e 5/5 绿 (sandbox 直证 getLastWebPreferences 运行时窄化 cast — Electron 33 类型未导出 + will-navigate 拦截后 SPA 存活 + window.open(file://) 拒且窗口数不变 + geolocation query denied + CSP meta 三指令); typecheck/lint 过
  - 内容: index.html CSP 追加 `object-src 'none'; base-uri 'none'; form-action 'none'` (只增不改); 新建 tests/e2e/window-hardening.e2e.ts (复用 GH-117 launch helper): ①`location.href='https://example.com'` 赋值后 page.url() 仍为 file:// 入口 (will-navigate prod 拦截); ②`window.open('file:///...')` 后 app 窗口数不变 (AC-4); ③`navigator.permissions.query({name:'geolocation'})` → 'denied' (AC-6 deny 路径); ④document CSP meta 含三指令 (AC-7)。
  - tests: tests/e2e/window-hardening.e2e.ts (新) — `pnpm test:e2e`。
  - verify: 新 e2e 绿 + 现有 e2e 全量绿 + prod 加载零回归。

- [x] T5 全量门禁 + 真机交互验收 (AC-9 收口) — DONE (2026-06-11):
  - 自动化: typecheck 三段绿; lint 绿; unit 全量双轮绿 (1016+29, 两轮 exit 0); e2e 25/26 绿 (新 hardening 5/5; 唯 1 败 project-scope 为已记 issue 的 win32 宿主隔离预存问题, baseline 复证非本任务回归)。
  - 真机 (agent-dev CDP 驱动, dev 实例 sandbox 形态): window.api 完好 (AC-1 dev); `location.reload()` 放行存活 — dev 同 origin 通道即 vite full-reload 通道 (AC-5 dev); 注入 `openExternal('file:///...')`/`('javascript:...')` 与集合外 `openPath` 全拒且落 main log 'url-guard' (AC-2/3 反例); 真实资产路径 `~/.claude/CLAUDE.md` 经 allowedRoots 三方并集端到端放行开 Explorer (AC-3 正例, 聚合唯一端到端证据); trusted click 内 `navigator.clipboard.writeText` ok (AC-6 放行); `permissions.query(geolocation)`='denied' (AC-6 拒绝)。
  - 真机从宽项与依据: 外链正例不真开浏览器 (避免系统副作用; 反例 log 已证 handler 接线, 正例为同函数另一分支 + unit 覆盖); 产品 4 复制按钮不逐点 (clipboard 权限层已由 trusted probe 证, 按钮 onClick 同一 API); 物理拖拽不模拟 (与 location.href 同走 will-navigate 拦截点, e2e prod + 真机 dev 双形态已覆盖)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
