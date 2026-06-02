import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { Instructions } from '../../src/renderer/src/pages/instructions'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'

function skillAsset(id: string, scope: Asset['scope'], path: string): Asset {
  return {
    id,
    agentId: 'codex',
    category: 'instruction',
    type: 'skill',
    scope,
    name: id,
    path,
    meta: {
      description: `${id} description`
    }
  }
}

describe('Instructions guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [], agentView: 'all', scopeSelection: { mode: 'global' } })
    window.api.memory = {
      list: vi.fn(async () => ({ notes: [], sources: [] })),
      get: vi.fn(async () => null)
    }
  })

  it('shows a feature guide for the Memories tab before the memory list', async () => {
    render(<Instructions activeSection="memories" />)

    expect(await screen.findByText('Memory notes across sources')).toBeInTheDocument()
    expect(screen.getByText(/Berth groups native memory files and durable local notes/)).toBeInTheDocument()
    expect(screen.queryByText('Source types')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('Source types')).toBeInTheDocument()
    expect(screen.queryByText('instructions.guidance.memories.insights.sources.title')).not.toBeInTheDocument()
  })

  it('uses an instructive memory empty state when no sources are found', async () => {
    render(<Instructions activeSection="memories" />)

    expect(await screen.findByText('No memory sources found')).toBeInTheDocument()
    expect(screen.getByText(/Berth looks for native Claude Code memory and united-memory/)).toBeInTheDocument()
  })

  it('filters instruction assets by selected project scope', async () => {
    useAppStore.setState({
      scopeSelection: {
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      },
      assets: [
        skillAsset('User skill', 'user', 'C:/Users/mail/.codex/skills/user/SKILL.md'),
        skillAsset('Project skill', 'project', 'D:/Code/berth/.agents/skills/project/SKILL.md'),
        skillAsset('Other project skill', 'project', 'D:/Code/other/.agents/skills/project/SKILL.md')
      ],
      agentView: 'all'
    })

    render(<Instructions />)

    expect(await screen.findByText('Project skill')).toBeInTheDocument()
    expect(screen.getByText('User skill')).toBeInTheDocument()
    expect(screen.queryByText('Other project skill')).not.toBeInTheDocument()
  })
})
