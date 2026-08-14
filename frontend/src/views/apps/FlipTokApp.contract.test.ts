import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./FlipTokApp.vue', import.meta.url),
  'utf8',
)
const serverSource = readFileSync(
  new URL('../../../../sky_phone/source/server/fliptok.lua', import.meta.url),
  'utf8',
)
const migrationSource = readFileSync(
  new URL(
    '../../../../sky_phone/source/server/db_migrate.lua',
    import.meta.url,
  ),
  'utf8',
)
const youtubeSource = readFileSync(
  new URL('../../../../sky_phone/source/server/media_metadata.lua', import.meta.url),
  'utf8',
)

describe('FlipTokApp Sky UI contract', () => {
  it('uses first-party Sky UI without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySearchbar')
    expect(source).toContain('<SkyPillNavigation')
    expect(source).toContain('<SkyMessagebar')
  })

  it('uses the SkyUI navigation pill and native navbar back action', () => {
    expect(source).toMatch(
      /<SkySegmented[\s\S]*?:item-count="5"[\s\S]*?navigation/,
    )
    expect(source).toContain(':show-back="Boolean(store.viewedProfile)"')
    expect(source).toContain('back-appearance="surface"')
    expect(source).toMatch(/\.fliptok-navbar\s*\{[^}]*transform:\s*none/s)
  })

  it('shows timestamps and supports replies and likes on comments', () => {
    expect(source).not.toContain('formatTimestamp(video.created_at)')
    expect(source).toContain('formatTimestamp(thread.comment.created_at)')
    expect(source).toContain('@click="startReply(thread.comment)"')
    expect(source).toContain('@click="reactCommentWithPulse(thread.comment)"')
    expect(source).toContain('comment-like-pulse')
    expect(source).toContain('@keyframes comment-heart-pop')
    expect(source).toContain('class="comment-row comment-row--reply"')
    expect(source).toContain('form.comments-composer')
  })

  it('keeps moderation and profile actions compact and inside Sky UI', () => {
    expect(source).toContain('class="moderation-button"')
    expect(source).toContain('<ShieldCheck />')
    expect(source).toContain('.moderation-button__surface')
    expect(source).toMatch(/\.profile-actions\s*\{[^}]*max-width:\s*286px/s)
  })

  it('exposes follower lists and editable profile photos', () => {
    expect(source).toContain("openConnections('following')")
    expect(source).toContain("openConnections('followers')")
    expect(source).toContain("openProfileMedia('photos')")
    expect(source).toContain("openProfileMedia('camera')")
    expect(source).toContain('@click="removeProfilePhoto"')
    expect(source).toContain('profilePhotoSheetOpen')
    expect(source).toContain('avatarMediaId')
  })

  it('shows a transient follow confirmation', () => {
    expect(source).toContain('followFeedbackIds')
    expect(source).toContain('follow-dot--confirmed')
    expect(source).toContain('@click="followFromFeed(video)"')
  })

  it('supports validated custom audio links in the composer', () => {
    expect(source).toContain('function validCustomMusicUrl')
    expect(source).toContain('customMusicDraftUrl')
    expect(source).toContain('customMusicLoadFailed')
    expect(source).toContain('type="url"')
    expect(source).toContain('@click="chooseCustomMusic"')
    expect(source).toContain(
      "customMusicUrl: musicTrack.value ? '' : customMusicUrl.value",
    )
    expect(source).toContain('v-if="composerMusicUrl"')
    expect(source).toContain('function parseYoutubeVideoId')
    expect(source).toContain("'fliptok:music-metadata'")
    expect(source).toContain('playFlipTokYoutube')
  })

  it('validates and persists custom audio links on the server', () => {
    expect(serverSource).toContain('local function valid_custom_music_url')
    expect(serverSource).toContain('error = "invalid_music_url"')
    expect(serverSource).toContain('v.`custom_music_url`')
    expect(serverSource).toContain('video.custom_music_url = nil')
    expect(migrationSource).toContain('name = "custom_music_url"')
    expect(migrationSource).toContain('name = "custom_music_title"')
    expect(migrationSource).toContain('name = "custom_music_artist"')
    expect(migrationSource).toContain('collation = "ascii_bin"')
    expect(youtubeSource).toContain('function SkyPhoneYouTube.ParseId')
    expect(youtubeSource).toContain('function SkyPhoneYouTube.FetchMetadata')
    expect(youtubeSource).toContain('www.youtube.com/oembed')
  })

  it('keeps report and profile editing surfaces rounded and safe', () => {
    expect(source).toContain('class="report-sheet__actions"')
    expect(source).toContain('class="profile-account-list"')
    expect(source).toMatch(
      /\.report-sheet\s*\{[^}]*padding-bottom:\s*calc\(var\(--sky-safe-area-bottom\)/s,
    )
    expect(source).toMatch(
      /\.profile-form-list,[\s\S]*?\.profile-account-list\s*\{[^}]*border-radius:\s*var\(--sky-radius-card\)/,
    )
  })
})
