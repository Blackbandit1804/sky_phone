# AGENTS - sky_phone

## Scope

This repository contains the standalone FiveM resource `sky_phone`. These rules
apply throughout the repository unless a more specific `AGENTS.md` adds stricter
requirements.

## Architecture and security

- Keep `sky_phone` independent. Do not add dependencies or integrations with
  `sky_base`, `sky_jobs_base`, or other `sky_*` resources.
- Keep resource-owned configuration, persistence, callbacks, events, and
  framework abstractions inside `sky_phone`.
- Prefix new resource-owned callbacks and events with `sky_phone:`.
- Keep client, server, and shared responsibilities separate. Prefer a local
  function when an export or network event is unnecessary.
- Treat all client and NUI input as untrusted. The server must authorize every
  state-changing action involving identity, permissions, ownership, money,
  inventory, proximity, or configured limits.
- Parameterize SQL and keep database objects owned by this resource.
- Never commit credentials, tokens, private keys, personal data, internal
  infrastructure details, or deployment-specific paths.

## FiveM and Lua

- Keep `use_experimental_fxv2_oal "yes"` enabled in the resource manifest.
- Pass native coordinates as separate numeric arguments. Do not pass a
  `vector3` where a native expects individual coordinates.
- Verify native signatures and use the documented parameter types.
- Use `joaat("...")`, `PlayerPedId()`, and vector distance where applicable.
- Treat native results as truthy or falsy values instead of comparing them with
  `true` or `false`.
- Avoid unconditional per-frame loops. Sleep while idle and use `Wait(0)` only
  while per-frame work is required.
- Keep failures visible in concise English diagnostics instead of silently
  swallowing invalid states.

## Frontend and NUI

- Use Vue 3 Composition API with TypeScript and the existing stores and router.
- Use the shared Sky UI through `@/ui` for new or substantially changed screens.
  Export reusable primitives through the relevant UI indexes.
- Do not add new direct `konsta/vue` imports.
- Use the shared semantic tokens and stylesheet order. Avoid duplicating common
  colors, spacing, radii, safe areas, or interaction geometry in app-local CSS.
- Localize all user-facing text through the phone locale system. Keep logs and
  developer diagnostics in English.
- Every NUI callback must invoke its response callback on every reachable path.
- Preserve one intended vertical scroll owner, visible keyboard focus, reduced
  motion support, and interaction targets of at least 44 CSS pixels.
- FiveM CEF is the runtime contract. Keep critical behavior compatible with the
  configured browser target and do not treat a desktop preview as live FiveM
  proof.
- Do not hand-edit generated frontend output.

## Working method and verification

1. Trace the relevant client, server, NUI, configuration, persistence, and event
   flow before changing behavior.
2. Fix the root cause with the smallest coherent change while preserving public
   compatibility unless the task explicitly changes it.
3. Verify external APIs and integrations against their current source or
   authoritative documentation.
4. Run the narrowest relevant checks and inspect the final diff.

For frontend changes, use the scripts declared in `frontend/package.json` as
appropriate, including type checking, linting, tests, and the production build.
Report build or browser-preview evidence separately from live in-game testing.

## Git

- Use `TAG - short imperative summary` for commit subjects.
- Supported tags are `ENH`, `ADD`, `FIX`, `DOC`, `BLD`, `PERF`, `CLN`, and `TRY`.
- Keep commits focused and document required configuration, locale, or database
  migrations.
- Stage only files belonging to the task and preserve unrelated worktree
  changes.
