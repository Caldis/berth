import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { FeatureGuidePanel } from '../../src/renderer/src/components/shared/feature-guide-panel'
import type { FeatureGuideDefinition } from '../../src/renderer/src/lib/feature-guidance'

const guide: FeatureGuideDefinition = {
  id: 'test-guide',
  titleKey: 'instructions.guidance.skills.title',
  summaryKey: 'instructions.guidance.skills.summary',
  insightKeys: [
    {
      titleKey: 'capabilities.hooks.intro.tips.trigger.title',
      bodyKey: 'capabilities.hooks.intro.tips.trigger.body'
    },
    {
      titleKey: 'capabilities.hooks.intro.tips.handler.title',
      bodyKey: 'capabilities.hooks.intro.tips.handler.body'
    }
  ],
  pointKeys: [
    'instructions.guidance.skills.points.role',
    'instructions.guidance.skills.points.scope',
    'instructions.guidance.skills.points.review'
  ],
  providerMappings: [
    {
      provider: 'Claude Code',
      config: 'SKILL.md',
      meaningKey: 'instructions.guidance.skills.providers.claude'
    }
  ],
  docLinks: [
    {
      labelKey: 'instructions.guidance.docs.claudeSkills',
      url: 'https://code.claude.com/docs/en/skills'
    }
  ]
}

describe('FeatureGuidePanel', () => {
  beforeEach(() => {
    window.api.shell.openExternal = vi.fn(async () => {})
  })

  it('renders a compact feature guide with evidence and reusable insight cards', () => {
    render(
      <FeatureGuidePanel
        guide={guide}
        evidence={[
          { labelKey: 'assetGuide.evidence.assets', value: 4 },
          { labelKey: 'assetGuide.evidence.sources', value: 2 },
          { labelKey: 'assetGuide.evidence.risks', value: 1, tone: 'warning' }
        ]}
      />
    )

    expect(screen.getByText('Reusable workflow packages')).toBeInTheDocument()
    expect(screen.getByText(/Skills package repeatable procedures/)).toBeInTheDocument()
    expect(screen.getByText('Trigger point')).toBeInTheDocument()
    expect(screen.getByText(/runs when the agent reaches/)).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('assets')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('risks')).toBeInTheDocument()
  })

  it('keeps dense details behind an explicit disclosure', () => {
    render(<FeatureGuidePanel guide={guide} />)

    expect(screen.queryByText(/The same concept can be backed by Claude Code skills/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Details/ }))

    expect(screen.getByText(/The same concept can be backed by Claude Code skills/)).toBeInTheDocument()
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText('SKILL.md')).toBeInTheDocument()
  })

  it('opens official docs through the shell bridge', async () => {
    render(<FeatureGuidePanel guide={guide} />)

    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    fireEvent.click(screen.getByRole('button', { name: /Claude Code skills/ }))

    await waitFor(() => {
      expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://code.claude.com/docs/en/skills')
    })
  })
})
