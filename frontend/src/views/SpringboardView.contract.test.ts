import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const viewSource = readFileSync(
  new URL('./SpringboardView.vue', import.meta.url),
  'utf8',
)
const appIconSource = readFileSync(
  new URL('../components/AppIcon.vue', import.meta.url),
  'utf8',
)
const folderIconSource = readFileSync(
  new URL('../components/HomeFolderIcon.vue', import.meta.url),
  'utf8',
)
const mainCss = readFileSync(
  new URL('../assets/main.css', import.meta.url),
  'utf8',
)
describe('Springboard page swipe contract', () => {
  it('allows page swipes to start on home apps and widget surfaces', () => {
    expect(viewSource).toContain(
      '.springboard-page--apps .app-icon-button, .home-widget',
    )
    expect(viewSource).toContain('springboardSwipeIntent')
    expect(viewSource).not.toContain(
      "target.closest('button, input, .home-widget-shell')",
    )
  })

  it('suppresses app and folder activation after pointer movement', () => {
    expect(appIconSource).toContain('springboardSwipeIntent')
    expect(folderIconSource).toContain('springboardSwipeIntent')
    expect(appIconSource).toContain('suppressClick.value = true')
    expect(folderIconSource).toContain('suppressClick.value = true')
  })

  it('keeps app and folder drags alive independently of element capture', () => {
    expect(appIconSource).toContain('bindPointerDragSession(window, pointerId')
    expect(folderIconSource).toContain(
      'bindPointerDragSession(window, pointerId',
    )
    expect(appIconSource).not.toContain('@lostpointercapture')
    expect(folderIconSource).not.toContain('@lostpointercapture')
  })

  it('separates animated page compensation from immediate pointer movement', () => {
    expect(appIconSource).toContain('springboardPageDragCompensation')
    expect(folderIconSource).toContain('springboardPageDragCompensation')
    expect(appIconSource).toContain(':style="dragPointerStyle"')
    expect(folderIconSource).toContain(':style="dragPointerStyle"')
  })

  it('keeps a phone-wide drag ghost outside the moving page track', () => {
    const trackStart = viewSource.indexOf('class="springboard-track"')
    const dragLayerStart = viewSource.indexOf('ref="homeDragLayer"')

    expect(trackStart).toBeGreaterThan(-1)
    expect(dragLayerStart).toBeGreaterThan(trackStart)
    expect(viewSource.slice(trackStart, dragLayerStart)).toContain('</div>')
    expect(viewSource).toContain('source.cloneNode(true)')
    expect(viewSource).toContain("ghost.classList.add('home-drag-ghost')")
    expect(viewSource).toContain('springboardViewportToLocal')
    expect(viewSource).toContain('springboardViewportDeltaToLocal')
    expect(viewSource).toContain('event.target instanceof Element')
    expect(viewSource).toContain('dropGhost?.getBoundingClientRect()')
    expect(viewSource.match(/:external-drag-visual/g)).toHaveLength(4)
    expect(viewSource.match(/startHomeDrag\([^\n]+\$event\)/g)).toHaveLength(4)
    expect(appIconSource).toContain('externalDragVisual?: boolean')
    expect(folderIconSource).toContain('externalDragVisual?: boolean')
    expect(appIconSource).toContain("'app-icon-item--drag-source'")
    expect(folderIconSource).toContain("'app-icon-item--drag-source'")
    expect(mainCss).toMatch(
      /\.home-drag-layer\s*\{[^}]*z-index:\s*70;[^}]*pointer-events:\s*none;/s,
    )
    expect(mainCss).toMatch(
      /\.home-drag-ghost\s*\{[^}]*position:\s*absolute;[^}]*will-change:\s*transform;/s,
    )
    expect(mainCss).toMatch(
      /\.app-icon-item--drag-source\s*\{[^}]*opacity:\s*0;/s,
    )
    expect(mainCss).not.toContain('.springboard--home-dragging')
    expect(mainCss).toMatch(/\.springboard\s*\{[\s\S]*?overflow:\s*hidden;/)
    expect(mainCss).toMatch(
      /\.springboard-page--apps\s*\{[^}]*overflow:\s*hidden;/s,
    )
  })

  it('targets the active visual page and lets grid or dock drags turn pages', () => {
    expect(viewSource).toContain(':data-home-page="page.page"')
    expect(viewSource).toContain(':data-home-target-offset="cell.targetOffset"')
    expect(viewSource).toContain('nearestGridDropTarget')
    expect(viewSource).toContain('moveHomeAppToGridPage')
    expect(viewSource).not.toContain("draggingHomeApp.value?.area === 'grid'")
    expect(viewSource).toContain('event.clientX < springboardBounds.left')
    expect(viewSource).toContain('event.clientY > springboardBounds.bottom')
  })

  it('resolves occupied dock slots from the dock bounds rather than the event target', () => {
    expect(viewSource).toContain("querySelector<HTMLElement>('.app-dock')")
    expect(viewSource).toContain('\'[data-home-area="dock"][data-home-index]\'')
    expect(viewSource).not.toContain(
      '.closest<HTMLElement>(\'[data-home-area="dock"]\')',
    )
  })

  it('keeps a new trailing page temporary until a valid drop', () => {
    expect(viewSource).toContain('temporaryHomePage')
    expect(viewSource).toContain('clearTemporaryHomePage')
    expect(viewSource).toContain('resolveSpringboardHomeEdgeTurn')
    expect(viewSource).toContain('onBeforeUnmount')
  })
})
