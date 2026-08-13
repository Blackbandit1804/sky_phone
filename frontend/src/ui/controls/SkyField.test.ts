import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SkyField from '@/ui/controls/SkyField.vue'

describe('SkyField numeric constraints', () => {
  it('forwards min, max, and step to the native input', async () => {
    const app = createSSRApp(SkyField, {
      ariaLabel: 'Primary frequency',
      max: 999.9,
      min: 0.1,
      step: 0.1,
      type: 'number',
    })

    const html = await renderToString(app)
    const input = html.match(/<input[^>]+>/)?.[0] ?? ''

    expect(input).toContain('aria-label="Primary frequency"')
    expect(input).toContain('max="999.9"')
    expect(input).toContain('min="0.1"')
    expect(input).toContain('step="0.1"')
  })

  it('exposes the inline settings layout without changing input semantics', async () => {
    const app = createSSRApp(SkyField, {
      label: 'Service number',
      layout: 'inline',
      modelValue: '231',
    })

    const html = await renderToString(app)

    expect(html).toContain('sky-field--inline')
    expect(html).toMatch(/<label[^>]+for="([^"]+)"/)
    expect(html).toContain('value="231"')
  })

  it('marks fields with leading media so labels and controls share alignment', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          SkyField,
          { label: 'Primary frequency' },
          { leading: () => h('span', 'icon') },
        ),
    })

    const html = await renderToString(app)

    expect(html).toContain('sky-field--has-leading')
    expect(html).toContain('sky-field__leading')
  })

  it('forwards text-entry hints to the native input', async () => {
    const app = createSSRApp(SkyField, {
      autocapitalize: 'none',
      autocomplete: 'off',
      autocorrect: 'off',
      pattern: '[A-Z0-9]+',
      spellcheck: false,
      type: 'text',
    })

    const html = await renderToString(app)
    const input = html.match(/<input[^>]+>/)?.[0] ?? ''

    expect(input).toContain('autocapitalize="none"')
    expect(input).toContain('autocomplete="off"')
    expect(input).toContain('autocorrect="off"')
    expect(input).toContain('pattern="[A-Z0-9]+"')
    expect(input).toContain('spellcheck="false"')
  })

  it('renders an explicitly labelled clear control only for a non-empty value', async () => {
    const app = createSSRApp(SkyField, {
      clearButton: true,
      clearLabel: 'Clear email',
      modelValue: 'alex@example.com',
    })

    const html = await renderToString(app)

    expect(html).toContain('class="sky-field__clear"')
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Clear email"')
  })

  it('does not expose an unnamed clear control', async () => {
    const app = createSSRApp(SkyField, {
      clearButton: true,
      modelValue: 'alex@example.com',
    })

    const html = await renderToString(app)

    expect(html).not.toContain('sky-field__clear')
  })

  it('declares its accessible clear event without changing existing events', () => {
    const component = SkyField as unknown as { emits: string[] }

    expect(component.emits).toEqual(
      expect.arrayContaining([
        'blur',
        'change',
        'clear',
        'focus',
        'input',
        'update:modelValue',
      ]),
    )
  })
})
