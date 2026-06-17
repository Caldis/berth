import { describe, expect, it } from 'vitest'
import { ALL_WIDGET_IDS } from '../../src/renderer/src/components/dashboard/widget-catalog'
import { getWidgetDefinition, isWidgetRegistered } from '../../src/renderer/src/components/dashboard/widget-registry'

// GH-138: 守护 widget 注册契约 (AC7 低成本扩展) — catalog 加了 widget 但忘在 registry 绑定 icon/
// component 时此测试先红。
describe('widget registry', () => {
  it('registers every catalog widget with an icon and component', () => {
    for (const id of ALL_WIDGET_IDS) {
      expect(isWidgetRegistered(id), `widget "${id}" must be registered`).toBe(true)
      const def = getWidgetDefinition(id)
      expect(def, `widget "${id}" definition`).toBeDefined()
      expect(def?.icon, `widget "${id}" icon`).toBeTruthy()
      expect(def?.component, `widget "${id}" component`).toBeTruthy()
      expect(def?.id).toBe(id)
    }
  })
})
