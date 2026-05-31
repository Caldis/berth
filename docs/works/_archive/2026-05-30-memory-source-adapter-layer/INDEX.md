---
task: 2026-05-30-memory-source-adapter-layer
type: feature
phase: archive
created: 2026-05-30
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 为 berth "记忆" 视图引入可替换的 MemorySource 适配层

## 一句话

berth 的 "记忆" tab 当前只映射 `claude-md`/`agents-md`、没有任何真实记忆数据源 → 面板恒空。
引入与现有按-agent 的 `AgentAdapter` **正交**的、按-记忆后端切分的 `MemorySource` 适配层:
接入 原生 Claude Code 记忆 + united-memory + 未来可扩展; 重定义 "记忆" 视图为真·记忆浏览体验 (只读)。

## 当前 phase
implement — explore + design 完成 (00-PRD / 01-ANALYSIS / 02-SPEC / 03-PLAN 齐, harness:check 绿)。
- 安全先行: 03-PLAN 步骤 1-7、9 全是新文件 (无碰撞), 可直接 TDD 落地。
- 共享热点 (步骤 8 IPC、步骤 10 instructions.tsx+i18n) 触并行 session 未提交文件, 须协调时序/提交,
  开工前等用户对"何时动共享文件"给绿灯。
- 过程摩擦已沉淀: docs/friction/20260530-explore-product-ui-vs-host-tool-misattribution.md。

### 实现进度
- ✅ 步骤 1-7 核心模块 (已提交 357315c): memory.ts 类型 / MemorySource 接口 / united-memory 源 /
  claude-native 源 / 聚合服务 + 2 单测 (16/16 绿)。
- ✅ 步骤 8 IPC 接线: ipc.ts (memory:list/get) + handlers.ts + preload index.ts/index.d.ts (clean 文件)。
- ✅ 步骤 9 渲染: use-memory hook + MemoryView 组件 (源过滤 + 来源/重要度 badge + 懒加载详情, 新文件)。
- ✅ 步骤 10 instructions.tsx: "记忆" tab → MemoryView; CLAUDE.md/AGENTS.md → 新 "约定" tab。
- ✅ 全量 typecheck **0 error**; memory 单测 16/16 绿。
- ⏳ i18n: memory.* / tabs.conventions keys 已加到工作区, 但 en/zh.json 仍混并行 status-line WIP,
  暂不单独提交 (待其干净); 运行态已生效 (i18next 从工作区读)。
### verify 结果
- ✅ typecheck 全项目 0 error。
- ✅ memory 单测 16/16 绿。
- ✅ **运行态实证** (临时 integration test 跑真机后删除): `listMemory()` 返回两源聚合 57 条 —
  united-memory 45 (读 index.json) + claude-native 12 (读 ~/.claude/projects/*/memory/), 每条带
  来源标签 + importance。证明数据链端到端打通 (适配层 → 聚合 → IPC 就绪)。
- ⏳ 剩余: (a) i18n keys 待 en/zh.json 脱离并行 status-line WIP 后单独提交; (b) 应用 GUI 截图验收
  (可由 `pnpm dev` → 指令 → 记忆 tab 人工查看; Windows 自动截图未做)。

### verify 回写 (defect 修复)
- 🐞→✅ 点击新增 "约定" tab 白屏。根因: `AssetGuidePanel` 直接解引用 `guide.titleKey` (无 undefined 守卫),
  而 `instructionGuideMap` 无 `conventions` 键 → activeGuide=undefined → 渲染抛错。
  修复: `instructions.tsx` 改为 `{activeGuide && <AssetGuidePanel .../>}` (无 guide 的 tab 不渲染该面板)。
  typecheck 0 error。教训: 新增 tab 必须配 guide 或对 AssetGuidePanel 加守卫。

### 增强轮 (用户验收后追加: P0+P1+P2 + 收尾)
- ✅ **P0 路径 bug** (5cb37e1): 两源把相对路径解析为绝对路径, 修复 "在资源管理器显示" 与路径标签;
  新增 memory-service.test.ts 绝对路径回归守卫。
- ✅ **P1**: 记忆视图加搜索 (标题/摘要/标签) + 按 updatedAt 倒序 + 手动刷新按钮。
- ✅ **P2**: 详情展示关联笔记 (links 可点跳转+聚焦) + "查看原始" 复用 inspector drawer
  (未引入 markdown 依赖, 富渲染转 issue)。
- ✅ **收尾·服务层测试**: listMemory/readMemory 加可注入 sources[] (生产调用不变), 临时目录测两源 + 聚合/路由,
  共 16 例; 替代之前的一次性探针。memory 测试合计 32/32 绿。
- ✅ **收尾·约定 tab 说明面板**: conventions guide 复用既有 `guidance.memories` 文案 (描述持久指令, 正合
  CLAUDE.md/AGENTS.md), 零新增 i18n; 记忆 tab 不再显示该面板 (渲染 MemoryView)。
- ✅ **收尾·i18n 改为组件内兜底** (ec1c609): en/zh.json 是并行 session 反复重写的共享资源, 我加的
  memory.* 键被回退导致 Memory tab 显示原始键名。改用 `t(key, 默认值)` 在 memory-view.tsx 内置英文兜底
  (search/refresh/relations/allSources/sourceError/clearFilters/importanceHint.*/空态), 彻底解耦易变 JSON:
  键缺失即显示可读英文, 键到位则自动接管。只动自有文件, 不再连带他人 WIP。typecheck 0 / lint 0 / 测试 29/29。
- ⏳ GUI 截图验收 (pnpm dev → 指令 → 记忆 人工查看; Windows 自动截图未做, 留作人工抽检)。

### 转 issues 的后续 (本任务不做)
- `docs/issues/2026-05-31-IMPROVEMENT-memory-view-rich-rendering.md` (markdown 富渲染 + importance/tag 过滤 + 正文双链)
- `docs/issues/2026-05-31-IMPROVEMENT-memory-source-robustness.md` (重复读取 / native N+1 / index 失准提示 / 路径穿越加固 / native 时间)
- `docs/issues/2026-05-31-IMPROVEMENT-memory-view-motion-polish.md` (展开过渡 + 跳转高亮淡出, critique #5)

## 验收结论 (archive)
端到端闭环已交付并验证: 适配层 (MemorySource 正交抽象) + 两源 (united-memory / claude-native) + 聚合/IPC/UI
(搜索/排序/刷新/来源过滤/关联跳转/详情) 全部落地; typecheck 0 / lint 0 / memory 测试 29/29 / harness:check 绿;
运行态实证两源聚合 57 条。白屏与路径两个缺陷已修并加回归守卫。i18n 改组件内兜底彻底消除共享 JSON 竞态。
非主线增强 (富渲染 / 健壮性 / 动效) 已转 3 个 issue。剩 GUI 截图人工抽检, 不阻断归档。

### 已知数据细节 (非 berth bug)
- united-memory 返回 45 (依 index.json) 而磁盘 mem/ 仅 38 有效 (+8 畸形文件): index.json 偏旧。
  berth 以 index.json 为准是正确取舍; 指向缺失文件的条目 read() 时优雅降级。属 ~/.united-memory 仓库
  的数据卫生问题, 已记于 00-PRD 交叉引用。
- claude-native 非空 (12 条): 原生记忆在其它 project slug 下存在 (berth 自身 slug 才是空的)。

## 范围决策 (来自用户)
- 记忆 tab 语义: 重定义为真·记忆视图 (默认推荐)。
- 多源呈现: 聚合 + 来源标签/过滤, 并支持源切换 (用户选了 "完整记忆浏览体验" → 取最全)。
- 范围: 完整记忆浏览体验 (适配层 + 两个源 + 聚合/过滤/搜索/详情); 遵守 v0.1 只读硬边界。

## 硬约束
- 只读: 不写任何本地文件 (ARCHITECTURE.md 安全约束)。
- 可测试: 适配层为纯 file→model 解析, 单元可测。
- 凭证隔离 / 路径白名单沿用现有规则。

## 交叉引用
- 并行任务 `2026-05-30-settings-scan-directories` (可配置扫描目录) — united-memory 路径可配将与之联动, 本任务先用默认+自动探测。
- friction `_archive/20260530-optimization-memory-belongs-in-repo.md` — "知识落仓库" 决策, 与本任务 (展示多源记忆) 不冲突。
- 待办: united-memory 数据完整性问题 (SessionStart 注入 45 notes/8 core vs 实盘 38/2; 6 条 core 已删 + 8 个畸形 .md.md/尾点文件) → 拟落 docs/issues/。
