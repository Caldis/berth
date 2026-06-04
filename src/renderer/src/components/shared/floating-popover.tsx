import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  hide,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Padding,
  type Placement
} from '@floating-ui/react'
import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useState,
  type HTMLProps,
  type ReactElement,
  type ReactNode
} from 'react'
import { cn } from '@/lib/utils'

type FloatingSide = 'top' | 'right' | 'bottom' | 'left'
type FloatingAlign = 'start' | 'center' | 'end'
type FloatingRole = 'tooltip' | 'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'grid' | 'tree'

interface FloatingPopoverProps {
  trigger: ReactElement
  children: ReactNode
  id?: string
  triggerTestId?: string
  contentTestId?: string
  triggerClassName?: string
  contentClassName?: string
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  alignOffset?: number
  collisionPadding?: Padding
  closeDelay?: number
  safePolygonBuffer?: number
  role?: FloatingRole
}

function floatingPlacement(side: FloatingSide, align: FloatingAlign): Placement {
  return align === 'center' ? side : `${side}-${align}`
}

const DEFAULT_CLOSE_DELAY_MS = 80
const DEFAULT_SAFE_POLYGON_BUFFER_PX = 8

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
  safePolygonBuffer: safePolygonBufferProp,
  role
}: FloatingPopoverProps): React.ReactElement {
  const generatedId = useId()
  const contentId = id ?? `floating-popover-${generatedId}`
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context, middlewareData, isPositioned, placement } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: floatingPlacement(side, align),
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({ mainAxis: sideOffset, alignmentAxis: alignOffset }),
      flip({ padding: collisionPadding }),
      shift({ padding: collisionPadding }),
      hide({ padding: collisionPadding })
    ]
  })
  const safePolygonBuffer = safePolygonBufferProp ?? Math.max(DEFAULT_SAFE_POLYGON_BUFFER_PX, sideOffset)
  const hoverBridge = useMemo(
    () => safePolygon({ buffer: safePolygonBuffer, requireIntent: false }),
    [safePolygonBuffer]
  )
  const hover = useHover(context, {
    mouseOnly: true,
    delay: { open: 0, close: closeDelay },
    handleClose: hoverBridge
  })
  const focus = useFocus(context)
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const floatingRole = useRole(context, { enabled: Boolean(role), role })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    floatingRole
  ])

  if (!isValidElement(trigger)) {
    throw new Error('FloatingPopover trigger must be a valid React element')
  }

  const triggerProps = trigger.props as { className?: string }
  const triggerWithAria = cloneElement(trigger, getReferenceProps({
    ...triggerProps,
    ref: refs.setReference,
    'data-testid': triggerTestId,
    'aria-describedby': open ? contentId : undefined,
    'aria-expanded': open,
    className: cn(triggerProps.className, triggerClassName)
  } as HTMLProps<Element>) as Partial<unknown>)
  const referenceHidden = middlewareData.hide?.referenceHidden === true

  return (
    <>
      {triggerWithAria}
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            {...getFloatingProps({
              id: contentId,
              role,
              'data-testid': contentTestId,
              'data-placement': placement,
              style: {
                ...floatingStyles,
                visibility: referenceHidden ? 'hidden' : undefined,
                opacity: isPositioned ? undefined : 0,
                pointerEvents: isPositioned ? undefined : 'none'
              }
            } as HTMLProps<HTMLElement>)}
            id={contentId}
            role={role}
            data-testid={contentTestId}
            data-placement={placement}
            className="z-50 w-max max-w-[calc(100vw-2rem)] outline-none"
          >
            <div
              className={cn(
                'max-w-[calc(100vw-2rem)] outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150',
                contentClassName ?? 'rounded-md border border-border bg-popover text-popover-foreground shadow-lg'
              )}
            >
              {children}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
