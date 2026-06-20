# 描述
- health.ts 1453 行 ≥6 类职责 (claude 检查/codex 检查/跨 agent 检查/scan-error 转换/check 基建), ~25 个检查函数串行单入口; agent-plugins 已为内置 agent 建模 healthCheckDescriptors 但 health.ts 不经该模型, 第三方 manifest agent 与内置是两套并行体系。
- 同文件问题: 健康检查本地化靠渲染层 EXACT_TEXT_KEYS (~30 条) 逐字匹配主进程英文 prose (lib/health-check-i18n.ts), 措辞微调即静默击穿 — 渲染层唯一依赖主进程字符串内容的契约。
- registry.ts 1347 行中 ~870 行静态描述符数据与逻辑混居; HEALTH_TARGET_ROUTES 把 renderer 路由硬编码进主进程 (与 renderer asset-route.ts 三处独立维护)。

# 预期 · 建议
- 合并做 (01-ANALYSIS R20 明文"与 health 拆分同批成本最低"): health 按 agent 拆 check provider + 中立基建; HealthCheck 契约改携带稳定 messageKey + params (迁移期双带 key 与 legacy 文本); registry 静态数据拆 builtin-{claude-code,codex}.ts; 路由字符串收敛 @shared 单源。
- 拆分以"输出 prose 一字不动"golden 钉死 (messageKey 迁移完成前)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R15+R20 合立, panel 嫁接决策)。关联 2026-06-09-IMPROVEMENT-shared-path-and-type-config.md (路由表)。
- 状态: OPEN (Phase 1 已发 v0.4.3; Phase 2 待常规 harness 任务, 见下)。

# 进展 (2026-06-20, Phase 1 行为保持拆分 DONE, 随 v0.4.3)
- **Phase 1 (纯结构拆分) DONE**: `health.ts` 1446 → 45 行 (纯编排入口); 抽出 `engine/health/` 13 个内聚模块 (value-guards / fs-utils / command-heuristics / markdown / constants / types / hooks / make-check / shared-checks / claude / codex / cross-agent / paths)。公共导出不变 (`runHealthChecks` + `HealthCheckOptions`)。行为保持以**逐字节 golden oracle** 钉死 (claude+codex+project+sessions+scan-errors × win32/darwin, 每次增量 diff 字节相同)。engine typecheck/lint/108 测试 + 根 health-check 16 测试绿; 8 次小绿提交 (0d4c3ac0..3a36c0c1)。
- **Phase 2 (DEFER, 仍 OPEN — 触及 renderer/@shared/agent-plugins, 需常规 harness + renderer 协调)**, 三独立工作流:
  - **A messageKey+params 契约**: HealthCheck 增可选 messageKey+params (与 legacy message 双带迁移); 各 makeCheck 调用点 (现已按 provider 模块隔离, 改动局部化) 派生稳定 key; 渲染层 health-check-i18n 由 EXACT_TEXT_KEYS 逐字匹配改 key 查表 (golden 兜底至全部携带 key 后删 EXACT_TEXT)。
  - **B healthCheckDescriptors ↔ agent-plugins 对齐**: 定义 HealthCheckProvider 接口, claude/codex provider (Phase 1 已统一 `(paths,platform)=>HealthCheck[]` 签名) 按 agentId 注册 agent-plugin registry, runHealthChecks 由 registry 驱动 (manifest agent 经同路径贡献检查)。
  - **C registry 静态数据 + HEALTH_TARGET_ROUTES 收敛**: registry.ts 静态描述符拆 builtin-{claude-code,codex}.ts; asset-type→route 映射 (现 make-check.ts / 主 HEALTH_TARGET_ROUTES / renderer asset-route.ts 三处) 收敛 @shared 单源 (可独立先落)。

# 进展 (2026-06-20, Phase 2 item A — messageKey 契约全量完成, 随 v0.4.6)
- **Phase 2A (messageKey+params 契约) DONE — 含 2D 全量解耦** (commits eefbd404 2A / 472bda6f 2B / b8d534d6 2C / 77ba50a6 2D): HealthCheck+HealthCheckInput 加 nested `i18nKeys?{title/message/suggestion/fixLabel/fixDescription}` + `params?` + evidence `labelKey?`; 41 makeCheck 点全标注 (27 旧 key 复用 + 新增 suggestions/evidence 子命名空间); 渲染层 `localizeHealthCheck` 改**纯 key-first** (key→t(key,params), 无 key→raw), **EXACT_TEXT_KEYS + PATTERN_TEXT_KEYS + translateHealthCheckText 全删** (2D)。渲染层对主进程英文 prose 的内容耦合**彻底消除**。
- **双 golden 钉死**: engine `health-i18n-golden` (prose + emitted keys/params, 34 check families × darwin/win32) + renderer `health-i18n-localize-golden` (key-coverage 守卫 + en==engine-prose + zh 真翻译)。en 逐字不变 + zh 补 8 evidence-label 翻译 (净正)。
- 验收: engine 124/124 + full 1311/1311 + typecheck(node+web+test) + eslint 绿; lead 独立复跑确认 + 4 commit 文件域审计干净。
- **仍 OPEN (Phase 2 余项, 低价值架构 follow-up)**: B healthCheckDescriptors↔agent-plugins registry 统一 (扩展性, 中低价值); C registry 静态数据拆分 + asset-type→route 三处收敛 (DRY, 低价值)。issue 主诉求 (god-file 拆分 Phase-1 + 渲染层 prose 解耦 Phase-2A) 均已交付; B/C 作独立低优架构精修, 保持 OPEN。
