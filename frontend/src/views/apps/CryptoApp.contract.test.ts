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
    expect(server).not.toContain('data.price')
    expect(server).not.toContain('data.fee')
  })
})
