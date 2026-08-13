import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyTabBar from '@/ui/SkyTabBar.vue'

describe('SkyTabBar', () => {
  it('keeps the docked tab bar as the default', async () => {
    const html = await renderToString(
      createSSRApp(SkyTabBar, { label: 'Navigation' }),
    )

    expect(html).toContain('class="sky-tabbar"')
    expect(html).not.toContain('sky-tabbar--floating')
  })

  it('exposes the shared floating capsule variant', async () => {
    const html = await renderToString(
      createSSRApp(SkyTabBar, { floating: true, label: 'Navigation' }),
    )

    expect(html).toContain('sky-tabbar sky-tabbar--floating')
  })
})
