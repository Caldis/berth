---
task: 2026-05-30-memory-source-adapter-layer
type: feature
phase: design
created: 2026-05-30
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 为 berth "记忆" 视图引入可替换的 MemorySource 适配层

## 一句话

berth 的 "记忆" tab 当前只映射 `claude-md`/`agents-md`、没有任何真实记忆数据源 → 面板恒空。
引入与现有按-agent 的 `AgentAdapter` **正交**的、按-记忆后端切分的 `MemorySource` 适配层:
接入 原生 Claude Code 记忆 + united-memory + 未来可扩展; 重定义 "记忆" 视图为真·记忆浏览体验 (只读)。

## 当前 phase
design — explore 已完成 (00-PRD + 01-ANALYSIS)。下一步: 02-SPEC (MemorySource 接口/模型/IPC) + 03-PLAN。
开工实现前须先解决"并发热点"提交策略 (见 01-ANALYSIS 风险段)。

## 范围决策 (来自用户)
- 记忆 tab 语义: 重定义为真·记忆视图 (默认推荐)。
- 多源呈现: 聚合 + 来源标签/过滤, 并支持源切换 (用户选了 "完整记忆浏览体验" → 取最全)。
- 范围: 完整记忆浏览体验 (适配层 + 两个源 + 聚合/过滤/搜索/详情); 遵守 v0.1 只读硬边界。

## 硬约束
- 只读: 不写任何本地文件 (ARCHITECTURE.md 安全约束)。
- 可测试: 适配层为纯 file→model 解析, 单元可测。
- 凭证隔离 / 路径白名单沿用现有规则。

## 交叉引用
- 并行任务 `2026-05-30-settings-scan-directories` (可配置扫描目录) — united-memory 路径可配将与之联动, 本任务先用默认+自动探测。
- friction `_archive/20260530-optimization-memory-belongs-in-repo.md` — "知识落仓库" 决策, 与本任务 (展示多源记忆) 不冲突。
- 待办: united-memory 数据完整性问题 (SessionStart 注入 45 notes/8 core vs 实盘 38/2; 6 条 core 已删 + 8 个畸形 .md.md/尾点文件) → 拟落 docs/issues/。
