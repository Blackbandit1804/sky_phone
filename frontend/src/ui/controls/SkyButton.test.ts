import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyButton from './SkyButton.vue'

describe('SkyButton', () => {
  it('renders a native button with the requested variants', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(
            SkyButton,
            { outline: true, rounded: true, tonal: true, type: 'submit' },
            () => 'Continue',
          ),
      }),
    )

    expect(html).toContain('<button')
    expect(html).toContain('type="submit"')
    expect(html).toContain('sky-button--outline')
    expect(html).toContain('sky-button--rounded')
    expect(html).toContain('sky-button--tonal')
    expect(html).toContain('Continue')
  })

  it('keeps focus and pressed feedback on the contextual accent', () => {
    const uiDirectory = fileURLToPath(new URL('..', import.meta.url))
    const controls = readFileSync(`${uiDirectory}/controls.css`, 'utf8')
    const buttonStyles = controls.slice(
      controls.indexOf('.sky-button:focus-visible'),
      controls.indexOf('.sky-badge'),
    )

    expect(buttonStyles).toMatch(
      /\.sky-button:focus-visible[\s\S]*?outline: 2px solid var\(--sky-app-accent, #007aff\)/,
    )
    expect(buttonStyles).toMatch(
      /\.sky-button--primary:active:not\(:disabled\)\s*\{\s*background: var\(--sky-app-accent, #007aff\);\s*filter: brightness\(0\.86\)/,
    )
    expect(buttonStyles).toMatch(
      /\.sky-button--tonal:active:not\(:disabled\)\s*\{\s*background: var\(--sky-app-accent-soft, rgba\(0, 122, 255, 0\.15\)\);\s*filter: brightness\(0\.92\)/,
    )
    expect(buttonStyles).not.toContain('--sky-app-accent-shade')
  })

  it('keeps outline hover border, surface, and text in one color state', () => {
    const uiDirectory = fileURLToPath(new URL('..', import.meta.url))
    const controls = readFileSync(`${uiDirectory}/controls.css`, 'utf8')
    const buttonStyles = controls.slice(
      controls.indexOf('.sky-button:focus-visible'),
      controls.indexOf('.sky-badge'),
    )

    expect(buttonStyles).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?\.sky-button--outline:hover:not\(:disabled\)\s*\{[\s\S]*?border-color:\s*var\(--sky-app-accent, #007aff\);[\s\S]*?background:\s*var\(--sky-app-accent, #007aff\);[\s\S]*?color:\s*#ffffff;/,
    )
    expect(buttonStyles).toMatch(
      /\.sky-button--danger\.sky-button--outline:hover:not\(:disabled\)\s*\{[\s\S]*?border-color:\s*var\(--sky-danger, #dc2626\);[\s\S]*?background:\s*var\(--sky-danger, #dc2626\);[\s\S]*?color:\s*#ffffff;/,
    )
    expect(buttonStyles).toContain(
      'color var(--sky-transition-fast, 100ms) ease,',
    )
  })
})
