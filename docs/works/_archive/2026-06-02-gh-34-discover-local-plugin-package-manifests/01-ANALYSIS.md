# 需求分析 (Explore 产物)

## 现状理解
相关代码集中在 `src/main/agent-plugins/manifest.ts`:

- `loadAgentPluginManifests(options)` 调用 `discoverManifestPaths(options)` 找 manifest 路径。
- `discoverManifestPaths()` 当前来源:
  - `options.manifestPaths`
  - `BERTH_AGENT_PLUGIN_MANIFESTS`
  - `~/.berth/agent-plugins/*.json`
  - `<project>/.berth/agent-plugins/*.json`
- `readManifestDirectory(dir)` 当前只读取目录内直接 `*.json` 文件, 不读取子目录。
- 现有测试 `tests/unit/agent-plugin-manifest.test.ts` 已覆盖显式 path、env path、home/project `.json`、duplicate id。

PRD 要求支持“只读 manifest 文件和完整 plugin package 两种形态”。本任务补足 discovery 层, 不改变 validator schema, 不执行插件代码。

## 关联与依赖
不涉及 renderer、IPC 契约或 shared 类型。`AgentCapabilityPluginManifestEntry.path` 仍指向实际 manifest 文件路径。

目录来源需要保持确定性:
- 显式 `manifestPaths` / env paths 保持用户指定顺序。
- home/project plugin 根目录内的 manifest 文件和直接子目录按路径排序。
- 同一真实路径去重。
- 同一 manifest id 的后出现项继续标记 duplicate invalid。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 显式传入的 manifest 文件路径继续正常加载。
2. 显式传入的目录路径若包含 `manifest.json` 或 `plugin.json`, 能发现并加载。
3. 显式传入的目录路径若是 plugin root, 能发现其直接子目录里的 `manifest.json` / `plugin.json`。
4. home/project `.berth/agent-plugins` 继续发现根目录 JSON 文件, 也能发现直接子目录 plugin package。
5. 同一个 package 同时有 `manifest.json` 和 `plugin.json` 时只选择一个确定入口。
6. duplicate manifest id 规则不变: 后出现的同 id manifest 标为 invalid。
7. 发现过程只读, 不执行第三方代码。

## 界面质量与交互验收
不适用。本任务不改 UI。

## 未决问题
留给 design 向人澄清。
无。
