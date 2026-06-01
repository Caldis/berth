# 抛光候选项

## 当前任务边界

当前任务负责 Hooks 页面精简、生命周期侧栏固定、Agent 差异说明、Hook 健康检查展示方式、共享引导说明从 hover 改为详情区平铺, 以及这些改动对应的 renderer/unit 测试和 Electron 视觉验收。

当前任务内的主要文件:
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
- `src/renderer/src/lib/hook-lifecycle.ts`
- `src/renderer/src/components/shared/feature-guide-panel.tsx`
- `tests/renderer/hooks-lifecycle-view.test.tsx`
- `tests/unit/hook-lifecycle.test.ts`
- `tests/renderer/feature-guide-panel.test.tsx`
- 相关 feature guide / capabilities / instructions / sessions renderer 测试

不属于当前任务边界:
- 删除主进程 hooks IPC 或历史 i18n key。
- 重做整个 Capabilities 页面信息架构。
- 改造所有 popover/tooltip 为全局组件库。

## 候选项

### 1. 健康检查 tooltip 可能被 sticky 侧栏滚动容器裁切

- 影响: 中到高
- 成本: 中
- 建议是否进入当前任务: 建议进入
- 依据: `HookHealthSignal` 已移入生命周期侧栏, 侧栏本身使用 `lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`。健康状态 tooltip 也是侧栏内部的 absolutely positioned 元素, 其中还可能包含 `Open source` 按钮。若侧栏内容较长或 tooltip 靠近底部, 浮层可能被 overflow 容器裁切, 影响查看检查详情和打开来源。
- 建议处理: 把侧栏滚动范围下沉到 stage 列表, 让健康检查 tooltip 的外层不处于 overflow 容器内; 或抽一个轻量 `Popover`/portal 方案。至少补一个 renderer 结构断言, 再做一次 Electron 视觉验收。

### 2. 生命周期侧栏缺少当前阶段反馈和键盘 focus 细节

- 影响: 中
- 成本: 中
- 建议是否进入当前任务: 建议进入
- 依据: 侧栏是高频交互区域, 但 stage button 只有 hover 样式, 没有 `focus-visible` ring, 也没有 `aria-current` 或当前滚动阶段高亮。鼠标用户能点击跳转, 但键盘用户和长页面滚动时缺少当前位置反馈。
- 建议处理: 给 stage button 增加 `focus-visible` 样式; 若成本可控, 用 IntersectionObserver 或 scroll 事件节流记录当前 section, 为当前项加 `aria-current="true"` 与视觉状态。若不做 active section, 至少补齐 focus 样式。

### 3. 共享详情按钮应暴露展开状态

- 影响: 中
- 成本: 低
- 建议是否进入当前任务: 建议进入
- 依据: `FeatureGuidePanel` 把说明从 hover 改为 `[Details]` 展开区, 但按钮目前只通过文案变化表达状态, 没有 `aria-expanded` / `aria-controls`。这属于本轮共享引导详情改造的可访问性缺口。
- 建议处理: 为详情内容生成稳定 id, 按钮添加 `aria-expanded={expanded}` 和 `aria-controls`。renderer 测试补断言。

### 4. Hook 行路径被 truncate 后缺少查看完整路径的轻量入口

- 影响: 中
- 成本: 低到中
- 建议是否进入当前任务: 可选进入
- 依据: Hook 行里 `hook.path` 使用 `truncate font-mono`。这能保持布局紧凑, 但长路径对排错很重要, 当前只能通过 Actions 打开路径, 不能直接查看完整文本。当前任务多次调整了信息密度, 这属于可用性细节。
- 建议处理: 给路径加 `title={hook.path}` 或提供复制按钮。若加复制按钮, 需要复用现有 copy 交互风格并补测试; 若只加 title, 成本低但键盘/触屏帮助有限。

### 5. Row action menu 的 focus 和展开语义偏弱

- 影响: 中
- 成本: 中
- 建议是否进入当前任务: 可选进入
- 依据: `HookActions` 使用原生 `details/summary`, summary 只有 hover 样式, 没有明确 focus ring; 菜单展开后没有更清楚的语义标签。它不是本轮新增功能, 但处在本任务改造后的 Hooks 页面主要操作路径里。
- 建议处理: 先补 `focus-visible` 样式和 `aria-label`; 若继续深入, 后续可抽统一菜单组件, 但那会超出当前任务。

### 6. 小屏横向生命周期索引缺少滚动提示

- 影响: 低到中
- 成本: 低
- 建议是否进入当前任务: 可选进入
- 依据: 小屏下 stage 列表是横向滚动, 每个按钮 `min-w-[230px]`。这保留了移动端可用性, 但没有渐隐/滚动提示, 用户可能不知道还有更多阶段。
- 建议处理: 加边缘渐隐或保留最后一项半露出的布局提示。需用移动宽度截图确认没有横向页面滚动。

## 建议顺序

1. 先处理 1 和 3: 都是本轮新结构直接带来的风险, 验证成本低。
2. 再处理 2: 如果只补 focus 样式成本低; 若做 active section, 需要更完整的交互测试和实测。
3. 4 到 6 可按时间选择, 不影响当前主路径完成。

## 用户选择

等待用户确认:
- 跳过全部: 将 INDEX.phase 回到 `verify`, 下一步进入 `harness-5.0-archive`。
- 选择部分项: 将选中项追加到 `03-PLAN.md`, INDEX.phase 回到 `implement`。
- 全部作为后续: 将越界项转为 `docs/issues/`, 当前任务只保留交叉引用。
