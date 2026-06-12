import {
  registerAssetHandlers,
  registerDomainHandlers,
  registerSessionHandlers,
  registerSystemHandlers,
  registerUpdateHandlers,
  registerWindowHandlers
} from './handlers'

export function registerAllHandlers(): void {
  registerWindowHandlers()
  registerSystemHandlers()
  registerAssetHandlers()
  registerSessionHandlers()
  registerDomainHandlers()
  registerUpdateHandlers()
}
