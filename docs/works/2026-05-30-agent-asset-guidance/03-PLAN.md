# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [ ] 任务 1: 新增 `asset-guidance` 数据定义、`AssetGuidePanel` 组件和中英文 i18n 文案。验证: 相关 renderer 测试或 typecheck。
- [ ] 任务 2: 在 Instructions / Capabilities 页面接入说明面板, 不改现有扫描和 IPC。验证: typecheck。
- [ ] 任务 3: 修复 PermissionsSection / EnvSection 对当前 parser meta 的兼容展示。验证: 新增或更新单元测试。
- [ ] 任务 4: 跑 typecheck、相关 tests、harness:check; 如启动 Electron, 按 verify 规则做视觉检查。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
