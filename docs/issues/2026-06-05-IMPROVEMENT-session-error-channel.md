# 描述
- GH-105 explore 审计发现: sessions 列表与 session-detail 页**没有错误状态通道**, IPC 失败被当作空态展示, 用户无法区分"无数据"与"加载失败"。
- 属产品健壮性缺口 (AC7 状态完备的一部分), 但需要 hook/IPC 改动, 超出 GH-105 纯展示层重构的验收范围, 故拆出跟踪。

# 重现步骤
- `hooks/use-ipc.ts` 的 `useSessions()` 仅返回 `{ sessions, loading, stale }`, 无 `error`。
- `useSessionDetail(id)` 仅返回 `{ detail, loading }`, 无 `error`。
- 当 `window.api.sessions.list` / `sessions.get` IPC 抛错或拒绝时, 页面回退到 EmptyState, 与真正无数据的渲染一致 (`pages/sessions.tsx`、`pages/session-detail.tsx`)。

# 预期结果
- 加载失败时显示明确的错误态 (HeroUI Alert / NoticePanel) + 重试入口, 与空态区分。

# 实际结果
- 失败静默回退为空态, 误导用户。

# 解决方案
- 在 `useSessions` / `useSessionDetail` 增加 `error` 通道 (捕获 IPC reject), 页面据此渲染错误态 (复用 ui/Alert) + 重试。
- 同步更新对应 renderer 测试覆盖错误分支。
