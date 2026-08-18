import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./CryptoApp.vue', import.meta.url), 'utf8')
const server = readFileSync(
  new URL('../../../../sky_phone/source/server/crypto.lua', import.meta.url),
  'utf8',
)
const passwordProvider = readFileSync(
  new URL(
    '../../../../sky_phone/source/server/crypto_password.js',
    import.meta.url,
  ),
  'utf8',
)
const config = readFileSync(
  new URL('../../../../sky_phone/config/config.lua', import.meta.url),
  'utf8',
)

describe('VaultX crypto app contracts', () => {
  it('uses Sky UI without introducing Konsta components', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    for (const component of [
      'SkyAppPage',
      'SkyNavbar',
      'SkyScrollArea',
      'SkyField',
      'SkyButton',
      'SkySheet',
      'SkyPillNavigation',
      'SkySegmented',
    ]) {
      expect(source).toContain(`<${component}`)
    }
  })

  it('shows distinct icons in every primary navigation item', () => {
    expect(source).toContain('<WalletCards')
    expect(source).toContain('<ChartNoAxesCombined')
    expect(source).toContain('<History')
    expect(source).toContain('<UserRound')
    expect(source).toMatch(
      /\.sky-pill-navigation \.sky-segmented-button--active\)\s*\{\s*color:\s*#fff;/,
    )
  })

  it('includes advanced market detail and persistent profile controls', () => {
    expect(source).toContain('detail.sparkline')
    expect(source).toContain("t('marketDetail.statistics')")
    expect(source).toContain('<SkyToggle')
    expect(server).toContain('sky_phone:crypto:update-profile')
    expect(server).toContain('`price_alerts`')
  })

  it('uses the premium dashboard hierarchy without manual refresh controls', () => {
    expect(source).toContain('class="portfolio-shell"')
    expect(source).toContain('class="featured-market"')
    expect(source).toContain('class="activity-ring"')
    expect(source).toContain('class="profile-card"')
    expect(source).not.toContain('RefreshCw')
    expect(source).not.toContain(':aria-label="t(\'refresh\')"')
  })

  it('uses the compact Flare-style navigation and polished overlay transitions', () => {
    expect(source).toContain('class="vault-navbar"')
    expect(source).toContain(':show-back="Boolean(detail)"')
    expect(source).not.toMatch(/<SkyNavbar[\s\S]*?\slarge(?:\s|>)/)
    expect(source).toContain('class="vault-view"')
    expect(source).toContain('@keyframes vault-view-in')
    expect(source).toContain('class="sheet-header"')
    expect(source).toContain('class="sheet-close"')
    expect(source).toContain('class="sheet-market-summary"')
  })

  it('exposes a broad fictional market with dedicated logo marks', () => {
    const cryptoConfig = config.slice(
      config.indexOf('Config.Crypto = {'),
      config.indexOf('-- Server-only configuration'),
    )
    expect(cryptoConfig.match(/\n\s+Id = "/g)).toHaveLength(24)
    expect(cryptoConfig.match(/\n\s+Logo = "/g)).toHaveLength(24)
    expect(server).toContain('logo = config.Logo')
    expect(source).toContain('detail.logo')
  })

  it('keeps all consequential calculations and state transitions on the server', () => {
    expect(server).toContain(
      'Bridge.Callbacks.Register("sky_phone:crypto:quote"',
    )
    expect(server).toContain(
      'Bridge.Callbacks.Register("sky_phone:crypto:execute"',
    )
    expect(server).toContain('`consumed_operation_id`')
    expect(server).toContain('`idempotency_key`')
    expect(server).toContain("`status` = 'manual_review'")
    expect(server).toContain('Bridge.Framework.RemoveMoney')
    expect(server).toContain('Bridge.Framework.AddMoney')
    expect(server).toContain('local function with_exchange_lock')
    expect(server).toContain('local function reconcile_settlements')
    expect(server).toContain('settlement_ledger_queries')
  })

  it('stores cash in price-scale minor units throughout the ledger', () => {
    expect(server).toContain(
      'local ledger_amount = amount * Config.Crypto.PriceScale',
    )
    expect(server).toContain(
      'Config.Crypto.TreasuryCash * Config.Crypto.PriceScale',
    )
    expect(server).toContain(
      'amount = decimal_string(row.amount, Config.Crypto.PriceScale)',
    )
  })

  it('uses a memory-hard password provider with constant-time verification', () => {
    expect(passwordProvider).toContain('scryptSync')
    expect(passwordProvider).toContain('timingSafeEqual')
    expect(passwordProvider).toContain('randomBytes(16)')
    expect(server).not.toMatch(/data\.price\b/)
    expect(server).not.toMatch(/data\.fee\b/)
  })
})
