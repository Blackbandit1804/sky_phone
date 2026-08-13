const assert = require('node:assert/strict')
const { once } = require('node:events')

const { app } = require('./index.cjs')

const browserDataRequests = [
  ['development:bootstrap', {}],
  ['account:devices', {}],
  ['banking:overview', {}],
  ['billing:overview', {}],
  ['billing:list', { filter: 'all', limit: 20, offset: 0 }],
  ['calendar:list', { endsAt: 4_102_444_800, startsAt: 0 }],
  ['calls:recents', {}],
  ['companies:list', {}],
  ['companies:my-requests', { limit: 20, offset: 0 }],
  ['companies:work-context', {}],
  ['companies:work-queue', { limit: 20, offset: 0 }],
  ['contacts:list', {}],
  ['crewlink:bootstrap', {}],
  ['crewlink:live', {}],
  ['crewlink:nearby', {}],
  ['darkchat:bootstrap', {}],
  ['easyshare:bootstrap', {}],
  ['easyshare:own-contact', {}],
  ['feather:bootstrap', {}],
  ['feather:feed', { limit: 20 }],
  ['feather:explore', { limit: 20 }],
  ['flare:bootstrap', {}],
  ['fliptok:bootstrap', {}],
  ['fliptok:feed', { limit: 20 }],
  ['fliptok:discover', { limit: 20 }],
  ['fliptok:activities', {}],
  ['gallery:list', {}],
  ['garage:vehicles', {}],
  ['garage:valet-state', {}],
  ['housing:overview', {}],
  ['housing:key-candidates', { action: 'give' }],
  ['mail:counts', {}],
  ['mail:list', { folder: 'inbox' }],
  ['map:getPlayerCoords', {}],
  ['map:markers', {}],
  ['marketplace:counts', {}],
  ['marketplace:list', {}],
  ['marketplace:list-own', {}],
  ['marketplace:list-inquiries', {}],
  ['marketplace:profile', {}],
  ['messages:conversations', {}],
  ['messages:gifs', { query: 'party' }],
  ['memos:list', {}],
  ['music:bootstrap', {}],
  ['notes:list', {}],
  ['pages:list', {}],
  ['pages:list-own', {}],
  ['pages:profile', {}],
  ['picstagram:bootstrap', {}],
  ['picstagram:feed', { limit: 20 }],
  ['picstagram:explore', { limit: 20 }],
  ['picstagram:saved', {}],
  ['picstagram:stories', {}],
  ['picstagram:activities', {}],
  ['radio:get', {}],
  ['skyride:bootstrap', {}],
  ['skyride:history', {}],
  ['skyride:get-player-coords', {}],
  ['weather:get', {}],
]

async function post(baseUrl, endpoint, body = {}) {
  const response = await fetch(`${baseUrl}/api/${endpoint}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  assert.equal(response.status, 200, endpoint)
  return response.json()
}

async function expectSuccess(baseUrl, endpoint, body = {}, data = false) {
  const result = await post(baseUrl, endpoint, body)
  assert.equal(result.success, true, `${endpoint}: ${result.error ?? 'failed'}`)
  if (data) assert.notEqual(result.data, undefined, `${endpoint}: missing data`)
  return result.data
}

async function verifyStatefulActions(baseUrl) {
  const memoBootstrap = await expectSuccess(
    baseUrl,
    'development:bootstrap',
    {},
    true,
  )
  assert(
    Array.isArray(memoBootstrap.memos) && memoBootstrap.memos.length >= 3,
    'development:bootstrap did not include realistic memo data',
  )
  assert(
    memoBootstrap.memos.every(
      (memo) =>
        typeof memo.url === 'string' &&
        memo.url.length > 0 &&
        Array.isArray(memo.waveform) &&
        memo.waveform.length >= 8,
    ),
    'development:bootstrap returned an invalid memo response shape',
  )

  let memos = await expectSuccess(baseUrl, 'memos:list', {}, true)
  const capturedMemo = await expectSuccess(
    baseUrl,
    'memos:devCapture',
    {
      audioDataUrl: 'data:audio/webm;base64,T2dnUw==',
      correlationId: 'browser-smoke-memo',
      durationMs: 1_250,
      mimeType: 'audio/webm;codecs=opus',
      note: 'Recorded in the browser preview.',
      pinned: false,
      title: 'Browser recording',
      waveform: Array(16).fill(0.35),
    },
    true,
  )
  assert.equal(capturedMemo.title, 'Browser recording')
  assert.equal(capturedMemo.mimeType, 'audio/webm')
  assert.equal(capturedMemo.sizeBytes, 4)
  assert.match(capturedMemo.id, /^[0-9a-f-]{36}$/)
  memos = await expectSuccess(baseUrl, 'memos:list', {}, true)
  assert(
    memos.some((item) => item.id === capturedMemo.id),
    'memos:devCapture did not persist',
  )
  await expectSuccess(baseUrl, 'memos:delete', { id: capturedMemo.id }, true)
  memos = await expectSuccess(baseUrl, 'memos:list', {}, true)

  const memo = memos.find((item) => !item.pinned)
  assert(memo, 'memos:list did not return an editable memo')
  const updatedMemo = await expectSuccess(
    baseUrl,
    'memos:update',
    {
      id: memo.id,
      note: 'Updated by the browser mock smoke test.',
      pinned: true,
      revision: memo.revision,
      title: 'Updated browser memo',
    },
    true,
  )
  assert.equal(updatedMemo.id, memo.id)
  assert.equal(updatedMemo.title, 'Updated browser memo')
  assert.equal(updatedMemo.note, 'Updated by the browser mock smoke test.')
  assert.equal(updatedMemo.pinned, true)
  assert.equal(updatedMemo.revision, memo.revision + 1)
  assert(Array.isArray(updatedMemo.waveform) && updatedMemo.waveform.length > 0)

  const deletedMemo = await expectSuccess(
    baseUrl,
    'memos:delete',
    { id: updatedMemo.id },
    true,
  )
  assert.deepEqual(deletedMemo, { id: updatedMemo.id })
  memos = await expectSuccess(baseUrl, 'memos:list', {}, true)
  assert(
    !memos.some((item) => item.id === updatedMemo.id),
    'memos:delete did not persist',
  )

  const noteId = `browser-note-${Date.now()}`
  let notes = await expectSuccess(
    baseUrl,
    'notes:create',
    {
      body: 'Created by the browser mock smoke test.',
      id: noteId,
      title: 'Browser test',
    },
    true,
  )
  assert(
    notes.some((note) => note.id === noteId),
    'notes:create did not persist',
  )
  notes = await expectSuccess(
    baseUrl,
    'notes:update',
    {
      body: 'Updated browser test note.',
      id: noteId,
      title: 'Browser test updated',
    },
    true,
  )
  assert.equal(
    notes.find((note) => note.id === noteId)?.title,
    'Browser test updated',
  )
  notes = await expectSuccess(baseUrl, 'notes:delete', { id: noteId }, true)
  assert(
    !notes.some((note) => note.id === noteId),
    'notes:delete did not persist',
  )

  const contact = await expectSuccess(
    baseUrl,
    'contacts:save',
    { name: 'Browser Tester', phoneNumber: '5552223333' },
    true,
  )
  await expectSuccess(
    baseUrl,
    'contacts:favorite',
    { favorite: true, id: contact.id },
    true,
  )
  let contacts = await expectSuccess(baseUrl, 'contacts:list', {}, true)
  assert.equal(contacts.find((item) => item.id === contact.id)?.favorite, true)
  await expectSuccess(baseUrl, 'contacts:delete', { id: contact.id })
  contacts = await expectSuccess(baseUrl, 'contacts:list', {}, true)
  assert(
    !contacts.some((item) => item.id === contact.id),
    'contacts:delete did not persist',
  )

  const event = await expectSuccess(
    baseUrl,
    'calendar:create',
    {
      allDay: false,
      description: 'Stateful browser mock check',
      endsAt: 2_000_003_600,
      location: 'Legion Square',
      reminderMinutes: 15,
      startsAt: 2_000_000_000,
      title: 'Browser test event',
    },
    true,
  )
  let events = await expectSuccess(
    baseUrl,
    'calendar:list',
    { endsAt: 4_102_444_800, startsAt: 0 },
    true,
  )
  const storedEvent = events.find((item) => item.id === event.id)
  assert(storedEvent, 'calendar:create did not persist')
  await expectSuccess(baseUrl, 'calendar:update', {
    ...storedEvent,
    endsAt: storedEvent.endsAt / 1000,
    startsAt: storedEvent.startsAt / 1000,
    title: 'Updated browser test event',
  })
  events = await expectSuccess(
    baseUrl,
    'calendar:list',
    { endsAt: 4_102_444_800, startsAt: 0 },
    true,
  )
  assert.equal(
    events.find((item) => item.id === event.id)?.title,
    'Updated browser test event',
  )
  await expectSuccess(baseUrl, 'calendar:delete', { id: event.id })

  const marker = await expectSuccess(
    baseUrl,
    'map:create-marker',
    {
      color: '#2dd4bf',
      coords: { x: 215.2, y: -810.1, z: 30.7 },
      icon: 'pin',
      label: 'Browser test marker',
    },
    true,
  )
  let markers = await expectSuccess(baseUrl, 'map:markers', {}, true)
  assert(
    markers.some((item) => item.id === marker.id),
    'map:create-marker did not persist',
  )
  await expectSuccess(baseUrl, 'map:delete-marker', { id: marker.id })
  markers = await expectSuccess(baseUrl, 'map:markers', {}, true)
  assert(
    !markers.some((item) => item.id === marker.id),
    'map:delete-marker did not persist',
  )

  const bankingBefore = await expectSuccess(
    baseUrl,
    'banking:overview',
    {},
    true,
  )
  const bankingAfter = await expectSuccess(
    baseUrl,
    'banking:transfer',
    { amount: 125, phoneNumber: '5551110001' },
    true,
  )
  assert.equal(bankingAfter.bank, bankingBefore.bank - 125)

  let radio = await expectSuccess(
    baseUrl,
    'radio:connect',
    { frequency: 42.5, secondaryFrequency: 7.25 },
    true,
  )
  assert.equal(radio.frequency, 42.5)
  radio = await expectSuccess(baseUrl, 'radio:set-volume', { volume: 44 }, true)
  assert.equal(radio.volume, 44)
  await expectSuccess(baseUrl, 'radio:disconnect')

  const playlistState = await expectSuccess(
    baseUrl,
    'music:create-playlist',
    { name: 'Browser Test Mix' },
    true,
  )
  const playlist = playlistState.playlists.find(
    (item) => item.name === 'Browser Test Mix',
  )
  assert(playlist, 'music:create-playlist did not persist')
  await expectSuccess(
    baseUrl,
    'music:rename-playlist',
    { id: playlist.id, name: 'Updated Browser Mix' },
    true,
  )
  await expectSuccess(
    baseUrl,
    'music:delete-playlist',
    { id: playlist.id },
    true,
  )

  await expectSuccess(baseUrl, 'sim:eject')
  let bootstrap = await expectSuccess(
    baseUrl,
    'development:bootstrap',
    {},
    true,
  )
  assert.equal(bootstrap.device.sim, null)
  const simConfirmation = await post(baseUrl, 'sim:insert', {
    imei: '356938035643810',
  })
  assert.deepEqual(simConfirmation, {
    error: 'confirmation_required',
    success: false,
  })
  await expectSuccess(baseUrl, 'sim:insert', {
    confirmed: true,
    imei: '356938035643810',
  })
  bootstrap = await expectSuccess(baseUrl, 'development:bootstrap', {}, true)
  assert.equal(bootstrap.device.sim.number, '5559876543')

  const payphoneCall = await expectSuccess(
    baseUrl,
    'payphone:dial',
    { phoneNumber: '5551110001' },
    true,
  )
  assert.equal(payphoneCall.state, 'connected')
  await expectSuccess(baseUrl, 'payphone:hangup')

  const draft = await expectSuccess(
    baseUrl,
    'mail:save-draft',
    {
      body: 'Browser test body',
      recipients: ['alex@ifruit.com'],
      subject: 'Browser test mail',
    },
    true,
  )
  const storedDraft = await expectSuccess(
    baseUrl,
    'mail:get-draft',
    { id: draft.id },
    true,
  )
  assert.equal(storedDraft.subject, 'Browser test mail')
  await expectSuccess(baseUrl, 'mail:delete-many', {
    folder: 'drafts',
    ids: [draft.id],
  })
  const drafts = await expectSuccess(
    baseUrl,
    'mail:list',
    { folder: 'drafts' },
    true,
  )
  assert.equal(drafts.items.length, 0, 'mail:delete-many kept selected draft')

  await expectSuccess(baseUrl, 'mail:delete-many', {
    folder: 'inbox',
    ids: [1],
  })
  const inbox = await expectSuccess(
    baseUrl,
    'mail:list',
    { folder: 'inbox' },
    true,
  )
  assert(
    inbox.items.some((message) => message.id === 2),
    'mail:delete-many removed a non-selected inbox message',
  )
  const trash = await expectSuccess(
    baseUrl,
    'mail:list',
    { folder: 'trash' },
    true,
  )
  assert(
    trash.items.some((message) => message.id === 1),
    'mail:delete-many did not move selected inbox mail to trash',
  )

  await expectSuccess(baseUrl, 'mail:delete-many', {
    folder: 'sent',
    ids: [3],
  })
  const sent = await expectSuccess(
    baseUrl,
    'mail:list',
    { folder: 'sent' },
    true,
  )
  assert.equal(sent.items.length, 0, 'mail:delete-many kept selected sent mail')

  await expectSuccess(baseUrl, 'mail:delete-many', {
    folder: 'trash',
    ids: [1],
  })
  const remainingTrash = await expectSuccess(
    baseUrl,
    'mail:list',
    { folder: 'trash' },
    true,
  )
  assert(
    !remainingTrash.items.some((message) => message.id === 1),
    'mail:delete-many kept permanently deleted trash mail',
  )
  assert(
    remainingTrash.items.some((message) => message.id === 4),
    'mail:delete-many removed non-selected trash mail',
  )
}

async function main() {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    for (const [endpoint, body] of browserDataRequests) {
      await expectSuccess(baseUrl, endpoint, body, true)
    }

    await verifyStatefulActions(baseUrl)

    const lifecycleEndpoints = [
      'camera:setActive',
      'camera:setFacing',
      'camera:setFlash',
      'camera:setFocus',
      'camera:setOrientation',
      'camera:setZoom',
      'close',
      'custom-app:lifecycle',
      'device:notification-open',
      'notification:focus',
      'sim:picker-close',
      'ui:opened',
      'ui:ready',
    ]
    for (const endpoint of lifecycleEndpoints) {
      await expectSuccess(baseUrl, endpoint)
    }

    const unknown = await post(baseUrl, 'development:missing-mock', {})
    assert.deepEqual(unknown, {
      error: 'mock_endpoint_missing',
      success: false,
    })
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }

  console.log(
    `Verified ${browserDataRequests.length} browser data endpoints and stateful app actions.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
