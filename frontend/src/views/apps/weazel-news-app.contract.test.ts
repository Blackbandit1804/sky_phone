import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./weazel-news-app.vue', import.meta.url),
  'utf8',
)

function sectionBetween(start: RegExp, end: RegExp): string {
  const startMatch = start.exec(source)
  if (!startMatch || startMatch.index === undefined) return ''

  const tail = source.slice(startMatch.index + startMatch[0].length)
  const endMatch = end.exec(tail)
  return endMatch?.index === undefined
    ? source.slice(startMatch.index)
    : source.slice(
        startMatch.index,
        startMatch.index + startMatch[0].length + endMatch.index,
      )
}

function openingTags(
  pascalName: string,
  kebabName: string,
  value = source,
): string[] {
  const pattern = new RegExp(`<(?:${pascalName}|${kebabName})\\b[^>]*>`, 'gis')
  return value.match(pattern) ?? []
}

function styleRule(selector: string): string {
  const start = source.indexOf(selector)
  if (start < 0) return ''
  const end = source.indexOf('}', start)
  return end < 0 ? source.slice(start) : source.slice(start, end + 1)
}

const detailSource = sectionBetween(
  /<template\s+v-else-if=["']screen\s*===\s*['"]detail['"][^>]*>/i,
  /<template\s+v-else-if=["']screen\s*===\s*['"]composer['"][^>]*>/i,
)
const composerSource = sectionBetween(
  /<template\s+v-else-if=["']screen\s*===\s*['"]composer['"][^>]*>/i,
  /<(?:SkyActionSheet|sky-action-sheet|SkySheet|sky-sheet)\b/i,
)
const searchSource = sectionBetween(
  /<template\s+v-else-if=["']activeTab\s*===\s*['"]search['"][^>]*>/i,
  /class=["']weazel-editorial-heading["']/i,
)

describe('Weazel News central navigation contract', () => {
  it('uses the full Sky pill navigation and a tabbar-aware scroll owner', () => {
    const navigationSource =
      source.match(
        /<(?:SkyPillNavigation|sky-pill-navigation)\b[\s\S]*?<\/(?:SkyPillNavigation|sky-pill-navigation)>/i,
      )?.[0] ?? ''
    const pillTags = openingTags(
      'SkyPillNavigation',
      'sky-pill-navigation',
      navigationSource,
    )
    const segmentedTags = openingTags(
      'SkySegmented',
      'sky-segmented',
      navigationSource,
    )
    const segmentedButtonTags = openingTags(
      'SkySegmentedButton',
      'sky-segmented-button',
      navigationSource,
    )
    const scrollTags = openingTags('SkyScrollArea', 'sky-scroll-area')

    expect(pillTags).toHaveLength(1)
    expect(pillTags[0]).toMatch(/\blayout\s*=\s*["']full["']/i)
    expect(segmentedTags.length).toBeGreaterThanOrEqual(1)
    expect(segmentedButtonTags).toHaveLength(4)
    expect(
      scrollTags.some((tag) => /\bwith-(?:tabbar|tab-bar)\b/i.test(tag)),
    ).toBe(true)

    expect(source).not.toMatch(/<(?:SkyTabBar|sky-tab-bar)\b/i)
    expect(source).not.toMatch(/\bSkyTabBar\b/)
    expect(source).not.toMatch(/\.weazel-tabbar(?:\b|__)/)
  })
})

describe('Weazel News article detail contract', () => {
  it('uses the centered back action owned by SkyNavbar', () => {
    const navbarTag = detailSource.match(
      /<(?:SkyNavbar|sky-navbar)\b[^>]*>/is,
    )?.[0]

    expect(detailSource).not.toBe('')
    expect(navbarTag).toBeDefined()
    expect(navbarTag).toMatch(/\bshow-(?:back|back-button)\b/i)
    expect(navbarTag).toMatch(/\bback-appearance\s*=\s*["']surface["']/i)
    expect(navbarTag).toMatch(/@back\s*=\s*["']closeDetail["']/)
    expect(detailSource).not.toMatch(
      /<(?:SkyNavbarBackLink|sky-navbar-back-link)\b/i,
    )
  })

  it('keeps the lead image full bleed while aligning article copy to the page gutter', () => {
    const detailScrollTag = detailSource.match(
      /<(?:SkyScrollArea|sky-scroll-area)\b(?=[^>]*\bweazel-detail-scroll\b)[^>]*>/is,
    )?.[0]
    const coverRule = styleRule('.weazel-detail-cover')
    const copyRule = styleRule('.weazel-detail-copy')

    expect(detailScrollTag).toBeDefined()
    expect(detailScrollTag).toMatch(/\bas\s*=\s*["']article["']/i)
    expect(detailScrollTag).not.toMatch(/\bpadded\b/i)
    expect(coverRule).toMatch(/\bwidth\s*:\s*100%\s*;/i)
    expect(coverRule).not.toMatch(/calc\s*\(\s*100%/i)
    expect(coverRule).not.toMatch(/margin[^;]*-\d/i)
    expect(copyRule).toContain('var(--sky-page-gutter)')
  })

  it('offers one canonical edit action to article writers', () => {
    const editActions =
      detailSource.match(
        /@click\s*=\s*["']\s*editArticle\s*\(\s*selectedArticle\s*\)\s*["']/g,
      ) ?? []
    const navbarEnd = detailSource.search(/<\/(?:SkyNavbar|sky-navbar)>/i)
    const navbarSource = navbarEnd < 0 ? '' : detailSource.slice(0, navbarEnd)

    expect(editActions).toHaveLength(1)
    expect(navbarSource).toMatch(
      /@click\s*=\s*["']\s*editArticle\s*\(\s*selectedArticle\s*\)\s*["']/,
    )
  })
})

describe('Weazel News empty search contract', () => {
  it('uses the shared compact empty state when no article matches', () => {
    const emptyStateTag = searchSource.match(
      /<(?:SkyEmptyState|sky-empty-state)\b[^>]*>/is,
    )?.[0]

    expect(searchSource).not.toBe('')
    expect(emptyStateTag).toBeDefined()
    expect(emptyStateTag).toMatch(/\bcompact\b/i)
    expect(emptyStateTag).toMatch(/!\s*news\.publicItems\.length/)
    expect(emptyStateTag).toContain("t('search.emptyTitle')")
    expect(emptyStateTag).toContain("t('search.emptyBody')")
  })
})

describe('Weazel News article composer contract', () => {
  it('uses the central SkyField select for the article category', () => {
    const categorySelect = openingTags('SkyField', 'sky-field').find(
      (tag) =>
        /\btype\s*=\s*["']select["']/i.test(tag) && /draft\.category/.test(tag),
    )

    expect(categorySelect).toBeDefined()
    expect(categorySelect).toMatch(/:options\s*=/i)
    expect(categorySelect).toMatch(/\bdropdown\b/i)
    expect(categorySelect).toContain("t('composer.category')")
    expect(composerSource).not.toContain("composerChoice = 'category'")
  })

  it('offers Photos and Camera through the shared action sheet', () => {
    const actionSheet = source.match(
      /<(?:SkyActionSheet|sky-action-sheet)\b[\s\S]*?<\/(?:SkyActionSheet|sky-action-sheet)>/i,
    )?.[0]

    expect(actionSheet).toBeDefined()
    expect(actionSheet).toMatch(
      /<(?:SkyActionButton|sky-action-button)\b[\s\S]*?(?:photos|gallery)/i,
    )
    expect(actionSheet).toMatch(
      /<(?:SkyActionButton|sky-action-button)\b[\s\S]*?camera/i,
    )
    expect(actionSheet).toMatch(/@backdropclick\s*=/i)
    expect(actionSheet).toMatch(/@escape\s*=/i)
  })

  it('round-trips and previews multiple article images', () => {
    expect(source).toContain('imageMediaIds')
    expect(source).toContain('maximumImages')
    expect(source).toMatch(/messageMedia\.begin\s*\(/)
    expect(source).toMatch(/messageMedia\.consumeMany(?:<[^>]+>)?\s*\(/)
    expect(source).toMatch(/selection\?*\.media/)
    expect(source).not.toMatch(/selection\?*\.media\s*\[\s*0\s*\]/)
    expect(composerSource).toMatch(
      /v-for\s*=\s*["'][^"']+\s+in\s+[^"']*(?:image|media)[^"']*["']/i,
    )
    expect(source).toMatch(
      /['"]camera['"]\s*\|\s*['"]photos['"]|['"]photos['"]\s*\|\s*['"]camera['"]/,
    )
  })
})
