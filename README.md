# sky_phone

## Custom Apps

`sky_phone` erkennt Registrierungen gestarteter Fremd-App-Ressourcen über integrierte
Hersteller-Aliase und übernimmt unterstützte Apps automatisch in Springboard und App Store. In
App-Ressourcen müssen dafür keine Sky-Vorlagen abgelegt werden. Unterstützt werden die
dokumentierten Basisverträge von LB Phone, 17Movement, High Phone, Quasar Smartphone V3 und
YSeries; die Resource- und Cfx-Export-Aliase `lb-phone`, `17mov_Phone`, `high-phone`,
`qs-smartphone` und `yseries` werden direkt von `sky_phone` bereitgestellt. Einrichtung und
ehrliche Kompatibilitätsgrenzen stehen in der
[deutschen Custom-App-Anleitung](docs/custom-apps.md).

## FlipTok verification

FlipTok verification is server-authoritative and limited to the framework groups configured in
`Config.FlipTok.AdminGroups`; no command ACE is required. Use
`/fliptokverify <@handle> [on|off]`. Without `on` or `off`, the current blue-check state is toggled.
The command name is configurable through `Config.FlipTok.VerifyCommand`.
Verification command access uses `Config.FlipTok.AdminGroups`. The report moderation overview is
server-authoritative and independently restricted through `Config.FlipTok.ReportAdminGroups`.

## FlipTok music

Licensed music can be exposed in the composer through `Config.FlipTok.MusicTracks`. Keep the IDs
stable because published videos store the selected ID; URLs must be directly playable by the NUI.

```lua
MusicTracks = {
    { Id = "night-drive", Title = "Night Drive", Artist = "Sky Radio", Url = "https://cdn.example.com/night-drive.ogg" },
}
```

## Music app

The standalone `Music` app plays audio only inside the current player's NUI. It never creates a
world sound, voice channel, positional event, or 3D-audio state that another player can hear.

Server-owned MP3/OGG tracks and their optional artwork live directly in
`sky_phone/config/music`. Define only their stable ID, title, and artist in
`sky_phone/config/music.lua`:

```lua
Tracks = {
    {
        Id = "night-drive",
        Title = "Night Drive",
        Artist = "Sky Records",
    },
}
```

The resource searches `config/music` and all of its subdirectories for files whose name matches
the ID. For the example above, place `night-drive.ogg` or `night-drive.mp3` anywhere below that
directory. Optional artwork uses the same name with `.webp`, `.png`, `.jpg`, or `.jpeg`. If both
audio formats exist, OGG wins; artwork priority is WEBP, PNG, JPG, then JPEG. More than one file
with the selected extension and ID is ambiguous and the server reports it in the console. Folder
names may contain spaces, but must not contain path separators or control characters. Do not name
a folder itself with a supported audio or artwork extension.

No frontend build is needed when tracks change. Restart the resource so FiveM republishes the
files and reloads the track configuration. Keep existing track IDs stable because playlists store
those IDs. Moving matching files between subdirectories does not affect playlists.

When upgrading from the previous path-based configuration, rename each audio and artwork file to
its existing ID and remove the `File` and `Artwork` fields. Do not change the ID itself, otherwise
existing playlist entries can no longer resolve the track.

Players can add public YouTube video links to their own library. Metadata is requested through
YouTube's oEmbed endpoint on the server, while playback uses the embedded YouTube player only on
that player's NUI. Personal songs and playlists are stored per linked iFruit account, or per phone
IMEI while signed out, in the `sky_phone_music_*` tables. Limits and rate controls are configured in
`config/music.lua`.

## FlipTok accounts

FlipTok profiles use their own username and password login. Registration requires a linked iFruit
account once so an existing creator profile, videos, followers, and verification can be claimed
without data loss. Login sessions are stored per phone IMEI and survive resource or server restarts;
signing out removes only that device session.

Set a private, stable password pepper in `server.cfg` before players register. Changing it later
invalidates every existing FlipTok password:

```cfg
set sky_phone_fliptok_password_pepper "replace-with-a-long-random-secret"
```

Passwords are stored as salted hashes. The pepper is read server-side from the convar and is never
included in the NUI bundle.

Standalone FiveM phone built with Vue 3, TypeScript, Pinia, Vue Router, Konsta UI 5, and Tailwind CSS 4. The phone opens through the usable item; `/phone` is disabled unless `Config.Phone.DevelopmentCommand` is enabled explicitly. Phone identity and SIM-card behavior are selected independently through `Config.Phone.Unique` and `Config.Sim.Enabled`.

An iFruit account is optional. Unlinked devices retain local settings, alarms, media, apps, notes, contacts, and recent calls. Linking from Mail or Settings moves local data into an empty cloud account; an existing cloud dataset wins over local contacts and recents. Signing out keeps an editable local snapshot without deleting cloud data.

## Phone identity and SIM modes

Both compatibility switches default to the physical, unique-item behavior:

```lua
Config.Phone.Unique = true
Config.Sim.Enabled = true
```

For backwards compatibility, an omitted switch is also treated as `true`.

With `Config.Phone.Unique = true`, every phone item is one transferable physical Device. Its unique
15-digit IMEI is stored in item metadata, so its settings, PIN, local app data, linked iFruit
account, and installed SIM travel with that item. The item must be non-stackable.

With `Config.Phone.Unique = false`, the server assigns each framework character one persistent
virtual Device. Possessing any configured phone item grants access to that Device, but the item does
not own its IMEI or data. Losing a handset therefore removes access only until the character obtains
another one; the replacement opens the same data, PIN, account session, and number. Phone items may
be stackable in this mode, although at least one phone item is still required to use or receive the
phone. The character mapping is server-authoritative and uses the framework character identifier,
never a client-supplied owner value.

With `Config.Sim.Enabled = true`, a physical registered or anonymous SIM item must be inserted before
the Device has cellular service. SIM items remain unique and non-stackable. With
`Config.Sim.Enabled = false`, SIM inventory items are not required. The first time a Device without
an attached SIM is resolved, the server creates an anonymous virtual SIM with a random unique phone
number using `Config.Sim.NumberPrefix` and `NumberLength`; `NumberGroups` controls its display
format. Physical SIM insertion and ejection are disabled in this mode. An already attached physical
SIM and its number are preserved when SIM requirements are disabled.

The switches are independent. An automatic number follows a physical handset when unique phones are
enabled and follows the character's persistent virtual Device when unique phones are disabled.
Likewise, a physical SIM inserted while unique phones are disabled belongs to the character's
virtual Device and remains available after replacing the handset.

### Existing installations and first use

After changing an existing installation to `Config.Phone.Unique = false`, the first phone item a
character uses establishes the persistent mapping. If that item has a valid legacy IMEI which is not
already mapped to another character, the complete existing Device is adopted. This preserves its
local content, PIN, linked account, and attached SIM. If the legacy IMEI cannot be adopted, the
server creates a fresh virtual Device instead. Historic unique Devices did not record an owner, so
the character carrying a handset on its first use after the change is the character that claims it.

When `Config.Sim.Enabled = false`, an existing attached physical SIM is kept; only Devices without a
SIM receive a random virtual one. If SIM cards are enabled again, automatically created virtual SIMs
are detached during resource startup so those Devices once again require a physical SIM. Stored
character-to-Device mappings remain available, but changing back to unique phones does not copy a
virtual Device's data onto an arbitrary inventory item. Treat production mode changes as migrations
and restart the resource after updating the configuration.

## Requirements

- ESX Legacy (`es_extended`), Qbox (`qbx_core`), or QBCore (`qb-core`). The bridge selects a running supported framework when `Config.Bridge.Framework` is set to `"auto"`.
- A supported inventory: `ox_inventory`, `qb-inventory`, `lj-inventory`, `qs-inventory`, `codem-inventory`, `core_inventory`, `mf-inventory`, or `smx-inventory`. The bridge auto-detects a running provider and normalizes metadata, slots, counts, item mutations, and usable-item callbacks. `mf-inventory` and `smx-inventory` require ESX. Because SMX stores standard ESX items as stacks, its adapter persists one active Phone/SIM metadata record per player and item type in ESX player metadata.
- An inventory item named `phone`. It must be non-stackable when `Config.Phone.Unique = true` and may be stackable when it is `false`.
- When `Config.Sim.Enabled = true`, two unique, non-stackable inventory items named `sky_phone_sim_registered` and `sky_phone_sim_anonymous`. Their metadata is initialized automatically on first use, so shops and crafting recipes add plain items without supplying a number. These item definitions are not required when SIM cards are disabled.
- `oxmysql` with MySQL/MariaDB.
- `pma-voice` when `Config.Calls.VoiceProvider` is set to `"pma"`.
- A FiveManage V3 Media API token for Camera photo/video uploads and Gallery deletion. Set the
  server-only `Config.Media.FiveManage.ApiKey` in `sky_phone/config/media.lua`; the token is never
  sent to NUI because clients receive temporary presigned upload URLs instead.
- `yaca-voice`, `pma-voice`, or `saltychat` when the Radio app is enabled. `Config.Radio.VoiceProvider = "auto"` selects the first running provider in that order.

## Messages GIF provider

Configure GIF search in `sky_phone/config/config.lua`:

```lua
Config.Media.GiphyApiKey = "YOUR_GIPHY_API_KEY"
```

GIPHY provides trending and searched GIFs through a paginated server-side proxy. The shared
`config.lua` is loaded by both FiveM runtimes, so its values are available to clients even though
only the server uses the GIPHY key. Photo and video actions in Messages are intentionally inactive
until their dedicated implementation is available.

Database migrations run automatically. Existing `sky_phone_mail_accounts` installations are renamed to `sky_phone_accounts` while preserving account IDs and mail foreign keys. The migration also creates `sky_phone_character_devices` for persistent non-unique phone mappings and marks automatic SIMs through `sky_phone_sims.is_virtual`. iFruit passwords are intentional in-character credentials and remain plaintext `VARCHAR(64)` values; registration screens warn players never to reuse a real password.

Camera and Gallery media is stored in `sky_phone_media`. Signed-out captures belong to the current
IMEI; linking an iFruit account moves those rows into the account gallery so every linked phone sees
them. Signing out hides cloud media without deleting it. Factory reset removes device-local media
and attempts to delete its remote FiveManage files, while account-owned media remains in the cloud.

For a fresh manual database installation, import `sky_phone/sql/install.sql`. It contains the complete current table, key, index, collation, and foreign-key schema. Runtime migrations remain authoritative for upgrading an existing installation and must stay enabled.

Framework, inventory, callback, notification, and database integrations live under `sky_phone/source/bridge`. The resource has no dependency on any other Sky resource.

## Radio app

The built-in Radio app supports a primary frequency, volume, recent channels, participant lists, automatic rejoin, join/leave notifications, and an optional service number. YACA and SaltyChat support the configured secondary frequency; PMA Voice exposes one radio channel, so the secondary input is hidden automatically.

Configure frequency bounds and precision, restricted channel ranges and allowed jobs, history length, defaults, badge validation, radio display-name permissions, and the built-in speaker HUD under `Config.Radio`. `Config.Radio.DisplayName.AllowedJobs` maps authoritative framework job names to their minimum grade. Unlisted jobs cannot change the name; an empty name restores the normal player or character name. Channel and display-name access are always checked server-side. `Config.Radio.Hud` controls the phone-owned overlay, its screen edge, offsets, and recent-speaker duration without depending on another HUD resource. Active-speaker highlighting uses the YACA radio events; the Radio app itself continues to support every configured voice provider.

Radio profiles are stored in `sky_phone_radio_profiles`. Runtime migration creates the table automatically; fresh installations receive it through `sky_phone/sql/install.sql`.

Inventory metadata has no framework-wide standard: providers differ in export names, callback payloads, slot handling, and whether metadata is called `metadata` or `info`. For that reason, `sky_phone` uses explicit provider adapters instead of guessing exports at runtime. Every supported adapter implements slot lookup, item lookup, metadata replacement, capacity handling, add/remove operations, and usable-item registration. Providers without a separate capacity export use their authoritative add operation as the final capacity gate. Phone item metadata is authoritative only when `Config.Phone.Unique = true`; in non-unique mode the persistent character mapping is authoritative instead.

When physical SIMs are enabled and a SIM is ejected or replaced, the returned inventory item is rebuilt from the authoritative `sky_phone_sims` row. Its metadata contains `sim_metadata_version`, `sim_id`, `phone_number`, `formatted_number`, and `sim_type`. Registered SIMs additionally contain `firstname`, `lastname`, `birthdate`, and `registered_at`. The internal framework owner identifier remains database-only. Inserting the item again resolves the SIM by `sim_id`; contacts and device/cloud data remain attached to their existing Device or cloud persistence instead of being copied into inventory metadata. Automatically created virtual SIMs remain database-only and never become inventory items.

For `ox_inventory`, configure the phone with `stack = false` when `Config.Phone.Unique = true`; it may use `stack = true` in non-unique mode. Physical SIM items always use `stack = false` and are only needed when `Config.Sim.Enabled = true`. Every usable item should use `consume = 0`. Do not configure a client event or export. Ox then completes its normal server-authoritative use flow and emits `ox_inventory:usedItem`; the bridge resolves the authoritative slot again and only opens the matching Device or SIM. A client export would return before Ox calls `useItem` and therefore prevent `ox_inventory:usedItem` from being emitted.

Example `ox_inventory/data/items.lua` entries for the default unique-phone, physical-SIM modes:

```lua
["phone"] = {
    label = "iFruit Phone",
    weight = 200,
    stack = false,
    close = true,
    consume = 0,
},
["sky_phone_sim_registered"] = {
    label = "Registered SIM",
    weight = 5,
    stack = false,
    close = true,
    consume = 0,
},
["sky_phone_sim_anonymous"] = {
    label = "Anonymous SIM",
    weight = 5,
    stack = false,
    close = true,
    consume = 0,
},
```

For QBCore-style item tables, set the phone's `unique` value to match `Config.Phone.Unique`, and use `useable = true` and `shouldClose = true`. When physical SIMs are enabled, define both SIM items with `unique = true`, `useable = true`, and `shouldClose = true`; omit them when SIMs are disabled. The provider adapter registers the server-side usable callbacks; no `lb-phone` event or export is used.

The homescreen is an original implementation inspired by the interaction and layout concepts in [lukejacksonn/homescreen](https://github.com/lukejacksonn/homescreen), inspected at commit [`98a812f`](https://github.com/lukejacksonn/homescreen/tree/98a812f4f7c33594e791d65092f73b8f54b3c598). No source code or image assets from that project are included.

## Development

From `frontend/`, run `pnpm dev` for browser development. The phone opens automatically and NUI callbacks are mocked. Feather can be opened directly with the following browser scenarios:

- Full data: `http://localhost:5174/?apiPort=3002#/apps/feather`
- Login and registration: `http://localhost:5174/?apiPort=3002&testScenario=feather-login#/apps/feather`
- Profile onboarding: `http://localhost:5174/?apiPort=3002&testScenario=feather-onboarding#/apps/feather`
- Empty states: `http://localhost:5174/?apiPort=3002&testScenario=feather-empty#/apps/feather`

The full-data scenario includes posts, replies, quotes, media grids, profiles, ranked hashtags, network search results, and every notification type. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` before packaging.

`pnpm build` uses `build.cjs` to replace `sky_phone/source/html` deterministically with the Vite output. Production assets use relative paths so they work through the FiveM NUI protocol.
