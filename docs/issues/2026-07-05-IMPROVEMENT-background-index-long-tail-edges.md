# IMPROVEMENT: background deep-index 三处长尾边缘 (GH-155 双轴评审立据, 接受不入批)

状态: OPEN (低优 — 均为窄窗口/有界降级, 主链路正确性不受影响)

## 边缘清单

1. **非 default 视图活跃且 default 缓存条目缺失时, 后台成果跳过持久化** (`runtime.ts` applyBackgroundProjectResult `persist = null` 分支)。触发窗口: 冷启无持久快照 + 首个 default commit 前即切入项目视图。内存 live 视图仍正确折叠, 下次 default 视图 commit 的全量 save 兜底; 代价仅为重启后该批 deep 行重扫。可选修法: default 条目缺失时降级为 "折叠结果暂存 + 首个 default commit 时合并落盘"。
2. **failed 项目计入 indexedProjects, 无用户可见信号、revalidation 无退避**。队列对扫描失败 (目录删除/不可读/超时被杀) 的 root 记 processed 保证轮次收敛 (banner 能到 done), 但 N/M 语义上把失败也算 "已索引"; 每轮 revalidation 无条件重试, 真 wedge 项目每轮烧一个 deep 超时窗口 (10min)。可选修法: processed 恢复 verdict + 失败退避 (指数或封顶次数) + hover 面板显示失败项目数。
3. **排队请求落在已死 child 的 session 上要等满看门狗** (`helper-host.ts` dispatch 注释自认)。前台扫描排在 crash 的 deep 请求后时, 对已死 child postMessage 无效, 等 watchdog 到期才失败重试。窄概率 (需 child 恰在队列等待期间死亡); 可选修法: 取槽时校验 `this.child !== session.child` 快速失败换新 session。

## 来源

GH-155 verify 双轴评审 (Spec 轴窄边缘① + Standards 轴 M1 残余/m3), 2026-07-05。主险 (B1 graft 丢行 / M1 看门狗互杀 / preempt livelock) 已在 GH-155 T9/T10 修复, 本 issue 只保留裁决为 "接受 + 后续改进" 的长尾。任务态见 `docs/works/2026-07-04-gh-155-background-deep-index-all-projects/`。
