# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增共享类型:

```ts
export interface AgentCapabilityPluginManifestPermission {
  kind: AgentCapabilityPluginPermissionKind
  scopes: AssetScope[]
  pathPatterns: string[]
  reason: string
  backupStrategy?: string
  conflictStrategy?: string
}
```

`AgentCapabilityPluginManifestEntry` 增加:

```ts
permissions?: AgentCapabilityPluginManifestPermission[]
```

契约规则:

- parser 只把通过校验的权限数组返回给 UI。对应验收标准 1、2、4。
- `kind`, `scopes`, `pathPatterns`, `reason` 保持现有必填校验。对应验收标准 1、2。
- `backupStrategy` 和 `conflictStrategy` 作为可选字符串读取。缺失时不是 validation error, UI 展示为 “Not declared / 未声明”。对应验收标准 6。
- `write` 和 `execute` 继续进入 `activationReadiness.status = blocked`, 计算来源改用已解析权限数组。对应验收标准 3。
- `status === invalid` 的 entry 不返回 `permissions`, 避免 UI 展示部分有效但整体无效的数据。对应验收标准 4。
- `status === incompatible` 不是 schema invalid, 可以展示已解析权限, 便于用户理解版本之外的风险。对应验收标准 1、5。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/shared/types/agent-plugin.ts`
  - 新增 `AgentCapabilityPluginManifestPermission`。
  - `AgentCapabilityPluginManifestEntry` 增加可选 `permissions`。
- `src/main/agent-plugins/manifest.ts`
  - 将 `validatePermissions()` 改为 `readPermissions()` 或同等函数: 同时校验并返回已清洗字段。
  - `buildActivationReadiness()` 使用已解析权限计算 blocked kinds。
  - invalid manifest 和 unreadable/invalid JSON manifest 不返回 permissions。
- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx`
  - 新增 `ManifestPermissionsDetails` 或同等局部组件。
  - 放在 readiness 之后、validation errors 之前。
  - 每条 permission 显示 kind、scope、pathPatterns、reason、backupStrategy、conflictStrategy。
  - 第三方 `reason` 是用户文件里的普通字符串, 不能传给 `t()`。
- `src/renderer/src/i18n/locales/en.json` / `zh.json`
  - 增加 manifest permission 标题、空态、字段标签、未声明文案。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 摘要行不增加新 badge; 权限只在 manifest 展开详情内展示。readiness 说明在前, permission review 在后, validation errors 最后。 | renderer 测试确认摘要默认不出现权限路径; 展开后出现。 |
| 组件选择 / 设计系统一致性 | 复用 `Badge`, `ManifestMetaRow`, mono path 行和 border/divide 分割; 不新增全局组件。 | 截图或 DOM 检查确认样式与现有详情块一致。 |
| 交互反馈 / 状态切换 | 沿用现有展开按钮与 `aria-expanded`; 不增加额外弹层或 hover 依赖。 | renderer 测试点击 manifest 行后可见权限详情。 |
| loading / empty / error / disabled / focus | 本任务不改 loading / empty / error。invalid manifest 的权限详情为空, 错误仍在 validation errors。focus 沿用 button 原有 focus 行为。 | renderer 测试 invalid manifest 展开后仍显示 validation errors, 不显示伪权限。 |
| 响应式 / 可访问性 / 键盘可达 | path pattern 使用 truncate + title; 权限 kind 用文字 badge, 不只靠颜色。移动端保持单列。 | 目标测试覆盖文字; 最终视觉验收看小屏不横向溢出。 |
| 文案 / i18n / 数字和路径格式 | 中英文补齐标题、字段和未声明文案; 第三方 reason / strategy 原文展示; path 保持 mono。 | renderer 测试使用英文文案; typecheck 校验 i18n key 引用。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| manifest validator 返回已校验权限明细, 包括可选策略字段 | unit | `tests/unit/agent-plugin-manifest.test.ts` | `pnpm vitest run tests/unit/agent-plugin-manifest.test.ts` | 不适用 |
| write / execute 权限仍 blocked, invalid manifest 不展示伪权限 | unit | `tests/unit/agent-plugin-manifest.test.ts` | `pnpm vitest run tests/unit/agent-plugin-manifest.test.ts` | 不适用 |
| Settings 展开 blocked manifest 后显示权限 kind、scope、pathPatterns、reason、策略字段 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| 摘要行不增加权限噪音, invalid manifest 仍显示 validation errors | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| 阶段文档和任务状态合规 | harness | 当前 work 目录 | `pnpm harness:check --work docs/works/2026-06-02-gh-33-manifest-permission-review` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Manifest permission 类型与 parser 返回值 | 1, 2, 4 |
| activation readiness blocked 逻辑不变 | 3 |
| Settings manifest 权限审查区域 | 5, 6, 7 |
| i18n 与 path/reason 展示 | 2, 8 |
| unit / renderer / harness 测试矩阵 | 9 |
