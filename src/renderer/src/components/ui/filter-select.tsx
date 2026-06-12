import { Select as HeroSelect, type SelectProps } from '@heroui/react'
import { cn } from '@/lib/utils'

export type FilterSelectProps<T extends object = object> = SelectProps<T>

const FILTER_SELECT_TRIGGER_CLASSNAME =
  'h-9 min-h-9 border-border bg-background shadow-none data-[hover=true]:bg-muted/40 data-[open=true]:border-ring'

export function FilterSelect<T extends object = object>({
  size = 'sm',
  variant = 'bordered',
  radius = 'md',
  classNames,
  ...props
}: FilterSelectProps<T>): React.ReactElement {
  return (
    <HeroSelect
      size={size}
      variant={variant}
      radius={radius}
      classNames={{
        ...classNames,
        trigger: cn(FILTER_SELECT_TRIGGER_CLASSNAME, classNames?.trigger)
      }}
      {...props}
    />
  )
}
