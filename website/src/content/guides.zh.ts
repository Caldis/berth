import type { Article } from './types'

const CC_HOOKS = { title: 'Claude Code — Hooks 指南', url: 'https://code.claude.com/docs/en/hooks-guide', note: '一手来源;hook 事件与生命周期。' }
const CC_SETTINGS = { title: 'Claude Code — Settings', url: 'https://code.claude.com/docs/en/settings', note: '一手来源;settings.json,含 disableAllHooks。' }
const CC_COSTS = { title: 'Claude Code — Costs', url: 'https://code.claude.com/docs/en/costs', note: '一手来源;用量与成本如何统计。' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: '一手来源;CLAUDE.md 作用域与 import。' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '一手来源;MCP 服务的 project 与 user 作用域。' }

export const guidesZh: Article[] = [
  {
    slug: 'why-isnt-my-hook-firing',
    pillar: 'guides',
    lang: 'zh',
    order: 1,
    title: 'Hook 为什么不触发?',
    summary: '一份简短的排查清单——借助 Berth 展示的信息,定位那个从不运行的 Hook。',
    lead: '一个悄无声息、从不运行的 Hook,是最常见的 Agent 配置谜题之一。下面教你用 Berth 把它揪出来。',
    body: [
      { type: 'h2', text: '1. 事件名对吗?' },
      { type: 'p', text: 'Hook 在特定生命周期事件上触发(例如工具调用前的 PreToolUse、调用后的 PostToolUse)。若事件名对不上任何真实事件,Hook 永远不会运行。Berth 会显示每个 Hook 被设定为何时触发。' },
      { type: 'h2', text: '2. 是不是被全局关掉了?' },
      { type: 'p', text: 'disableAllHooks 设置会一次性关闭所有 Hook。Berth 的健康检查会把它标出来——这是第一个要排除的因素。' },
      { type: 'h2', text: '3. matcher 是不是太窄?' },
      { type: 'p', text: '很多 Hook 用 matcher 来锁定特定工具。若 matcher 匹配不到你正在用的工具,就什么都不会发生。对照会话重放里的工具事件名,检查 matcher。' },
      { type: 'h2', text: '4. 命令文件存在吗?' },
      { type: 'p', text: 'Hook 指向一个命令或脚本。若路径错误或文件缺失,Hook 无法运行。Berth 会在健康检查里校验 Hook 的入口路径。' },
      { type: 'callout', label: '快速路径', text: '打开 Capabilities → Hooks,看那个 Hook 的生命周期视图和健康检查,通常一分钟内就能找到那个断开的环节。' },
    ],
    sources: [CC_HOOKS, CC_SETTINGS],
  },
  {
    slug: 'understand-your-cost',
    pillar: 'guides',
    lang: 'zh',
    order: 2,
    title: '看懂你的成本',
    summary: '读懂 Berth 的 Usage 界面,找出"什么贵、为什么贵"——按模型、按项目、按天。',
    lead: 'AI Agent 的花费常常像一团迷雾。Berth 的 Usage 界面,把它拆成三个能读懂的视图。',
    body: [
      { type: 'h2', text: '先看三个维度的拆解' },
      { type: 'list', items: [
        '按模型——哪些模型最花钱(比如前沿大模型 vs 更小的模型)。',
        '按项目——钱花在了哪里。',
        '按天——什么时候出现了尖峰。',
      ] },
      { type: 'h2', text: 'Token 才是真相' },
      { type: 'p', text: '成本跟着 Token 走:输入、输出、缓存。一个每轮都重读大文件的会话会烧输入 Token;长篇生成会烧输出 Token。Berth 把 Token 拆开,让你看到"原因",而不只是"总数"。' },
      { type: 'h2', text: '留意速率限制' },
      { type: 'p', text: 'Berth 把速率限制的余量放在视野内,于是变慢会被读作"快到上限了",而不是莫名其妙的卡顿。' },
      { type: 'callout', label: '当成本显示"未知"', text: '如果某次会话缺少计费数据,Berth 显示"未知"而不是误导性的 $0——让你知道它是缺失,而不是免费。' },
    ],
    sources: [CC_COSTS],
  },
  {
    slug: 'team-config-baseline',
    pillar: 'guides',
    lang: 'zh',
    order: 3,
    title: '为团队建立配置基线',
    summary: '用作用域与 import,给团队一套共享、可预期的 Agent 配置——并用健康检查验证它。',
    lead: '当几个人共享一个项目,"在我机器上是好的"是一个真实的风险。一条清晰的作用域基线能解决它。',
    body: [
      { type: 'h2', text: '1. 决定哪些该放在 project 作用域' },
      { type: 'p', text: 'user 作用域的资产是个人的;project 作用域的资产随仓库分发、对所有人生效。把共享的约定、Skill 与 MCP 服务放到 project 作用域,整个团队就能继承。' },
      { type: 'h2', text: '2. import 共享指令' },
      { type: 'p', text: '一个项目的 CLAUDE.md 可以通过 @path import 共享文件(例如 import AGENTS.md)。Berth 解析这条 import 链,让你确认每个人确实收到了相同的指令。' },
      { type: 'h2', text: '3. 用健康检查验证' },
      { type: 'p', text: '分享之前,过一遍 Berth 的健康检查:缺失的 import、断开的路径、作用域定义冲突,都会在这里显现。一次修好,团队就从一个"已知良好"的基线出发。' },
      { type: 'callout', label: '作用域为什么是关键杠杆', text: '大多数"我这能用、他那不能用"的问题,本质都是作用域问题。看清最终生效的合并配置,正是让一套配置可复现的方法。' },
    ],
    sources: [CC_MEMORY, CC_MCP],
  },
]
