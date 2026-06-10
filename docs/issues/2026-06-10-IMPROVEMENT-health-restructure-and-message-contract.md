# 描述
- health.ts 1453 行 ≥6 类职责 (claude 检查/codex 检查/跨 agent 检查/scan-error 转换/check 基建), ~25 个检查函数串行单入口; agent-plugins 已为内置 agent 建模 healthCheckDescriptors 但 health.ts 不经该模型, 第三方 manifest agent 与内置是两套并行体系。
- 同文件问题: 健康检查本地化靠渲染层 EXACT_TEXT_KEYS (~30 条) 逐字匹配主进程英文 prose (lib/health-check-i18n.ts), 措辞微调即静默击穿 — 渲染层唯一依赖主进程字符串内容的契约。
- registry.ts 1347 行中 ~870 行静态描述符数据与逻辑混居; HEALTH_TARGET_ROUTES 把 renderer 路由硬编码进主进程 (与 renderer asset-route.ts 三处独立维护)。

# 预期 · 建议
- 合并做 (01-ANALYSIS R20 明文"与 health 拆分同批成本最低"): health 按 agent 拆 check provider + 中立基建; HealthCheck 契约改携带稳定 messageKey + params (迁移期双带 key 与 legacy 文本); registry 静态数据拆 builtin-{claude-code,codex}.ts; 路由字符串收敛 @shared 单源。
- 拆分以"输出 prose 一字不动"golden 钉死 (messageKey 迁移完成前)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R15+R20 合立, panel 嫁接决策)。关联 2026-06-09-IMPROVEMENT-shared-path-and-type-config.md (路由表)。
- 状态: OPEN。
