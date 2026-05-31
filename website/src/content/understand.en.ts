import type { Article } from './types'

const AWS = { title: 'AWS — What are AI agents?', url: 'https://aws.amazon.com/what-is/ai-agents/', note: 'Vendor-neutral explainer; crisp definitions of agent capabilities.' }
const IBM_AGENTS = { title: 'IBM — What are AI agents?', url: 'https://www.ibm.com/think/topics/ai-agents', note: 'Neutral topic explainer; tool calling and autonomy.' }
const IBM_VS = { title: 'IBM — AI agents vs. AI assistants', url: 'https://www.ibm.com/think/topics/ai-agents-vs-ai-assistants', note: 'Reactive assistant vs. proactive agent.' }
const GOOGLE = { title: 'Google Cloud — What are AI agents?', url: 'https://cloud.google.com/discover/what-are-ai-agents', note: 'Educational explainer; "LLM as the brain".' }
const MS = { title: 'Microsoft — AI agents, explained', url: 'https://news.microsoft.com/source/features/ai/ai-agents-what-they-are-and-how-theyll-change-the-way-we-work/', note: 'Plain-language framing; agents work on your behalf.' }
const ANTHROPIC = { title: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: 'Primary source; the agent-vs-workflow distinction and the tools-in-a-loop model.' }
const TOOLUSE = { title: 'Anthropic — Tool use (function calling) overview', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview', note: 'Primary source; how a model calls tools.' }
const IBM_MULTI = { title: 'IBM — Multiagent systems', url: 'https://www.ibm.com/think/topics/multiagent-system', note: 'Multiple agents collaborating on a goal.' }

export const understandEn: Article[] = [
  {
    slug: 'what-is-an-agent',
    pillar: 'understand',
    lang: 'en',
    order: 1,
    title: 'What is an AI agent?',
    summary: 'A chatbot answers; an agent acts. Plain-language definition of an AI agent and how it differs from a chat model.',
    lead: 'The shortest definition that actually holds up: a chatbot answers your questions; an agent works to get things done for you.',
    body: [
      {
        type: 'p',
        text: 'An AI agent is software that, given a goal, can perceive its context, plan steps, use tools, remember what happened, and carry a multi-step task to completion with limited human steering. AWS puts it simply: humans set the goals, but the agent "independently chooses the best actions it needs to perform to achieve those goals."',
      },
      {
        type: 'callout',
        label: 'The one-line version',
        text: 'A chat assistant is reactive — it does what you ask, when you ask. An agent is proactive — given a goal, it decides the steps and carries them out.',
      },
      { type: 'h2', text: 'How an agent relates to the model' },
      {
        type: 'p',
        text: 'The large language model is the "brain." Google Cloud describes the LLM as the brain of an agent, processing and generating language, while other parts let it reason and act. AWS frames the model as the reasoning engine that turns prompts into actions, decisions, or queries to tools and memory.',
      },
      {
        type: 'p',
        text: 'So an agent is the model plus the parts that let it act: perception (taking in context), planning, tool use, and memory. The model knows things; the agent gets things done.',
      },
      { type: 'h2', text: 'What this looks like in practice' },
      {
        type: 'p',
        text: 'Anthropic, whose tools Berth manages, defines an agent as a system where the model "dynamically directs its own processes and tool usage." In practice that is an LLM using tools in a loop: it acts, reads real feedback from the environment, assesses progress, and repeats until the goal is met.',
      },
    ],
    sources: [AWS, IBM_VS, GOOGLE, ANTHROPIC],
  },
  {
    slug: 'core-capabilities',
    pillar: 'understand',
    lang: 'en',
    order: 2,
    title: 'The six core capabilities of an agent',
    summary: 'Perception, reasoning & planning, tool use, memory, autonomous multi-step execution, and multi-agent collaboration — explained simply.',
    lead: 'Strip an agent down and you find roughly six abilities working together. Understanding them is the fastest way to know what an agent can — and cannot — do for you.',
    body: [
      { type: 'h2', text: 'Perception' },
      { type: 'p', text: 'The agent takes in the situation: your request, documents, data from other systems, or live inputs. It is the agent’s way of seeing what is going on before it acts.' },
      { type: 'h2', text: 'Reasoning & planning' },
      { type: 'p', text: 'Instead of replying instantly, the agent thinks the goal through and breaks it into ordered steps — like writing itself a to-do list and deciding what to tackle first.' },
      { type: 'h2', text: 'Tool use (function calling)' },
      { type: 'p', text: 'This is the highest-leverage ability: the agent reaches out and uses real software — searching, sending an email, running code, querying a database. You define tools; the model decides when to call one and returns a structured request your app executes.' },
      { type: 'h2', text: 'Memory' },
      { type: 'p', text: 'The agent keeps context across a task (and sometimes across days), so each step does not start from zero and it stays consistent and personalized.' },
      { type: 'h2', text: 'Autonomous multi-step execution' },
      { type: 'p', text: 'Given one goal, the agent runs a loop on its own: act, observe the result, adjust, and keep going across many steps until the job is done — without a human pressing each button.' },
      { type: 'h2', text: 'Multi-agent collaboration' },
      { type: 'p', text: 'For bigger jobs, several specialized agents can team up, each handling the part it is good at, coordinated toward a shared goal.' },
      {
        type: 'callout',
        label: 'Why it matters for Berth',
        text: 'On your machine these abilities show up as concrete assets — tools arrive as MCP servers, reusable procedures as Skills, delegation as subagents. Berth makes those visible.',
      },
    ],
    sources: [AWS, GOOGLE, { ...IBM_AGENTS }, TOOLUSE, IBM_MULTI],
  },
  {
    slug: 'model-vs-agent',
    pillar: 'understand',
    lang: 'en',
    order: 3,
    title: 'Large model vs. agent: what actually changes',
    summary: 'The same model, with or without an agent around it, behaves very differently. Here is the distinction that matters.',
    lead: 'People often blur "the model" and "the agent." The difference is practical, not academic — and it decides what you can trust the system to do.',
    body: [
      {
        type: 'p',
        text: 'A plain language model answers from what it learned in training. IBM notes it is "bounded by knowledge and reasoning limitations." An agent, by contrast, uses tool calling to fetch up-to-date information, take actions, and create subtasks to reach a complex goal.',
      },
      {
        type: 'p',
        text: 'Microsoft frames agents as a layer on top of the model that observes, collects information, feeds it to the model, and together they produce an action plan — or act on it directly when permitted. Model and agent are complementary halves: one thinks, the other perceives and acts.',
      },
      { type: 'h2', text: 'Not everything needs to be an "agent"' },
      {
        type: 'callout',
        label: 'A useful distinction',
        text: 'Anthropic separates workflows (LLMs and tools on fixed, predefined paths — predictable) from agents (the model directs its own path — flexible). Their advice: use the simplest thing that works, and add agentic complexity only when it measurably helps.',
      },
      {
        type: 'p',
        text: 'That is why a serious agent setup is mostly about its surroundings — the instructions, tools, permissions, and memory you give it. Those are exactly the assets Berth scans and shows you.',
      },
    ],
    sources: [{ ...IBM_AGENTS }, MS, GOOGLE, ANTHROPIC],
  },
]
