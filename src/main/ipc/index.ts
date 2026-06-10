import {
  registerAssetHandlers,
  registerDomainHandlers,
  registerSessionHandlers,
  registerSystemHandlers,
  registerWindowHandlers
} from './handlers'

export function registerAllHandlers(): void {
  registerWindowHandlers()
  registerSystemHandlers()
  registerAssetHandlers()
  registerSessionHandlers()
  registerDomainHandlers()
}
