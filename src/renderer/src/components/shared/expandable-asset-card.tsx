import { useCallback, useEffect, useState, type ReactNode, type Ref } from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { PluginOriginBadge } from '@/components/shared/plugin-origin-badge'
import { ViewRawButton } from '@/components/shared/view-raw-button'
import { Collapsible, CollapsibleChevron } from '@/components/ui'
import { FOCUS_HIGHLIGHT_CLASS } from '@/hooks/use-focus-target'
import type { Asset } from '@shared/types/asset'

export interface ExpandableAssetCardOrigin {
  pluginId: string
  pluginName?: string
}

export interface ExpandableAssetCardProps {
  /** Asset backing the card; drives the header ScopeBadge + footer ViewRawButton + ShowInExplorer path. */
  asset: Asset
  /** Outer `data-testid` (instructions cards: `instruction-asset-card-${id}`). */
  testId?: string
  /** Outer `id` attribute (McpServerCard: `mcp-card-${id}` — paired with `cardRef` for scrollIntoView). */
  cardId?: string
  /** Forwarded ref to the outer element (McpServerCard scrolls it into view on focus). */
  cardRef?: Ref<HTMLDivElement>
  /** Collapsible content region id, wired to the trigger's `aria-controls`. */
  detailId: string
  /** Leading icon slot — caller passes the full element (size/color preserved per card). */
  icon: ReactNode
  /** Header title (GenericAssetCard prefixes commands with `/`). */
  title: ReactNode
  /** Optional subtitle line beneath the title (path / description / overriddenBy). */
  subtitle?: ReactNode
  /** Optional right-aligned header meta (size / fileCount+lineCount / model+counts / status text). */
  headerMeta?: ReactNode
  /** Plugin origin — renders the clickable PluginOriginBadge in the header (Skill/Generic/Mcp). */
  origin?: ExpandableAssetCardOrigin | null
  /** Cross-page focus jump target: highlight + auto-expand. */
  focused?: boolean
  /** Called once when `focused` flips true (McpServerCard uses it for scrollIntoView). */
  onReveal?: () => void
  /** ViewRawButton label (instructions: localized "View File"; Mcp: omitted → default "View Raw"). */
  viewRawLabel?: string
  /** When set, renders a "Show in Explorer" footer button with this label (instructions only). */
  showInExplorerLabel?: string
  /** Expanded body — each card keeps its own DetailRows (incl. the footer ScopeBadge DetailRow). */
  children: ReactNode
}

/**
 * Shared scaffold for the four expandable asset cards (GH-115 Issue #5):
 * MemoryCard / SkillCard / GenericAssetCard (instructions) + McpServerCard
 * (capabilities). Converges the ~330-line duplicated shell: outer
 * className/FOCUS_HIGHLIGHT, the flex-stretch header (button trigger +
 * optional PluginOriginBadge), CollapsibleChevron, the focused→expand effect,
 * and the DetailRow/ViewRawButton/ShowInExplorer footer.
 *
 * Behavior/DOM is preserved verbatim from the originals (testids, ids,
 * aria-controls, class strings) — this is a pure de-dup, not a redesign. The
 * manual Collapsible + CollapsibleChevron stays (Accordion migration is the
 * separate heroui-followup issue).
 */
export function ExpandableAssetCard({
  asset,
  testId,
  cardId,
  cardRef,
  detailId,
  icon,
  title,
  subtitle,
  headerMeta,
  origin,
  focused = false,
  onReveal,
  viewRawLabel,
  showInExplorerLabel,
  children
}: ExpandableAssetCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)

  // Jumped-to from another page: expand (and let the caller scroll into view).
  useEffect(() => {
    if (!focused) return
    onReveal?.()
    setExpanded(true)
    // onReveal is a stable callback per render; tracking it would re-fire on every
    // render. Mirror the originals which depend on [focused] only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div
      ref={cardRef}
      data-testid={testId}
      id={cardId}
      className={cn('rounded-lg border bg-card transition-colors hover:bg-accent/5', focused ? FOCUS_HIGHLIGHT_CLASS : 'border-border')}
    >
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          {icon}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{title}</span>
              <ScopeBadge scope={asset.scope} />
            </div>
            {subtitle}
          </div>
          {headerMeta}
          <CollapsibleChevron open={expanded} />
        </button>
        {origin && (
          <div className="flex shrink-0 items-center pr-3">
            <PluginOriginBadge pluginId={origin.pluginId} pluginName={origin.pluginName} />
          </div>
        )}
      </div>

      <Collapsible
        open={expanded}
        id={detailId}
        className="border-t border-border px-4 py-3 space-y-2"
        unmountOnExit
      >
        {children}

        <div className="flex gap-2 pt-1">
          <ViewRawButton asset={asset} label={viewRawLabel} />
          {showInExplorerLabel && (
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              <FolderOpen className="h-3 w-3" />
              {showInExplorerLabel}
            </button>
          )}
        </div>
      </Collapsible>
    </div>
  )
}
