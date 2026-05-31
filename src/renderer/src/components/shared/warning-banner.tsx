import { NoticePanel } from './notice-panel'

interface WarningBannerProps {
  title: string
  message: string
  className?: string
}

export function WarningBanner({ title, message, className }: WarningBannerProps): React.ReactElement {
  return <NoticePanel tone="error" title={title} message={message} className={className} />
}
