# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: https://github.com/Caldis/berth/issues/21

# 描述

记忆视图 (MemoryView) 的动效/反馈打磨, 属 `2026-05-30-memory-source-adapter-layer` 的后续 (来自 critique #5):
- **展开/折叠无过渡**: NoteCard 展开是裸条件渲染 (`{expanded && ...}`), 无高度过渡, 体感生硬。
  应按 frontend-design 规范用 `grid-template-rows` (0fr->1fr) 过渡, 而非直接动 height。
- **跳转高亮环不消失**: 通过关联 (links) 跳转后, 目标卡片的 `focusId` ring (border-primary ring) **永久保留**,
  无解释、不淡出。应改为短暂脉冲 (~2s 后自动清除 focusId), 让高亮表达 "刚跳到这里" 的瞬时语义。

## 复现步骤

- 打开 berth -> 指令 -> 记忆 -> 展开任一条目 (无过渡动画)。
- 展开一条有 "关联" 的笔记 -> 点关联项跳转 -> 目标卡片高亮环一直留着不消失。

## 期望 vs 实际

- 期望: 展开/折叠平滑过渡 (grid-rows, ease-out, 尊重 prefers-reduced-motion)。
- 期望: 跳转高亮短暂脉冲后淡出。
- 实际: 展开/折叠是裸条件渲染, 高亮不会自动清除。
