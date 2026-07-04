# 任务清单 (Design 产物 / 活清单) — GH-154

从 02-SPEC 拆解。**顺序执行**: T1/T2 独立小项先行; T3 (最大机械面) → T4 (与 T3 共享对账测试文件) → T5 (typecheck 驱动)。主 session 顺序推进 (T3-T5 触碰共享契约/门禁文件, 不并行)。每项过目标测试后单独提交。

- [x] T1 (D4 → A5): parseMemoryIndex +onMalformed; indexEntries malformed>0 → 记账 + 返回 null (整体回退目录扫描); splitFrontmatter ×2 补豁免注释
  - tests: 纯层 2 用例 (onMalformed 上报畸形链接行 / 真实 fixture 散文 bullet 零误报) + 服务层 1 用例 (回退目录扫描 + 记账一次 + detect 计数), 先红 (2 failed) 后绿; memory 三文件 35/35 回归
  - verify: 不适用 (main 域逻辑)
- [x] T2 (D5 → A6): url-guard +isAllowedRevealPathReal (realpath 注入); handlers.ts openPath 接入 fs.realpathSync
  - tests: url-guard.test.ts +5 用例 (symlink 出根 deny / 正常过 / ENOENT deny / 根解析失败保字面 / 根别名归一放行), 先红 (5 failed) 后绿 34/34
  - verify: 冷启动 smoke reveal 正常 (归 4.0-verify)
- [x] T3 (D1 → A1/A2): typed-ipc.ts (handleIpc + isTrustedIpcSender) + handlers.ts 迁移 + ipc-contract regex 扩面
  - tests: typed-ipc.test.ts (新) 4 用例先红后绿 (主帧透传/子帧 reject+log/非窗口 reject/args 透传); ipc-contract + ipc-registration 回归 9/9; typecheck 探针: 错返回类型+错通道名 → 3 个 TS 错误, 还原绿 (绑定实证)
  - **偏差 (计数)**: 实际注册点 43 (非估算 45); 迁移后 handlers.ts ipcMain 引用归零 (双向 grep)
  - verify: 冷启动 smoke 窗口控制正常 (归 4.0-verify)
- [x] T4 (D2 → A3): sendToWindow + index.ts 5 send 点迁移 + eventsSent regex 扩面
  - tests: ipc-contract 事件三方回归 4/4; 裸 webContents.send 归零 (双向 grep); typecheck 探针: 错 payload → 1 TS 错误, 还原绿
  - verify: 冷启动 smoke 最大化状态推送正常 (归 4.0-verify)
- [x] T5 (D3 → A4): tests/setup.ts mockApi 收紧 satisfies BerthAPI (GH-115 T2 遗留 TODO 兑现)
  - tests: 红名单仅 2 处 (usage.summary 缺 7 字段 / getPreferences 缺 2 字段), 补齐后 typecheck 绿 + 全量 1382 测试回归绿 (零连锁断言改动)
  - verify: 不适用
- [x] 收口: A7 复核 + 全局门禁 + 推送 + CI 旁路 + 冷启动 smoke
  - tests: prepush 全绿 (lint/typecheck/根级 1382 测试/包内/harness:check/baseline); 推 09dad1b0 → CI **success** (三平台绿, 旁路回读确认; flaky 前科用例未复发)
  - verify: 见下节

## verify 证据 (4.0-verify, 2026-07-04)

1. **A7 复核**: url-guard.test.ts 既有 isSafeExternalUrl 覆盖 scheme 白名单 (https/mailto 放行 + 大小写/trim 容错) 与 deny 面 (protocol-relative/scheme-less/空串/garbage) — ⑦ 无新代码, 复核通过。
2. **冷启动 smoke (agent 实例 gh154, CDP 9224)**: ① window 域经 sender 门禁正常 (isMaximized boolean, maximize 往返 true→false, maximized-change 推送经 sendToWindow); ② assets.status ready; ③ shell deny 双路真机验证 — main.log 两条 url-guard denied (reveal-path / external-url), **ipc-guard 零条** (合法主帧调用零误伤)。
3. **类型绑定实证 (探针记录)**: T3 错返回类型+错通道名 → 3 TS 错误; T4 错 payload → 1 TS 错误; 均还原后绿。
4. **机械项**: harness:check 全绿; 全量 1382 测试绿; debt.final 已落账 (incurred 2/repaid 4/net -2, 与 explore 修正后 estimate 一致)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
