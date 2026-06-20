// Normalizes Claude / Codex hook config shapes into a flat list for validation.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import { asRecord, booleanValue, stringValue } from './value-guards'

export interface CollectedHook {
  event: string
  command?: string
  commandWindows?: string
  shell?: string
  type?: string
  url?: string
  server?: string
  tool?: string
  prompt?: string
  async?: boolean
  args: string[]
}

export function collectHooks(hooks: Record<string, unknown> | undefined): CollectedHook[] {
  if (!hooks) return []
  const result: CollectedHook[] = []

  for (const [event, handlers] of Object.entries(hooks)) {
    const handlerList = Array.isArray(handlers) ? handlers : [handlers]
    for (const handler of handlerList) {
      const handlerRecord = asRecord(handler) ?? {}
      const nestedHooks = Array.isArray(handlerRecord.hooks)
        ? handlerRecord.hooks
        : [handlerRecord]
      for (const hook of nestedHooks) {
        const hookRecord = asRecord(hook) ?? {}
        result.push({
          event,
          command: stringValue(hookRecord.command),
          commandWindows:
            stringValue(hookRecord.commandWindows) ?? stringValue(hookRecord.command_windows),
          shell: stringValue(hookRecord.shell),
          type: stringValue(hookRecord.type),
          url: stringValue(hookRecord.url),
          server: stringValue(hookRecord.server),
          tool: stringValue(hookRecord.tool),
          prompt: stringValue(hookRecord.prompt),
          async: booleanValue(hookRecord.async) ?? booleanValue(hookRecord.async_),
          args: Array.isArray(hookRecord.args)
            ? hookRecord.args.filter((arg): arg is string => typeof arg === 'string')
            : []
        })
      }
    }
  }

  return result
}
