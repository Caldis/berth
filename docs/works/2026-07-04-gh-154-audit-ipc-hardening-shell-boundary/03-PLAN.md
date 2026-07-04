# 任务清单 (Design 产物 / 活清单) — GH-154

从 02-SPEC 拆解。**顺序执行**: T1/T2 独立小项先行; T3 (最大机械面) → T4 (与 T3 共享对账测试文件) → T5 (typecheck 驱动)。主 session 顺序推进 (T3-T5 触碰共享契约/门禁文件, 不并行)。每项过目标测试后单独提交。

- [x] T1 (D4 → A5): parseMemoryIndex +onMalformed; indexEntries malformed>0 → 记账 + 返回 null (整体回退目录扫描); splitFrontmatter ×2 补豁免注释
  - tests: 纯层 2 用例 (onMalformed 上报畸形链接行 / 真实 fixture 散文 bullet 零误报) + 服务层 1 用例 (回退目录扫描 + 记账一次 + detect 计数), 先红 (2 failed) 后绿; memory 三文件 35/35 回归
  - verify: 不适用 (main 域逻辑)
- [x] T2 (D5 → A6): url-guard +isAllowedRevealPathReal (realpath 注入); handlers.ts openPath 接入 fs.realpathSync
  - tests: url-guard.test.ts +5 用例 (symlink 出根 deny / 正常过 / ENOENT deny / 根解析失败保字面 / 根别名归一放行), 先红 (5 failed) 后绿 34/34
  - verify: 冷启动 smoke reveal 正常 (归 4.0-verify)
- [ ] T3 (D1 → A1/A2): typed-ipc.ts (handleIpc + isTrustedIpcSender) + handlers.ts 45 点迁移 + ipc-contract regex 扩面
  - tests: typed-ipc.test.ts (新) 先红后绿 (门禁 reject+log / 主帧透传); ipc-contract + ipc-registration 回归; typecheck 错误探针 (临时错参 → 红 → 移除, 结果记 PLAN)
  - verify: 冷启动 smoke 窗口控制正常 (归 4.0-verify)
- [ ] T4 (D2 → A3): sendToWindow + index.ts 5 send 点迁移 + eventsSent regex 扩面
  - tests: ipc-contract 事件三方回归; typecheck 错 payload 探针
  - verify: 冷启动 smoke 最大化状态推送正常 (归 4.0-verify)
- [ ] T5 (D3 → A4): tests/setup.ts mockApi 收紧 satisfies BerthAPI (typecheck 红名单驱动补形状)
  - tests: typecheck 绿 + 全量 renderer 回归 (>5 文件连锁则停下回 design)
  - verify: 不适用
- [ ] 收口: A7 复核 (url-guard scheme 既有用例点名) + 全局门禁 + 推送 + CI 旁路 + 冷启动 smoke
  - tests: A0 (prepush 全绿)
  - verify: 4.0-verify 汇总证据

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
