# Workflow 共享契约

被 `.agents/workflow/*.md` 各 action 引用。定义命名、状态契约、阶段门禁。

## 最高优先级规则

已验证、边界清楚的增量必须小步频繁提交并及时推送。完成一个可独立验证的子步骤并通过对应本地检查后, 立即只暂存自己相关文件、用 `git diff --cached` 核对 staged 集合、提交一次。共享工作区禁止 `git add -A` / `git add .` / 目录级批量 add, 必须显式列出本轮处理过的文件; 若误提交他人文件, 用 `git reset --soft HEAD~1` 拆回索引再 `git restore --staged <path>` 逐个踢出, 不用 destructive reset。推送前必须确认本地目标检查通过; 代码类提交优先运行 `pnpm harness:prepush`, 若该命令因远端 CI baseline 仍在运行而阻塞, 应拆开运行本地 lint/typecheck/test/harness 检查, 不因远端等待停住实现阶段主循环。推送后先用 `git rev-parse HEAD` 读取完整 SHA, 再把该 SHA 的 GitHub Actions 状态交给子代理或等价旁路检查异步跟踪; 旁路检查可使用 `pnpm harness:ci:wait --sha <full-sha>`, 但由子代理或等价旁路执行, 主 Agent 不同步等待。主 Agent 继续处理不依赖 CI 结果的当前实现。只有旁路检查确认当前会话提交导致 CI 失败, 且失败会直接破坏当前任务主线或后续实现基础时, 才停止新功能推进并先修 CI。CI 修复提交允许在红灯基线下推送, 但必须明确它是在修复红灯, 并用 `pnpm harness:ci:baseline -- --allow-failed-baseline` 作为显式例外。不得把多个已完成阶段长时间堆在工作区最后一次性提交; archive / 收尾提交不能替代 implementation 过程中的小步提交。例外: 如果本轮只改了进度状态类文档, 例如 `INDEX.md` phase、`03-PLAN.md` 复选框或测试证据, 先不单独提交, 等下一次代码、测试、设计产物、归档或其他阶段结果一起提交并推送; 若它们是当前阶段唯一剩余变更, 则在阶段结束、归档或停手前提交。若因为风险、依赖关系或远端故障不能提交 / 推送, 必须在当轮说明阻塞原因。

## 任务标识

以 GitHub Issue number 作为可读主键。任务 ID 固定为 `GH-{issue_number}`, 任务目录命名 `{YYYY-MM-DD}-gh-{issue_number}-{SUMMARY}`:
- `2026-06-01-gh-123-order-notes`
- `2026-06-01-gh-124-cold-start-crash`

SUMMARY 为 kebab-case。任务目录位于 `docs/works/`。`issue.number` 是人工可读主键; `gh_project.item_id` 是脚本同步 Project 状态用的 GraphQL node id, 不能互换。

## INDEX.md 状态契约

每个任务目录含 `INDEX.md`, 顶部 YAML frontmatter 为唯一状态源:

```yaml
---
task: 2026-06-01-gh-123-order-notes
task_id: GH-123
type: feature          # feature | bug | maintenance
phase: explore         # explore | design | implement | verify | polish | blocked | archive
created: 2026-06-01
priority: P2           # P0 | P1 | P2 | P3
target_date:
maintenance:
  subtype: performance # 仅 type=maintenance 时填写
source:
  kind: user-request   # user-request | github-issue | docs-issues | docs-friction | ci | harness
  refs: []
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module      # file | module | cross-process | global
    risk: medium       # low | medium | high
    areas: [architecture]
    confidence: low    # low | medium | high
    rationale: "0.0-new 初始估算; explore/design 后校准。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions: []
issue:
  number: 123
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/123
gh_project:
  status: tracked
  project_id: PVT_xxx
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_xxx
  item_status: In Progress
artifacts:
  source: 00-PRD.md    # feature/maintenance: 00-PRD.md; bug: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md # 可选, 仅 polish 阶段需要
---
```

当 `gh` 暂时缺少 `project/read:project` scope 且无法写入 GitHub Project 时, 只能使用显式阻塞态, 不得填 `TBD` / `TODO` / 手写占位 item id:

```yaml
phase: blocked
gh_project:
  status: pending-auth
```

授权恢复后运行 `node scripts/harness-projects.mjs ensure docs/works/{task}` 回写真实 `PVTI_...` item id, 再把 `phase` 改回应继续的阶段。

`phase` 表示任务当前所处阶段, 即 `harness-0.1-continue` 将续跑的步骤。action id 只用于 workflow 文件、skill 名和 friction 命名, 不替代 `INDEX.phase`。

## 任务分类、source 与 debt

- `type` 只使用 `feature | bug | maintenance`。`issue` 与 `friction` 是 `source.kind`, 不作为 type 或 maintenance subtype。
- `maintenance.subtype` 只在 `type: maintenance` 时出现, 且必须是 `ui-ux | performance | architecture | testability | tooling-ci | dependency | docs`。
- `debt.estimate` 是当前已知估算, 从 new 开始填写, explore/design/implement 发现影响面变化时必须修正。
- 估算发生有意义变化时, 追加 `debt.revisions[]`, 记录阶段、日期、from/to 和 reason; 不只静默改数字。
- `debt.final` 在 verify/archive 前填写, archive 不接受只有 estimate 的新任务。统计口径优先 `final.net`, 没有 final 时临时用 `estimate.net`。
- `net = incurred - repaid`。feature / bug 通常增加 debt; maintenance 通常设置 `repaid > 0`, 目标是降低项目总 debt。
- `pnpm harness:stats` 汇总项目 debt pool。阈值: `<20 ok`, `>=20 notice`, `>=40 recommend-maintenance`, `>=60 requires-override`; 超过 60 继续做非维护任务时, INDEX 必须写 `debt.override_reason`。
- `pnpm harness:stats` 在达到维护阈值且存在可选 area 时输出 `maintenance=<subtype>:<score>`, Agent 用它自动选择维护 subtype。规则: 只在 `recommend-maintenance` / `requires-override` 时推荐; 取正分最高的 debt area; 同分按 `tooling-ci > ui-ux > testability > performance > dependency > docs > architecture`; `architecture` 只有自身 area debt `>=40` 时才能自动选择, 否则跳过到下一个 area。
- Agent 可按 `debt.estimate.net`、scope 与 risk 调整任务顺序和并行度: 高 risk/global 优先顺序执行并扩大验证; file/module 且文件不重叠时可并行。该判断不能跳过测试、设计或 Project 同步。
- 当前 Caldis/berth 用户仓库不写 GitHub Issue Type; 类型同步到 GitHub Project 自定义字段 `Task Type`。

## Action ID

| action | 性质 |
|---|---|
| 0.0-new | 创建任务态 |
| 0.1-continue | 续跑当前 phase |
| 1.0-explore | explore 阶段 |
| 2.0-design | design 阶段 |
| 3.0-implement | implement 阶段 |
| 3.1-polish | 可选 implement 子步骤 |
| 4.0-verify | verify 阶段 |
| 5.0-archive | archive 阶段 |
| 5.1-friction | 可选归档后 friction 收敛 |
| 5.2-issues | 可选归档后 issue 收敛 |

## 阶段门禁

| phase | 必备产物 | 下一步 |
|---|---|---|
| explore | source | design |
| design | source + 01-ANALYSIS | implement 或 blocked |
| implement | source + 01-ANALYSIS + 02-SPEC + 03-PLAN | verify |
| verify | 同 implement | polish、archive 或退回 implement |
| polish | 同 verify + 04-POLISH | archive、verify 或退回 implement |
| blocked | source + 01-ANALYSIS | 人工澄清后回 design |
| archive | 全部 | 移入 docs/works/_archive |

## 不变量

1. 阶段间只靠 INDEX.md 与产物文件交接, 不靠会话记忆。
2. PRD/BUG 快照 (00-*) 为只读输入, 任何阶段不回写。
3. design 遇 PRD 级歧义 → phase 置 blocked 并在 INDEX 标注待澄清项, 不进 implement。
4. verify 不通过项回写 03-PLAN.md 新任务, phase 退回 implement。
5. 工程摩擦不就地处理, 沉到 docs/friction/{YYYYMMDD}-{action-id}-{summary}.md。
6. 用户在任务过程中给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction 并当轮改进规则, 无需用户提示。遇到已验证的工具链 workaround、环境/截图/进程类问题也一样处理; 不等最终复盘或用户追问。沉淀产物本身须先过 `pnpm harness:check` 才能提交 (action 段限 10 个值: 0.0-new|0.1-continue|1.0-explore|2.0-design|3.0-implement|3.1-polish|4.0-verify|5.0-archive|5.1-friction|5.2-issues)。
7. 用户提出流程改善意见时, 先判断归属: 当前任务执行过程的可复用摩擦直接写入 `docs/friction/` 并改规则; 产品缺陷、功能缺口或改进项写入 `docs/issues/`; 只有改产品代码、外部副作用、不可逆操作或范围不清时才询问。不得为“是否记录 friction”征求同意。
8. 小改动豁免分两类处理。若用户已明确给出目的、范围或具体参数, 或明确要求 "不走 harness / 直接调整", 且影响面满足单一文件或少量紧密相关文件、单一关注点、无需跨文件根因分析或人工意图澄清、可由目标 test/lint/typecheck 验收, Agent 直接声明按小改动处理并执行, 不再二次询问。若是 Agent 自行判断小改动豁免, 必须先声明豁免依据并征得用户确认; 确认前不得直接跳过 `harness-0.0-new`。实施中发现影响面超出声明范围时, 停下重新申请或切入 harness。
9. 涉及外部产品/平台/SDK/CLI 的功能行为、字段契约、费用口径、配置选项、文件格式、指标含义等可能随版本变化的内容时, Explore / Design 阶段必须先用英文检索官方文档或 primary source, 再写判断和方案; 官方无公开契约时, 才可使用本机样本作为 fallback, 并在产物中明确标注其经验性。开源 UI primitive / 组件库的定位、Portal、hover、focus、dismiss、transition、collision 等行为也按外部 SDK 处理; 如果 implement / verify 阶段发现此类行为问题, 先补查官方文档或 primary source, 再调整实现。常规网页检索只用 WebSearch/WebFetch; 除非用户明确要求浏览器实测、截图或交互验证, 不打开 GUI 浏览器。遇到 403 / Cloudflare 等拦截时, 先找官方 `.md` 版本、官方镜像或公告页, 再用搜索摘要并标注限制; 仍拿不到就跳过。
10. 执行当前任务时发现已验证的产品 bug、功能缺口或改进项, 且不属于当前主线验收范围, 必须主动写入 `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`; 当前任务产物只保留交叉引用, 不把旁支问题混入当前实现, 除非用户明确扩大任务范围。
11. 已验证、边界清楚增量的提交/推送/CI 异步旁路/baseline 红灯例外/误提交回收/进度文档延迟提交等**完整提交纪律见 §最高优先级规则** (canonical 单源)。per-file 暂存与 `git add -A` 禁止、`git diff --cached` 核对、`pnpm harness:prepush`、推送后 `git rev-parse HEAD` + 子代理旁路 `pnpm harness:ci:wait`、CI failure 先归因后才停新功能修红、`pnpm harness:ci:baseline -- --allow-failed-baseline` 例外均在该节; verify/archive/最终完成声明前主 Agent 必须消费成功结果见不变量 19 收口条。
   - 多 Agent 并行导致别的 active work 破坏全局 `pnpm harness:check` 时, 当前任务阶段提交可先跑 `pnpm harness:check --work docs/works/{task}` 验证自己的任务目录。verify/archive 总收口仍必须跑全局 `pnpm harness:check`, 不能用局部检查替代。
   - 向"可枚举注册契约" (union 类型 / catalog map / registry / i18n key 表 / 计数断言) 并发新增成员是高频撞车点 (天然要求每个新成员同时改同一组中心文件): ① 写第一笔前 grep 新 id / 维度关键字确认未被占用 (撞了换维度或 id); ② 把不碰共享契约的独占层 (引擎/纯函数/类型/单测) 先建先提交解耦交付; ③ 待对方对共享文件的改动**已提交且工作树 clean** 再做注册编辑, 顺着已落定的序号续; ④ 每个共享文件改前即时重读, 用 Edit 的 "file modified since read" 当竞态信号 (friction 20260618-3.0-implement-concurrent-registry-contract-collision)。
   - 提交信息语法按工具区分: **Bash 工具**用 bash 语法 (多行用 `<<'EOF' ... EOF` heredoc 写临时文件 + `git commit -F`, 或多个 `-m`), **禁用 PowerShell here-string `@'...'@`** (bash 把 `@` 当字面量, 会把 subject 污染成孤立 `@`); 反之 PowerShell 工具才用 `@'...'@`, 两者不可混用。每次提交后立即 `git log -1 --format=%B` 自检 subject/body 无污染; 共享分支一旦被他人提交压成历史中段即无法安全重写, 故污染必须当轮发现、当轮 `--amend`。
12. Polish 是可选阶段, 只能由用户主动要求, 或 Agent 在复杂任务 verify 通过后询问并取得明确同意后进入。Polish 只检查当前任务相关的深挖、修复、交互、视觉、可用性、适用性与性能问题, 不扩大范围。
   - 用户显式授权高主动性/高完成度时 (出现"举一反三/给我惊喜/完全自定义/全量一次到位/尽可能丰富"等信号), 用户当下显式指令**覆盖** behavioral-guidelines 的"最小代码/不加未要求功能"默认: 进入超额交付模式 — 把每个显式需求当意图样本, 提炼背后完整体验, 主题化系统扩展 (非散点堆功能), 决定+执行+事后说清额外做了什么, 不逐条征许可。该让位仅限此类显式授权语境, 默认仍守 surgical (friction 20260617-3.1-polish-extrapolate-beyond-literal-ask)。
13. Active work 必须记录 `task_id`、`issue.number`、`issue.url` 和真实 `gh_project.item_id`。唯一例外是 `gh_project.status: pending-auth` 且 `phase: blocked`, 表示缺少 GitHub Project 授权, 不允许使用 `TBD` / `TODO` / 手写占位 item id。旧归档任务可保留历史企业 ticket 字段, 但 active works 不再新增这类字段。
14. GitHub Project 字段必须可用: `node scripts/harness-projects.mjs fields ensure` 确认 `Task Type`、`Priority`、日期、debt、scope、risk、source 等自定义字段; `ensure` / `done` 会同步这些字段。`node scripts/harness-projects.mjs check --strict` 用于检查 Project 状态与可读字段值。
15. Archive 前必须同步 GitHub Project: 运行 `node scripts/harness-projects.mjs done <task-dir>`, 将 item 状态置 Done, 同步 `Archived at` 与最终 debt 字段, 再回读 Project item 确认; 失败、缺授权或缺 `gh_project.item_id` 时停止 archive, 不移动目录。GitHub Issue 是否关闭由 PR closing keyword 或用户明确要求决定, archive 不默认关闭 Issue。
16. 测试不是 verify 阶段补跑。Design 必须写测试策略和测试矩阵; Implement 每个实现项必须先写或更新目标测试, 跑目标测试通过后才可勾选。确实不适合自动化测试时, 必须在 03-PLAN 写清 `tests: not needed - <reason>` 和替代验证。每个实现项必须有测试证据或明确例外理由。
17. 默认流程是 harness workflow。只有用户明确要求使用 Superpowers 流程时, Superpowers 才能接管流程; 否则只把 Superpowers 当作方法库。
18. 进入 harness 后, Superpowers 只能作为方法参考: 不创建 active `docs/superpowers/plans` 或 `docs/superpowers/specs`, 不要求 worktree, 不覆盖 INDEX.phase, 不把 `writing-plans` / `executing-plans` 的流程问答注入当前任务。所有 spec / plan 输出都写入当前 work 的 `02-SPEC.md` / `03-PLAN.md`。
19. Agent 自主判断并行或顺序执行。文件不重叠、模块边界清楚、测试可独立运行时可并行; 同一批文件反复修改、测试强耦合、任务依赖前一步结果、或涉及全局迁移/状态机/脚本入口时顺序执行。不得把 subagent 并行或主 session 执行作为用户选择题。
   - 非本地门禁可由子代理执行: GitHub Actions wait 和 GitHub Project 同步/check/done 属于远端等待任务。实现阶段的 CI 检查默认作为异步旁路执行, 主 Agent 可继续处理不依赖 CI 结果的当前实现; 子代理报告失败时, 主 Agent 先做归因, 只有失败会直接影响当前任务主线时才暂停新功能修 CI。
   - verify/archive/最终完成声明前, 主 Agent 必须消费成功结果, 包括远端 CI / Project 结果; 若子代理在收口阶段报告失败, 主 Agent 停止完成声明并回到对应修复阶段。
   - 派**边界明确的隔离窄任务**默认用 fresh general-purpose / Explore agent (只给该子任务范围), 不用 `subagent_type: "fork"` — fork 继承完整对话上下文, 会把上下文里的大目标也吸收致越权扩张; 仅需继承全上下文协作时才用 fork, 且 prompt 必须显式写"你是单一职责 worker, 不是 lead, 只做 X, 不扩张到其他目标"。任何子 agent (尤其 fork) 收尾后, lead 标准动作: 审 `git log` 是否有未授权 commit (同机同 git 身份下"不要 git"对 fork 只是软约束) + 对其自报的验证结论独立复跑门禁, 不采信子 agent 的"已验证/绿/干净" (越权 agent 的自报一律作废) (friction 20260618-3.0-implement-fork-inherits-context-overreaches-mandate)。
20. Archive 后必须提醒本次产生或关联的 friction / issues, 并给出可选下一步: `harness-5.1-friction` 处理 friction, `harness-5.2-issues` 处理 docs/issues。提醒不等于自动执行, 未经用户要求不得进入这两个可选动作。
21. 临时文件写系统临时目录 (`$env:TEMP` / `os.tmpdir()`) 或已约定的忽略目录, 不写项目目录, 也不在 Windows 上使用 `/tmp`。不把不可靠命令塞进大批量并行调用; 一个可能失败的命令应单独跑, 便于看清真实错误。
22. 前端或 UI 相关任务必须有界面质量与交互验收。Explore 记录现有设计系统、页面密度、用户路径和状态问题; Design 写清布局层级、组件选择、交互反馈、加载/空/错误/禁用/focus 状态、响应式、可访问性、文案/i18n 与视觉一致性; Verify 按这些条目实测。涉及数据流 / 时序 / 渐进 / 多源写同一状态 / 缓存的功能, 验收必须真跑观察随时间变化的行为 (CDP 时序采集, 断言落在 observable "用户持续看到什么"), 不能用单组件 unit + CI 静态全绿代替 — 它证明不了组合时序下的可观测正确性 (见 friction `20260609-4.0-verify-static-green-over-runtime-observation`)。主观视觉 / 布局 taste 项 (贴顶、遮罩、间距、对齐、按钮位置) 的最终裁判是用户: Verify 先截图请用户确认再收口; 唯一例外是用户已明确要求 Agent 自主完成该需求 (此时 Agent 自验、不打断循环)。Polish 只能加深检查, 不能替代 Design 阶段的界面方案。
   - 多 widget / 组件库类任务: 视觉验收必须**逐组件 × 逐尺寸 × 逐状态** CDP 截图核验 (尺寸集完整性、M/L/S 各尺寸是否肉眼可分、留白/密度、美学), 不接受单张整页截图作为验收证据 (整页截图掩盖单组件尺寸无区别/密度不足/对齐瑕疵); Design/SPEC 必须为每个多尺寸组件写明各尺寸内容密度差异规则 + 尺寸集 (含 S 与否) (friction 20260617-3.1-polish-per-component-visual-review)。
   - 筛选/分组/范围选择类控件的**可选项必须取自该筛选器作用域之外的全集**, 不能取自被它自己过滤后的结果 (否则收敛到单值后控件自锁无法回退); "选择 → 数据重取 → UI 重渲染"的动态控件 Verify 必须 CDP 真跑**完整往返** (选中某项 → 再切回 / 切到第三项), 不接受仅静态渲染测试 (mock 固定数据掩盖动态收缩) (friction 20260618-4.0-verify-filter-options-from-unfiltered-source)。

## 工具

可用工具索引见 `.agents/tools.md`。项目地图见 `docs/ARCHITECTURE.md`。
