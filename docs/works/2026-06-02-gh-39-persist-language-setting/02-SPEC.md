# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改 IPC、扫描结果或用户配置文件契约。

renderer 本地存储契约:

- key: `berth-language`
- allowed values: `en` | `zh`
- missing/invalid: fallback to `navigator.language.startsWith('zh') ? 'zh' : 'en'`

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

修改 `src/renderer/src/i18n/index.ts`:

- 提取 `SUPPORTED_LANGUAGES` 和 `resolveInitialLanguage()`。
- 优先读取 `localStorage.getItem('berth-language')`。
- 只接受 `en` 或 `zh`。
- 读取 `localStorage` 失败时回退系统语言, 避免测试或特殊环境异常影响启动。

`src/renderer/src/pages/settings.tsx` 不需要改动; 它已经负责保存用户选择。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局, 不新增解释块 | 代码 diff |
| 组件选择 / 设计系统一致性 | 复用现有设置页语言按钮 | 不改组件 |
| 交互反馈 / 状态切换 | 现有点击后即时切换保留, 重启后读取保存值 | renderer/unit 测试 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改焦点和 aria | 不适用 |
| 文案 / i18n / 数字和路径格式 | 保存语言值只接受 `en` / `zh`, 非法值回退 | unit 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 保存语言优先生效 | unit | `tests/renderer/i18n-initial-language.test.ts` | `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts` | 不适用 |
| 非法值和缺失值回退 | unit | `tests/renderer/i18n-initial-language.test.ts` | `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts` | 不适用 |
| 设置页行为保持 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` 或现有设置页相关测试 | `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| 本地门禁 | lint/typecheck/harness | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm harness:check` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 读取保存语言 | 1, 2 |
| 缺失/非法回退 | 3 |
| 不改设置页交互 | 4 |
| 测试与门禁 | 5 |
