# 解决 (RESOLVED 2026-06-09, GH-113 T3)
- 继承链 bug 已由 GH-113 T3 owner-tagging 谓词修复: `src/shared/scope.ts:71-81 assetMatchesProjectPath` 弃用 `pathIsInsideProject` 路径包含判断, 改为「无显式 owner 且 scope=project ⇒ 属活动项目快照 (含 rooted-above 继承链), 放行; 跨项目资产带显式 projectPath ⇒ 排除」。选中子目录时父级 repo 根 `AGENTS.md`/`.claude/settings.json` 等生效配置不再被误过滤。
- 测试固化: `tests/unit/scope.test.ts:74-77` — 选中 `D:/Code/berth/packages/app` 时父级 `D:/Code/berth/AGENTS.md` (无 owner project asset) 命中 = true; `:67-70` 跨项目带 owner 资产被排除, 满足"避免无关父项目配置混入"。
- 归档任务: `docs/works/_archive/2026-06-07-gh-113-scope-refactor-convergence/` (T3a)。

# 描述
- 扫描会包含 repo 根到当前叶子目录的配置根 (root→cwd); 但 UI project scope 过滤只保留 path 在当前所选项目目录内的 asset。当所选项目是某 repo 的子目录时, 父级 (repo 根) 的 `AGENTS.md` / `.claude/settings.json` 等实际对该子目录生效的配置被过滤掉, 用户看不到生效中的继承配置。

# 证据
- `src/shared/scope.ts:71-76 assetMatchesProjectPath` 对 project-scope asset 用 `pathIsInsideProject(asset.path, projectPath)` → 父级路径不在子目录内 → false。
- `src/main/project-config-roots.ts` 提供 root→cwd 继承链; scanner 据此扫父级配置。

# 预期 / 建议
- scope filter 认 `projectDirs` 继承链 (asset 属于当前项目的任一祖先配置根即视为生效), 或给继承来的 asset 标 `inheritedFor` 当前项目。需与"项目级 vs 用户级"语义对齐, 避免把无关父项目配置混入。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-2 B#3; Tier-2。关联 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (P5)。
- 状态: RESOLVED (GH-113 T3 owner-tagging 谓词, 提交跨 T3a; 测试 `tests/unit/scope.test.ts`)。
