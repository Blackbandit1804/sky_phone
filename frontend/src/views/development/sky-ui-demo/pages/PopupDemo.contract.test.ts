import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./PopupDemo.vue', import.meta.url), 'utf8')

describe('PopupDemo Konsta parity', () => {
  it('carries the selected theme and accent into the nested popup page', () => {
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('component="div"')
    expect(source).toContain(':dark="demo.dark.value"')
    expect(source).toContain(':accent="demo.accent.value"')
    expect(source).toContain(':accent-soft="demo.accentSoft.value"')
    expect(source).toContain('label="Popup"')
    expect(source).not.toContain('<div class="sky-app-page')
  })

  it('uses the exact iOS close icon and one scroll owner', () => {
    expect(source).toContain(
      "import Xmark from 'framework7-icons/vue/vue/Xmark.vue'",
    )
    expect(source).toContain('<SkyIcon :size="20"><Xmark /></SkyIcon>')
    expect(source).not.toContain("from 'lucide-vue-next'")
    expect(source.match(/<SkyScrollArea/g)).toHaveLength(1)
  })

  it('keeps every close path and the original reference copy', () => {
    expect(source).toContain('@backdropclick="popupOpened = false"')
    expect(source).toContain('@escape="popupOpened = false"')
    expect(source).toContain('@click="popupOpened = false"')
    expect(source).toContain('"Temporary Views".')
    expect(source).toContain('Also not, that by default popup')
  })
})
