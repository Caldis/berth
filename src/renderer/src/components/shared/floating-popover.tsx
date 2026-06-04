import * as Popover from '@radix-ui/react-popover'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type ReactElement,
  type ReactNode
} from 'react'
import { cn } from '@/lib/utils'

type PopoverContentProps = ComponentPropsWithoutRef<typeof Popover.Content>

interface FloatingPopoverProps {
  trigger: ReactElement
  children: ReactNode
  id?: string
  triggerTestId?: string
  contentTestId?: string
  triggerClassName?: string
  contentClassName?: string
  side?: PopoverContentProps['side']
  align?: PopoverContentProps['align']
  sideOffset?: number
  alignOffset?: number
  collisionPadding?: PopoverContentProps['collisionPadding']
  closeDelay?: number
  role?: PopoverContentProps['role']
}

const DEFAULT_CLOSE_DELAY_MS = 180

export function FloatingPopover({
  trigger,
  children,
  id,
  triggerTestId,
  contentTestId,
  triggerClassName,
  contentClassName,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 16,
  closeDelay = DEFAULT_CLOSE_DELAY_MS,
  role
}: FloatingPopoverProps): React.ReactElement {
  const generatedId = useId()
  const contentId = id ?? `floating-popover-${generatedId}`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const openPopover = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, closeDelay)
  }, [clearCloseTimer, closeDelay])

  const handleBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget
    if (
      nextTarget instanceof Node &&
      (triggerRef.current?.contains(nextTarget) || contentRef.current?.contains(nextTarget))
    ) {
      return
    }
    scheduleClose()
  }, [scheduleClose])

  useEffect(() => clearCloseTimer, [clearCloseTimer])

  if (!isValidElement(trigger)) {
    throw new Error('FloatingPopover trigger must be a valid React element')
  }

  const triggerWithAria = cloneElement(trigger, {
    'aria-describedby': open ? contentId : undefined,
    'aria-expanded': open
  } as Partial<unknown>)

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <span
        ref={triggerRef}
        data-testid={triggerTestId}
        className={cn('inline-flex', triggerClassName)}
        onPointerEnter={openPopover}
        onPointerLeave={scheduleClose}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={handleBlur}
      >
        <Popover.Trigger asChild>{triggerWithAria}</Popover.Trigger>
      </span>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          id={contentId}
          role={role}
          data-testid={contentTestId}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          hideWhenDetached
          onPointerEnter={openPopover}
          onPointerLeave={scheduleClose}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          onFocus={openPopover}
          onBlur={handleBlur}
          className={cn(
            'z-50 max-w-[calc(100vw-2rem)] outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150',
            contentClassName ?? 'rounded-md border border-border bg-popover text-popover-foreground shadow-lg'
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
