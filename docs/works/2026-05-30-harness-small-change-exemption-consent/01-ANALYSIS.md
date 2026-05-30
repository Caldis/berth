# 需求分析 (Explore 产物)

## 现状理解

这是 harness 框架自身的规则修正, 不涉及 Electron 主进程、渲染层、IPC 或资产模型。影响面集中在工作流说明与 Agent 入口规则:

- `AGENTS.md`: 用户和 Agent 起步时的最高频入口, 已写明 feature / bug 开发任务必须先 `opsx-new`, 并有“小改动豁免”条款。
- `.agents/README.md`: harness 总览入口, 同样写有“何时进入”的压缩规则。
- `.agents/workflow/_shared.md`: 各 verb 引用的共享契约, 当前有“不变量”但没有专门描述“小改动豁免前需声明并征得用户同意”。
- `.agents/workflow/new.md`: new 阶段只描述进入后如何建任务态, 不处理进入前的豁免判断。
- `scripts/harness-sync.mjs` / `scripts/harness-check.mjs`: 分发与校验只检查 playbook、模板、works、friction、分发漂移, 不理解自然语言流程规则。

本次摩擦已经记录在 `docs/friction/20260530-implement-small-change-exemption-overreach.md`: 小改动豁免本身合理, 问题是未先向用户声明并申请确认。

## 关联与依赖

规则必须落在使用点。历史 friction `docs/friction/_archive/20260530-new-gh-node-id-hand-typed.md` 已总结过类似问题: 只写在参考文档里不够, 执行时会落空。

因此本次不应只改 friction; 至少要改两个入口:

- 根 `AGENTS.md`: Codex 当前会直接加载, 是“是否进入 harness”的实际判断点。
- `.agents/README.md`: harness 总览文档, 保持与根入口一致。

若要让 `pnpm harness:check` 捕捉这类规则漂移, 可以新增一个轻量校验: 要求 `AGENTS.md` 与 `.agents/README.md` 同时包含一个稳定标记句, 例如“小改动豁免前必须先声明豁免依据并征得用户确认”。这不是验证语义完整性, 但能避免以后只改一处。

## 验收标准
1. 根 `AGENTS.md` 的“小改动豁免”条款明确要求: Agent 在不走 harness 前, 必须先声明豁免依据并征得用户确认。
2. `.agents/README.md` 的入口规则与根 `AGENTS.md` 保持一致。
3. harness 自检能防止上述规则只改一处造成漂移。
4. 本次 friction 保持为未归档状态或按实际优化策略处理, 不丢失用户纠正。
5. 验证命令通过: `pnpm harness:check`, `pnpm test tests/harness/check.test.ts`。若修改分发源或分发脚本, 还要跑 `pnpm harness:sync -- --check` 或等价检查。

## 未决问题
无。用户已经明确目标: 将该摩擦实际落实到 harness 框架中。
