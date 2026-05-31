import type { Article } from './types'

const AWS = { title: 'AWS — 什么是 AI 智能体?', url: 'https://aws.amazon.com/what-is/ai-agents/', note: '中立厂商科普;对各项能力定义清晰。' }
const IBM_AGENTS = { title: 'IBM — 什么是 AI 智能体?', url: 'https://www.ibm.com/think/topics/ai-agents', note: '中立主题解释;工具调用与自主性。' }
const IBM_VS = { title: 'IBM — AI 智能体 vs AI 助手', url: 'https://www.ibm.com/think/topics/ai-agents-vs-ai-assistants', note: '被动的助手 vs 主动的智能体。' }
const GOOGLE = { title: 'Google Cloud — 什么是 AI 智能体?', url: 'https://cloud.google.com/discover/what-are-ai-agents', note: '科普解释;"大模型是智能体的大脑"。' }
const MS = { title: 'Microsoft — AI 智能体科普', url: 'https://news.microsoft.com/source/features/ai/ai-agents-what-they-are-and-how-theyll-change-the-way-we-work/', note: '通俗框架;智能体替你做事。' }
const ANTHROPIC = { title: 'Anthropic — 构建高效 Agent', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: '一手来源;workflow 与 agent 的区分、工具在循环中的模型。' }
const TOOLUSE = { title: 'Anthropic — 工具调用(function calling)概览', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview', note: '一手来源;模型如何调用工具。' }
const IBM_MULTI = { title: 'IBM — 多智能体系统', url: 'https://www.ibm.com/think/topics/multiagent-system', note: '多个智能体协作达成目标。' }

export const understandZh: Article[] = [
  {
    slug: 'what-is-an-agent',
    pillar: 'understand',
    lang: 'zh',
    order: 1,
    title: '什么是 AI Agent?',
    summary: '聊天机器人回答你,Agent 替你把事做完。用通俗语言讲清 AI Agent 的定义,以及它和聊天模型的区别。',
    lead: '最短、又最站得住的定义是:聊天机器人回答你的问题,而 Agent 是替你把事情做完。',
    body: [
      {
        type: 'p',
        text: 'AI Agent 是这样一种软件:给它一个目标,它能感知所处情境、规划步骤、调用工具、记住过程,并在很少人工干预下,把一个多步骤任务推进到完成。AWS 的说法很直白:目标由人设定,但"该采取哪些最优行动来达成目标,由 Agent 自主决定"。',
      },
      {
        type: 'callout',
        label: '一句话版本',
        text: '聊天助手是被动的——你问它才答。Agent 是主动的——给定目标,它自己决定步骤并执行到底。',
      },
      { type: 'h2', text: 'Agent 和大模型是什么关系' },
      {
        type: 'p',
        text: '大模型是"大脑"。Google Cloud 把大模型描述为 Agent 的大脑,负责理解与生成语言;而其他部件让它能够推理与行动。AWS 则把模型称为"推理引擎",负责把提示转化为动作、决策,或对工具与记忆的调用。',
      },
      {
        type: 'p',
        text: '所以,Agent = 模型 + 让它能行动的那些部件:感知(接收情境)、规划、工具调用、记忆。模型"懂",Agent"做"。',
      },
      { type: 'h2', text: '落到实处是什么样' },
      {
        type: 'p',
        text: 'Berth 所管理的 Anthropic 工具,把 Agent 定义为"让模型自主主导其流程与工具使用"的系统。具体来说,就是大模型在一个循环里调用工具:行动 → 读取环境的真实反馈 → 评估进展 → 重复,直到目标达成。',
      },
    ],
    sources: [AWS, IBM_VS, GOOGLE, ANTHROPIC],
  },
  {
    slug: 'core-capabilities',
    pillar: 'understand',
    lang: 'zh',
    order: 2,
    title: 'Agent 的六大核心能力',
    summary: '感知、规划与推理、工具调用、记忆、自主多步执行、多智能体协作——用大白话讲清楚。',
    lead: '把一个 Agent 拆开,大致是六种能力在协同工作。看懂它们,是最快理解"Agent 能帮你做什么、不能做什么"的方式。',
    body: [
      { type: 'h2', text: '感知' },
      { type: 'p', text: 'Agent 先接收情境:你的需求、文档、来自其他系统的数据,或实时输入。这是它在行动前"看清现状"的方式。' },
      { type: 'h2', text: '规划与推理' },
      { type: 'p', text: '它不急着秒回,而是把目标想清楚,拆成有先后顺序的步骤——相当于给自己列一张待办清单,并决定先做哪一步。' },
      { type: 'h2', text: '工具调用(function calling)' },
      { type: 'p', text: '这是杠杆最高的一项能力:Agent 伸手去用真实软件——搜索、发邮件、运行代码、查询数据库。你定义好工具,模型决定何时调用,并返回一个结构化请求,由你的程序去执行。' },
      { type: 'h2', text: '记忆' },
      { type: 'p', text: 'Agent 在一个任务里(有时跨越数天)保留上下文,使每一步都不必从零开始,保持连贯与个性化。' },
      { type: 'h2', text: '自主多步执行' },
      { type: 'p', text: '给定一个目标,Agent 自己跑一个循环:行动、观察结果、调整、继续,跨越许多步骤直到完成——不需要人一个个按按钮。' },
      { type: 'h2', text: '多智能体协作' },
      { type: 'p', text: '面对更大的任务,多个各有所长的 Agent 可以组队,各管一段,朝共同目标协作。' },
      {
        type: 'callout',
        label: '这对 Berth 意味着什么',
        text: '在你的电脑上,这些能力以具体"资产"的形式存在——工具以 MCP 服务出现,可复用流程以 Skill 出现,任务委派以子代理出现。Berth 让它们变得可见。',
      },
    ],
    sources: [AWS, GOOGLE, { ...IBM_AGENTS }, TOOLUSE, IBM_MULTI],
  },
  {
    slug: 'model-vs-agent',
    pillar: 'understand',
    lang: 'zh',
    order: 3,
    title: '大模型 vs 智能体:到底差在哪',
    summary: '同一个模型,外面套不套 Agent,行为天差地别。这里讲清那个真正重要的区别。',
    lead: '人们常把"模型"和"Agent"混为一谈。但这个区别是实务性的,不是学术性的——它决定了你能放心让系统做到哪一步。',
    body: [
      {
        type: 'p',
        text: '一个"光秃秃"的大模型,只能根据训练时学到的知识作答。IBM 指出它"受限于知识与推理的边界"。相比之下,Agent 会通过工具调用获取最新信息、采取行动,并为达成复杂目标自行拆解子任务。',
      },
      {
        type: 'p',
        text: 'Microsoft 把 Agent 描述为模型之上的一层:它观察、收集信息、喂给模型,二者共同产出一份行动计划——在被授权时甚至直接执行。模型与 Agent 是互补的两半:一个负责"想",一个负责"看见并行动"。',
      },
      { type: 'h2', text: '并不是什么都要做成"Agent"' },
      {
        type: 'callout',
        label: '一个实用的区分',
        text: 'Anthropic 把 workflow(大模型与工具走固定、预设的路径——可预测)与 agent(由模型自主决定路径——灵活)区分开。它们的建议是:用能解决问题的最简方案,只有在确实能带来可衡量提升时,才增加 agent 式的复杂度。',
      },
      {
        type: 'p',
        text: '这也是为什么一套认真的 Agent 配置,重点其实在它的"周边"——你给它的指令、工具、权限和记忆。而这些,正是 Berth 扫描并呈现给你的资产。',
      },
    ],
    sources: [{ ...IBM_AGENTS }, MS, GOOGLE, ANTHROPIC],
  },
]
