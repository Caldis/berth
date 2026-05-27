import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

export function SessionDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/sessions')}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="text-xs text-muted-foreground">
            {t('sessions.title')} / Session #{id?.slice(0, 8)}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Session Detail</h1>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      </div>
    </div>
  )
}
