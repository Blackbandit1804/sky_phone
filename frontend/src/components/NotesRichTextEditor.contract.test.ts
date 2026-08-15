import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./NotesRichTextEditor.vue', import.meta.url),
  'utf8',
)

describe('NotesRichTextEditor formatting tabbar', () => {
  it('lists every formatting action through shared tabbar primitives', () => {
    expect(source.match(/<SkyTabBar\b/g)).toHaveLength(1)
    expect(source.match(/<SkyTabButton\b/g)).toHaveLength(11)
    expect(source).toContain(
      "import { SkyIcon, SkyTabBar, SkyTabButton } from '@/ui'",
    )
    expect(source).not.toContain('notes-rich-editor__toolbar-row')
    expect(source).not.toContain('scrollToolbar')
  })
})
