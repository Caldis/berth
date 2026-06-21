# LANGUAGE
- 必须使用中文进行回答

# WEB_INFO_SEARCH
- 始终使用英文检索内容

# VERSION_MANAGEMENT
- 不使用 worktree, 只在主分支工作
- 始终有其他 AI Agent 和你同时在修改主分支工作区, 因此你需要妥善处理冲突, 以及谨慎提交代码, 避免改动到其他不相关文件

# COMMIT_POLICY
- **最高优先级: 已验证、边界清楚的增量必须小步频繁提交。** 任何 feature / bug / harness 任务中, 完成一个可独立验证的子步骤并通过对应检查后, 立即只暂存自己相关文件、用 `git diff --cached` 核对 staged 集合、提交一次。
- 不允许把多个已完成阶段长时间堆在工作区最后一次性提交。若因为风险或依赖关系不能提交, 必须在当轮说明阻塞原因。
- archive / 收尾提交不能替代 implementation 过程中的小步提交。
- 同提交内"改文件内容 + `git mv` 该文件"时, `git mv` 只暂存重命名 (旧 blob→新路径), 不携带未暂存的内容改动: 必须 `git mv` 后再 `git add <新路径>` (或 mv 前先 add 旧路径); 提交前 `git diff --cached --stat` 见 R100/0-insertions 对"应有改动的移动"即内容丢失信号, 补暂存。见 `docs/friction/_archive/20260620-5.2-issues-git-mv-with-unstaged-edits-drops-content.md`。

# RELEASE
- "发版" 完成的唯一定义 = GitHub Release 页面出现目标版本 (含全平台 assets + `latest*.yml`)。改 `package.json` version + commit **不是发版**, 不触发任何发布。
- 唯一发布触发: 推 `vX.Y.Z` annotated tag (匹配既有 tag 风格) → `release.yml` (`on: push tags 'v*'`) 跑多平台构建 + mac 公证 + 建 release。tag 必须指向 package.json version 与之相等的 commit; 未发布过的中间 patch 可跳过 (changelog 取 上一 tag..当前 tag, 不丢 commit)。
- 宣称发版完成前必须 `gh release view vX.Y.Z` 回读到目标版本; 只看到 tag 已推 / run 已触发不算完成。细节见 `docs/friction/_archive/20260619-5.0-archive-release-needs-tag-push-not-just-version-bump.md`。

# DOCS
存放冷文档目录; harness 操作态例外为 `docs/works/`、`docs/friction/`、`docs/issues/`

# ISSUES
产品 bug、功能与改进项统一存放在 `docs/issues/`

# TEST
必须满足可测试性

# BUILD_ENV
本地构建/运行的非显然约束 (从代码无法直接得出, 交接与起步必读):
- **必须 pnpm 9.x**。corepack 默认拉 pnpm 11, 会无视 `package.json` 的 `pnpm.onlyBuiltDependencies`, 跳过 better-sqlite3/electron/esbuild 构建脚本 (原生模块不编译、Electron 二进制不下载), 且生成无效 `pnpm-workspace.yaml` 导致所有 pnpm 命令报 `packages field missing`。起步先 `corepack prepare pnpm@9.15.4 --activate`; 已在 package.json 钉 `packageManager`。
- **node 经 nvm** `~/.nvm/versions/node/v24.3.0/bin` (非交互 shell 默认无 pnpm, 需 prepend PATH)。
- **dev 端口**: 5173 常被同机另一项目占用, electron-vite 自动跳 5174+。
- **单实例**: 应用已加 `requestSingleInstanceLock` (src/main/index.ts), 重复 `pnpm dev` 不会多开窗口; 第二个实例自杀并聚焦已有窗口。
- **UI 视觉验收截图**: 必须用 electron 主进程**实测窗口坐标**裁剪 (osascript 取 `{position, size}` of front window → 按显示器缩放比换算物理像素裁剪); 不可猜坐标。进程检测见 `.agents/workflow/4.0-verify.md` (完整 .pnpm 路径模式 + 排除 helper)。
- **加依赖 postinstall 报 `.pnpm/node_modules/...` ENOENT**: 不要逐包打地鼠, 直接全量扫清 `node_modules/.pnpm/node_modules` 下 LinkType 存在但 Target 不存在的断链 junction (历史删依赖/跨版本 pnpm 残留, 仅 install-app-deps 遍历触发, 日常 test/build 不受影响)。见 `docs/friction/_archive/20260612-3.0-implement-pnpm-store-dangling-junctions.md`。

# EVOLUATION
当用户对先前的任务或指令进行纠正或指示时, 你需要在验证其有效性后将其写入 `docs/issues/`
- 在 harness 工作流 (harness-*) 任务过程中, 用户给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction (docs/friction/), 并在当轮改进规则, 无需用户提示 "记下来"。详见 `.agents/workflow/_shared.md` 不变量 6。
- **friction 沉淀是 Agent 自主职责, 不是需审批的动作**: 识别到可复用工程摩擦后, 直接检查 `docs/friction/` 是否已有相关记录 — 有则合并、无则新建, 记录后过 `pnpm harness:check` 并在当轮事后向用户汇报即可。**严禁回头征求"是否要记录 friction"的同意** — 征求同意本身即一种元摩擦, 违背 "无需用户提示" 的既定规则。
- **记录 ≠ 折成常驻规则** (2026-06 复盘): friction 永远记 (docs/friction/, 可搜索), 但**只把高复发/高影响**的折进常驻 playbook (`_shared.md` 不变量 / `4.0-verify.md` 等); 一次性、低复发的留在 `docs/friction/_archive/` 即可, **不进常驻规则** —— 规则越堆越长则无人逐条读, 反成噪音。folding 前自问: 这条会在未来多类任务反复踩到吗? 否则只归档。
- 判定归属: 针对当前任务执行过程的反馈 → friction; 针对产品功能/缺陷的反馈 → `docs/issues/`。
- 执行当前任务时发现已验证但不属于当前主线验收范围的产品 bug、功能缺口或改进项, 主动记录到 `docs/issues/`, 当前任务只做交叉引用; 不顺手修旁支问题, 除非用户明确扩大任务范围。
- 沉淀产物本身 (friction / works / issues / 文档) 必须先过 `pnpm harness:check` (命名/阶段/结构合规) 才能提交; 不可未验证就 commit。沉淀指令的完备性 = 主动记录 + 产物过闸门。(提交纪律本身见 `# COMMIT_POLICY`, 不在此复述。)

# Behavioral guidelines
减少常见 LLM 编码失误 (trivial 任务用判断力):
- **想清再写**: 显式陈述假设, 不清楚就停下问; 多解 present 不暗选; 有更简方案就说并据理 push back。
- **最简优先**: 解决问题的最小代码, 不投机 — 无单用抽象 / 未要求的灵活性 / 不可能分支的错误处理; 200 行能 50 行解决就重写 (senior 会不会嫌它过度复杂?)。
- **手术式改动**: 只碰必须碰的, 不顺手"改进"无关代码/格式/注释, 不重构没坏的, 匹配既有风格; 只删自己改动产生的孤儿 import/变量, 既有死代码只提不删。每行改动可溯源到需求。
- **目标驱动**: 把任务转成可验证目标 (改 bug → 先写复现测试再修); 多步任务先列简短 step→verify 计划; 强验收标准支撑自主 loop。

# AI NATIVE WORKFLOW HARNESS
Agent 工作流体系, 单一真源在 `.agents/`, 同时服务 Claude Code 与 Codex。
- 总览与调用: `.agents/README.md`
- 流程 playbook: `.agents/workflow/` (Explore → Design → Implementation → Verify)
- 工具索引: `.agents/tools.md`; 项目地图: `docs/ARCHITECTURE.md`
- 任务态 (操作目录, 非冷文档): `docs/works/{date}-gh-{number}-{summary}/`
- 工程摩擦: `docs/friction/{yyyymmdd}-{action-id}-{summary}.md`
- 产品问题: `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`
- 自检/分发: `pnpm harness:check` / `pnpm harness:sync` (CI 强制)

## 何时进入 (强制)
- **默认轻量** (2026-06 复盘校准): 多数 feature / bug 直接 explore-in-context → 小步提交 + 门禁 (typecheck/lint/test/可测试性) → issue 交叉引用即可, **不强制建 task-state**。完整 task-state (`harness-0.0-new` + works 目录 + INDEX + debt/Project 追踪) 只为**真正的大件**保留: 跨会话/跨设备协作、跨进程或全局 blast radius、高风险需 design checkpoint。大件落代码前先 `harness-0.0-new` 按 explore→design→implement→verify 推进; 体量/风险小的走轻量, 边界存疑偏大则按 task-state。
- 小改动豁免: 单行/拼写/纯文案注释, 或满足"单一文件·单一关注点·标准门禁 (typecheck/lint/test) 即可验收·无需跨文件根因分析或人工意图澄清"的小改动 (如数值调整、局部 UI 微调、弃用 API 替换、局部重构), 可直接处理 + 跑门禁 (含可测试性), 不建任务态。若用户已明确给出目的、范围或具体参数, 或明确要求"不走 harness / 直接调整", Agent 直接声明按小改动处理并执行, 不再二次询问。若是 Agent 自行判断小改动豁免, 必须先声明豁免依据并征得用户确认。实施中发现影响面超出声明范围时, 停下重新申请或切入 harness。
- 边界存疑按非平凡处理, 默认走 harness; 进行中的任务用 `harness-0.1-continue` 续跑, 不重新 new。在另一台设备或另一个 Agent 推进过同一任务后切回本机, 先用 `harness-0.2-sync` 拉取对齐 + 增量交接 (吸收他人新沉淀的 friction/issue), 再续跑。
- 默认流程是 harness workflow。只有用户明确要求使用 Superpowers 流程时, 才允许 Superpowers 接管任务流程; 否则 feature / bug / harness 任务都按 harness 执行。
- 走 harness 时, Superpowers 只能作为方法参考 (不建 active 产物 / 不要 worktree / 不覆盖 INDEX.phase); 完整禁止清单见 `.agents/workflow/_shared.md` 不变量 18 (canonical)。
- `brainstorming` 可作为 design 的受控方法: 最多 3 个关键问题, 且问题必须影响范围、方案或验收标准。
- Agent 自主判断并行或顺序执行: 按文件是否重叠、模块边界、任务依赖和测试耦合度决定; 不把 subagent 并行或主 session 执行作为用户选择题。

入口: harness-0.0-new · harness-0.1-continue · harness-0.2-sync · harness-1.0-explore · harness-2.0-design · harness-3.0-implement · harness-3.1-polish · harness-4.0-verify · harness-5.0-archive · harness-5.1-friction · harness-5.2-issues
