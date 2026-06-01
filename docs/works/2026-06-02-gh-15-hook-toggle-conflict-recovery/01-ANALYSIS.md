# 需求分析 (Explore 产物)

## 现状理解

- `setClaudeHookEnabled()` 只支持用户级 `.claude/settings.json`, 并用进程内 `hookFileLocks` 避免同一 Berth 进程并发写同一文件。
- 禁用路径当前流程为: 读 sidecar -> 读 settings -> 在内存对象里删除 hook -> 写 sidecar -> 写 settings。
- 恢复路径当前流程为: 读 sidecar -> 读 settings -> 插入 hook -> 删除 sidecar entry -> 写 settings -> 写 sidecar。
- Hook 定位已经基于 `scenarioHash + hookHash`, 不依赖数组 index。
- 当前写入仍会重新序列化整个 JSON 文件; 这是既有行为。要做真正文本级 JSON patch, 需要引入范围定位或 JSON AST 工具, 风险高于本轮必要修复。

## 风险拆解

- 外部修改无关字段: 应重读后重算, 仍可完成目标 hook 操作。
- 外部修改目标 hook: 必须停止, 不覆盖用户内容。
- 写入前文件被外部修改: 应检测当前文本是否等于本轮读取文本; 不相等时重试, 最多 3 次。
- sidecar 损坏: 不应写 settings; 错误文案要可读。
- active hook 已经被手动恢复: 恢复操作应清理 sidecar, 返回 changed=false。

## 范围取舍

本轮先实现“窄范围版本控制”: 重读、重算、写前 compare、三次重试和明确错误。暂不引入文本级 JSON patch。原因:

- 现有 parser 使用 `JSON.parse`, 未保留 token 范围、注释与格式信息。
- 没有现成 `jsonc-parser` 依赖, 新增依赖会扩大验证面。
- 写前 compare + 重试已经能覆盖高频并行写入风险, 且不改变 hook 身份模型。

## 验收标准

1. 禁用/恢复在每次尝试中重新读取 settings 和 sidecar。
2. 若写入前 settings 发生变化, 最多重试 3 次。
3. 外部只改无关字段时, 禁用/恢复继续完成且保留无关字段。
4. 外部改目标 hook 或目标 hook 消失且无 restore point 时, 不写入并返回可读冲突错误。
5. sidecar 损坏时, 不写 settings, UI 显示明确说明。
6. 恢复时 active hook 已存在则清理 restore point, 返回 changed=false。
