import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { SettingsContent } from '../../src/renderer/src/components/settings/settings-content'

describe('SettingsContent source placement', () => {
  beforeEach(() => {
    window.api.assets.scanSources = vi.fn(async () => [])
  })

  it('does not render project or local source inventory inside settings', async () => {
    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Appearance')).toBeInTheDocument()
    expect(screen.queryByText('Local Sources')).not.toBeInTheDocument()
    expect(screen.queryByText('Project sources')).not.toBeInTheDocument()
    expect(window.api.assets.scanSources).not.toHaveBeenCalled()
  })
})
