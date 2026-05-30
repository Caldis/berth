# 工程摩擦记录

> 命名: docs/friction/{YYYYMMDD}-{phase}-{summary}.md (phase: new|continue|explore|design|implement|verify|archive|optimization)
> 不与 Jira 关联, 不拆子目录。优化后移入 _archive/。

## 发生阶段

design

## 现象

在设计 Claude Code 会话列表修复时, 初始分析过度依赖本机 JSONL 样本和经验判断, 没有先查 Anthropic / Claude Code 官方文档。用户指出: 涉及功能特性偏好、字段契约、费用口径、产品行为这类会变化的信息时, 应优先联网检索文档, 而不是凭经验猜。

## 工程师介入动作

已补查官方 Claude Code 文档, 包括 status line、hooks、costs、monitoring usage、CLI reference, 并据此修正设计: `cwd` / `workspace.current_dir` 可作为路径依据, `session_id` / `transcript_path` 可作为会话标识依据, token 可按 usage 字段累加, session 级 cost 缺字段时应显示 unknown 而不是 `$0.00`。

## 应沉淀的上下文或规则

当任务涉及外部产品、平台、SDK、CLI、配置字段、费用口径、指标字段、文件格式、运行时行为等可能随版本变化的内容时, 先用英文检索官方文档或 primary source。只有在确认官方文档没有公开契约后, 才把本机样本作为实现依据, 并在设计里标注这是经验性 fallback。

## 建议的流程改进

Explore / Design 阶段加入“外部契约校验”检查项: 对非客观静态事实、可变功能行为、产品偏好和第三方字段契约, 先查官方文档, 再写验收标准和实现策略。
