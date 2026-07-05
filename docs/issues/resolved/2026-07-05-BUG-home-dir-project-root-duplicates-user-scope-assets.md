# 描述
- 当某个"项目"的根目录恰好是用户 home 目录时 (用户曾在 `~` 下直接跑过 Claude Code, 产生 session 记录), 后台索引把 `~` 当作项目候选深扫, 项目级设置路径 `<projectRoot>/.claude/settings.json` 与用户级设置 `~/.claude/settings.json` 解析为**同一个文件**, 同一份配置被建档两次 (scope=user + scope=project)。
- 状态栏页因此显示两条 Status Line, 且 UI 的 scope 优先级排序 (project > user) 推导出"用户级被 project 级覆盖"警告 — 实为同一文件自己覆盖自己, 语义无意义。

# 重现步骤
- 在 home 目录 (`C:\Users\<name>` / `~`) 下直接运行过一次 `claude`, 使 `~/.claude/projects/` 留下以 home 为 cwd 的 session (项目候选来源: `project-scope.ts` `projectScopeCandidatesFromAssets` 从 session 资产提取项目路径)。
- `~/.claude/settings.json` 配置任意 `statusLine`。
- 打开 Berth 状态栏页, 作用域选"全部"。

# 预期结果
- 只出现一条用户级 Status Line 资产; 不产生"被覆盖"警告。

# 实际结果
- 出现两条 Status Line, 路径同为 `~/.claude/settings.json`, 一条"用户级/被覆盖", 一条"项目级/生效"。
- 快照库证据 (2026-07-05, 本机): `statusline-user-c4fe69dfb6699153` 与 `statusline-project-c4fe69dfb6699153` 同 path 同 command。
- 已配置资产数/警告数等统计随之虚增 (截图见 2 已配置 / 2 警告, 实际仅 1 份配置)。

# 根因 (2026-07-05 证据快照)
- 候选枚举: 任何有 session 的目录都是项目候选, home 也不例外 (`~/.claude.json` projects 表含 `C:\Users\mail`)。
- 深扫时 `resolveProjectConfigRoots(home)` 向上找不到 `.git`, 返回 `[home]` 自身作项目根 (`project-config-roots.ts`)。
- claude-code scanner 对每个项目根扫 `<root>/.claude/settings.json` 为 scope=project (`adapters/claude-code/scanner.ts` settingsSources 循环), 与 user 源 `ctx.claudeDir/settings.json` 是同一路径; 资产 id 含 scope, 去重不掉。
- 受影响面不止 statusline: 同循环里的 hooks / permissions / env 同样会被双份建档。

# 解决方案 (已完成 2026-07-05)
采用中心修法「home 目录永远不是项目配置根」, 一处规则覆盖 7 个 adapter 前台扫描 + 后台深扫/浅扫 + watcher/增量派生, 而非逐 adapter 打补丁:
- `project-config-roots.ts`: `resolveProjectConfigRoots` 过滤 home (含 dotfiles `.git` 在 home 的情形); 测试注入 `opts.homeDir`。
- `engine/scanner.ts` appendShallowConventions + `engine/assets/background-index-queue.ts` sync: 候选解析不出配置根时跳过, 移除 `?? candidate.path` 兜底 (否则 home 从兜底路径回流)。
- `engine/assets/runtime.ts` graftDeepRows: 不再嫁接已失效根的 deep 行 — 这是修复前已持久化的 home 脏行的退休路径 (下次全量扫描落盘即清)。
- 验证: 单测 3 处新增 (roots/queue/graft) + 全量门禁绿 + CLI 对本机真实数据全量扫描, statusline 由 2 条降为 1 条 (user), home 点目录下项目级资产 42 → 0。
- 有意保留的边界: home 根级文件 (`~/CLAUDE.md`, `~/.mcp.json`, `~/.claude/settings.local.json`) 随 home 不再作为项目而失去项目级建档 — 属退化"项目"的一部分, 如有真实诉求再按 user 级来源单独收编。
