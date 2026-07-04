import { useTranslation } from 'react-i18next'
import { NoticePanel } from './notice-panel'
import { useAppStore } from '@/stores/app'

/**
 * GH-155 决策⑤: [全局] 视图在后台 deep-index 首轮未完成时的轻量提示 —
 * "已索引 N/M, 结果逐步补全"。保护 "看不到=没有" 心智: 未扫完时用户不会把
 * "暂时看不到" 误判为 "不存在"。完成 (done) / 静默复核 (revalidating) /
 * 不支持 (unsupported) / 非 global scope 一律不渲染。
 *
 * 自订阅组件 (GH-153 T8 不变量): AppLayout 布局壳不新增订阅; 这里只订阅
 * 队列级低频字段 (N/M 按项目粒度变化), 不订阅整个 status 对象 — 扫描期的
 * per-file progress tick 不会重渲染本组件之外的任何布局节点。
 */
export function GlobalIndexingBanner(): React.ReactElement | null {
  const { t } = useTranslation()
  const mode = useAppStore((s) => s.scopeSelection.mode)
  const state = useAppStore((s) => s.assetRuntimeStatus.backgroundIndex?.state)
  const indexed = useAppStore((s) => s.assetRuntimeStatus.backgroundIndex?.indexedProjects ?? 0)
  const total = useAppStore((s) => s.assetRuntimeStatus.backgroundIndex?.totalProjects ?? 0)

  if (mode !== 'global' || state !== 'indexing' || total <= 0) return null

  return (
    <div data-testid="global-indexing-banner">
      <NoticePanel
        tone="info"
        className="mb-4"
        title={t('nav.scanStatus.backgroundIndexing', { indexed, total })}
        message={t('nav.scanStatus.backgroundIndexingHint')}
      />
    </div>
  )
}
