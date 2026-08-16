import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./HouseApp.vue', import.meta.url), 'utf8')

describe('House app sheets', () => {
  it('closes both sheets through their shared drag gesture', () => {
    expect(source.match(/swipe-to-close/g)).toHaveLength(2)
    expect(source).toContain('@swipeclose="selectedPropertyId = null"')
    expect(source).toContain('@swipeclose="candidatesOpened = false"')
  })

  it('sizes the panels instead of clipping the overlay roots', () => {
    const rootRule = source.match(
      /:global\(\.house-detail-sheet\),\s*:global\(\.house-candidates-sheet\)\s*\{(?<declarations>[^}]*)\}/,
    )?.groups?.declarations

    expect(rootRule).toBeDefined()
    expect(rootRule).not.toContain('height:')
    expect(source).toMatch(
      /:global\(\.house-detail-sheet \.sky-sheet__panel\),[\s\S]*?height:\s*88%;/,
    )
    expect(source).not.toContain('height: 620px;')
  })
})
