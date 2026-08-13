import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const viewSource = readFileSync(
  new URL('./SkyUiKitchenSinkView.vue', import.meta.url),
  'utf8',
)
const appSource = readFileSync(
  new URL('../../App.vue', import.meta.url),
  'utf8',
)
const routerSource = readFileSync(
  new URL('../../router/index.ts', import.meta.url),
  'utf8',
)
const settingsSource = readFileSync(
  new URL('../apps/SettingsApp.vue', import.meta.url),
  'utf8',
)

const publicIndexSources = [
  '../../ui/index.ts',
  '../../ui/controls/index.ts',
  '../../ui/overlays/index.ts',
  '../../ui/settings/index.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

const publicComponents = Array.from(
  new Set(
    publicIndexSources.flatMap((source) =>
      Array.from(
        source.matchAll(/default\s+as\s+(Sky[A-Za-z0-9_]*)/g),
        ([, component]) => component,
      ),
    ),
  ),
).sort()

describe('development Sky UI Kitchen Sink contract', () => {
  it('demonstrates every public Sky component without Konsta imports', () => {
    const missingComponents = publicComponents.filter(
      (component) => !new RegExp(`<${component}(?:\\s|/?>)`).test(viewSource),
    )

    expect(publicComponents.length).toBeGreaterThanOrEqual(63)
    expect(missingComponents).toEqual([])
    expect(viewSource).toContain("from '@/ui'")
    expect(viewSource).not.toContain('konsta/vue')
    expect(viewSource).not.toMatch(/<\/?k-[a-z]/)
  })

  it('keeps the lazy route and launcher development-only', () => {
    expect(routerSource).toMatch(
      /const developmentRoutes[^=]*=\s*import\.meta\.env\.DEV[\s\S]*?import\('@\/views\/development\/SkyUiKitchenSinkView\.vue'\)/,
    )
    expect(routerSource).toContain("name: 'development-sky-ui'")
    expect(appSource).toContain(
      "isDevelopment && route.name === 'development-sky-ui'",
    )
    expect(settingsSource).toContain(
      'const isDevelopment = import.meta.env.DEV',
    )
    expect(settingsSource).toContain('v-if="isDevelopment')
    expect(settingsSource).toContain(
      "router.push({ name: 'development-sky-ui' })",
    )
    expect(settingsSource).not.toContain('SkyUiKitchenSinkView')
  })
})
