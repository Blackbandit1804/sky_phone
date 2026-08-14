import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./GalleryApp.vue', import.meta.url),
  'utf8',
)
const headerActions = source.slice(
  source.indexOf('<template #right>'),
  source.indexOf('</template>', source.indexOf('<template #right>')),
)

describe('GalleryApp import action', () => {
  it('uses the photo viewer toolbar button design', () => {
    expect(headerActions).toContain('<SkyToolbarPane')
    expect(headerActions).toContain('gallery-header-tool--icon')
    expect(headerActions).toContain('<SkyButton')
    expect(headerActions).toContain('clear')
    expect(headerActions).toContain(
      '<Download :size="21" aria-hidden="true" />',
    )
    expect(headerActions).toContain(
      ':aria-label="phone.t(\'Apps.photos.import.action\')"',
    )
    expect(headerActions).toContain(
      ':title="phone.t(\'Apps.photos.import.action\')"',
    )
    expect(headerActions).not.toContain(
      "{{ phone.t('Apps.photos.import.action') }}",
    )
    expect(headerActions).not.toContain('tonal')
  })

  it('renders an iPhone-style large library header with filtered counts', () => {
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('variant="large"')
    expect(source).toContain(':title="phone.t(\'Apps.photos.library\')"')
    expect(source).toContain(':subtitle="countText"')
    expect(source).toContain("nuiCall<GalleryCounts>('gallery:counts')")
    expect(source).toContain('`Apps.photos.counts.${translationKey}`')
    expect(source).toContain('gridColumnStart: bottomRightGridPosition(')
    expect(source).toContain('gridRowStart: bottomRightGridPosition(')
    expect(source).toContain('var(--sky-navbar-large-title-height) - 30px')
  })

  it('opens an accessible sort menu from the large header', () => {
    expect(headerActions).toContain('<ListFilter')
    expect(headerActions).toContain('sortMenuOpened = true')
    expect(source).toContain('<SkyActionSheet')
    expect(source).toContain("selectSortOrder('newest')")
    expect(source).toContain("selectSortOrder('oldest')")
    expect(source).toContain('orderMedia(media.value, sortOrder.value)')
  })

  it('supports selecting, sharing, and deleting multiple media items', () => {
    expect(headerActions).toContain("phone.t('Apps.photos.selection.action')")
    expect(headerActions).toContain('enterSelectionMode')
    expect(source).toContain('v-if="selectionMode"')
    expect(source).toContain('selectedCountText')
    expect(source).toContain('shareSelection')
    expect(source).toContain("kind: 'media'")
    expect(source).toContain("nuiCall('gallery:delete-many'")
    expect(source).toContain('media:deleteManyResult')
  })

  it('shows capture time and iPhone-style actions in the media viewer', () => {
    expect(source).toContain(':title="selectedCaptureDay"')
    expect(source).toContain(':subtitle="selectedCaptureTime"')
    expect(source).not.toContain(
      "'Apps.photos.photo'\n            : 'Apps.photos.video'",
    )
    expect(source).toContain("nuiCall<FavoriteResult>('gallery:favorite'")
    expect(source).toContain('<Heart')
    expect(source).toContain('gallery-detail-toolbar')
    expect(source).toContain('color: var(--sky-text)')
    expect(source).toContain('shareSelected')
    expect(source).toContain('deleteDialogOpened = true')
  })

  it('uses complete local media fixtures when no browser API port is set', () => {
    expect(source).toContain("developmentParameters?.has('apiPort')")
    expect(source).toContain('isDevelopment && !developmentApiEnabled')
    expect(source).toContain('all: developmentMedia.length')
    expect(source).toContain('developmentMedia.filter(')
    expect(source).toMatch(/mockGalleryImage\(\s*'Flower Video'/)
    expect(source).toMatch(/mockGalleryImage\(\s*'Sintel Video'/)
    expect(source).toMatch(/mockGalleryImage\(\s*'Bunny Video'/)
    expect(source).toContain('const additionalPhotos = [')
    expect(source).toContain("['Campfire', '#c2410c', '#431407', '#fef08a']")
    expect(source).toContain('id: 13 + index')
    expect(source).not.toContain('picsum.photos')
  })
})
