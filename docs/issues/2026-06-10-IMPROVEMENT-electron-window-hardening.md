# 描述
- 窗口装配层加固缺位 (defense-in-depth, 高危 exploit 链已对抗验证证伪): sandbox:false 无必要回退 (preload 96 行纯 contextBridge 完全沙箱兼容, 唯一障碍是 externalizeDepsPlugin 两行配置); setWindowOpenHandler 与 shell:openExternal 对任意字符串直通无协议白名单; 无 will-navigate 守卫 (拖拽文件可替换 SPA 为 file:// 内容); 无 permission handler (默认全放行, 合法集合为空); shell:openPath 是"扫描路径白名单"边界上唯一不校验的出口; CSP 缺 object-src/base-uri/form-action 次级指令。

# 预期 · 建议
- sandbox: true + preload exclude 打包 (收益/成本比最高); 新建 main/url-guard.ts 单点: openExternal 限 https?/mailto, openPath 限扫描根集合, setWindowOpenHandler 共用; will-navigate 一律 preventDefault; permission handler deny-all; CSP 追加次级指令。一批落地, 改动集中 index.ts/handlers.ts。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R10)。
- 状态: OPEN。
