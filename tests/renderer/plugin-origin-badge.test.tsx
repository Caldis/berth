import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { PluginOriginBadge } from '../../src/renderer/src/components/shared/plugin-origin-badge'

const PLUGIN_ID = 'plugin:acme/demo@1.0.0'

function LocationProbe(): React.ReactElement {
  const loc = useLocation()
  return <div data-testid="loc">{`${loc.pathname}|${JSON.stringify(loc.state)}`}</div>
}

describe('PluginOriginBadge (GH-112 S3)', () => {
  it('renders the plugin name with the puzzle affordance', () => {
    render(
      <MemoryRouter initialEntries={['/instructions/skills']}>
        <PluginOriginBadge pluginId={PLUGIN_ID} pluginName="demo" />
      </MemoryRouter>
    )
    expect(screen.getByText('From demo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View plugin demo' })).toBeInTheDocument()
  })

  it('jumps to the plugins page carrying the plugin id as focus state', () => {
    render(
      <MemoryRouter initialEntries={['/instructions/skills']}>
        <PluginOriginBadge pluginId={PLUGIN_ID} pluginName="demo" />
        <LocationProbe />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByTestId(`plugin-origin-badge-${PLUGIN_ID}`))
    const loc = screen.getByTestId('loc').textContent ?? ''
    expect(loc).toContain('/capabilities/plugins')
    expect(loc).toContain(PLUGIN_ID)
  })

  it('falls back to the plugin id when no name is given', () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <PluginOriginBadge pluginId={PLUGIN_ID} />
      </MemoryRouter>
    )
    expect(screen.getByText(`From ${PLUGIN_ID}`)).toBeInTheDocument()
  })
})
