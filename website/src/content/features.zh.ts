import type { Article } from './types'

const CC_OVERVIEW = { title: 'Claude Code — 概览', url: 'https://code.claude.com/docs/en/overview', note: '一手来源;Claude Code 是什么、它使用哪些资产。' }
const CC_SKILLS = { title: 'Claude Code — Skills', url: 'https://code.claude.com/docs/en/skills', note: '一手来源;SKILL.md 结构与渐进式披露。' }
const CC_SUBAGENTS = { title: 'Claude Code — 子代理', url: 'https://code.claude.com/docs/en/sub-agents', note: '一手来源;隔离的专职助手。' }
const CC_HOOKS = { title: 'Claude Code — Hooks 指南', url: 'https://code.claude.com/docs/en/hooks-guide', note: '一手来源;生命周期 shell 命令。' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: '一手来源;CLAUDE.md 的作用域与 import。' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '一手来源;连接外部工具与数据。' }
const MCP_INTRO = { title: 'Model Context Protocol — 简介', url: 'https://modelcontextprotocol.io/docs/getting-started/intro', note: '一手来源;"AI 的 USB-C 接口" 比喻。' }

export const featuresZh: Article[] = [
  {
    slug: 'asset-model',
    pillar: 'features',
    lang: 'zh',
    order: 1,
    title: '资产模型:Berth 到底给你看什么',
    summary: 'Berth 把 Agent 背后的纯文本文件,变成它称之为"资产"的结构化、可关联对象。这里讲清这个模型。',
    lead: 'Berth 的一切都建立在一个想法上:那些塑造 AI Agent 行为的文件,本身就是"资产"——而资产理应被看见、被搜索、并彼此关联。',
    body: [
      { type: 'p', text: '资产,是任何塑造 AI Agent 工作方式的文件或配置。Berth 把它们归为两大类,你会在整个应用里反复看到。' },
      { type: 'h2', text: 'Instructions(指令)—— Agent 该做什么' },
      { type: 'p', text: '记忆(CLAUDE.md / AGENTS.md)、Skills、子代理、命令、输出模式、Agent Teams。这些是在工作前与工作中引导行为的文本。' },
      { type: 'h2', text: 'Capabilities(能力)—— Agent 能做什么' },
      { type: 'p', text: 'MCP 服务、Hooks、权限、环境变量、状态栏、插件。这些定义了 Agent 运行时的能力与边界。' },
      { type: 'callout', label: '要点', text: '散落的文本文件,变成你可以浏览、搜索、追溯的一等对象——而且它们之间的关系也被显式呈现出来。' },
      { type: 'p', text: 'v0.1 是只读的:Berth 为展示而读取这些文件,绝不写入。API Key 等凭证仅用于探测状态,永不显示。' },
    ],
    sources: [CC_OVERVIEW, CC_MEMORY],
  },
  {
    slug: 'overview-and-sessions',
    pillar: 'features',
    lang: 'zh',
    order: 2,
    title: 'Overview 与 Sessions:看清活动与历史',
    summary: '一屏掌握的总览,以及如何回溯历史会话——连同每次会话用到的资产与工具。',
    lead: 'Berth 的这两个界面,回答了日常最常问的两个问题:"我现在手上有什么?"和"那次会话到底发生了什么?"',
    body: [
      { type: 'h2', text: 'Overview(总览)' },
      { type: 'p', text: '一块仪表盘:你有多少 Skill、MCP 服务与插件,最近的几次会话,本周花费,以及标记配置问题的健康检查。' },
      { type: 'h2', text: 'Sessions(会话)' },
      { type: 'p', text: '按项目或时间浏览历史会话。每次会话会显示它加载的 Skill、连接的 MCP 服务、触发的 Hook,以及产出的产物(计划、待办、文件历史)——还有一条按顺序记录运行了什么的工具时间线。' },
      { type: 'callout', label: '会话为什么重要', text: '一次会话,是一次 Agent 运行的完整记录。回读它,是你了解"自己这套配置实际做了什么、花了多少钱"的方式。' },
    ],
    sources: [CC_OVERVIEW],
  },
  {
    slug: 'configuration-instructions',
    pillar: 'features',
    lang: 'zh',
    order: 3,
    title: 'Configuration · Instructions:记忆、Skill、子代理',
    summary: '引导 Agent 的指令类资产——以及 Berth 如何展示它们的作用域、import 链与各自的来源。',
    lead: 'Instructions 是告诉 Agent "该做什么"的文本。Berth 把它们铺开,让你看清:加载了什么、来自哪个作用域、文件之间如何串联。',
    body: [
      { type: 'h2', text: '记忆(Memories)' },
      { type: 'p', text: 'CLAUDE.md 与 AGENTS.md 是 Agent 在工作开始时读取的持久指令。Berth 显示它们的作用域(user / project / enterprise),并解析 @path import 链——包括断开的引用。' },
      { type: 'h2', text: 'Skills' },
      { type: 'p', text: '一个 Skill 用 SKILL.md(及可选脚本)打包一段可复用流程。Claude 在该 Skill 相关之前只加载它的名称/描述——即"渐进式披露"——因此再长的流程,在用到之前几乎不占成本。' },
      { type: 'h2', text: '子代理(Subagents)' },
      { type: 'p', text: '子代理是拥有独立上下文窗口、独立系统提示与受限工具的专职助手。主 Agent 把聚焦的工作委派给它,只拿回一份摘要——让主对话保持干净。' },
      { type: 'callout', label: '作用域合并', text: '同一个资产可能在 user、project、enterprise 三层都有定义。Berth 显示哪一个"生效"、并标记冲突,让最终生效配置不再靠猜。' },
    ],
    sources: [CC_MEMORY, CC_SKILLS, CC_SUBAGENTS],
  },
  {
    slug: 'configuration-capabilities',
    pillar: 'features',
    lang: 'zh',
    order: 4,
    title: 'Configuration · Capabilities:MCP、Hooks、权限',
    summary: '赋予 Agent 能力、并为它划定边界的能力类资产——MCP 服务、生命周期 Hooks 与权限。',
    lead: 'Capabilities 是 Agent 真正"能做什么"。Berth 把能力和护栏并排呈现,让你一眼看清。',
    body: [
      { type: 'h2', text: 'MCP 服务' },
      { type: 'p', text: 'MCP(Model Context Protocol)是连接 Agent 与外部工具、数据的开放标准——官方文档称它为"AI 的 USB-C 接口"。Berth 列出每个已连接的服务、它的传输方式,以及同名服务在多个作用域定义时的合并冲突。' },
      { type: 'h2', text: 'Hooks' },
      { type: 'p', text: 'Hooks 是在特定生命周期时刻运行的 shell 命令(例如工具调用前或后)。它带来确定性控制——确保某件事一定发生,而不是寄望模型主动去做。Berth 显示每个 Hook 何时触发,并对其做校验。' },
      { type: 'h2', text: '权限(Permissions)' },
      { type: 'p', text: 'allow / ask / deny 规则定义了 Agent 无需询问即可做什么、什么需要确认、什么被禁止。Berth 会标出危险的过宽规则,并显示哪个作用域覆盖了哪个。' },
      { type: 'callout', label: '能力与边界,一起看', text: '把能力和权限放在一起看,才能分清一套配置是"强大"还是"危险"。' },
    ],
    sources: [CC_MCP, MCP_INTRO, CC_HOOKS],
  },
  {
    slug: 'usage-health-privacy',
    pillar: 'features',
    lang: 'zh',
    order: 5,
    title: '用量、健康检查与隐私',
    summary: '成本与 Token 走势、自动诊断,以及这一切背后的只读 / 本地优先承诺。',
    lead: '最后一组功能让你既知情又安全:你在花多少钱、哪里配置错了、以及 Berth 如何保护你的数据。',
    body: [
      { type: 'h2', text: 'Usage(用量)' },
      { type: 'p', text: '按模型、按项目、按天的成本与 Token 走势,速率限制余量一目了然。当某次会话缺少成本数据时,Berth 显示"未知"而不是误导性的 $0。' },
      { type: 'h2', text: '健康检查' },
      { type: 'p', text: '自动化的本地诊断,捕捉常见问题:语法错误、缺失的必填字段、断开的 @path import、不安全的设置——每条都带严重级别,并尽可能给出修复建议。' },
      { type: 'h2', text: '隐私与只读' },
      { type: 'p', text: 'Berth 完全在你的机器上运行:无遥测、无云同步、无账号。v0.1 绝不修改任何文件,凭证仅用于探测状态——永不显示。' },
      { type: 'callout', label: '本地优先是设计原则', text: '你的 Agent 配置很敏感。Berth 的设计确保:理解它,从不意味着把它发往任何地方。' },
    ],
    sources: [CC_OVERVIEW],
  },
]
