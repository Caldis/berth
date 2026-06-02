import * as fs from 'fs'
import * as path from 'path'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ScopeBadge } from '../../src/renderer/src/components/shared/scope-badge'

const root = process.cwd()
const instructionsPage = fs.readFileSync(path.join(root, 'src/renderer/src/pages/instructions.tsx'), 'utf8')
const scopeBadgeSource = fs.readFileSync(path.join(root, 'src/renderer/src/components/shared/scope-badge.tsx'), 'utf8')
const categoryColorPattern = /(?:bg|text|border)-(?:blue|green|purple|orange)/
const scopeLabels = {
  user: 'User',
  project: 'Project',
  enterprise: 'Enterprise',
  session: 'Session'
} as const

describe('ScopeBadge palette', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders all scopes with neutral category colors', () => {
    render(
      <>
        {Object.keys(scopeLabels).map((scope) => (
          <ScopeBadge key={scope} scope={scope as keyof typeof scopeLabels} />
        ))}
      </>
    )

    for (const label of Object.values(scopeLabels)) {
      const badge = screen.getByText(label)
      expect(badge.className).toContain('bg-zinc-500/10')
      expect(badge.className).toContain('text-zinc-700')
      expect(badge.className).toContain('dark:text-zinc-300')
      expect(badge.className).not.toMatch(categoryColorPattern)
    }
  })

  it('keeps scope color tables from reintroducing category colors', () => {
    expect(scopeBadgeSource).not.toMatch(categoryColorPattern)
    expect(instructionsPage).not.toMatch(/function ScopeBadge|scopeColors|const colors: Record/)
  })
})
