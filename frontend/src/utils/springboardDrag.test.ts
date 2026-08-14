import { describe, expect, it } from 'vitest'

import {
  maximumRenderedWidgetPage,
  resolveSpringboardEdgeTurn,
  resolveSpringboardHomeEdgeTurn,
  springboardEdgeDirection,
  springboardPageDragCompensation,
  springboardSwipeIntent,
  springboardViewportDeltaToLocal,
  springboardViewportToLocal,
} from '@/utils/springboardDrag'

describe('springboard widget drag', () => {
  it('turns pages from the reachable phone edge zones', () => {
    expect(springboardEdgeDirection(113, 100, 468)).toBe(-1)
    expect(springboardEdgeDirection(455, 100, 468)).toBe(1)
    expect(springboardEdgeDirection(284, 100, 468)).toBe(0)
  })

  it('resolves reachable page destinations without crossing page bounds', () => {
    expect(resolveSpringboardEdgeTurn(455, 100, 468, 1, 0, 3)).toEqual({
      destination: 2,
      direction: 1,
    })
    expect(resolveSpringboardEdgeTurn(113, 100, 468, 2, 0, 3)).toEqual({
      destination: 1,
      direction: -1,
    })
    expect(resolveSpringboardEdgeTurn(113, 100, 468, 0, 0, 3)).toBeNull()
    expect(resolveSpringboardEdgeTurn(455, 100, 468, 3, 0, 3)).toBeNull()
  })

  it('previews one new trailing page without crossing the home-page limit', () => {
    expect(
      resolveSpringboardHomeEdgeTurn(455, 100, 468, 2, 2, 5, false),
    ).toEqual({ destination: 3, direction: 1, previewsPage: true })
    expect(
      resolveSpringboardHomeEdgeTurn(455, 100, 468, 2, 3, 5, true),
    ).toEqual({ destination: 3, direction: 1, previewsPage: false })
    expect(
      resolveSpringboardHomeEdgeTurn(455, 100, 468, 5, 5, 5, false),
    ).toBeNull()
  })

  it('keeps the original widget page mounted during a drag preview', () => {
    expect(maximumRenderedWidgetPage([1, 3], [1, 2])).toBe(3)
    expect(maximumRenderedWidgetPage([], [])).toBe(1)
  })

  it('distinguishes a page swipe from a tap or vertical gesture', () => {
    expect(springboardSwipeIntent(5, 2)).toBe('pending')
    expect(springboardSwipeIntent(30, 8)).toBe('horizontal')
    expect(springboardSwipeIntent(8, 30)).toBe('vertical')
  })

  it('keeps a dragged item under the pointer while the track changes pages', () => {
    expect(springboardPageDragCompensation(3, 2, 368)).toBe(-368)
    expect(springboardPageDragCompensation(2, 3, 368)).toBe(368)
    expect(springboardPageDragCompensation(2, 2, 368)).toBe(0)
  })

  it('converts viewport coordinates into local phone coordinates under zoom', () => {
    expect(
      springboardViewportToLocal(169, 238, 100, 100, 253.92, 582.36, 368, 844),
    ).toEqual({ x: 100, y: 200 })
    expect(
      springboardViewportToLocal(200, 250, 100, 50, 0, 0, 368, 844),
    ).toEqual({ x: 100, y: 200 })
    expect(
      springboardViewportDeltaToLocal(69, 138, 253.92, 582.36, 368, 844),
    ).toEqual({ x: 100, y: 200 })
  })
})
