import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const iconSource = readFileSync(
  new URL('./HomeFolderIcon.vue', import.meta.url),
  'utf8',
)
const overlaySource = readFileSync(
  new URL('./HomeFolderOverlay.vue', import.meta.url),
  'utf8',
)
const dragSource = readFileSync(
  new URL('../utils/springboardDrag.ts', import.meta.url),
  'utf8',
)
const springboardSource = readFileSync(
  new URL('../views/SpringboardView.vue', import.meta.url),
  'utf8',
)
const appIconSource = readFileSync(
  new URL('./AppIcon.vue', import.meta.url),
  'utf8',
)
const mainCss = readFileSync(
  new URL('../assets/main.css', import.meta.url),
  'utf8',
)

describe('Home folder interaction contract', () => {
  it('opens folders from edit mode and starts dragging only after movement', () => {
    expect(iconSource).toContain('if (props.editMode) return')
    expect(iconSource).toMatch(
      /if \(props\.editMode\) \{\s+beginPointerDrag\(event\)/,
    )
    expect(iconSource).not.toContain('props.editMode || suppressClick.value')
  })

  it('keeps folder app dragging aligned at every phone scale', () => {
    expect(dragSource).toContain("'.springboard-page, .home-folder-panel'")
    expect(dragSource).toContain('viewportWidth: bounds.width')
    expect(dragSource).not.toContain("getPropertyValue('zoom')")
    expect(iconSource).toContain('springboardViewportToLocal')
    expect(iconSource).not.toContain('@pointerleave')
    expect(springboardSource).not.toContain(
      '(event.currentTarget as HTMLElement | null)?.closest',
    )
  })

  it('edits the folder name inline with Sky UI controls', () => {
    expect(overlaySource).toContain('<SkyField')
    expect(overlaySource).toContain('home-folder-heading--editing')
    expect(overlaySource).toContain('<Check')
    expect(overlaySource).toContain('<X')
    expect(overlaySource).not.toContain('<SkyDialog')
    expect(overlaySource).not.toContain('<SkySheet')
  })

  it('visually closes the folder while an app leaves and closes after extraction', () => {
    expect(overlaySource).toContain('@dragmove="moveFolderAppDrag"')
    expect(overlaySource).toContain("emit('drag-outside-change', outside)")
    expect(overlaySource).toContain('home-folder-layer--dragging-out')
    expect(springboardSource).toContain(
      '@drag-outside-change="folderDraggingOutside = $event"',
    )
    expect(overlaySource).toContain(
      'if (draggingIndex.value === null || draggingOutside.value) return',
    )
    expect(overlaySource).toContain(
      'draggingOutside.value || !isPointerInsidePanel(event)',
    )
    expect(springboardSource).toContain(
      "'springboard--folder-open': folderOverlayVisible",
    )
    expect(springboardSource).toContain(
      'editMode && isEditablePage && !folderOverlayVisible',
    )
    expect(springboardSource).toMatch(
      /extractHomeFolderApp\([\s\S]*?closeFolder\(\)/,
    )
  })

  it('keeps the folder title left-aligned and gives the rename field more height', () => {
    expect(overlaySource).toMatch(
      /\.home-folder-heading\s*\{[^}]*justify-content:\s*flex-start;/s,
    )
    expect(overlaySource).toMatch(
      /\.home-folder-title\s*\{[^}]*text-align:\s*left;/s,
    )
    expect(overlaySource).toMatch(
      /\.home-folder-rename-field :deep\(\.sky-field__input\)\s*\{[^}]*height:\s*46px;[^}]*min-height:\s*46px;/s,
    )
  })

  it('uses one native iOS-style removal badge inside and outside folders', () => {
    expect(appIconSource).toContain('<span class="app-icon-remove__badge"')
    expect(appIconSource).not.toContain(
      '<k-badge class="app-icon-remove__badge"',
    )
    expect(mainCss).toMatch(
      /\.app-icon-remove__badge\s*\{[^}]*background:\s*rgb\(174 174 178 \/ 88%\);[^}]*color:\s*#111;/s,
    )
  })
})
