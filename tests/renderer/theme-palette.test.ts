import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const globalsCss = fs.readFileSync(path.join(root, 'src/renderer/src/styles/globals.css'), 'utf8')
const usagePage = fs.readFileSync(path.join(root, 'src/renderer/src/pages/usage.tsx'), 'utf8')

describe('renderer theme palette', () => {
  it('uses neutral brand accent tokens instead of the old orange theme accent', () => {
    expect(globalsCss).toContain('--primary: 240 5.9% 10%;')
    expect(globalsCss).toContain('--accent: 240 5.9% 10%;')
    expect(globalsCss).toContain('--sidebar-accent: 240 5.9% 10%;')

    expect(globalsCss).toContain('--primary: 0 0% 98%;')
    expect(globalsCss).toContain('--accent: 0 0% 98%;')
    expect(globalsCss).toContain('--accent-foreground: 240 10% 3.9%;')
    expect(globalsCss).toContain('--sidebar-accent: 0 0% 98%;')
    expect(globalsCss).toContain('--sidebar-accent-foreground: 240 10% 3.9%;')

    expect(globalsCss).not.toMatch(/--(?:accent|sidebar-accent|chart-2):\s*24\.6 95% 53\.1%;/)
  })

  it('uses a unified categorical semantic chart palette (blue/green/amber/violet/pink)', () => {
    // light
    expect(globalsCss).toContain('--chart-1: 217 91% 60%;')
    expect(globalsCss).toContain('--chart-2: 160 84% 39%;')
    expect(globalsCss).toContain('--chart-3: 38 92% 50%;')
    expect(globalsCss).toContain('--chart-4: 258 90% 66%;')
    expect(globalsCss).toContain('--chart-5: 330 81% 60%;')
    // dark (brightened one step for contrast)
    expect(globalsCss).toContain('--chart-1: 213 94% 68%;')
    expect(globalsCss).toContain('--chart-2: 160 65% 52%;')
    expect(globalsCss).toContain('--chart-3: 43 96% 56%;')
    expect(globalsCss).toContain('--chart-4: 255 92% 76%;')
    expect(globalsCss).toContain('--chart-5: 329 87% 70%;')
    // old shadcn contrast palette (mixed unrelated hues) is gone
    expect(globalsCss).not.toContain('--chart-3: 215 16% 47%;')
    expect(globalsCss).not.toContain('--chart-5: 339 45% 50%;')
  })

  it('keeps Usage chart colors tied to shared chart tokens', () => {
    for (const index of [1, 2, 3, 4, 5]) {
      expect(usagePage).toContain(`'hsl(var(--chart-${index}))'`)
    }

    expect(usagePage).not.toMatch(/hsl\(24\.6,\s*95%,\s*53\.1%\)/)
  })
})
