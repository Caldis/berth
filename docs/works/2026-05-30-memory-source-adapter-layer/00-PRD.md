# 00-PRD — 可替换的 MemorySource 记忆适配层

> feature 来源快照 (只读输入)。原始诉求来自用户对话, 经澄清确认。

## 背景

berth 是面向 Claude Code / Codex 的只读"资产看板"。"指令"页含一个"记忆"(memories) tab。
用户反馈: **"记忆"面板恒为空**。排查确认: 该 tab 实际只映射资产类型 `claude-md`/`agents-md`
(即 CLAUDE.md/AGENTS.md 指令文件), berth **没有任何真实"记忆"数据源**——既不读原生 Claude Code
记忆 (`~/.claude/projects/*/memory/MEMORY.md`), 也不读用户自建的 united-memory (`~/.united-memory`)。

## 诉求 (用户原话提炼)

> "将 mem 的数据接入层作为一个可替换的 adaption 层, 不仅可以展示原始的 mem, 还能展示我们的
> united mem, 或以后的其他。"

即: 为 berth 的记忆视图引入**可替换的记忆数据源适配层**, 支持多后端、可扩展。

## 目标

1. 引入 `MemorySource` 适配抽象, 与现有按-agent 的 `AgentAdapter` **正交** (后者切"哪个 agent",
   前者切"哪个记忆后端")。
2. 内置两个 source: 原生 Claude Code 记忆、united-memory; 预留未来扩展点。
3. "记忆" tab 重定义为**真·记忆视图**, 聚合展示所有可用源, 每条带**来源标签**并可按源过滤。
4. 全程**只读** (遵守 v0.1 硬边界)。

## 已锁定决策 (来自澄清 Q&A)

| 维度 | 决策 |
|---|---|
| 记忆 tab 语义 | 重定义为真·记忆视图 (CLAUDE.md/AGENTS.md 归"指令/约定"语义) |
| 多源呈现 | 聚合 + 来源标签 + 按源过滤 |
| 本次范围 | 最小端到端闭环 (适配层 + 2 源 + 聚合/过滤/详情); 不含全文搜索/关系图等增量 |
| 路径 | united-memory 用默认 `~/.united-memory` + 自动探测; 可配置化延后, 与并行任务 settings-scan-directories 联动 |

## 非目标 (本次)

- 不做记忆写回/编辑 (只读硬边界)。
- 不做记忆全文搜索、关系图、跨源去重等高级浏览 (可作后续任务)。
- 不内置 united-memory 路径的 UI 配置 (延后)。

## 约束

- 只读: 不写任何本地文件 (ARCHITECTURE.md 安全约束)。
- 可测试: source 适配层须为纯 `file → model` 解析, 可单元测试 (fixture 驱动)。
- 凭证隔离 / 路径白名单: 沿用现有规则 (记忆笔记本身非敏感)。

## 验收标准

1. 存在 `MemorySource` 接口, 至少 2 个实现 (native-claude / united-memory) + 注册/聚合机制。
2. "记忆" tab 在本机能**只读展示真实记忆条目** (本机数据应来自 united-memory 的 ~38 条),
   每条带来源标签, 可按源过滤; 无源时优雅空态。
3. 适配层有单元测试 (fixture: 各源样本 → 期望 model)。
4. typecheck / lint / test 全绿; 应用实跑面板非空 (截图验收)。
5. 新增第 3 个源只需实现接口 + 注册一行, 不改 UI/IPC 契约。

## 交叉引用

- 并行任务 `2026-05-30-settings-scan-directories` (可配置扫描目录)。
- friction `_archive/20260530-optimization-memory-belongs-in-repo.md` ("知识落仓库", 与本任务不冲突)。
- FYI (非 berth 范围): 用户 united-memory 库存在数据完整性问题——SessionStart 注入声称
  45 notes/8 core, 实盘 `~/.united-memory/mem` 仅 38 有效/2 core (6 条 core 已删) + 8 个畸形
  文件名 (`*.md.md`、尾部多点)。属 `~/.united-memory` 仓库问题, 不在 berth 修, 已口头告知。
