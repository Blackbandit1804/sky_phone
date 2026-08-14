import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  fileURLToPath(new URL('./AppStoreAction.vue', import.meta.url)),
  'utf8',
)

describe('AppStoreAction contract', () => {
  it('uses an Apple-style cloud download icon instead of GET text', () => {
    expect(source).toContain("import { CloudDownload } from 'lucide-vue-next'")
    expect(source).toContain('v-if="action === \'get\'"')
    expect(source).not.toContain("phone.t('Apps.appStore.get')")
  })

  it('shows a timed circular installation progress with a center stop mark', () => {
    expect(source).toContain('class="app-store-action__progress"')
    expect(source).toContain('class="app-store-action__track"')
    expect(source).toContain('class="app-store-action__value"')
    expect(source).toContain(
      'animation: app-store-download-progress 3s linear forwards',
    )
    expect(source).toMatch(
      /\.app-store-action__progress i\s*\{[^}]*width:\s*7px/s,
    )
    expect(source).not.toContain('color-mix(')
  })
})
