# Sky Phone

Sky Phone is a complete, standalone FiveM smartphone resource with a modern iPhone-inspired interface, persistent device data, physical or virtual SIM support, social apps, media, services, games, and framework integrations.

The production frontend is included. Customers do not need Node.js or pnpm for a normal server installation.

## Highlights

- Modern Sky UI with light and dark mode support
- Unique physical phones or one persistent virtual phone per character
- Registered, anonymous, physical, and automatic virtual SIM cards
- Calls, Messages, Mail, DarkChat, Radio, EasyShare, and payphones
- Picstagram, FlipTok, Feather, Flare, and CrewLink
- Banking, Billing, Garage, Housing, Companies, CityMarkt, Local Pages, Maps, SkyRide, and Weazel News
- Camera, Photos, Music, Calendar, Clock, Notes, Voice Memos, Weather, and Calculator
- Built-in games and an App Store
- English and German language support
- Automatic database installation and upgrades
- Command-only LB Phone database migration with preview and rollback
- Compatibility adapters for popular frameworks, inventories, voice systems, housing resources, and external phone apps

## Requirements

### Required

- MySQL or MariaDB
- `oxmysql`
- One supported framework:
  - ESX Legacy (`es_extended`)
  - Qbox (`qbx_core`)
  - QBCore (`qb-core`)
- One supported inventory:
  - `ox_inventory`
  - `qb-inventory`
  - `lj-inventory`
  - `qs-inventory`
  - `codem-inventory`
  - `core_inventory`
  - `mf-inventory`
  - `smx-inventory`

`mf-inventory` and `smx-inventory` are supported with ESX.

### Voice

Phone calls support:

- PMA Voice
- SaltyChat

The Radio app supports:

- YACA
- PMA Voice
- SaltyChat

Start the selected voice resource before Sky Phone.

### Optional services

- FiveManage V3 Media API for Camera uploads, videos, Voice Memos, and remote Gallery deletion
- GIPHY API for GIF search
- Supported Garage and Housing resources when those apps should use external provider data

## Quick installation

1. Copy the resource into your FiveM resources directory.
2. Keep the resource folder name `sky_phone`.
3. Start `oxmysql`, your framework, inventory, and voice resource before Sky Phone.
4. Review `sky_phone/config/config.lua` and `sky_phone/config/media.lua`.
5. Add the required inventory items.
6. Add `ensure sky_phone` to `server.cfg`.
7. Restart the server and watch the console for warnings.

Example start order:

```cfg
ensure oxmysql
ensure es_extended
ensure ox_inventory
ensure pma-voice
ensure sky_phone
```

Replace the example framework, inventory, and voice resources with the providers used by your server.

Sky Phone creates and upgrades its database tables automatically. A manual SQL import is normally not required.

## Configuration

Customer settings are organized in:

```text
sky_phone/config/config.lua
sky_phone/config/media.lua
```

The files contain clearly separated sections for:

| Section | Purpose |
| --- | --- |
| `Config.Bridge` | Framework, inventory, language, callback timeout, and debug mode |
| `Config.Phone` | Phone item, movement, unique-device mode, and development command |
| `Config.Sim` | Physical or virtual SIM behavior and number formatting |
| `Config.Calls` / `Config.Radio` | Voice providers, call behavior, radio limits, and permissions |
| `Config.Payphones` | Payphone pricing, props, validation, and server-owned locations |
| `Config.Animations` | Phone prop, animations, and portrait/landscape transforms |
| App sections | Limits and behavior for every built-in app |
| `Config.Server` | Stable password and passcode peppers |
| `Config.Companies` | Company directory, jobs, services, and permissions |
| `Config.Media` (`config/media.lua`) | FiveManage, GIPHY, uploads, and Gallery imports |
| `Config.Music` | Server music library and playlist limits |
| `Config.Migrations` | Manual LB Phone migration domains |
| `Config.WeazelNews` | Editorial jobs, categories, and article limits |

Restart `sky_phone` after changing Lua configuration.

### Language

Available locales:

- English: `en`
- German: `de`

Select the language near the top of `config.lua`:

```lua
Config.Bridge.Locale = "en"
```

or:

```lua
Config.Bridge.Locale = "de"
```

Locale files are stored separately:

```text
sky_phone/config/locales/en.lua
sky_phone/config/locales/de.lua
```

The German locale uses the complete English structure as a fallback, so newly introduced keys never leave the interface without text.

### Debug output

```lua
Config.Bridge.Debug = false
```

When enabled, Sky Phone prints debug and informational messages. Warnings and errors are always shown.

The short LB Phone detection notice also remains visible when debug mode is disabled.

## Security values

Sky Phone ships with stable generated defaults in `Config.Server`:

```lua
Config.Server = {
    PasscodePepper = "...",
    FlipTokPasswordPepper = "...",
    PicstagramPasswordPepper = "...",
}
```

For a production server, replace them with your own long, random, different values before players create passcodes or social accounts.

Important:

- Keep the values private and stable.
- Changing `PasscodePepper` invalidates existing device passcodes.
- Changing a social-app pepper invalidates existing passwords for that app.
- Do not replace these values during routine updates.

Sky Cloud logins are in-character credentials for the roleplay phone. Players must never reuse a
real-world password. FlipTok and Picstagram passwords are stored as salted hashes using their
configured peppers.

The server-only block is evaluated only on the server. Because the project uses a customer-requested single configuration file that is also present in the client resource package, protect access to your distributed resource files if these values must remain strictly secret.

## Inventory items

### ox_inventory

Default entries for unique phones with physical SIM cards:

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

Do not configure an LB Phone client event or client export. Sky Phone registers the usable items through its server-side inventory adapter.

The server registers `Config.Phone.Item` as usable for every supported inventory adapter: `ox`, `qb`, `lj`, `qs`, `codem`, `core`, `mf`, and `smx`. Resource startup fails visibly if the selected adapter cannot complete that registration.

### QBCore-style item tables

- Set the phone's `unique` value to match `Config.Phone.Unique`.
- Set `useable = true` and `shouldClose = true`.
- Physical SIM items must always be unique.
- SIM items are not required when `Config.Sim.Enabled = false`.

## Phone and SIM modes

The two mode switches are independent:

```lua
Config.Phone.Unique = true
Config.Sim.Enabled = true
```

| Phone mode | Behavior |
| --- | --- |
| `Unique = true` | Every phone item receives its own IMEI. Settings, apps, local data, linked account, and SIM move with the item. The item must not stack. |
| `Unique = false` | Every framework character receives one persistent virtual device. Any configured phone item opens that device. The item may stack. |

With unique phones, using an inventory item selects that exact handset whenever the inventory reports its slot. The F1 hotkey reopens the last selected IMEI; if no handset has been selected yet, the server chooses the first concrete phone slot. The client never supplies a slot or IMEI.

| SIM mode | Behavior |
| --- | --- |
| `Enabled = true` | A registered or anonymous physical SIM item is required for cellular service. |
| `Enabled = false` | Sky Phone creates a persistent automatic number for devices without a SIM. Physical SIM items are not required. |

When changing these modes on an existing production server, restart the resource and test with a copy of the database first. The first phone used after switching to non-unique mode may adopt an existing valid IMEI so its local data is preserved.

## Database

Runtime migrations create and update the Sky Phone schema automatically.

For hosts that require a manual fresh installation, import:

```text
sky_phone/sql/install.sql
```

Keep runtime migrations enabled after importing the SQL file because they remain responsible for future upgrades.

A Sky Cloud account is optional. Devices without an account retain local settings and supported local app data. Linking an account synchronizes supported data across linked devices.

## Media and uploads

Configure FiveManage in the server-only `sky_phone/config/media.lua` file:

```lua
Config.Media.FiveManage.ApiKey = "your-fivemanage-v3-media-token"
```

Without a valid token:

- Camera uploads are disabled
- Video uploads are disabled
- Voice Memo uploads are disabled
- FiveManage Gallery imports are unavailable

Configure GIF search with:

```lua
Config.Media.GiphyApiKey = "your-giphy-api-key"
```

Gallery import websites are configured under `Config.Media.Import.Websites`. Direct URLs are accepted only when their HTTPS hostname matches the configured allowed hosts.

## Music

Place server-owned audio files anywhere below:

```text
sky_phone/config/music/
```

Supported audio formats:

- OGG
- MP3

Optional artwork may use:

- WEBP
- PNG
- JPG
- JPEG

Configure each track in `Config.Music.Tracks`:

```lua
Config.Music.Tracks = {
    {
        Id = "night-drive",
        Title = "Night Drive",
        Artist = "Sky Records",
    },
}
```

Name the audio and artwork files after the stable track ID, for example:

```text
night-drive.ogg
night-drive.webp
```

Restart Sky Phone after adding files. A frontend rebuild is not required.

Players may also add public YouTube video links to their personal music library.

## Voice and Radio

### Calls

```lua
Config.Calls.VoiceProvider = "pma"
```

Supported values:

- `pma` or `pma-voice`
- `saltychat` or `salty`

SaltyChat supports the provider-backed call speaker feature. PMA Voice keeps the speaker option unavailable.

### Radio

```lua
Config.Radio.VoiceProvider = "auto"
```

Automatic selection checks YACA, PMA Voice, and SaltyChat. Restricted frequency ranges and job access are configured in `Config.Radio.LockedChannels`.

Radio display-name permissions are configured in `Config.Radio.DisplayName.AllowedJobs`.

## Payphones

Sky Phone includes server-authoritative GTA V payphone locations. Pricing, payment account, props, validation distances, and custom locations are configured under `Config.Payphones`.

Custom location example:

```lua
Config.Payphones.Locations = {
    { model = "prop_phonebox_01a", coords = { x = 123.45, y = 678.90, z = 21.0 } },
}
```

The model must also be listed in `Config.Payphones.Props`.

## Commands

`Config.Phone.Keybind` defaults to `F1` and can be rebound in FiveM's key bindings. Set it to `false` to disable the phone hotkey.

| Command | Where | Purpose |
| --- | --- | --- |
| `/phone` | In game | Opens the development phone command when `Config.Phone.DevelopmentCommand` is enabled |
| `/phonetestdata` | In game | Creates customer-scoped test data when `Config.TestData.Enabled` is enabled |
| `/fliptokverify <@handle> [on\|off]` | In game | Toggles or sets FlipTok verification for configured admin groups |
| `/picstagramverify <@handle> <on\|off>` | In game | Sets Picstagram verification for configured admin groups |
| `skyphone:migrate lb-phone dry` | Server console | Previews the LB Phone migration |
| `skyphone:migrate lb-phone` | Server console | Imports enabled LB Phone domains |
| `skyphone:migrate lb-phone force` | Server console | Re-runs enabled domains idempotently |
| `skyphone:migrate lb-phone remove` | Server console | Removes imported Sky Phone records and migration markers |

Command names and admin groups for the social apps are configurable.

Disable test data on production servers:

```lua
Config.TestData.Enabled = false
```

## LB Phone migration

Sky Phone detects supported LB Phone database tables during startup and prints a short notice. Detection never starts a migration automatically.

Recommended workflow:

1. Create a database backup.
2. Run the preview:
   `skyphone:migrate lb-phone dry`
3. Review the domain summaries.
4. Run the import:
   `skyphone:migrate lb-phone`
5. Restart and verify the migrated accounts and apps.

The importer:

- Reads LB Phone source tables without modifying them
- Supports preserved `_lb` tables created by sd-phone migrations
- Records per-domain completion markers
- Can be retried safely with `force`
- Can remove migration-created Sky Phone data with `remove`
- Reports unsupported source records instead of forcing them into incompatible Sky Phone structures

Supported domains include devices, settings, alarms, contacts, blocked numbers, calls, messages, photos, notes, wallet, voice memos, Picstagram, Mail, map markers, compatible DarkChat data, FlipTok, and Feather.

The migration command is server-console only.

## Garage, Housing, and Companies

### Garage

Select the provider under `Config.Garage.System`. Vehicle images use the configured CDN template with an icon fallback when no image is available.

### Housing

Select the provider under `Config.Housing.System`. Automatic mode supports the configured provider priority.

### Companies

Company jobs, public profiles, service numbers, services, permissions, locations, and default availability are configured under `Config.Companies.Definitions`.

### Weazel News

Configure editorial jobs and minimum grades:

```lua
Config.WeazelNews.AllowedJobs = {
    weazel = 0,
    reporter = 2,
}
```

Unlisted jobs can read news but cannot manage articles.

## External custom apps

Sky Phone includes compatibility adapters for supported custom-app contracts from:

- LB Phone
- 17Movement
- High Phone
- Quasar Smartphone
- YSeries

The resource provides the compatibility aliases `lb-phone`, `17mov_Phone`, `high-phone`, `qs-smartphone`, and `yseries`.

See [Custom App Integration](docs/custom-apps.md) for setup details and compatibility limits.
The complete per-app list of public exports, observer events, internal related contracts, and the
Custom App iframe protocol is available in [Exports and Events](docs/exports-events.md).

## Updating Sky Phone

Before updating:

1. Back up the database.
2. Back up `config/config.lua`, `config/media.lua`, and any custom media.
3. Keep the three pepper values unchanged.
4. Replace the resource files.
5. Reapply customer-specific configuration carefully.
6. Restart Sky Phone and review warnings and errors.

Do not overwrite a production configuration without comparing it to the new version.

## Frontend development

Customers installing a release do not need to build the frontend.

For development:

```powershell
cd frontend
pnpm install
pnpm dev
```

Create a production frontend build with:

```powershell
pnpm build
```

The production output is written to `sky_phone/source/html`.

Useful checks:

```powershell
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## Troubleshooting

### The phone item does nothing

- Confirm the framework and inventory are supported and started first.
- Confirm the item name matches `Config.Phone.Item`.
- Confirm the item is usable.
- In unique mode, confirm the phone is non-stackable.
- Check the server console for inventory adapter warnings.

### Calls connect without audio

- Confirm the configured voice resource is running.
- Confirm `Config.Calls.VoiceProvider` matches the installed provider.
- Start the voice resource before Sky Phone.

### Camera or Voice Memos cannot upload

- Configure a valid FiveManage V3 Media API token.
- Confirm the token has the required file permissions.
- Restart Sky Phone after changing the token.

### Social app password or passcode warnings appear

- Check the values in `Config.Server`.
- Use long, stable values.
- Do not change them after accounts or passcodes have been created.

### The LB Phone notice appears

This is only a detection notice. No data is imported automatically. Run the `dry` command from the server console when you are ready.

### More diagnostic output is needed

Enable:

```lua
Config.Bridge.Debug = true
```

Reproduce the problem, collect the relevant server and client console lines, and disable debug mode again afterward.

## Credits and notices

Third-party acknowledgements and license information are available in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
