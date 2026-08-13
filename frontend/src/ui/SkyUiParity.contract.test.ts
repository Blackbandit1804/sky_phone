import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import {
  SkyActionButton,
  SkyActionGroup,
  SkyBadge,
  SkyCard,
  SkyChip,
  SkyDialog,
  SkyListItem,
  SkyMenuList,
  SkyMenuListItem,
  SkySearchbar,
  SkyToast,
} from '@/ui'

async function render(
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
  slots?: Record<string, () => ReturnType<typeof h> | string>,
): Promise<string> {
  return renderToString(
    createSSRApp({ render: () => h(component, props, slots) }),
  )
}

describe('Sky UI Konsta 5.3 parity contracts', () => {
  it('keeps the main ListItem migration hooks and slot geometry', async () => {
    const html = await render(
      SkyListItem,
      {
        after: 'Now',
        contentClass: 'custom-content',
        dividers: true,
        href: '/details',
        innerClass: 'custom-inner',
        media: 'M',
        mediaClass: 'custom-media',
        target: '_blank',
        text: 'Body',
        title: 'Title',
        titleWrapClass: 'custom-title-wrap',
      },
      {
        content: () => h('span', { class: 'custom-content-slot' }, 'Content'),
        inner: () => h('span', { class: 'custom-inner-slot' }, 'Inner'),
      },
    )

    expect(html).toContain('<a')
    expect(html).toContain('href="/details"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('sky-list-item--dividers')
    expect(html).toContain('sky-list-item__title-wrap custom-title-wrap')
    expect(html).toContain('custom-content')
    expect(html).toContain('custom-inner')
    expect(html).toContain('custom-media')
    expect(html).toContain('custom-content-slot')
    expect(html).toContain('custom-inner-slot')
  })

  it('marks MenuList and forwards inherited MenuListItem content', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          SkyMenuList,
          { dividers: false, outline: true },
          {
            default: () =>
              h(SkyMenuListItem, {
                active: true,
                footer: 'Footer',
                text: 'Text',
                title: 'Entry',
              }),
          },
        ),
    })
    const html = await renderToString(app)

    expect(html).toContain('sky-list--menu')
    expect(html).toContain('sky-list--outline')
    expect(html).toContain('sky-menu-list-item--active')
    expect(html).toContain('Text')
    expect(html).toContain('Footer')
  })

  it('exposes Searchbar migration props without unnamed action buttons', async () => {
    const html = await render(SkySearchbar, {
      clearLabel: 'Clear query',
      component: 'form',
      disableButton: true,
      disableLabel: 'Close search',
      inputId: 'directory-search',
      modelValue: 'sky',
    })

    expect(html).toContain('<form')
    expect(html).toContain('id="directory-search"')
    expect(html).toContain('sky-glass')
    expect(html).not.toContain('sky-glass--highlight')
    expect(html).toContain('sky-searchbar__clear')
    expect(html).toContain('aria-label="Clear query"')
    expect(html).toContain('sky-searchbar__disable')
    expect(html).toContain('aria-label="Close search"')
  })

  it('renders added Chip, Badge, and Card variants', async () => {
    const chip = await render(
      SkyChip,
      { deleteButton: true, deleteLabel: 'Remove', outline: true },
      {
        default: () => 'Tag',
        media: () => h('span', 'M'),
      },
    )
    const badge = await render(SkyBadge, { component: 'strong', small: true })
    const card = await render(
      SkyCard,
      { contentWrapPadding: 'custom-padding' },
      { default: () => 'Body' },
    )

    expect(chip).toContain('sky-chip--outline')
    expect(chip).toContain('sky-chip__media')
    expect(chip).toContain('sky-chip__delete')
    expect(chip).toContain('aria-label="Remove"')
    expect(badge).toContain('<strong')
    expect(badge).toContain('sky-badge--small')
    expect(card).toContain('sky-card__content custom-padding')
  })

  it('keeps overlay component, backdrop, slot, and position parity', async () => {
    const dialog = await render(
      SkyDialog,
      { backdrop: false, opened: true },
      {
        buttons: () => h('button', 'OK'),
        title: () => h('span', 'Title slot'),
      },
    )
    const toast = await render(
      SkyToast,
      { opened: true, position: 'right', verticalPosition: 'center' },
      {
        button: () => h('button', 'Undo'),
        default: () => 'Saved',
      },
    )
    const actionGroup = await render(
      SkyActionGroup,
      { component: 'section', dividers: false },
      { default: () => h(SkyActionButton, { href: '/action' }, () => 'Open') },
    )

    expect(dialog).toContain('Title slot')
    expect(dialog).not.toContain('sky-overlay-backdrop')
    expect(toast).toContain('sky-toast--right')
    expect(toast).toContain('sky-toast--vertical-center')
    expect(toast).toContain('sky-toast__button')
    expect(actionGroup).toContain('<section')
    expect(actionGroup).not.toContain('sky-action-group--dividers')
    expect(actionGroup).toContain('<a')
    expect(actionGroup).toContain('href="/action"')
  })

  it('keeps Konsta glass blur optional over a solid fallback', () => {
    const uiDirectory = fileURLToPath(new URL('.', import.meta.url))
    const sources = ['controls.css', 'foundation.css', 'overlays.css'].map(
      (file) => readFileSync(`${uiDirectory}/${file}`, 'utf8'),
    )
    const combined = sources.join('\n')

    expect(combined).toContain('--sky-shadow-glass')
    expect(combined).toContain('var(--sky-glass-solid')
    expect(combined).toMatch(/@supports[\s\S]*backdrop-filter/)
    expect(combined).toContain('sky-glass--highlight-visible')
    expect(combined).toContain('sky-glass--touch-highlight')
    expect(combined).toContain('var(--sky-navbar-glass, var(--sky-bg))')
  })
})
