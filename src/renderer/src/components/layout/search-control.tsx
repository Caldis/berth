import { forwardRef } from 'react'
import { Search } from 'lucide-react'
import { Button, Input, Kbd } from '@/components/ui'
import { cn } from '@/lib/utils'

type SearchDensity = 'chrome' | 'dialog'

interface ChromeSearchInputProps {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  ariaLabel?: string
  shortcutLabel?: string
  density?: SearchDensity
  autoFocus?: boolean
  className?: string
  testId?: string
}

export function searchShortcutLabel(isMac: boolean): string {
  return isMac ? '⌘K' : 'Ctrl+K'
}

export const ChromeSearchInput = forwardRef<HTMLInputElement, ChromeSearchInputProps>(
  function ChromeSearchInput({
    value,
    onValueChange,
    placeholder,
    ariaLabel,
    shortcutLabel,
    density = 'chrome',
    autoFocus,
    className,
    testId
  }, ref) {
    const isDialog = density === 'dialog'

    return (
      <Input
        ref={ref}
        aria-label={ariaLabel ?? placeholder}
        autoFocus={autoFocus}
        data-testid={testId}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        variant="bordered"
        size="sm"
        radius="md"
        startContent={
          <Search className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        }
        endContent={shortcutLabel ? (
          <Kbd className="pointer-events-none hidden bg-muted text-[11px] font-semibold text-muted-foreground md:inline-flex">
            {shortcutLabel}
          </Kbd>
        ) : undefined}
        classNames={{
          base: cn(
            isDialog ? 'w-full' : 'min-w-[12rem] flex-1 sm:w-72 sm:flex-none',
            className
          ),
          inputWrapper: cn(
            'border-border bg-background shadow-none data-[hover=true]:bg-muted/40 group-data-[focus=true]:border-ring',
            isDialog ? 'h-12 min-h-12' : 'h-9 min-h-9'
          ),
          input: 'text-sm placeholder:text-muted-foreground'
        }}
      />
    )
  }
)

interface SearchTriggerButtonProps {
  label: string
  shortcutLabel?: string
  collapsed?: boolean
  title?: string
  className?: string
  onPress: () => void
}

export function SearchTriggerButton({
  label,
  shortcutLabel,
  collapsed = false,
  title,
  className,
  onPress
}: SearchTriggerButtonProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="bordered"
      size="sm"
      radius="md"
      isIconOnly={collapsed}
      aria-label={label}
      title={title}
      onPress={onPress}
      className={cn(
        'titlebar-no-drag h-9 min-h-9 border-border bg-background px-2.5 text-muted-foreground shadow-none data-[hover=true]:bg-muted/40 data-[hover=true]:text-foreground',
        collapsed ? 'w-9 min-w-9 px-0' : 'w-full min-w-0 justify-start gap-2',
        className
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-normal">{label}</span>
          {shortcutLabel && (
            <Kbd className="pointer-events-none bg-muted text-[11px] font-semibold text-muted-foreground">
              {shortcutLabel}
            </Kbd>
          )}
        </>
      )}
    </Button>
  )
}
