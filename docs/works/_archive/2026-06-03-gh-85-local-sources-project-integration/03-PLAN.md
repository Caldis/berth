# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新 ProjectScopeSwitcher renderer 测试
  - tests: `pnpm test tests/renderer/project-scope-switcher.test.tsx`
  - verify: 覆盖项目候选来源摘要、当前项目来源明细、来源加载失败、路径打开动作; 界面验收项覆盖信息密度、状态、长路径。
- [x] 任务 2: 在 ProjectScopeSwitcher 中整合项目来源
  - tests: `pnpm test tests/renderer/project-scope-switcher.test.tsx`
  - verify: 打开项目范围时加载 `assets.scanSources`; 候选行显示来源状态摘要; 当前项目显示来源明细; 来源失败不阻断项目选择。
- [x] 任务 3: 从 Settings 页面移除 Local Sources 区块
  - tests: `pnpm test tests/renderer/settings-sources.test.tsx tests/renderer/settings-page.test.tsx`
  - verify: SettingsContent 不再调用 `assets.scanSources`; 页面不出现 `Local Sources` / `本地来源`; 全局设置入口仍可用。
- [x] 任务 4: 更新中英文 i18n 文案
  - tests: `pnpm test tests/renderer/project-scope-switcher.test.tsx tests/renderer/settings-sources.test.tsx`
  - verify: 英文 `Project sources`; 中文 `项目来源`; source count / scanned / missing / not scanned 文案在项目切换器中可读。
- [x] 任务 5: 跑类型、构建、harness、视觉和 CI 验收
  - tests: `pnpm typecheck:web`; `pnpm build`; `pnpm harness:check`; `pnpm harness:prepush`
  - verify: dev agent + CDP + `print-window` 截图确认项目切换器下拉无溢出、长路径裁剪正常、Settings 页面没有旧本地来源区块。

## verify 回写
- `pnpm test tests/renderer/project-scope-switcher.test.tsx tests/renderer/settings-sources.test.tsx tests/renderer/settings-page.test.tsx` 通过。
- `pnpm typecheck:web` 通过。
- `pnpm build` 通过。
- `pnpm harness:prepush` 通过。
- GitHub Actions CI#26851960400、CI#26852233761 通过。
- dev agent `gh85-sources` CDP 断言通过: 项目切换器出现项目来源摘要与当前项目来源明细, Settings 页面不再出现旧 Local Sources 区块。
- dev agent `print-window` 截图: `C:\Users\mail\AppData\Local\Temp\berth-gh85-sources-print-2.png`, 确认弹层位于窗口内, 长路径裁剪正常。
