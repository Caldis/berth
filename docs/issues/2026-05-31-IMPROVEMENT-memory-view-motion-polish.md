# 描述
记忆视图 (MemoryView) 的动效/反馈打磨, 属 `2026-05-30-memory-source-adapter-layer` 的后续 (来自 critique #5):

# GitHub
- Issue: https://github.com/Caldis/berth/issues/21
- Number: #21

- **展开/折叠无过渡**: NoteCard 展开是裸条件渲染 (`{expanded && ...}`), 无高度过渡, 体感生硬。
  应按 frontend-design 规范用 `grid-template-rows` (0fr→1fr) 过渡, 而非直接动 height。
- **跳转高亮环不消失**: 通过关联 (links) 跳转后, 目标卡片的 `focusId` ring (border-primary ring) **永久保留**,
  无解释、不淡出。应改为短暂脉冲 (~2s 后自动清除 focusId), 让高亮表达 "刚跳到这里" 的瞬时语义。

# 重现步骤
- 打开 berth → 指令 → 记忆 → 展开任一条目 (无过渡动画)。
- 展开一条有 "关联" 的笔记 → 点关联项跳转 → 目标卡片高亮环一直留着不消失。

# 预期结果
- 展开/折叠平滑过渡 (grid-rows, ease-out, 尊重 prefers-reduced-motion)。
- 跳转高亮短暂脉冲后淡出。

# 解决方案
- NoteCard 详情区用 grid-template-rows 过渡包裹; 仅动 transform/opacity 与 grid-rows。
- MemoryView 在 setFocusId 后起一个 ~2s timer 清空 focusId; reduced-motion 时禁用脉冲。
