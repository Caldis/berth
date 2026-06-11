# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**全程顺序执行** (改动集中 index.ts/handlers.ts 强耦合, T2/T3 依赖 T1 谓词, T4 e2e 依赖 T3 装配齐; 不并行)。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [ ] T1 url-guard 纯模块 + 单测矩阵 (AC-2/3/6/8 判定层)
  - 内容: 新建 `src/main/url-guard.ts` (isSafeExternalUrl / isAllowedRevealPath / isAllowedPermission, 零 electron import, 复用 shared/path-utils isPathInside); 先写 `tests/unit/url-guard.test.ts` 红 → 实现绿 (TDD)。
  - tests: tests/unit/url-guard.test.ts — 协议矩阵 (http/https/mailto 放; file/javascript/data/smb/畸形/空/大小写 HTTPS/前后空格) + 路径矩阵 (根内/根本身 includeEqual/根外/.. 穿越/win32 大小写/空 roots) + 权限矩阵 (clipboard-sanitized-write 放; notifications/geolocation/media 拒)。
  - verify: `pnpm test -- url-guard` 绿; 文件零 electron import (AC-8)。非 UI 不适用界面验收。

- [ ] T2 shell handler 接谓词 + allowedRoots 聚合 + memory 根导出 (AC-2/3 接线层)
  - 内容: united-memory.ts 增 `defaultUnitedMemoryRoot()` (构造函数共用); memory/index.ts 增 `getMemoryRoots()`; handlers.ts 增私有 `collectAllowedRevealRoots()` (scanSourceGroups ∪ snapshot.projectDir ∪ memoryRoots, 每次现取); `shell:openExternal`/`shell:openPath` 接谓词, 拒绝不执行 + `getMainLog().log('url-guard', ...)`。
  - tests: T1 单测覆盖判定; 聚合为薄 IO 并集无分支, 例外理由见 02-SPEC 测试策略表; `pnpm test` 全量回归 (memory 模块测试不破坏)。
  - verify: typecheck/lint/test 绿; handler 签名 void 不变 (preload/renderer 零改动确认)。

- [ ] T3 窗口装配: sandbox:true + preload exclude + window-open/will-navigate/permission (AC-1/4/5/6 装配层)
  - 内容: electron.vite.config.ts preload `externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })`; index.ts `sandbox: true`; setWindowOpenHandler 接 isSafeExternalUrl + setImmediate (官方模式) + 拒绝 log; createWindow 内挂 will-navigate (dev 同 origin 放行 / 其余 preventDefault + log); whenReady 挂 session.defaultSession 双 permission handler (request+check 共用 isAllowedPermission)。
  - tests: `pnpm build` 后 `pnpm test:e2e` 现有 7 个全量 — sandbox 链路回归网 (AC-1 核心证据)。
  - verify: e2e 全绿; dev 模式 `pnpm dev` 启动正常 + window.api 可用。

- [ ] T4 CSP 三指令 + window-hardening e2e (AC-4/5/6/7 行为网)
  - 内容: index.html CSP 追加 `object-src 'none'; base-uri 'none'; form-action 'none'` (只增不改); 新建 tests/e2e/window-hardening.e2e.ts (复用 GH-117 launch helper): ①`location.href='https://example.com'` 赋值后 page.url() 仍为 file:// 入口 (will-navigate prod 拦截); ②`window.open('file:///...')` 后 app 窗口数不变 (AC-4); ③`navigator.permissions.query({name:'geolocation'})` → 'denied' (AC-6 deny 路径); ④document CSP meta 含三指令 (AC-7)。
  - tests: tests/e2e/window-hardening.e2e.ts (新) — `pnpm test:e2e`。
  - verify: 新 e2e 绿 + 现有 e2e 全量绿 + prod 加载零回归。

- [ ] T5 全量门禁 + 真机交互验收 (AC-9 收口)
  - 内容: typecheck / lint / unit 双轮 / e2e 全量; 真机 (dev + 打包任一): 外链按钮开浏览器 (AC-2 正例)、devtools 注入 `window.api.shell.openExternal('file:///C:/')` 拒且落 main log (AC-2 反例)、三处"在资源管理器中显示" (instructions 资产卡/memory note/scan sources, AC-3 正例)、四处复制按钮可用 (AC-6 正例)、拖拽文件到窗口不替换页面 (AC-5 正例)、dev 下改 vite 配置触发 full-reload 正常 (AC-5 dev 形态)。
  - tests: 上述门禁命令全量。
  - verify: AC-1~AC-9 逐条核对并记录证据; debt.final 回填。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
