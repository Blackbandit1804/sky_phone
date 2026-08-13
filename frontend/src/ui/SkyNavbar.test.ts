import { readFileSync } from 'node:fs'

import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyNavbar from '@/ui/SkyNavbar.vue'

const foundationStyles = readFileSync(
  new URL('./foundation.css', import.meta.url),
  'utf8',
)

describe('SkyNavbar', () => {
  it('keeps the compact centered header as the default', async () => {
    const html = await renderToString(
      createSSRApp(SkyNavbar, { title: 'Account' }),
    )

    expect(html).toContain('sky-navbar--compact')
    expect(html).toContain('<h1 class="sky-navbar__title">Account</h1>')
  })

  it('exposes the large-title header without changing heading semantics', async () => {
    const html = await renderToString(
      createSSRApp(SkyNavbar, {
        title: 'Settings',
        variant: 'large',
      }),
    )

    expect(html).toContain('sky-navbar--large')
    expect(html).toContain('<h1 class="sky-navbar__title">Settings</h1>')
  })

  it('does not reserve a second navigation row for the large title', () => {
    const largeNavbarRule = foundationStyles.match(
      /\.sky-navbar--large\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations

    expect(largeNavbarRule).toBeDefined()
    expect(largeNavbarRule).toContain(
      'grid-template-rows: var(--sky-navbar-large-title-height)',
    )
    expect(largeNavbarRule).not.toContain('var(--sky-navbar-height)')
  })

  it('exposes the optional surface back affordance for detail screens', async () => {
    const html = await renderToString(
      createSSRApp(SkyNavbar, {
        backAppearance: 'surface',
        backLabel: 'Back to Settings',
        showBack: true,
        title: 'Account',
      }),
    )

    expect(html).toContain('sky-navbar__back--surface')
    expect(html).toContain('aria-label="Back to Settings"')
  })
})
