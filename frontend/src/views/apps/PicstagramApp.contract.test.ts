import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./PicstagramApp.vue', import.meta.url),
  'utf8',
)

describe('Picstagram app layout', () => {
  it('keeps the feed title centered between create and activity actions', () => {
    expect(source).toContain('<template #left>')
    expect(source).toContain('@click="beginPostCompose"')
    expect(source).toContain('@click="showTab(\'activity\')"')
    expect(source).toContain('ps-post-more')
    expect(source).toContain('count(post.like_count)')
    expect(source).toContain('count(post.comment_count)')
  })

  it('opens comments independently from post detail and collapses replies', () => {
    expect(source).toContain('const commentPost = ref<PicstagramPost | null>')
    expect(source).toContain('selectedPost.value = null')
    expect(source).toContain('@click="shareCommentPost"')
    expect(source).toContain('toggleCommentThread(thread.comment.id)')
    expect(source).toContain('expandedCommentThreads.has(thread.comment.id)')
  })

  it('supports a visible multi-image compose workflow', () => {
    expect(source).toContain("mediaType === 'photo' ? 5 : 1")
    expect(source).toContain('class="ps-selection-slide"')
    expect(source).toContain('@click="removeComposeMedia(media.id)"')
    expect(source).toContain('@click="changeComposeSelection"')
  })

  it('uses owner actions and all, video, and tagged profile filters', () => {
    expect(source).toContain('class="ps-profile-owner-actions"')
    expect(source).toContain('@click="editProfile"')
    expect(source).toContain('@click="shareCurrentProfile"')
    expect(source).toContain("profileSection === 'all'")
    expect(source).toContain("profileSection === 'videos'")
    expect(source).toContain("profileSection === 'tagged'")
  })
})
