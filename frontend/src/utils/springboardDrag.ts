export type PageTurnDirection = -1 | 0 | 1

export type SpringboardEdgeTurn = {
  destination: number
  direction: Exclude<PageTurnDirection, 0>
}

export type SpringboardHomeEdgeTurn = SpringboardEdgeTurn & {
  previewsPage: boolean
}

export type SpringboardSwipeIntent = 'horizontal' | 'pending' | 'vertical'

export type SpringboardLocalPoint = {
  x: number
  y: number
}

export function springboardViewportToLocal(
  clientX: number,
  clientY: number,
  viewportLeft: number,
  viewportTop: number,
  viewportWidth: number,
  viewportHeight: number,
  layoutWidth: number,
  layoutHeight: number,
): SpringboardLocalPoint {
  const scaleX = viewportWidth > 0 ? layoutWidth / viewportWidth : 1
  const scaleY = viewportHeight > 0 ? layoutHeight / viewportHeight : 1
  return {
    x: (clientX - viewportLeft) * scaleX,
    y: (clientY - viewportTop) * scaleY,
  }
}

export function springboardViewportDeltaToLocal(
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
  layoutWidth: number,
  layoutHeight: number,
): SpringboardLocalPoint {
  const scaleX = viewportWidth > 0 ? layoutWidth / viewportWidth : 1
  const scaleY = viewportHeight > 0 ? layoutHeight / viewportHeight : 1
  return { x: deltaX * scaleX, y: deltaY * scaleY }
}

export function springboardPageDragCompensation(
  startPage: number,
  currentPage: number,
  pageWidth: number,
): number {
  return (currentPage - startPage) * Math.max(0, pageWidth)
}

export function springboardSwipeIntent(
  deltaX: number,
  deltaY: number,
  threshold = 8,
): SpringboardSwipeIntent {
  if (Math.hypot(deltaX, deltaY) <= threshold) return 'pending'
  return Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
}

export function springboardEdgeDirection(
  clientX: number,
  left: number,
  right: number,
): PageTurnDirection {
  const width = Math.max(0, right - left)
  const edgeSize = Math.min(42, width * 0.12)
  if (clientX <= left + edgeSize) return -1
  if (clientX >= right - edgeSize) return 1
  return 0
}

export function resolveSpringboardEdgeTurn(
  clientX: number,
  left: number,
  right: number,
  currentPage: number,
  minimumPage: number,
  maximumPage: number,
): SpringboardEdgeTurn | null {
  const direction = springboardEdgeDirection(clientX, left, right)
  if (direction === 0) return null
  const destination = currentPage + direction
  if (destination < minimumPage || destination > maximumPage) return null
  return { destination, direction }
}

export function resolveSpringboardHomeEdgeTurn(
  clientX: number,
  left: number,
  right: number,
  currentPage: number,
  renderedPageCount: number,
  maximumPageCount: number,
  previewPageActive: boolean,
): SpringboardHomeEdgeTurn | null {
  const canPreviewPage =
    !previewPageActive && renderedPageCount < maximumPageCount
  const maximumPage = Math.min(
    maximumPageCount,
    renderedPageCount + (canPreviewPage ? 1 : 0),
  )
  const turn = resolveSpringboardEdgeTurn(
    clientX,
    left,
    right,
    currentPage,
    1,
    maximumPage,
  )
  return turn
    ? { ...turn, previewsPage: turn.destination > renderedPageCount }
    : null
}

export function maximumRenderedWidgetPage(
  persistedPages: readonly number[],
  previewPages: readonly number[],
): number {
  return Math.max(1, ...persistedPages, ...previewPages)
}
