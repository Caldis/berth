# 描述
- 窗口装配层加固缺位 (defense-in-depth, 高危 exploit 链已对抗验证证伪): sandbox:false 无必要回退 (preload 96 行纯 contextBridge 完全沙箱兼容, 唯一障碍是 externalizeDepsPlugin 两行配置); setWindowOpenHandler 与 shell:openExternal 对任意字符串直通无协议白名单; 无 will-navigate 守卫 (拖拽文件可替换 SPA 为 file:// 内容); 无 permission handler (默认全放行, 合法集合为空); shell:openPath 是"扫描路径白名单"边界上唯一不校验的出口; CSP 缺 object-src/base-uri/form-action 次级指令。

# 预期 · 建议
- sandbox: true + preload exclude 打包 (收益/成本比最高); 新建 main/url-guard.ts 单点: openExternal 限 https?/mailto, openPath 限扫描根集合, setWindowOpenHandler 共用; will-navigate 一律 preventDefault; permission handler deny-all; CSP 追加次级指令。一批落地, 改动集中 index.ts/handlers.ts。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/_archive/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R10)。

# 终态 (2026-06-11, RESOLVED)
- GH-119 (docs/works/_archive/2026-06-11-gh-119-electron-window-hardening) 全量落地, 六缺口全消:
  1. sandbox:true + preload exclude 打包 (提交 c294bb7f; e2e 25 用例真实 preload 链回归 + sandbox 直证防回退)。
  2. `src/main/url-guard.ts` 纯谓词单点 (零 electron import, 29 unit 矩阵): openExternal/window.open 共用 http/https/mailto 白名单 (e240438b/26cbc445/c294bb7f)。
  3. openPath (实勘为 showItemInFolder) 限扫描根 ∪ memory 根 ∪ 活动项目目录三方并集, 每次现取; 三分支真机端到端零误拦 (26cbc445)。
  4. will-navigate: prod 一律拦 (MemoryRouter 零合法导航, e2e 实证 SPA 存活), dev 同 origin 放行保 vite full-reload (真机 reload 实证)。
  5. permission deny-all 例外 clipboard-sanitized-write (实勘修正: 原 issue "合法集合为空"不准确, renderer 4 处复制按钮依赖), request+check 双 handler 共用谓词; trusted-click 真机 clipboard ok + geolocation denied 双形态 (c294bb7f)。
  6. CSP 追加 object-src/base-uri/form-action 'none' + hardening e2e 行为网 5 用例 (0308ce75)。
- 全部拒绝路径落 main log 'url-guard' 不静默; AC1-9 verify 全过, CI success。
