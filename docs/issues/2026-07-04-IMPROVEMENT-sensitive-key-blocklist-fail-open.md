# IMPROVEMENT: 搜索索引敏感键脱敏是黑名单制, 未命中键 fail-open

- 日期: 2026-07-04
- 状态: open
- 来源: GH-154 explore 正则扫查旁带发现 (已核实机制)

## 现象

`pkg:engine/search.ts` `isSensitiveSearchKey` 用固定黑名单正则 (`raw|content|body|message(s)|transcript|secret|token|api[_-]?key|password|credential`) 决定资产 meta 的键值是否进搜索索引; 各 adapter 的 `SENSITIVE_KEY` 同为黑名单制。未命中的键 (如 `authToken`、`bearer`、`accessKey`) 的字符串值会被展平进 MiniSearch 索引, 可在渲染层搜索命中并以 snippet 形式呈现。

## 影响评估

低 (二层防御缺口): 主约束是 adapter 层"凭证只探测存在性、标 `sensitive: true` 不带值" (ARCHITECTURE 安全约束), 实际泄漏需 adapter 先违反主约束把值放进 meta。但黑名单天然滞后于新键名, 违反纵深防御取向。

## 建议方向

- 黑名单扩词 (auth/bearer/key/secret 族模糊匹配); 或
- 结构性: meta 进索引改白名单字段制 (只索引已知展示字段), 从机制上消灭 fail-open。

## 交叉引用

- GH-154 (批次四) 01-ANALYSIS §7; 不入该批 (改索引字段策略影响搜索召回面, 需独立评估)。
