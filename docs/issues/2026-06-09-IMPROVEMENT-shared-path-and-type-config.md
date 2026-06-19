# 描述
- 多处「路径相等性比较」「asset type → 展示元数据映射」「结果指纹」概念重复, 缺共享出口。其中路径比较重复最严重 (5 份各写一遍)。

# 证据
- 路径比较 5 份: `samePath` 于 claude/parsers.ts:487 (带 platform 参数, export) · engine/health.ts:1441 · engine/scanner.ts:322 · engine/hooks-manager.ts:717; 另 `sameProjectPath` shared/scope.ts:48 (main + renderer 共用)。语义重叠 (Windows 大小写折叠) 却各写一份。
- asset type → route/guidance/icon/label 映射分散: `lib/asset-route.ts`、`lib/asset-guidance.ts`、`lib/agent-view.ts`、`lib/capability-assets.ts` 各维护一部分, 无单一配置表 (官方类型表在 agent-plugins/manifest.ts)。
- 指纹: `lib/result-signature.ts` 的 session/memory 签名各硬编码字段列表; `engine/search.ts:115` 另有 createIndexSignature。

# 进展 (2026-06-10)
- **路径比较统一 DONE** (提交于 path-utils refactor): 建 `src/shared/path-utils.ts` 单一真源 `samePath`; claude/parsers · engine/health · engine/scanner · engine/hooks-manager 4 份本地实现全部替换为 import。核验发现 hooks-manager 原用 `toLocaleLowerCase` 全平台折叠 (与其余三处"win32 折叠/否则敏感"不一致, Linux 潜在 bug), 统一为平台感知版; win32/CI 行为不变。`sameProjectPath` (scope.ts) 本就共享, 未动。
- **仍 OPEN**: asset type → route/icon/i18n/guidance 单一配置表 (`asset-type-config.ts`) 未做; result-signature/search 指纹收敛未做。这两项是渲染层/引擎较大改动, 后续单独推进。

# 预期 · 建议
- 统一路径比较到 `src/shared/path-utils.ts` (含 platform 大小写折叠), 5 处收敛为 1。
- 建 `renderer/src/lib/asset-type-config.ts` 单一配置表 (route/icon/i18nKey/guidanceKey): 新增资产类型从「改 N 个文件」→「加 1 行」, 杜绝漏改导致 UI 不一致。
- (可选) 抽通用 signature 构造器, 收敛 result-signature 与 search 指纹。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-adapter-parsing-shared-core.md、2026-06-09-IMPROVEMENT-renderer-cached-resource-hook.md。
- 状态: OPEN (路径统一已完成; 仅余 asset-type 配置表 + signature 收敛)。

# 追记 (GH-115 进展+新证据, 2026-06-10)
- **isPathInside 收敛 DONE** (T7): shared/path-utils 增 isPathInside({includeEqual,platform}), memory ×2 与 engine/scanner 三处互相矛盾的包含判定收敛, win32 折叠对齐 samePath 先例。
- R30 新证据: normalizeProjectPath 双实现 Windows 盘根分叉 ('X:' vs 'X:/', sessions 分组键 vs scope 过滤键不等); 签名习语两侧独立 (result-signature vs search, main 侧不转义有伪相等风险); engine/usage 私有重定义 emptyUsageSummary/costSourceToFormula。仍 OPEN: asset-type 配置表、signature 收敛、盘根 canonical 定案 — session-location-groups/result-signature 是 gh-98 verify 足迹, 待收口。

# 核实更新 (2026-06-19, harness-5.2-issues 续做)
- **asset-type 配置表项过期, 不做**: 核实 `lib/asset-route.ts` 已是单一真源 route switch (注释自述 single source of truth); issue 原列的 `lib/asset-guidance.ts` / `lib/agent-view.ts` 已删 (后续重构), `capability-assets.ts` 的 'mcp'/'hooks' 是 EnvVarGroup 非 asset-type 映射。"4 处分散漏改"前提不再成立, 建统一 asset-type-config 收益极低。
- **路径统一**: DONE (samePath + isPathInside 已收敛)。
- **signature 收敛仍 OPEN**: `lib/result-signature.ts` + `engine/search.ts` (3 处 createIndexSignature) 两套签名构造仍并存, 抽通用 signature 构造器仍有价值 (有界小重构, 低优)。
- **盘根 canonical**: normalizeProjectPath + normalizeProjectPathKey 现同在 `shared/scope.ts`, 未深核实是否仍分叉, 暂留。
- 结论: 保持 OPEN, 聚焦剩 signature 收敛 (低优); asset-type 配置表项标过期不做。

# 落地更新 (2026-06-20, GH-145)
- **signature 收敛: 部分 DONE + 转义方向更正** — explore 核实 issue 把转义方向写反: 需补转义的是 `search.ts` (引擎侧 createIndexSignature 字段不转义, 有伪相等风险), 非 result-signature (renderer 已转义)。GH-145 给 search.ts 加 signatureField 转义 (**修了潜在伪相等 bug**: path/metadata 含分隔符字节漏触发 ensureIndexed 重建)。result-signature 已转义+已复用 row, near-no-op 按 surgical 跳过。跨 package 物理隔离 → 未抽"单一真源"共享模块 (不可达, 两侧镜像)。
- 余: 习语完全统一仍可低优收尾; asset-type 配置表过期不做; 盘根 canonical 暂留。work: `docs/works/_archive/2026-06-19-gh-145-scan-engine-nested-ignore-signature`。
