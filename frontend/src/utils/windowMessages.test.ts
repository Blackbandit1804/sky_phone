import { describe, expect, it } from 'vitest'

import { isTrustedRootMessageSource } from '@/utils/windowMessages'

describe('root window message source', () => {
  it('accepts native NUI messages and messages posted by the root window', () => {
    const rootWindow = {} as Window

    expect(isTrustedRootMessageSource(null, rootWindow)).toBe(true)
    expect(isTrustedRootMessageSource(rootWindow, rootWindow)).toBe(true)
  })

  it('rejects messages posted by child frames', () => {
    const rootWindow = {} as Window
    const childFrame = {} as Window

    expect(isTrustedRootMessageSource(childFrame, rootWindow)).toBe(false)
  })
})
