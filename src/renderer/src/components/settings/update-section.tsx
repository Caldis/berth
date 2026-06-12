import { useTranslation } from 'react-i18next'
import { Download, RefreshCw } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import { useUpdate } from '@/hooks/use-update'

const RELEASES_URL = 'https://github.com/Caldis/berth/releases'

/**
 * GH-124: in-card update block under Settings → About. Covers the full
 * update:state machine; on unsigned macOS (platformLimited) download/install
 * are replaced by a link to the releases page.
 */
export function UpdateSection(): React.JSX.Element {
  const { t } = useTranslation()
  const { state, preferences, check, download, install, setAutoDownload } = useUpdate()

  const busy = state.phase === 'checking' || state.phase === 'downloading'

  const statusText = (): string => {
    switch (state.phase) {
      case 'checking':
        return t('settings.update.checking')
      case 'available':
        return t('settings.update.available', { version: state.version ?? '' })
      case 'not-available':
        return t('settings.update.upToDate')
      case 'downloading':
        return t('settings.update.downloading', { percent: state.percent ?? 0 })
      case 'downloaded':
        return t('settings.update.downloaded', { version: state.version ?? '' })
      case 'error':
        return t('settings.update.error', { message: state.error ?? '' })
      default:
        return t('settings.update.idle')
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3" data-testid="update-section">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" data-testid="update-status">
          {statusText()}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {state.phase === 'available' && state.platformLimited && (
            <Button
              size="sm"
              variant="flat"
              startContent={<Download className="h-3.5 w-3.5" />}
              onPress={() => void window.api?.shell.openExternal(RELEASES_URL)}
              data-testid="update-go-to-downloads"
            >
              {t('settings.update.goToDownloads')}
            </Button>
          )}
          {state.phase === 'available' && !state.platformLimited && (
            <Button
              size="sm"
              color="primary"
              startContent={<Download className="h-3.5 w-3.5" />}
              onPress={download}
              data-testid="update-download"
            >
              {t('settings.update.download')}
            </Button>
          )}
          {state.phase === 'downloaded' && !state.platformLimited && (
            <Button size="sm" color="primary" onPress={install} data-testid="update-install">
              {t('settings.update.installRestart')}
            </Button>
          )}
          {state.phase !== 'available' && state.phase !== 'downloaded' && (
            <Button
              size="sm"
              variant="flat"
              isDisabled={busy}
              startContent={<RefreshCw className="h-3.5 w-3.5" />}
              onPress={check}
              data-testid="update-check"
            >
              {t('settings.update.check')}
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t('settings.update.autoDownload')}</p>
        <Switch
          size="sm"
          isSelected={preferences.autoDownload}
          onValueChange={setAutoDownload}
          aria-label={t('settings.update.autoDownload')}
          data-testid="update-auto-download"
        />
      </div>
    </div>
  )
}
