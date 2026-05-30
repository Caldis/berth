import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

interface PageErrorBoundaryProps {
  children: ReactNode
  titleKey?: string
  bodyKey?: string
}

interface PageErrorBoundaryInnerProps extends PageErrorBoundaryProps {
  title: string
  body: string
  retryLabel: string
}

interface PageErrorBoundaryState {
  error: Error | null
}

class PageErrorBoundaryInner extends Component<
  PageErrorBoundaryInnerProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Page render failed', error, info.componentStack)
  }

  private retry = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-destructive/25 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h1 className="text-base font-semibold">{this.props.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{this.props.body}</p>
              <button
                type="button"
                onClick={this.retry}
                className="mt-4 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                {this.props.retryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export function PageErrorBoundary({
  children,
  titleKey,
  bodyKey
}: PageErrorBoundaryProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <PageErrorBoundaryInner
      title={titleKey ? t(titleKey) : t('common.error')}
      body={bodyKey ? t(bodyKey) : t('common.error')}
      retryLabel={t('common.retry')}
    >
      {children}
    </PageErrorBoundaryInner>
  )
}
