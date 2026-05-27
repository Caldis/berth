import { useTranslation } from 'react-i18next'
import { MessageSquare } from 'lucide-react'

export function Sessions(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('sessions.title')}</h1>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            placeholder={t('sessions.filter')}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-1"
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('sessions.noSessions')}</p>
      </div>
    </div>
  )
}
