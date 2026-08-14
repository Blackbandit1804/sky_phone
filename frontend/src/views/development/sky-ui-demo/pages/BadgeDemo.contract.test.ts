import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./BadgeDemo.vue', import.meta.url), 'utf8')

describe('BadgeDemo', () => {
  it('uses the shared interactive Glass system for the profile action', () => {
    expect(source).toContain('SkyGlass,')
    expect(source).toMatch(
      /<SkyGlass[\s\S]*?aria-label="Profile, 5 notifications"[\s\S]*?class="badge-demo__profile-action"[\s\S]*?component="button"[\s\S]*?>/,
    )
    expect(source).not.toContain('<SkyLink aria-label="Profile')
  })

  it('keeps the profile action circular, accessible, and token sized', () => {
    expect(source).toMatch(
      /\.badge-demo__profile-action\s*\{[^}]*width:\s*var\(--sky-touch-target, 44px\)[^}]*height:\s*var\(--sky-touch-target, 44px\)[^}]*border:\s*0[^}]*border-radius:\s*50%[^}]*color:\s*inherit/s,
    )
    expect(source).toMatch(
      /\.badge-demo__profile-action:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--sky-app-accent, #007aff\)/s,
    )
    expect(source).toMatch(
      /\.badge-demo__icon-badge\s*\{[^}]*inset-block-start:\s*-2px[^}]*inset-inline-end:\s*-6px/s,
    )
  })
})
