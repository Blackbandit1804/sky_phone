import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  fileURLToPath(new URL('./AppStoreDetail.vue', import.meta.url)),
  'utf8',
)

describe('AppStoreDetail contract', () => {
  it('renders an Apple-style product page with metadata and direct action', () => {
    expect(source).toContain('class="store-detail__toolbar"')
    expect(source).toContain('class="store-detail__hero"')
    expect(source).toContain('class="store-detail__facts"')
    expect(source).toContain('class="store-detail__whats-new"')
    expect(source).toContain("emit('action')")
    expect(source).toContain("emit('back')")
    expect(source).toContain("emit('share')")
    expect(source).toContain('<AppStoreAction :action="action" />')
    expect(source).toContain("'store-detail__action--icon': action !== 'open'")
    expect(source).not.toContain(':has(')
    expect(source).toMatch(
      /\.store-detail\s*\{[^}]*padding:\s*var\(--sky-space-3\) 0 var\(--sky-space-6\)/s,
    )
  })

  it('generates three app-specific preview panels with visible test data', () => {
    expect(source).toContain('class="store-detail__previews"')
    expect(source).toContain('store-detail-preview--overview')
    expect(source).toContain('store-detail-preview--community')
    expect(source).toContain('store-detail-preview--insights')
    expect(
      source.match(/:src="app\.iconImage"/g)?.length,
    ).toBeGreaterThanOrEqual(4)
    expect(source).toContain('24')
    expect(source).toContain('87%')
    expect(source).toContain('+18%')
    expect(source).toMatch(
      /\.store-detail-preview\s*\{[^}]*width:\s*224px[^}]*height:\s*354px/s,
    )
  })

  it('provides accessible previous and next controls for the preview gallery', () => {
    expect(source).toContain('ref="previews"')
    expect(source).toContain('@scroll.passive="updateActivePreview"')
    expect(source).toContain('scrollToPreview(activePreviewIndex - 1)')
    expect(source).toContain('scrollToPreview(activePreviewIndex + 1)')
    expect(source).toContain('details.previousPreview')
    expect(source).toContain('details.nextPreview')
    expect(source).toContain('.store-detail__toolbar button:hover')
  })
})
