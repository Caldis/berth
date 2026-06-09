# 描述
- 多处「路径相等性比较」「asset type → 展示元数据映射」「结果指纹」概念重复, 缺共享出口。其中路径比较重复最严重 (5 份各写一遍)。

# 证据
- 路径比较 5 份: `samePath` 于 claude/parsers.ts:487 (带 platform 参数, export) · engine/health.ts:1441 · engine/scanner.ts:322 · engine/hooks-manager.ts:717; 另 `sameProjectPath` shared/scope.ts:48 (main + renderer 共用)。语义重叠 (Windows 大小写折叠) 却各写一份。
- asset type → route/guidance/icon/label 映射分散: `lib/asset-route.ts`、`lib/asset-guidance.ts`、`lib/agent-view.ts`、`lib/capability-assets.ts` 各维护一部分, 无单一配置表 (官方类型表在 agent-plugins/manifest.ts)。
- 指纹: `lib/result-signature.ts` 的 session/memory 签名各硬编码字段列表; `engine/search.ts:115` 另有 createIndexSignature。

# 预期 · 建议
- 统一路径比较到 `src/shared/path-utils.ts` (含 platform 大小写折叠), 5 处收敛为 1。
- 建 `renderer/src/lib/asset-type-config.ts` 单一配置表 (route/icon/i18nKey/guidanceKey): 新增资产类型从「改 N 个文件」→「加 1 行」, 杜绝漏改导致 UI 不一致。
- (可选) 抽通用 signature 构造器, 收敛 result-signature 与 search 指纹。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-adapter-parsing-shared-core.md、2026-06-09-IMPROVEMENT-renderer-cached-resource-hook.md。
- 状态: OPEN。
