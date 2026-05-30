import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { AssetGuidePanel } from '../../src/renderer/src/components/shared/asset-guide-panel'
import { instructionGuideMap } from '../../src/renderer/src/lib/asset-guidance'

describe('AssetGuidePanel', () => {
  beforeEach(() => {
    window.api.shell.openExternal = vi.fn(async () => {})
  })

  it('renders a provider-neutral explanation and official docs links', () => {
    render(<AssetGuidePanel guide={instructionGuideMap.skills} />)

    expect(screen.getByText('Reusable workflow packages')).toBeInTheDocument()
    expect(screen.getByText(/Skills package repeatable procedures/)).toBeInTheDocument()
    expect(screen.getByText(/The same concept can be backed by Claude Code skills/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Claude Code skills/ })).toBeInTheDocument()
  })

  it('opens documentation through the shell bridge', async () => {
    render(<AssetGuidePanel guide={instructionGuideMap.skills} />)

    fireEvent.click(screen.getByRole('button', { name: /Claude Code skills/ }))

    await waitFor(() => {
      expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://code.claude.com/docs/en/skills')
    })
  })
})
