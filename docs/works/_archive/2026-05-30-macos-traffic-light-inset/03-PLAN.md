# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。

- [x] 任务 1: sidebar.tsx logo header 加 `isMac` 平台判定 + macOS 顶部内边距
- [x] 任务 2: 确认非 mac 分支无额外 pt (代码审查)
- [x] 任务 3: pnpm dev 启动 app, 截图确认红绿灯不再遮挡 logo (展开态) — 已确认, 红绿灯独占顶行, logo 下移
- [x] 任务 4: 折叠态共用同一 header 容器, 自动生效 (代码层确认)
- [x] 任务 5: lint / typecheck / test (45) / harness:check 全绿
- [ ] 任务 6: gh project 跟踪 — 阻塞: gh token 缺 project scope, 待用户授权 (见 friction)

## verify 回写
- 第一轮: 机械检查全绿, 但用户 (人工验收者) 指出首版样式欠佳 — 红绿灯距 logo 过近 (gap 仅 ~7px),
  且未用设计 skill 指导。verify 不通过, 退回 implement。
- 第二轮 (本轮): 用 /frontend-design 重做 — 废弃 pt hack, 改为 macOS 专用拖拽带 (h-9, 对齐主内容区顶部
  drag strip) + logo header 恢复 h-14, 间距增至 ~22px。重新启动单实例 (启动前已检查无残留) 截图确认。
- 关联 friction: 20260530-implement-ui-spacing-no-design-skill, 20260530-verify-dev-instance-not-checked。
- 遗留: 任务 6 gh project 需用户授权 token scope (gh auth refresh -s project,read:project), 非代码问题。
- 截图证据: /tmp/berth_v2.png (按约定不入项目目录)。
