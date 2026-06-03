# Berth · v0.1 产品描述文档

> **工作名**:Berth(中文:泊位 / 泊)
> **状态**:Draft v0.1 · 启动文档
> **作者**:Caldis
> **更新**:2026-05-28

---

## 0. 文档约定

- 本文档面向**项目启动阶段**,定义产品边界、资产模型、信息架构、模块拆分与验收标准,不涉及具体技术实现细节(选型留给工程文档)。
- **工作名 Berth** 取自命名候选报告的 Top 1,后续可替换;文档内统一以 Berth 指代本产品。
- 标记约定:`[✓]` 已确认 · `[?]` 待决 · `[△]` 范围外但需记录

---

## 1. 产品定位

### 1.1 一句话定义

**Berth 是一个本地化的 AI Agent 资产可视化与管理工具** —— 把分散在用户机器各处的 Agent 配置、能力、会话、用量统一扫描、关联展示,让用户随时知道「自己装了什么、它们怎么协作、用得怎么样」。

### 1.2 核心洞察:被「隐藏」的本地资产

随着 Claude Code、Codex、Cursor 等 AI Agent 工具的快速演进,用户在本地积累的「周边资产」—— skills、MCP、hooks、subagents、memories、commands、output styles 等 —— 已多达 25+ 种不同形态、分散在多个目录下的文件。

这些资产具有共同特征:

- 都是 plain text(YAML / JSON / Markdown),**但 plain text ≠ 可见**
- 都靠 CLI / 配置文件 / 第三方工具安装,**安装即遗忘**
- 缺乏统一 GUI 入口,出问题时只能 `cat / tree / grep` 排查
- 跨 Agent 时各家命名 / 位置不同,无法对照
- 配置散落多 scope(user / project / enterprise),合并后的有效配置不可见

Berth 的目标是**让这些资产从「目录树底层的纯文本」升级为「产品级可视化对象」**,使用户能够:

1. **看清装了什么**(Visibility)
2. **看清它们如何关联**(Relationships)
3. **在不破坏 CLI 体验的前提下,提供轻量管理**(Management)

### 1.3 目标用户

| 优先级 | 用户画像 | 典型行为 |
|---|---|---|
| **P0** | Claude Code 中重度用户 | 每日使用 + 装有 ≥3 个 skill/MCP/plugin |
| **P1** | 多 Agent 混用开发者 | Claude Code + Codex / Cursor 并行使用 |
| **P2** | Tech Lead / Platform Engineer | 为团队管理统一 Agent 配置基线 |

### 1.4 与竞品的差异化

| 维度 | Berth | Opcode / Nimbalyst / Tessera | ToolHive | Claude Squad |
|---|---|---|---|---|
| **核心定位** | 资产盘点 + 可视化 | 会话执行工作台 | MCP 容器化管理 | 多会话并行执行 |
| **资产覆盖** | 25+ 类全资产 | 部分 | 仅 MCP | 仅会话 |
| **会话维度** | 浏览 + 关联,不执行 | 执行 + 浏览 | 无 | 执行 |
| **设计取向** | Finder 风格 | IDE 风格 | Docker Desktop 风格 | tmux 增强风格 |
| **跨 Agent** | 架构内建(adapter) | 部分 | 仅 MCP | 仅 Claude |

详见《命名与竞品分析报告》。

---

## 2. 产品范围

### 2.1 v0.1 In Scope

| # | 范围 | 说明 |
|---|---|---|
| 1 | **Claude Code adapter** | 仅支持 Claude Code 一种 Agent |
| 2 | **只读扫描** | 不修改任何本地文件 |
| 3 | **5 类资产全覆盖** | 指令 / 能力 / 状态 / 可观测 / 集成 |
| 4 | **会话浏览**(无内容) | 标题、时间、关联资产,不展示对话内容 |
| 5 | **跨资产关联视图** | 会话 ↔ skill,skill ↔ imports,plugin ↔ 子组件 |
| 6 | **全局搜索** | 跨所有资产的关键词搜索 |
| 7 | **三层视图** | Overview / Category / Detail |
| 8 | **文件监听** | 关键目录的 fs.watch,资产变化实时刷新 |
| 9 | **scope 合并显示** | user / project / enterprise 三层合并 + 来源标注 |
| 10 | **import 链解析** | CLAUDE.md / AGENTS.md 的 `@path` 引用链 |

### 2.2 Out of Scope(v0.1 不做)

| # | 不做 | 原因 |
|---|---|---|
| 1 | 编辑 / 修改资产 | 降低风险,先做盘点;v0.2 再开放编辑 |
| 2 | 多 Agent 支持 | MVP 先打透 Claude Code |
| 3 | 会话内容浏览 | 复杂度高,且与执行类竞品撞型 |
| 4 | 启动 / 停止 MCP server | 与 ToolHive 撞型,留到 v0.3 |
| 5 | 云同步 / 账号体系 | 违反「本地优先」原则 |
| 6 | 凭据明文展示 | 安全红线 —— 只显示登录态,绝不展示 token |
| 7 | 触发 Agent 执行 | 不是工作台 |
| 8 | 移动端 | v0.5+ 才考虑 |

### 2.3 后续 Roadmap

| 版本 | 关键能力 |
|---|---|
| **v0.1** | Claude Code 只读盘点(本文档定义) |
| v0.2 | 编辑能力 + import 链可视化增强 + 跨会话搜索 |
| v0.3 | Codex / Cursor adapter + 跨 Agent 统一视图 |
| v0.4 | 团队基线导出 + 配置同步建议 + MCP 启停 |
| v0.5+ | 命令面板 / 自动化建议 / 移动伴侣 |

---

## 3. 资产模型(Asset Model)

### 3.1 顶层分类

Berth 将所有本地资产抽象为 5 个一级类别:

```
Asset
├── Instruction      指令资产 · 塑造 Agent 行为的纯文本
├── Capability       能力资产 · Agent 能做什么
├── State            状态资产 · 积累的历史与产物
├── Observability    可观测性资产 · 用量、成本、调试
└── Integration      集成与凭据资产 · 外部连接
```

### 3.2 Claude Code adapter 资产清单

| 类别 | 资产名 | 位置 | scope | 形态 | 备注 |
|---|---|---|---|---|---|
| **Instruction** | CLAUDE.md | `~/.claude/CLAUDE.md` + 项目根 | global + project | Markdown | 支持 `@path` import |
| | AGENTS.md / .override.md | 项目根 + 任意目录 | project | Markdown | 跨工具共享 |
| | skills/ | `~/.claude/skills/` + `.claude/skills/` | global + project | SKILL.md + 脚本 | YAML frontmatter |
| | agents/ | `~/.claude/agents/` + `.claude/agents/` | global + project | YAML | 子代理定义 |
| | commands/ | `~/.claude/commands/` + `.claude/commands/` | global + project | Markdown | 自定义斜杠命令 |
| | output-modes/ | `~/.claude/output-modes/` | global | Markdown | 响应风格预设 |
| **Capability** | MCP servers | `~/.claude.json` + `.mcp.json` + managed | user / project / enterprise | JSON | 三层合并 |
| | hooks | `settings.json` | global + project | JSON | 8 种事件 |
| | plugins/ | `~/.claude/plugins/` | global | 目录树 | 含 marketplaces |
| | marketplaces | `~/.claude/plugins/marketplaces/` | global | JSON | 插件来源 |
| | statusline | `statusline.sh` + `subagentStatusLine` | global | Shell 脚本 | 两套独立 |
| | permissions | `settings.json` allow/deny | global + project | JSON | **敏感** |
| | env | `settings.json` env + `CLAUDE_CODE_*` | global + project | Key-Value | 环境变量 |
| **State** | sessions | `~/.claude/projects/<encoded>/*.jsonl` | per-project | JSONL | UUID 文件名 |
| | plans | `~/.claude/plans/` | global | Markdown | Plan Mode 产物 |
| | todos / tasks | `~/.claude/todos/` + `tasks/` | per-session | JSON | v2.1.16+ 持久化 |
| | file-history | `~/.claude/file-history/` | per-project | 快照 | `/rewind` 底层 |
| | history.jsonl | `~/.claude/history.jsonl` | global | JSONL | prompt 历史 |
| | shell-snapshots | `~/.claude/shell-snapshots/` | global | Shell dump | 含自定义函数 |
| **Observability** | stats-cache | `~/.claude/stats-cache.json` | global | JSON | 累计 token / 成本 |
| | usage-data | `~/.claude/usage-data/` | global | JSON | 用量明细 |
| | statsig | `~/.claude/statsig/` | global | JSON | 实验功能 flag |
| | debug | `~/.claude/debug/` | per-session | Log | 排错关键 |
| **Integration** | ide locks | `~/.claude/ide/` | global | 锁文件 | VS Code / JetBrains |
| | credentials | `~/.claude.json` + `.credentials.json` | global | OAuth | **红线敏感** |
| | worktree | `.worktreeinclude` | project | 文本 | git worktree |
| | backups | `~/.claude/backups/` | global | 备份 | 自动备份 |

> **范围细节**:本表覆盖 v0.1 必须扫描的目标。`paste-cache/` / `downloads/` / `session-env/` / `context-mode/` 列入扫描器实现但默认 UI 不展示(归入「Ephemeral」桶,仅在高级模式可见)。

### 3.3 跨 Agent 抽象接口(为 v0.3 预留)

每个 Agent 一个 adapter 实现,统一吐出 Berth 内部的 `Asset` 模型。

```typescript
interface AgentAdapter {
  readonly id: 'claude-code' | 'codex' | 'cursor';
  readonly displayName: string;

  // 探测:Agent 是否安装在本机
  detect(): Promise<DetectResult>;

  // 列出该 Agent 的扫描根目录
  scanRoots(): Promise<ScanRoot[]>;

  // 按类别扫描资产
  scanAssets(category: AssetCategory): Promise<Asset[]>;

  // 文件变化监听
  watchAssets(callback: (event: WatchEvent) => void): Disposable;

  // 解析资产间关联关系
  resolveRelations(asset: Asset): Promise<Relation[]>;
}

interface Asset {
  id: string;                // 全局唯一 ID
  agentId: string;           // 来自哪个 Agent
  category: AssetCategory;   // 5 类之一
  type: string;              // 'skill' / 'mcp' / 'hook' / ...
  scope: 'user' | 'project' | 'enterprise' | 'session';
  name: string;
  path: string;              // 原始文件路径
  meta: Record<string, any>; // 类型特定元数据
  raw?: string;              // 原始内容(按需懒加载)
  sensitive?: boolean;       // 是否含敏感信息
}

interface Relation {
  from: Asset['id'];
  to: Asset['id'];
  kind: 'imports' | 'uses' | 'contains' | 'triggered-by' | 'belongs-to';
}
```

---

## 4. 信息架构(IA)

### 4.1 顶层导航(Primary Navigation)

主侧栏采用 **5 大区结构**,而非平铺 25+ 项:

```
┌────────────────────────┐
│  ⚓ Berth              │
│                        │
│  ⌘K  Search            │   ← 全局搜索(顶部)
├────────────────────────┤
│                        │
│  ◆  Overview           │   仪表盘
│                        │
│  AGENTS                │
│    ●  Claude Code      │   ← 当前 Agent(v0.1 唯一)
│                        │
│  ◇  Sessions           │   会话与产物
│                        │
│  CONFIGURATION         │
│    ▸  Instructions     │   指令子模块
│    ▸  Capabilities     │   能力子模块
│                        │
│  📊 Usage              │   用量与成本
│                        │
│  ⚙  Settings           │   Berth 自身设置
│                        │
└────────────────────────┘
```

**设计推理**:
- 直接用 5 类做顶层会让用户接触"指令资产 / 状态资产"等内部术语 → 不友好
- 用户心智更接近"会话 vs 配置 vs 用量"三分法
- Configuration 内部再用"Instructions / Capabilities"两个 tab,符合资产模型的核心二分
- State 类资产高度耦合会话 → 并入 Sessions
- Integration 类资产碎片化 → 分散到 Configuration 子项与 Settings
- Observability 单独成模块,呈现"账单仪表盘"心智

### 4.2 视图分层(View Layering)

Berth 采用四层视图模型:

```
L1  Application Shell           应用外壳
    └─ 左侧栏 + 顶部全局搜索 + 主区域

L2    Module Page               模块页(总览 / 列表 / tab 切换)
      └─ 列表 + 过滤器 + 分组

L3      Detail Page             详情页(单个资产完整信息)
        └─ 元数据 + 关联图 + 引用文件

L4        Inspector             侧滑面板(可选)
          └─ 原始文件 / JSON / diff
```

**层间转换规则**:
- L1 → L2:点击侧栏导航项
- L2 → L3:点击列表行 / 卡片
- L3 → L4:点击"查看原始文件"
- 跨模块跳转:点击任意资产引用 → 进入该资产的 L3

### 4.3 关联关系图(Relationship Graph)

资产之间的核心关联,用于驱动跨视图跳转与关联面板:

```
┌─────────┐
│ Session │──uses──┬──→ MCP server
└─────────┘        ├──→ Skill
     │             ├──→ Subagent
     │             └──→ Hook(triggered)
     │
     belongs-to
     ↓
┌─────────┐
│ Project │──imports──→ CLAUDE.md / AGENTS.md
└─────────┘                    │
                              imports
                               ↓
                          其他 .md 文件
                          (递归 @path)

┌─────────┐         ┌──────────┐
│ Plugin  │contains─┤ Skill    │
│         │contains─┤ Command  │
│         │contains─┤ Subagent │
└─────────┘         └──────────┘

┌─────────┐                ┌──────────┐
│ Hook    │──triggered-by─→│ Event    │
└─────────┘                │ (8 种)   │
                           └──────────┘
```

---

## 5. 界面模块分类

每个模块按统一模板描述:**目的 / 数据源 / L2 视图 / L3 视图 / 关键交互 / 关联**。

### 5.1 Overview 模块

**目的**:用户进入 Berth 后第一眼看到的状态盘,回答"我目前装了什么、最近在做什么"。

**数据源**:全部 adapter 的聚合统计 + 最近 7 天会话流。

**L2 视图**:仪表盘式单页,无 L3。

```
┌─────────────────────────────────────────────────────────┐
│ Overview                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 12       │ │ 8        │ │ 23       │ │ 4        │    │
│  │ Skills   │ │ MCP      │ │ Sessions │ │ Plugins  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                         │
│  Recent Sessions                                        │
│  ─────────────                                          │
│  • feat: refactor auth flow            2h ago           │
│  • debug: payment hook timing          yesterday        │
│  • spike: try claude-flow plugin       2 days ago       │
│                                                         │
│  Cost (last 7 days)        Rate limits                  │
│  ────────────────          ───────────                  │
│  $12.45 / 142k tokens      5h: 67% remaining            │
│  ▁▃▅▇▇▅▃ (per day)         7d: 23% remaining            │
│                                                         │
│  Health checks                                          │
│  ─────────                                              │
│  ⚠ 2 MCP servers failed to connect last session         │
│  ⚠ 1 skill has unresolved @path import                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**关键交互**:
- 卡片点击 → 跳转对应模块
- Health check 点击 → 跳转问题资产 L3
- 时间筛选(7d / 30d / all)

**关联**:所有模块的入口聚合。

### 5.2 Sessions 模块

**目的**:浏览本机所有 Claude Code 会话,定位"那个我上周做过的项目"。

**数据源**:`~/.claude/projects/<encoded>/*.jsonl` + 关联 todos / plans / file-history。

**L2 视图**:列表 + 时间轴 + 项目分组。

```
┌─────────────────────────────────────────────────────────┐
│ Sessions                              [Group: project ▾]│
├─────────────────────────────────────────────────────────┤
│  🔍 Filter sessions...           [Last 30 days ▾]       │
│                                                         │
│ ▸ shopee/driver-fe          (12 sessions)               │
│ ▾ caldis/mos                (5 sessions)                │
│     ◇ feat: TCC permission rewrite     2h · 8 tools     │
│     ◇ docs: changelog cleanup          yesterday · 3    │
│     ◇ spike: isometric icon ideation   3 days ago       │
│ ▸ anthropic-skills/         (3 sessions)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**L3 视图**:单个会话详情(**不展示对话内容**)。

```
┌─────────────────────────────────────────────────────────┐
│ ← Sessions / Session #a3f9b2                            │
├─────────────────────────────────────────────────────────┤
│  Title:     feat: TCC permission rewrite                │
│  Project:   caldis/mos                                  │
│  Started:   2026-05-28 14:32                            │
│  Duration:  1h 47m                                      │
│  Cost:      $0.83 · 12.4k tokens                        │
│  Model:     claude-opus-4-7                             │
│                                                         │
│  ── Loaded assets ─────────────────                     │
│  Skills used (4)                                        │
│    • macos-tcc-helper                                   │
│    • swift-codegen                                      │
│    • git-flow                                           │
│    • commit-message                                     │
│                                                         │
│  MCP servers connected (3)                              │
│    • github      [user scope]                           │
│    • linear      [project scope]    ⚠ auth failed       │
│    • playwright  [project scope]                        │
│                                                         │
│  Hooks fired (8)                                        │
│    PreToolUse × 3 · PostToolUse × 5                     │
│                                                         │
│  ── Artifacts ─────────────────                         │
│  • 2 plans                                              │
│  • 3 todos (1 remaining)                                │
│  • 14 file-history checkpoints                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**关键交互**:
- 任意 Loaded asset 点击 → 跳转对应 L3
- Artifacts 区域可展开(plans / todos / checkpoints)
- "查看原始 transcript" → L4 Inspector(警告:可能很大)

**关联**:Session 是关联的中枢节点。

### 5.3 Configuration › Instructions 模块

**目的**:盘点所有「塑造 Agent 行为的指令文本」。

**数据源**:CLAUDE.md / AGENTS.md / skills / agents / commands / output-modes / teams。

**L2 视图**:tab 切换 + 列表。

```
┌─────────────────────────────────────────────────────────┐
│ Configuration › Instructions                            │
├─────────────────────────────────────────────────────────┤
│  [ Memories ] [ Skills ] [ Subagents ] [ Commands ]     │
│  [ Output Modes ]                                       │
│                                                         │
│  🔍 Search instructions...     [Scope: all ▾]           │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ macos-tcc-helper                  global       │     │
│  │ Validate macOS accessibility permissions       │     │
│  │ Auto-invoke · 8 tools · 234 lines              │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ swift-codegen                     project      │     │
│  │ Generate Swift boilerplate for AppKit views    │     │
│  │ Manual invoke · 3 tools · 89 lines             │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**L3 视图**(以 Skill 为例):

```
┌─────────────────────────────────────────────────────────┐
│ ← Skills / macos-tcc-helper                             │
├─────────────────────────────────────────────────────────┤
│  Scope:        global (~/.claude/skills/)               │
│  Path:         ~/.claude/skills/macos-tcc-helper/       │
│  Trigger:      auto (matches macOS permission queries)  │
│  Tools:        Bash, Read, Edit, ...                    │
│  Model:        inherit                                  │
│                                                         │
│  ── Description ─────────                               │
│  Validate macOS accessibility permissions for the      │
│  current process and surface fixes.                    │
│                                                         │
│  ── Files ─────────                                     │
│  • SKILL.md           5.2 KB                            │
│  • scripts/check.sh   1.4 KB                            │
│  • scripts/grant.sh   0.8 KB                            │
│                                                         │
│  ── Used in sessions (last 30d) ─────────               │
│  • feat: TCC permission rewrite        2h ago           │
│  • bugfix: TCC dialog dismissal        3 days ago       │
│  • spike: alternative entitlement approach  1 week      │
│                                                         │
│  [ View SKILL.md ]  [ Show in Finder ]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**关键交互**:
- "View SKILL.md" → L4 Inspector
- "Show in Finder" → 调用 OS,定位到 Finder
- Sessions 列表点击 → Session L3

**关联**:被 Session 引用、引用其他 Skill / Memory(via `@path`)。

### 5.4 Configuration › Capabilities 模块

**目的**:盘点所有「让 Agent 能做某事」的能力配置。

**数据源**:MCP / hooks / plugins / statusline / permissions / env / marketplaces。

**L2 视图**:tab 切换。

```
┌─────────────────────────────────────────────────────────┐
│ Configuration › Capabilities                            │
├─────────────────────────────────────────────────────────┤
│  [ MCP ] [ Hooks ] [ Plugins ] [ Status Line ]          │
│  [ Permissions ⚠ ] [ Env ]                              │
└─────────────────────────────────────────────────────────┘
```

#### 5.4.1 MCP 子视图(重点)

**特点**:必须**合并显示 user / project / enterprise 三层 scope**,并标注来源(类似 `git config --show-origin`)。

```
┌─────────────────────────────────────────────────────────┐
│ Capabilities › MCP                  [Scope: merged ▾]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Effective configuration (merged from 3 sources)        │
│                                                         │
│  ✓ github                            [user]             │
│  ✓ linear                            [project]  ⚠ auth  │
│  ✓ playwright                        [project]          │
│  ✓ sentry                            [user]             │
│  ✓ obsidian        [enterprise → overridden by user]    │
│  ✓ filesystem                        [user]             │
│                                                         │
│  ── By scope ─────────                                  │
│  User scope (~/.claude.json):           4 servers       │
│  Project scope (.mcp.json):             2 servers       │
│  Enterprise scope (managed):            3 servers       │
│  Merge conflicts:                       1 (obsidian)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 5.4.2 Hooks 子视图

按 **8 种事件**分组,而非按文件分组:

```
┌─────────────────────────────────────────────────────────┐
│ Capabilities › Hooks                                    │
├─────────────────────────────────────────────────────────┤
│  PreToolUse           3 hooks                           │
│  PostToolUse          2 hooks                           │
│  UserPromptSubmit     1 hook                            │
│  Stop                 0 hooks                           │
│  SubagentStop         0 hooks                           │
│  Notification         1 hook                            │
│  PreCompact           0 hooks                           │
│  SessionStart         2 hooks                           │
└─────────────────────────────────────────────────────────┘
```

#### 5.4.3 Permissions 子视图(敏感)

显示 allow/deny 列表 + 警告 `bypassPermissions: true` 等危险设置。

```
⚠ Warning: bypassPermissions is enabled in project scope.
   This skips ALL permission prompts including writes to .git.
```

### 5.5 Usage 模块

**目的**:呈现「账单仪表盘」。

**数据源**:stats-cache.json / usage-data/ / statsig/ / rate_limits(从最近会话提取)。

**L2 视图**:

```
┌─────────────────────────────────────────────────────────┐
│ Usage                                  [30 days ▾]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Total spent             Tokens used                    │
│  $48.23                  524,800                        │
│                                                         │
│  ┌─ daily cost ─────────────────────────────────┐       │
│  │     ▆                                        │       │
│  │  ▃  █     ▅           ▃     ▆               │       │
│  │ ▁██▂█▂▁▃▁▂█▂▃▁▂▁▂▁▃▂▁▂█▂▁▁▁▂█▂▁▁            │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│  By model              By project                       │
│  ──────────            ──────────                       │
│  Opus 4.7   62%        driver-fe   41%                  │
│  Opus 4.6   24%        mos         28%                  │
│  Sonnet 4.6 11%        skills      18%                  │
│  Haiku 4.5  3%         others      13%                  │
│                                                         │
│  Rate limits (current)                                  │
│  ─────────────────                                      │
│  5-hour window:  67% remaining (resets in 2h 14m)       │
│  7-day window:   23% remaining (resets in 4 days)       │
│                                                         │
│  ── Experimental flags (statsig) ─────                  │
│  • CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS  enabled        │
│  • CLAUDE_STREAM_IDLE_TIMEOUT_MS          set: 10000    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**关键交互**:
- 时间维度切换
- 按模型 / 项目 / Agent(后续)分组

### 5.6 Settings 模块

**目的**:Berth 自身的配置。

**内容**:
- 扫描目录配置(允许添加额外路径)
- 文件监听开关
- 高级模式(展示 ephemeral / debug / cache 等默认隐藏资产)
- 主题(light / dark / system)
- 关于 / 版本

### 5.7 全局组件

| 组件 | 出现位置 | 行为 |
|---|---|---|
| **Global search** | 顶部 ⌘K | 跨所有资产的关键词搜索 |
| **Asset card** | L2 列表 | 统一卡片:icon + name + scope + meta |
| **Scope badge** | 各处 | `user` / `project` / `enterprise` 色彩区分 |
| **Sensitive badge** | 敏感资产 | 红色徽章 + 隐藏内容 |
| **Inspector drawer** | L4 | 侧滑显示原始文件 |
| **Show in Finder** | L3 | 调用 OS 文件管理器 |
| **Breadcrumb** | L3 | 层级回退导航 |

---

## 6. 关键交互流程

### 6.1 用户故事 1:排查"为什么这个 skill 没生效"

```
1. Sessions → 选中目标 session L3
2. 检查 "Skills used" 列表 → 发现 skill 不在
3. 点击 "Show all available skills at session time"
4. 看到该 skill 实际在 user scope,但被项目 .claude/skills/ 的同名 skill 覆盖
5. 跳转 Skill L3,看到 "Shadowed by: <project skill>"
```

### 6.2 用户故事 2:盘点"我都装了什么 MCP"

```
1. Overview → 看到 "8 MCP" 卡片
2. 点击 → Capabilities › MCP
3. 看到 merged 视图,4 来自 user / 2 来自 project / 3 来自 enterprise
4. 发现 obsidian 有 scope override 警告
5. 点击展开,看到 user scope 覆盖了 enterprise scope 的 obsidian
```

### 6.3 用户故事 3:确认"我这周花了多少钱"

```
1. 侧栏点击 Usage
2. 看到本周累计 + 日柱状图 + 按模型分布
3. 切换到 30 天,看到趋势
```

---

## 7. 设计原则

| # | 原则 | 含义 |
|---|---|---|
| 1 | **Visibility first, control later** | v0.1 只读,不冒险开放编辑 |
| 2 | **Don't show everything** | ephemeral / debug 默认隐藏 |
| 3 | **Credentials are radioactive** | 显示登录态即可,绝不展示 token |
| 4 | **Merge scopes, show origins** | 多层 scope 必须合并显示并标注来源 |
| 5 | **Relationships > Lists** | 资产之间关联性比单独列表更有价值 |

---

## 8. 技术架构概要

### 8.1 总体架构

```
┌─────────────────────────────────────────┐
│ Renderer (React + TypeScript)           │
│  • UI components / view layer           │
│  • State (Zustand / SWR)                │
└──────────┬──────────────────────────────┘
           │ IPC
┌──────────┴──────────────────────────────┐
│ Main (Electron Node.js)                 │
│  ┌─────────────────────────────────┐    │
│  │ Adapter Registry                │    │
│  │  ├─ ClaudeCodeAdapter (v0.1)    │    │
│  │  ├─ CodexAdapter (v0.3)         │    │
│  │  └─ CursorAdapter (v0.3)        │    │
│  └─────────┬───────────────────────┘    │
│  ┌─────────┴───────────────────────┐    │
│  │ Asset Engine                    │    │
│  │  • scan / parse / cache         │    │
│  │  • watch (chokidar)             │    │
│  │  • relation resolver            │    │
│  │  • search index (MiniSearch)    │    │
│  └─────────┬───────────────────────┘    │
│  ┌─────────┴───────────────────────┐    │
│  │ Storage                         │    │
│  │  • SQLite (asset index)         │    │
│  │  • LRU cache (parsed files)     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
            │
            ↓ read-only fs access
┌─────────────────────────────────────────┐
│ Local file system                       │
│  ~/.claude/ · project .claude/ · etc.   │
└─────────────────────────────────────────┘
```

### 8.2 关键技术决策(草案)

| 项 | 选型(草) | 理由 |
|---|---|---|
| Electron 框架 | Electron Forge | 主流,工具链成熟 |
| 前端 | React + TypeScript | 团队熟悉 |
| 状态管理 | Zustand + SWR | 轻量,适合资产 fetch |
| UI 库 | shadcn/ui + Tailwind | 现代,与 Berth 调性匹配 |
| 文件监听 | chokidar | Node 标准 |
| YAML 解析 | js-yaml | 标准 |
| 搜索 | MiniSearch | 全文索引,纯前端 |
| 本地存储 | better-sqlite3 | 资产 index 缓存 |
| 路径展开 | os.homedir() + glob | 跨平台 |

### 8.3 扫描器实现要点

- **冷启动**:首次启动全量扫描,显示进度条
- **热更新**:chokidar 监听变化,增量更新
- **懒加载**:`raw` 字段只在 L3 / L4 打开时才读
- **解析隔离**:每种资产类型独立 parser,失败不影响其他资产
- **错误可见**:解析失败的资产显示为"损坏",而非隐藏

### 8.4 安全约束

| # | 约束 |
|---|---|
| 1 | **只读模式**:v0.1 不对本地文件做任何写入 |
| 2 | **凭据隔离**:`.credentials.json` / OAuth token 字段永不进入渲染进程 |
| 3 | **路径白名单**:扫描器仅访问预定义路径,不接受任意用户输入路径(Settings 自定义路径除外) |
| 4 | **沙盒**:遵循 Electron 安全最佳实践(contextIsolation / nodeIntegration: false) |
| 5 | **遥测**:v0.1 不发送任何遥测数据 |

---

## 9. 风险与约束

| 风险 | 描述 | 缓解 |
|---|---|---|
| **Anthropic 下场** | Anthropic 自己出 GUI 抹平本品 | 押注他们做 cloud dashboard 不做 local;同时尽快扩展到 Codex / Cursor |
| **Schema 变动** | `~/.claude` 结构无官方文档,版本更新可能变 | parser 容错;关注 changelog;社区跟进 |
| **凭据泄漏** | 误展示 token / OAuth | 红线:`sensitive: true` 字段永不到渲染进程 |
| **性能** | 用户有 100+ sessions / 数百 skills | 增量扫描 + SQLite 索引 + 懒加载 raw |
| **隐私担忧** | 用户对本地工具读取所有会话不放心 | 完全本地 / 开源 / 无遥测 / 显式扫描路径列表 |
| **命名冲突** | Berth 商标 / 域名抢注 | 立即注册 berth.app + GitHub org(详见命名报告) |

---

## 10. v0.1 完成标准(Definition of Done)

### 10.1 功能验收

- [ ] 扫描 `~/.claude/` 与项目 `.claude/` 的全部资产类别(3.2 表中所有行)
- [ ] 5 个主模块(Overview / Sessions / Configuration / Usage / Settings)可用
- [ ] 三层视图(L1 / L2 / L3)在所有模块齐全;L4 Inspector 至少支持文本类资产
- [ ] MCP / hooks / settings 实现 scope 合并显示与来源标注
- [ ] CLAUDE.md / AGENTS.md 的 `@path` import 链能正确解析并跳转
- [ ] 全局搜索覆盖所有资产的 name + meta(不含 raw 内容)
- [ ] fs.watch 在资产变化后 1 秒内刷新 UI
- [ ] 凭据字段不出现在 UI 任何位置(自动化测试覆盖)

### 10.2 非功能验收

- [ ] 冷启动扫描 < 5s(用户机器上有 50 sessions / 30 skills 的情况)
- [ ] 内存占用 < 300MB(idle 状态)
- [ ] 支持 macOS;Windows / Linux 至少可启动(完整支持留 v0.2)
- [ ] Dark mode 完整支持
- [ ] 无任何写入操作的运行时检测(单元测试)

### 10.3 文档验收

- [ ] README 含 5 分钟上手
- [ ] 资产模型与 adapter 接口文档化
- [ ] 已知限制列表

---

## 附录 A · 用户旅程示意

```
用户首次启动
    ↓
检测 ~/.claude 是否存在
    ↓
[是] → 全量扫描 → Overview
[否] → 引导页:看起来你还没装 Claude Code,这里有安装指引
                          ↓
                     [等用户安装]
                          ↓
                     重新扫描
```

## 附录 B · 术语表

| 术语 | 含义 |
|---|---|
| Asset | Berth 中对所有本地资产的统一抽象 |
| Adapter | 某个具体 Agent(Claude Code / Codex / Cursor)的扫描器实现 |
| Scope | 资产作用域:user / project / enterprise / session |
| Effective config | 多 scope 合并后的最终生效配置 |
| Shadowed | 某 scope 的资产被更高优先级 scope 同名资产覆盖 |
| Ephemeral | 临时性资产(cache / debug),默认隐藏 |
| Sensitive | 敏感资产(credentials),仅显示存在与登录态 |

## 附录 C · 命名与品牌

详见《Berth 命名与竞品分析报告》。关键点:

- 主名:**Berth**(中文:泊位 / 泊)
- 音节:1 音节 / `/bɜːrθ/`
- 域名:berth.app / berth.dev / getberth.com
- npm scope:`@berth`
- GitHub org:`berth`
- Logo 方向:码头桩俯视图,海军蓝 + 暖橙
- 子产品命名延展:Berth Console / Berth Atlas / Berth Skills

---

**END OF DOCUMENT**
