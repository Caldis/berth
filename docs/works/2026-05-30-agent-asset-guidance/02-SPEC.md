# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不改 `Asset` shared type 和 IPC 通道。
- 新增 renderer-only guidance 定义:
  - `AssetGuideDefinition`: `titleKey`, `summaryKey`, `pointKeys`, `docLinks`。
  - `AssetGuideDocLink`: `labelKey`, `url`。
  - `instructionGuideMap` / `capabilityGuideMap` 分别按页面 tab id 索引。
- guidance 文案全部进入 `src/renderer/src/i18n/locales/{en,zh}.json`:
  - 每个 tab 至少包含 title / summary / points / doc labels。
  - docs URL 保持在 TS 定义里, 避免 i18n 文案携带可执行目标。
- 权限展示读取兼容形态:
  - 新形态或未来形态: `meta.listType`, `meta.pattern`。
  - 当前 Claude 形态: `meta.kind`, `meta.rules`。
  - `allow`, `ask`, `deny`, `bypass` 都允许进入分组; 当前页面至少展示 allow/deny, ask 作为中性分组保留扩展位。
- 环境变量展示读取兼容形态:
  - 聚合形态: `meta.keys: string[]`, 每个 key 展示为一行, value 永远遮蔽。
  - 单变量形态: `asset.name`, `meta.value`, `asset.sensitive`; 敏感值遮蔽, 非敏感值可显示。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 新增 `src/renderer/src/lib/asset-guidance.ts`:
  - 放 provider-neutral 资产说明映射和官方 docs URL。
  - 不访问 store、不访问 IPC。
- 新增 `src/renderer/src/components/shared/asset-guide-panel.tsx`:
  - 纯展示组件, 接收 `guide`。
  - 使用 `useTranslation` 渲染文案。
  - 文档链接按钮调用 `window.api.shell.openExternal(url)`。
  - 视觉为单层说明面板, 放在 tab/filter 和列表之间; 不嵌套进资产卡片。
- 修改 `src/renderer/src/pages/instructions.tsx`:
  - 根据 `activeTab` 从 `instructionGuideMap` 取说明并渲染。
  - 现有卡片和筛选逻辑不重写。
- 修改 `src/renderer/src/pages/capabilities.tsx`:
  - 根据 `activeTab` 从 `capabilityGuideMap` 取说明并渲染。
  - 修复 PermissionsSection / EnvSection 的兼容读取。
- 修改 `tests/renderer` 或新增轻量单元测试:
  - 覆盖说明面板渲染和外链按钮。
  - 覆盖权限/env 归一化 helper, 避免只靠人工点击发现字段漂移。

## 测试策略
- `pnpm test -- src/renderer/...` 或相关 Vitest 文件: 验证说明面板、权限/env 归一化。
- `pnpm typecheck`: 验证 TS 和 i18n key 使用没有类型错误。
- `pnpm harness:check`: 验证任务态结构。
- 若启动 Electron 做视觉验收, 只验证说明面板在 Instructions/Capabilities 中不遮挡列表和筛选器; 截图需按项目 verify 规则取实测窗口坐标。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
- renderer-only guidance 定义 + i18n 文案 | 1, 2, 5, 6 |
- AssetGuidePanel 复用组件 | 1, 2, 5 |
- Instructions 页面接入 | 1, 5, 6 |
- Capabilities 页面接入 | 2, 5, 6 |
- PermissionsSection 兼容读取 | 3 |
- EnvSection 兼容读取 | 4 |
- 单元测试 / typecheck / harness | 7 |
