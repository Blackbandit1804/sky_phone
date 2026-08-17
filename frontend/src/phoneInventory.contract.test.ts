import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const readResourceFile = (path: string) =>
  readFileSync(new URL(`../../sky_phone/${path}`, import.meta.url), 'utf8')

const inventoryAdapters = [
  ['ox', 'source/bridge/server/inventory/ox.lua'],
  ['qb', 'source/bridge/server/inventory/qb.lua'],
  ['lj', 'source/bridge/server/inventory/qb.lua'],
  ['qs', 'source/bridge/server/inventory/qs.lua'],
  ['codem', 'source/bridge/server/inventory/codem.lua'],
  ['core', 'source/bridge/server/inventory/core.lua'],
  ['mf', 'source/bridge/server/inventory/mf.lua'],
  ['smx', 'source/bridge/server/inventory/smx.lua'],
] as const

describe('phone inventory contracts', () => {
  it.each(inventoryAdapters)(
    'registers the phone as a usable item through the %s adapter',
    (_inventory, path) => {
      expect(readResourceFile(path)).toContain(
        'function Bridge.Inventory.RegisterUsableItem',
      )
    },
  )

  it('fails startup when the selected inventory cannot register the phone item', () => {
    const phoneServer = readResourceFile('source/server/phone.lua')

    expect(phoneServer).toContain(
      'Bridge.Inventory.RegisterUsableItem(Config.Phone.Item, open_phone)',
    )
    expect(phoneServer).toContain('if not usable_registered then')
  })

  it('opens from a configurable F1 mapping without client-provided device identity', () => {
    const config = readResourceFile('config/config.lua')
    const phoneClient = readResourceFile('source/client/main.lua')
    const phoneServer = readResourceFile('source/server/phone.lua')

    expect(config).toContain('Keybind = "F1"')
    expect(phoneClient).toContain(
      'RegisterKeyMapping("sky_phone_toggle", locale.Controls.OpenPhone, "keyboard", Config.Phone.Keybind)',
    )
    expect(phoneClient).toContain(
      'Bridge.Callbacks.Trigger("sky_phone:device:open-request", {})',
    )
    expect(phoneServer).toContain(
      'Bridge.Callbacks.Register("sky_phone:device:open-request", function(source)',
    )
  })

  it('keeps a server-selected unique handset as the preferred hotkey device', () => {
    const phoneServer = readResourceFile('source/server/phone.lua')

    expect(phoneServer).toContain('local preferred_device_imeis = {}')
    expect(phoneServer).toContain('local preferred_imei = preferred_device_imeis[source]')
    expect(phoneServer).toContain('preferred_device_imeis[source] = imei')
  })
})
