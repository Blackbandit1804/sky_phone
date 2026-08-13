import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkySettingsGroup from '@/ui/settings/SkySettingsGroup.vue'
import SkySettingsRow from '@/ui/settings/SkySettingsRow.vue'

describe('SkySettingsGroup', () => {
  it('connects its heading and footer to the settings section', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          SkySettingsGroup,
          {
            footer: 'Used when reconnecting to the channel.',
            title: 'Connection',
          },
          {
            default: () =>
              h(SkySettingsRow, {
                kind: 'value',
                title: 'Status',
                value: 'Ready',
              }),
          },
        ),
    })

    const html = await renderToString(app)
    const titleId = html.match(/<h2 id="([^"]+)"/)?.[1]
    const footerId = html.match(/<p id="([^"]+)"/)?.[1]

    expect(titleId).toBeTruthy()
    expect(footerId).toBeTruthy()
    expect(html).toContain(`aria-labelledby="${titleId}"`)
    expect(html).toContain(`aria-describedby="${footerId}"`)
    expect(html).toContain('<ul class="sky-settings-group__list">')
    expect(html).not.toContain('sky-list--inset')
  })

  it('uses an explicit accessible name when no heading is shown', async () => {
    const app = createSSRApp(SkySettingsGroup, {
      ariaLabel: 'Profile actions',
    })

    const html = await renderToString(app)

    expect(html).toContain('aria-label="Profile actions"')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('sky-settings-group__footer')
  })
})
