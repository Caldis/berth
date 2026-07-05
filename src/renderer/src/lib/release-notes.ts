import type { UpdateReleaseNote } from '@shared/types/ipc'

/**
 * GH-156: release-note helpers for the sidebar update indicator.
 *
 * GitHub-provider notes are Atom-feed HTML (see GitHubProvider in
 * electron-updater). We never inject that HTML — `releaseNoteHtmlToText`
 * extracts readable text from a detached DOMParser document, where scripts
 * never execute and resources never load.
 */

const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'TABLE', 'TR', 'BLOCKQUOTE', 'PRE'])
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE'])

function nodeToText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const tag = (node as Element).tagName
  if (SKIPPED_TAGS.has(tag)) return ''
  if (tag === 'BR') return '\n'
  const inner = Array.from(node.childNodes).map(nodeToText).join('')
  if (tag === 'LI') return `• ${inner.trim()}\n`
  if (BLOCK_TAGS.has(tag)) return `${inner}\n`
  return inner
}

export function releaseNoteHtmlToText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return nodeToText(doc.body)
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function versionTag(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

/** Provider order is newest-first; a multi-version jump reads oldest → newest. */
export function formatVersionRange(entries: readonly UpdateReleaseNote[], fallbackVersion?: string): string {
  const versions = entries.map((entry) => entry.version).filter((version) => version.length > 0)
  if (versions.length === 0) return fallbackVersion ? versionTag(fallbackVersion) : ''
  if (versions.length === 1) return versionTag(versions[0])
  return `${versionTag(versions[versions.length - 1])} → ${versionTag(versions[0])}`
}
