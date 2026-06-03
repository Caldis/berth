import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LegacyCapabilitiesRedirect, RemovedAgentTeamsInstructionRedirect } from '../../src/renderer/src/App'

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}{location.search}</span>
}

describe('App route compatibility', () => {
  it('redirects legacy capability tab URLs to promoted first-level routes', async () => {
    render(
      <MemoryRouter initialEntries={['/configuration/capabilities?tab=statusLine']}>
        <Routes>
          <Route path="/configuration/capabilities" element={<LegacyCapabilitiesRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/capabilities/status-line')
    })
  })

  it('falls back unknown legacy capability tabs to MCP', async () => {
    render(
      <MemoryRouter initialEntries={['/configuration/capabilities?tab=unknown']}>
        <Routes>
          <Route path="/configuration/capabilities" element={<LegacyCapabilitiesRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/capabilities/mcp')
    })
  })

  it('redirects the removed Agent Teams instruction route to Subagents', async () => {
    render(
      <MemoryRouter initialEntries={['/instructions/agent-teams']}>
        <Routes>
          <Route path="/instructions/agent-teams" element={<RemovedAgentTeamsInstructionRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/instructions/subagents')
    })
  })
})
