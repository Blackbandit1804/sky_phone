import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const manifest = readFileSync(
  new URL('../../sky_phone/fxmanifest.lua', import.meta.url),
  'utf8',
)
const config = readFileSync(
  new URL('../../sky_phone/config/config.lua', import.meta.url),
  'utf8',
)
const sharedBridge = readFileSync(
  new URL('../../sky_phone/source/bridge/shared.lua', import.meta.url),
  'utf8',
)
const clientCalls = readFileSync(
  new URL('../../sky_phone/source/bridge/client/calls.lua', import.meta.url),
  'utf8',
)
const clientMain = readFileSync(
  new URL('../../sky_phone/source/client/main.lua', import.meta.url),
  'utf8',
)
const clientRadio = readFileSync(
  new URL('../../sky_phone/source/bridge/client/radio.lua', import.meta.url),
  'utf8',
)
const radioNui = readFileSync(
  new URL('../../sky_phone/source/client/radio.lua', import.meta.url),
  'utf8',
)
const serverCalls = readFileSync(
  new URL('../../sky_phone/source/server/calls.lua', import.meta.url),
  'utf8',
)
const serverRadio = readFileSync(
  new URL('../../sky_phone/source/server/radio.lua', import.meta.url),
  'utf8',
)
const serverVoice = readFileSync(
  new URL('../../sky_phone/source/bridge/server/voice.lua', import.meta.url),
  'utf8',
)

describe('voice provider contracts', () => {
  it('loads the provider bridges before their call and radio consumers', () => {
    expect(manifest.indexOf("'source/bridge/client/calls.lua'")).toBeLessThan(
      manifest.indexOf("'source/client/payphones.lua'"),
    )
    expect(manifest.indexOf("'source/bridge/server/voice.lua'")).toBeLessThan(
      manifest.indexOf("'source/server/calls.lua'"),
    )
  })

  it('owns SaltyChat call membership and phone speaker state on the server', () => {
    expect(serverVoice).toContain('exports.saltychat:AddPlayersToCall')
    expect(serverVoice).toContain('exports.saltychat:RemovePlayersFromCall')
    expect(serverVoice).toContain('exports.saltychat:SetPhoneSpeaker')
    expect(serverCalls).toContain(
      'Bridge.Callbacks.Register("sky_phone:calls:set-speaker"',
    )
    expect(serverCalls).toContain('local call_id = active_by_source[source]')
    expect(serverCalls).toContain('call.id ~= data.id')
    expect(serverCalls).toContain('Bridge.Calls.Stop(')
    expect(serverCalls).toMatch(
      /call\.speakers\[source\] = data\.enabled\s+send_state\(call, source, "connected", call\.channel\)/,
    )
    expect(clientMain).toContain('"calls:set-speaker"')
    expect(clientCalls).toContain(
      'SaltyChat call membership is owned by the server bridge.',
    )
  })

  it('supports one global server-authoritative speaker switch', () => {
    expect(config).toMatch(/Config\.Speaker\s*=\s*\{\s*Enabled\s*=\s*true,/)
    expect(sharedBridge).toContain('function Bridge.Speaker.IsEnabled()')
    expect(clientCalls).toContain(
      'Bridge.Speaker.IsEnabled() and resolve_provider() == "saltychat"',
    )
    expect(clientRadio).toContain(
      'Bridge.Speaker.IsEnabled() and resolve_provider() == "saltychat"',
    )
    expect(serverVoice).toContain(
      'Bridge.Speaker.IsEnabled() and resolve_call_provider() == "saltychat"',
    )
    expect(serverVoice).toContain(
      'Bridge.Speaker.IsEnabled() and resolve_radio_provider() == "saltychat"',
    )
    expect(serverCalls).toContain('if not Bridge.Speaker.IsEnabled() then')
  })

  it('uses the documented client and server Radio speaker exports', () => {
    expect(clientRadio).toContain('exports.saltychat:GetRadioSpeaker()')
    expect(clientRadio).toContain('exports.saltychat:SetRadioSpeaker(')
    expect(serverVoice).toContain('exports.saltychat:SetPlayerRadioSpeaker(')
    expect(radioNui).toContain('RegisterNUICallback("radio:set-speaker"')
    expect(serverRadio).toContain(
      'Bridge.Callbacks.Register("sky_phone:radio:set-speaker"',
    )
    expect(serverRadio).toContain('if not channels[source] then')
    expect(serverRadio).toContain(
      'AddEventHandler("onResourceStop", function(resource_name)',
    )
  })
})
