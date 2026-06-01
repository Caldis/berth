import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { Instructions } from '../../src/renderer/src/pages/instructions'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('Instructions guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [], agentView: 'all' })
    window.api.memory = {
      list: vi.fn(async () => ({ notes: [], sources: [] })),
      get: vi.fn(async () => null)
    }
  })

  it('shows a feature guide for the Memories tab before the memory list', async () => {
    render(<Instructions />)

    fireEvent.click(screen.getByRole('button', { name: /Memories/ }))

    expect(await screen.findByText('Memory notes across sources')).toBeInTheDocument()
    expect(screen.getByText(/Berth groups native memory files and durable local notes/)).toBeInTheDocument()
    expect(screen.queryByText('Source types')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('Source types')).toBeInTheDocument()
    expect(screen.queryByText('instructions.guidance.memories.insights.sources.title')).not.toBeInTheDocument()
  })

  it('uses an instructive memory empty state when no sources are found', async () => {
    render(<Instructions />)

    fireEvent.click(screen.getByRole('button', { name: /Memories/ }))

    expect(await screen.findByText('No memory sources found')).toBeInTheDocument()
    expect(screen.getByText(/Berth looks for native Claude Code memory and united-memory/)).toBeInTheDocument()
  })
})
