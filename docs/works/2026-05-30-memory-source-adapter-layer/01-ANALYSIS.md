# 01-ANALYSIS — 探索结论

## 根因 (已在代码确认)

berth "记忆"面板恒空, 双重原因:

1. **tab 名实不符**: `src/renderer/src/pages/instructions.tsx` 的 `tabTypeMap.memories` 映射到
   `['claude-md','agents-md']`——它展示的是 CLAUDE.md/AGENTS.md 指令文件, 不是记忆笔记。
2. **无记忆数据源**: Claude Code 适配器 `src/main/adapters/claude-code/scanner.ts` 的
   `scanInstructions()` 只扫 CLAUDE.md/AGENTS.md/skills/agents/commands/…, **从不读**
   `~/.claude/projects/*/memory/MEMORY.md`; 也没有任何代码读 united-memory。
3. **现实叠加**: 本机原生 `~/.claude/projects/*/memory/` 为空 (united-memory 接管了, 数据在
   `~/.united-memory/mem/*.md`)。所以即便加"读原生记忆", 本机仍空——真数据在 united-memory。

## 当前数据流 (记忆/资产)

```
disk (~/.claude/**)
  → ClaudeCodeAdapter.scanAssets() / scanAll()      src/main/adapters/claude-code/{index,scanner,parsers}.ts
  → AssetScanner (聚合多 adapter, 缓存 assetMap)      src/main/engine/scanner.ts
  → ipcMain.handle('assets:scan-all')               src/main/ipc/handlers.ts
  → preload window.api.assets.scanAll()             src/preload/index.ts
  → useAssets() hook                                 src/renderer/src/hooks/use-ipc.ts
  → Zustand store.assets                             src/renderer/src/stores/app.ts
  → instructions.tsx (按 tab 过滤渲染)               src/renderer/src/pages/instructions.tsx
```

## 关键架构判断: 两条正交的轴

- 现有 `AgentAdapter` (`src/shared/types/asset.ts`) 切分的是 **"哪个 agent"** (claude-code / codex)。
- 用户要的"原生 mem / united mem / 未来其他"切分的是 **"哪个记忆后端"**。
- 二者**正交**。把记忆后端硬塞进 `AgentAdapter` 会污染语义。
  → **新增独立的 `MemorySource` 抽象** 是正确落点。

## 两个源的数据格式 (探索实测)

### A. 原生 Claude Code 记忆
- 位置: `~/.claude/projects/<project-slug>/memory/MEMORY.md` (索引) + 同目录单文件笔记。
- 笔记格式: frontmatter (`name` / `description` / `metadata.type ∈ user|feedback|project|reference`) + 正文,
  正文用 `[[name]]` 互链。`MEMORY.md` 为一行一条的索引 (`- [Title](file.md) — hook`)。
- 本机现状: 空目录, 无 MEMORY.md。

### B. united-memory (用户自建, `~/.united-memory/`)
- 索引: `index.json` → `entries[]`: `{id,file,title,tags[],links[],importance,summary,created,updated}`,
  `importance ∈ core|active|archive`。
- 笔记: `mem/<id>.md` → frontmatter (`id,title,tags,links,importance,created,updated`) + 正文 (含 `## TL;DR`)。
- 读取策略: 列表读 `index.json` (省 I/O); 详情按需读 `mem/<id>.md`。
- 数据完整性坑 (探索发现, 属 united-memory 仓库非 berth): `mem/` 有 8 个畸形文件名
  (`*.md.md`、尾部多点); 应按 `index.json` 为准过滤, 不要裸 `glob('*.md')`。

## 插入点 (文件级)

| 改动 | 文件 | 性质 |
|---|---|---|
| 记忆模型 (MemoryNote + source 标记) | `src/shared/types/` 新增或扩 asset.ts | 共享类型 (并行热点⚠) |
| MemorySource 接口 + 2 实现 + 注册聚合 | **新建** `src/main/memory/` (新目录) | 新文件 (无碰撞) |
| IPC: `memory:list` / `memory:get` | `src/main/ipc/handlers.ts` + `src/shared/types/ipc.ts` + `src/preload/index.ts(.d.ts)` | 共享热点⚠ |
| 渲染: 记忆 tab → 真记忆视图 + 来源标签/过滤 | `src/renderer/src/pages/instructions.tsx` + 新组件 | 部分热点 |
| i18n | `src/renderer/src/i18n/locales/{en,zh}.json` | 共享热点⚠ |

## 约束与风险

- **只读**: 全部 source 仅读取; 不 watch 写; 沿用路径白名单。
- **并发热点 (关键风险)**: `git status` 显示并行 session 在 asset.ts / ipc.ts / handlers.ts /
  preload / i18n / claude-code/index.ts 有**未提交改动**, 且项目**不用 worktree** (共享工作树)。
  我的特性需要碰这些文件 → 风险: (a) 同文件并发编辑语义冲突; (b) 文件级 `git add` 会把别人的
  WIP 一起暂存, 违反不变量 11。
  → **缓解**: 逻辑尽量落新文件 (`src/main/memory/`); 对共享文件只做最小外科插入; 共享文件的提交
  等其 WIP 干净时再做, 或用 patch 级暂存; 每次提交前 `git diff --cached` 核对只含本任务文件。
- **路径探测**: united-memory 默认 `~/.united-memory`, 探测 `index.json` 存在性; 缺失则该源静默不出现。
- **可测试**: source 解析为纯函数, fixture 驱动单测 (各源样本 → MemoryNote)。

## 待 SPEC 决策的问题

1. 记忆模型: 复用 `Asset` (加 `type:'memory'` + meta) 还是**独立 `MemoryNote` 模型 + 新 IPC 通道**?
   倾向**独立模型 + `memory:*` IPC** (聚合/来源标签/详情语义更干净, 不污染 25+ 类的 Asset 体系)。
2. 聚合点: 并入 `AssetScanner` (作伪 adapter) 还是**独立 `MemoryService`**? 倾向独立 service。
3. 记忆 tab 改造幅度: 最小=换数据源 + 加来源 badge/过滤; CLAUDE.md/AGENTS.md 移到哪个 tab 由 design 定。

## 过程摩擦 (待沉淀 friction)

初次把"[指令]下面的[记忆]为空"误判为 Claude Code 本体的记忆配置, 查了半天 CC/united-memory 内部,
实际指的是 **berth 产品自身 UI 的面板**。教训: 当项目本身就是"工具/看板"类产品时, 用户说的
"[X]/[Y] 面板"默认先指**产品 UI**, 不是 harness/CC 本体; 先在产品代码定位, 再外扩。
→ 拟落 `docs/friction/20260530-explore-product-ui-vs-host-tool-misattribution.md`。
