<script setup lang="ts">
import {
  Bell,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Heart,
  Home,
  Images,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import {
  kActions,
  kActionsButton,
  kActionsGroup,
  kBadge,
  kBlock,
  kButton,
  kCard,
  kChip,
  kDialog,
  kDialogButton,
  kGlass,
  kLink,
  kList,
  kListInput,
  kListItem,
  kMessagebar,
  kNavbar,
  kNavbarBackLink,
  kPage,
  kPreloader,
  kSearchbar,
  kSegmented,
  kSegmentedButton,
  kSheet,
  kTabbar,
  kTabbarLink,
  kToast,
  kToolbar,
  kToolbarPane,
  kToggle,
} from 'konsta/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import picstagramIcon from '@/assets/img/app-icons/picstagram.webp'
import { useMessageMediaStore } from '@/stores/messageMedia'
import { usePhoneStore } from '@/stores/phone'
import { usePicstagramStore } from '@/stores/picstagram'
import type { PhoneMedia } from '@/types/media'
import type {
  PicstagramActivity,
  PicstagramPost,
  PicstagramProfile,
  PicstagramReportReason,
  PicstagramReportTarget,
  PicstagramStory,
} from '@/types/picstagram'

type Tab = 'home' | 'explore' | 'create' | 'activity' | 'profile'
type AuthMode = 'login' | 'register'
type ComposeKind = 'post' | 'story'
type ProfileSection = 'photos' | 'saved'

const phone = usePhoneStore()
const store = usePicstagramStore()
const mediaPicker = useMessageMediaStore()
const router = useRouter()

const tab = ref<Tab>('home')
const authMode = ref<AuthMode>('login')
const authHandle = ref('')
const authDisplayName = ref('')
const authPassword = ref('')
const authConfirmPassword = ref('')
const authSubmitting = ref(false)
const composeKind = ref<ComposeKind>('post')
const selectedMedia = ref<PhoneMedia[]>([])
const caption = ref('')
const location = ref('')
const storyText = ref('')
const commentsEnabled = ref(true)
const publishing = ref(false)
const search = ref('')
const profileSection = ref<ProfileSection>('photos')
const selectedPost = ref<PicstagramPost | null>(null)
const selectedStory = ref<PicstagramStory | null>(null)
const commentsOpen = ref(false)
const commentBody = ref('')
const replyTo = ref<string | undefined>()
const actionsOpen = ref(false)
const reportOpen = ref(false)
const reportTarget = ref<{
  id: string
  label: string
  type: PicstagramReportTarget
} | null>(null)
const reportReason = ref<PicstagramReportReason>('spam')
const reportDetails = ref('')
const profileEditOpen = ref(false)
const selectedAvatar = ref<PhoneMedia | null>(null)
const removeAvatar = ref(false)
const profileDraft = ref({
  bio: '',
  displayName: '',
  handle: '',
  private: false,
})
const logoutDialogOpen = ref(false)
const logoutSubmitting = ref(false)
const deleteDialogOpen = ref(false)
const blockDialogOpen = ref(false)
const storyViewersOpen = ref(false)
const moderationOpen = ref(false)
const feedback = ref('')
const carouselIndexes = ref<Record<string, number>>({})
let feedbackTimer: number | null = null
let searchTimer: number | null = null

const currentProfile = computed(() => store.viewedProfile ?? store.profile)
const unreadCount = computed(
  () => store.activities.filter((activity) => !activity.read_at).length,
)
const profileGrid = computed(() =>
  profileSection.value === 'saved' && currentProfile.value?.is_owner
    ? store.saved
    : store.profilePosts,
)
const selectedStoryPosition = computed(() =>
  selectedStory.value
    ? store.stories.findIndex((story) => story.id === selectedStory.value?.id)
    : -1,
)
const selectedStoryGroup = computed(() =>
  selectedStory.value
    ? store.stories.filter(
        (story) => story.profile_id === selectedStory.value?.profile_id,
      )
    : [],
)
const selectedStoryGroupPosition = computed(() =>
  selectedStory.value
    ? selectedStoryGroup.value.findIndex(
        (story) => story.id === selectedStory.value?.id,
      )
    : -1,
)
const storyGroups = computed(() => {
  const groups = new Map<
    string,
    { avatar: string | null; handle: string; stories: PicstagramStory[] }
  >()
  store.stories.forEach((story) => {
    const existing = groups.get(story.profile_id)
    if (existing) existing.stories.push(story)
    else
      groups.set(story.profile_id, {
        avatar: story.avatar_url,
        handle: story.is_owner ? t('yourStory') : story.handle,
        stories: [story],
      })
  })
  return [...groups.values()]
})

const reportReasons: PicstagramReportReason[] = [
  'spam',
  'harassment',
  'dangerous',
  'illegal',
  'other',
]

function t(key: string, replacements?: Record<string, string>): string {
  return phone.t(`Apps.picstagram.${key}`, replacements)
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function initials(value: string): string {
  return value.trim().slice(0, 2).toUpperCase() || 'PS'
}

function count(value: number): string {
  return new Intl.NumberFormat(phone.lang, {
    maximumFractionDigits: 1,
    notation: value > 999 ? 'compact' : 'standard',
  }).format(value)
}

function relativeTime(value: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - value) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function notify(message: string): void {
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer)
  feedback.value = message
  feedbackTimer = window.setTimeout(() => {
    feedback.value = ''
    feedbackTimer = null
  }, 2600)
}

function errorMessage(error?: string): string {
  return t(`errors.${error ?? 'default'}`)
}

async function submitAuth(): Promise<void> {
  if (
    authMode.value === 'register' &&
    authPassword.value !== authConfirmPassword.value
  ) {
    notify(t('passwordsMismatch'))
    return
  }
  authSubmitting.value = true
  const response =
    authMode.value === 'login'
      ? await store.login(authHandle.value, authPassword.value)
      : await store.register(
          authDisplayName.value,
          authHandle.value,
          authPassword.value,
        )
  authSubmitting.value = false
  if (!response.success) notify(errorMessage(response.error))
}

async function signOut(): Promise<void> {
  logoutSubmitting.value = true
  const response = await store.logout()
  logoutSubmitting.value = false
  logoutDialogOpen.value = false
  if (!response.success) notify(errorMessage(response.error))
}

async function showTab(next: Tab): Promise<void> {
  tab.value = next
  selectedPost.value = null
  if (next === 'explore' && !store.explore.length) await store.loadExplore()
  if (next === 'activity') {
    await store.loadActivities()
  }
  if (next === 'profile' && store.profile) {
    await store.loadProfile({ profileId: store.profile.id })
    store.viewedProfile = null
    profileSection.value = 'photos'
  }
}

async function openProfile(profile: PicstagramProfile | string): Promise<void> {
  const profileId = typeof profile === 'string' ? profile : profile.id
  if (!(await store.loadProfile({ profileId }))) {
    notify(errorMessage('profile_not_found'))
    return
  }
  selectedPost.value = null
  tab.value = 'profile'
  profileSection.value = 'photos'
}

function goBackFromProfile(): void {
  store.viewedProfile = null
  tab.value = 'explore'
}

function openPost(post: PicstagramPost): void {
  selectedPost.value = post
}

function closePost(): void {
  selectedPost.value = null
}

async function openComments(post: PicstagramPost): Promise<void> {
  selectedPost.value = post
  await store.loadComments(post.id)
  commentsOpen.value = true
}

async function submitComment(): Promise<void> {
  if (!selectedPost.value || !commentBody.value.trim()) return
  const response = await store.comment(
    selectedPost.value.id,
    commentBody.value.trim(),
    replyTo.value,
  )
  if (!response.success) {
    notify(errorMessage(response.error))
    return
  }
  selectedPost.value.comment_count += 1
  commentBody.value = ''
  replyTo.value = undefined
  await store.loadComments(selectedPost.value.id)
}

function chooseComposeMedia(): void {
  mediaPicker.begin(
    'picstagram:compose',
    'photo',
    '/apps/picstagram?tab=create',
    composeKind.value === 'post' ? 5 : 1,
    {
      caption: caption.value,
      commentsEnabled: commentsEnabled.value,
      kind: composeKind.value,
      location: location.value,
      storyText: storyText.value,
    },
  )
  void router.push({
    path: '/apps/photos',
    query: { mediaAttachment: 'photo' },
  })
}

function chooseAvatar(): void {
  mediaPicker.begin(
    'picstagram:avatar',
    'photo',
    '/apps/picstagram?editProfile=1',
    1,
    { ...profileDraft.value },
  )
  void router.push({
    path: '/apps/photos',
    query: { mediaAttachment: 'photo' },
  })
}

function resetComposer(): void {
  selectedMedia.value = []
  caption.value = ''
  location.value = ''
  storyText.value = ''
  commentsEnabled.value = true
}

function beginStoryCompose(): void {
  void showTab('create')
  composeKind.value = 'story'
}

function setComposeKind(kind: ComposeKind): void {
  composeKind.value = kind
  resetComposer()
}

function clearAvatarSelection(): void {
  removeAvatar.value = true
  selectedAvatar.value = null
}

async function publish(): Promise<void> {
  if (!selectedMedia.value.length || publishing.value) return
  publishing.value = true
  const response =
    composeKind.value === 'post'
      ? await store.publishPost({
          caption: caption.value,
          commentsEnabled: commentsEnabled.value,
          location: location.value,
          mediaIds: selectedMedia.value.map((media) => media.id),
        })
      : await store.publishStory(selectedMedia.value[0].id, storyText.value)
  publishing.value = false
  if (!response.success) {
    notify(errorMessage(response.error))
    return
  }
  const kind = composeKind.value
  resetComposer()
  await showTab('home')
  notify(t(kind === 'post' ? 'published' : 'storyPublished'))
}

function updateCarousel(post: PicstagramPost, event: Event): void {
  const element = event.currentTarget as HTMLElement
  carouselIndexes.value[post.id] = Math.round(
    element.scrollLeft / Math.max(1, element.clientWidth),
  )
}

async function react(
  post: PicstagramPost,
  kind: 'like' | 'save',
): Promise<void> {
  if (!(await store.react(post, kind))) notify(errorMessage())
}

function likeFromMedia(post: PicstagramPost): void {
  if (!post.is_liked) void react(post, 'like')
}

async function follow(profile: PicstagramProfile): Promise<void> {
  if (!(await store.followProfile(profile))) notify(errorMessage())
}

function editProfile(): void {
  if (!store.profile) return
  profileDraft.value = {
    bio: store.profile.bio,
    displayName: store.profile.display_name,
    handle: store.profile.handle,
    private: store.profile.private,
  }
  selectedAvatar.value = null
  removeAvatar.value = false
  profileEditOpen.value = true
}

async function saveProfile(): Promise<void> {
  if (!store.profile) return
  const response = await store.updateProfile({
    avatarMediaId: removeAvatar.value
      ? 0
      : (selectedAvatar.value?.id ?? store.profile.avatar_media_id ?? 0),
    bio: profileDraft.value.bio,
    displayName: profileDraft.value.displayName,
    handle: profileDraft.value.handle,
    private: profileDraft.value.private,
  })
  if (!response.success) {
    notify(errorMessage(response.error))
    return
  }
  profileEditOpen.value = false
  notify(t('profileSaved'))
}

function showPostActions(post: PicstagramPost): void {
  selectedPost.value = post
  actionsOpen.value = true
}

function startReport(
  type: PicstagramReportTarget,
  id: string,
  label: string,
): void {
  actionsOpen.value = false
  reportTarget.value = { id, label, type }
  reportReason.value = 'spam'
  reportDetails.value = ''
  reportOpen.value = true
}

function reportSelectedStory(): void {
  if (!selectedStory.value) return
  startReport('story', selectedStory.value.id, t('story'))
  selectedStory.value = null
}

function reportCurrentProfile(): void {
  if (!currentProfile.value || currentProfile.value.is_owner) return
  startReport(
    'profile',
    currentProfile.value.id,
    `@${currentProfile.value.handle}`,
  )
}

function editProfileFromActions(): void {
  editProfile()
  actionsOpen.value = false
}

function openModerationFromActions(): void {
  void openModeration()
  actionsOpen.value = false
}

function archiveSelectedPost(): void {
  if (!selectedPost.value) return
  void store.setPostStatus(selectedPost.value, 'archived')
  actionsOpen.value = false
}

async function submitReport(): Promise<void> {
  if (!reportTarget.value) return
  const response = await store.report(
    reportTarget.value.type,
    reportTarget.value.id,
    reportReason.value,
    reportDetails.value,
  )
  if (!response.success) {
    notify(errorMessage(response.error))
    return
  }
  reportOpen.value = false
  notify(t('reported'))
}

async function confirmBlock(): Promise<void> {
  const profileId = selectedPost.value?.profile_id ?? currentProfile.value?.id
  if (!profileId) return
  blockDialogOpen.value = false
  actionsOpen.value = false
  if (await store.blockProfile(profileId)) notify(t('blocked'))
  else notify(errorMessage())
}

async function deleteSelectedPost(): Promise<void> {
  if (!selectedPost.value) return
  const post = selectedPost.value
  deleteDialogOpen.value = false
  actionsOpen.value = false
  if (await store.setPostStatus(post, 'removed')) {
    selectedPost.value = null
    notify(t('deletePost'))
  } else notify(errorMessage())
}

async function openStory(story: PicstagramStory): Promise<void> {
  selectedStory.value = story
  await store.viewStory(story)
}

async function openStoryGroup(stories: PicstagramStory[]): Promise<void> {
  const story = stories.find((item) => !item.seen) ?? stories[0]
  await openStory(story)
}

async function nextStory(direction: 1 | -1): Promise<void> {
  const current = selectedStoryPosition.value
  if (current < 0) return
  const next = store.stories[current + direction]
  if (!next) {
    selectedStory.value = null
    return
  }
  selectedStory.value = next
  await store.viewStory(next)
}

async function showStoryViewers(story: PicstagramStory): Promise<void> {
  if (!story.is_owner) return
  await store.loadStoryViewers(story.id)
  storyViewersOpen.value = true
}

async function removeSelectedStory(): Promise<void> {
  if (!selectedStory.value?.is_owner) return
  if (await store.removeStory(selectedStory.value.id)) {
    selectedStory.value = null
    notify(t('storyRemoved'))
  } else notify(errorMessage())
}

async function openModeration(): Promise<void> {
  if (!(await store.loadReports())) {
    notify(errorMessage('not_authorized'))
    return
  }
  moderationOpen.value = true
}

function activityProfile(activity: PicstagramActivity): void {
  void openProfile(activity.profile_id)
}

watch(search, (value) => {
  if (searchTimer !== null) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    if (value.trim()) void store.search(value)
    else {
      store.searchPosts = []
      store.searchProfiles = []
    }
  }, 300)
})

watch(profileSection, (section) => {
  if (section === 'saved' && currentProfile.value?.is_owner)
    void store.loadSaved()
})

onMounted(async () => {
  await store.bootstrap()
  const composeSelection = mediaPicker.consumeMany<{
    caption?: string
    commentsEnabled?: boolean
    kind?: ComposeKind
    location?: string
    storyText?: string
  }>('picstagram:compose')
  if (composeSelection?.media.length) {
    selectedMedia.value = composeSelection.media
    composeKind.value = composeSelection.context?.kind ?? 'post'
    caption.value = composeSelection.context?.caption ?? ''
    location.value = composeSelection.context?.location ?? ''
    storyText.value = composeSelection.context?.storyText ?? ''
    commentsEnabled.value = composeSelection.context?.commentsEnabled ?? true
    tab.value = 'create'
  }
  const avatarSelection = mediaPicker.consumeMany<{
    bio?: string
    displayName?: string
    handle?: string
    private?: boolean
  }>('picstagram:avatar')
  if (avatarSelection?.media[0] && store.profile) {
    selectedAvatar.value = avatarSelection.media[0]
    removeAvatar.value = false
    profileDraft.value = {
      bio: avatarSelection.context?.bio ?? store.profile.bio,
      displayName:
        avatarSelection.context?.displayName ?? store.profile.display_name,
      handle: avatarSelection.context?.handle ?? store.profile.handle,
      private: avatarSelection.context?.private ?? store.profile.private,
    }
    profileEditOpen.value = true
  }
})

onBeforeUnmount(() => {
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer)
  if (searchTimer !== null) window.clearTimeout(searchTimer)
})
</script>

<template>
  <k-page class="picstagram-page">
    <div v-if="store.loading && !store.feed.length" class="ps-state">
      <k-preloader />
      <span>{{ t('loading') }}</span>
    </div>

    <section v-else-if="!store.authenticated" class="ps-auth">
      <k-navbar :title="t('name')" />
      <div class="ps-auth__body">
        <k-glass class="ps-auth__glass">
          <img :src="picstagramIcon" alt="" />
          <h1>{{ t('authTitle') }}</h1>
          <p>{{ t(authMode === 'login' ? 'loginBody' : 'registerBody') }}</p>
          <k-segmented strong>
            <k-segmented-button
              :active="authMode === 'login'"
              @click="authMode = 'login'"
            >
              {{ t('login') }}
            </k-segmented-button>
            <k-segmented-button
              :active="authMode === 'register'"
              @click="authMode = 'register'"
            >
              {{ t('register') }}
            </k-segmented-button>
          </k-segmented>
          <k-list inset strong class="ps-auth__form">
            <k-list-input
              v-if="authMode === 'register'"
              :label="t('displayName')"
              :placeholder="t('displayNamePlaceholder')"
              :value="authDisplayName"
              @input="authDisplayName = inputValue($event)"
            />
            <k-list-input
              :label="t('username')"
              :placeholder="t('usernamePlaceholder')"
              :value="authHandle"
              autocapitalize="none"
              @input="authHandle = inputValue($event)"
            />
            <k-list-input
              :label="t('password')"
              :placeholder="t('passwordPlaceholder')"
              :value="authPassword"
              type="password"
              @input="authPassword = inputValue($event)"
            />
            <k-list-input
              v-if="authMode === 'register'"
              :label="t('confirmPassword')"
              :placeholder="t('confirmPasswordPlaceholder')"
              :value="authConfirmPassword"
              type="password"
              @input="authConfirmPassword = inputValue($event)"
            />
          </k-list>
          <p v-if="authMode === 'register'" class="ps-auth__hint">
            {{ t('registrationHint') }}
          </p>
          <k-button
            large
            rounded
            :disabled="authSubmitting"
            @click="submitAuth"
          >
            <k-preloader v-if="authSubmitting" />
            <span v-else>{{
              t(authMode === 'login' ? 'login' : 'createAccount')
            }}</span>
          </k-button>
        </k-glass>
      </div>
    </section>

    <template v-else>
      <k-navbar
        v-if="!selectedPost"
        class="ps-navbar"
        :center-title="tab === 'profile' && Boolean(store.viewedProfile)"
        right-class="ps-navbar__right"
        :title="tab === 'home' ? '' : t(tab)"
      >
        <template v-if="tab === 'home'" #title>
          <span class="ps-wordmark">{{ t('name') }}</span>
        </template>
        <template v-if="tab === 'profile' && store.viewedProfile" #left>
          <k-navbar-back-link :text="t('explore')" @click="goBackFromProfile" />
        </template>
        <template #right>
          <div v-if="tab === 'home'" class="ps-navbar__actions">
            <k-link
              component="button"
              icon-only
              :aria-label="t('newPost')"
              @click="showTab('create')"
            >
              <span class="ps-navbar__create"><Plus /></span>
            </k-link>
            <k-link
              component="button"
              icon-only
              :aria-label="t('activity')"
              @click="showTab('activity')"
            >
              <span class="ps-badge-icon">
                <Heart />
                <k-badge v-if="unreadCount">{{ unreadCount }}</k-badge>
              </span>
            </k-link>
          </div>
          <k-link
            v-else-if="tab === 'activity' && unreadCount"
            component="button"
            @click="store.markActivities()"
          >
            {{ t('markRead') }}
          </k-link>
          <k-link
            v-else-if="tab === 'profile' && !store.viewedProfile"
            component="button"
            icon-only
            :aria-label="t('more')"
            @click="actionsOpen = true"
          >
            <MoreHorizontal />
          </k-link>
          <k-link
            v-else-if="
              tab === 'profile' &&
              store.viewedProfile &&
              !store.viewedProfile.is_owner
            "
            component="button"
            icon-only
            :aria-label="t('more')"
            @click="actionsOpen = true"
          >
            <MoreHorizontal />
          </k-link>
        </template>
      </k-navbar>

      <k-navbar v-else class="ps-navbar" center-title :title="t('post')">
        <template #left>
          <k-navbar-back-link :text="t('done')" @click="closePost" />
        </template>
      </k-navbar>

      <main v-if="selectedPost" class="ps-scroll ps-scroll--detail">
        <k-card class="ps-post ps-post--detail">
          <div class="ps-post__header">
            <k-link
              component="button"
              class="ps-author"
              @click="openProfile(selectedPost.profile_id)"
            >
              <span class="ps-avatar ps-avatar--small">
                <img
                  v-if="selectedPost.avatar_url"
                  :src="selectedPost.avatar_url"
                  alt=""
                />
                <span v-else>{{ initials(selectedPost.display_name) }}</span>
              </span>
              <span>
                <span class="ps-author__name">
                  <strong>{{ selectedPost.handle }}</strong>
                  <Check
                    v-if="selectedPost.verified"
                    class="ps-verified"
                    :stroke-width="3"
                  />
                </span>
                <small v-if="selectedPost.location"
                  ><MapPin />{{ selectedPost.location }}</small
                >
              </span>
            </k-link>
            <k-link
              component="button"
              icon-only
              :aria-label="t('more')"
              @click="showPostActions(selectedPost)"
            >
              <MoreHorizontal />
            </k-link>
          </div>
          <div
            class="ps-media"
            @scroll.passive="updateCarousel(selectedPost, $event)"
            @dblclick="likeFromMedia(selectedPost)"
          >
            <img
              v-for="media in selectedPost.media"
              :key="media.id"
              :src="media.url"
              :alt="selectedPost.caption"
            />
          </div>
          <div v-if="selectedPost.media.length > 1" class="ps-dots">
            <span
              v-for="(_, index) in selectedPost.media"
              :key="index"
              :class="{
                active: (carouselIndexes[selectedPost.id] ?? 0) === index,
              }"
            />
          </div>
          <div class="ps-post__actions">
            <span>
              <k-link
                component="button"
                icon-only
                :aria-label="t(selectedPost.is_liked ? 'unlike' : 'like')"
                @click="react(selectedPost, 'like')"
              >
                <Heart
                  :class="{ 'ps-liked': selectedPost.is_liked }"
                  :fill="selectedPost.is_liked ? 'currentColor' : 'none'"
                />
              </k-link>
              <k-link
                component="button"
                icon-only
                :aria-label="t('comments')"
                @click="openComments(selectedPost)"
                ><MessageCircle
              /></k-link>
            </span>
            <k-link
              component="button"
              icon-only
              :aria-label="t(selectedPost.is_saved ? 'unsave' : 'save')"
              @click="react(selectedPost, 'save')"
            >
              <Bookmark
                :fill="selectedPost.is_saved ? 'currentColor' : 'none'"
              />
            </k-link>
          </div>
          <div class="ps-post__copy">
            <strong>{{
              t('likes', { count: count(selectedPost.like_count) })
            }}</strong>
            <p v-if="selectedPost.caption">
              <b>@{{ selectedPost.handle }}</b> {{ selectedPost.caption }}
            </p>
            <k-link
              v-if="selectedPost.comment_count"
              component="button"
              @click="openComments(selectedPost)"
            >
              {{
                t('viewComments', { count: count(selectedPost.comment_count) })
              }}
            </k-link>
            <small>{{ relativeTime(selectedPost.created_at) }}</small>
          </div>
        </k-card>
      </main>

      <main v-else-if="tab === 'home'" class="ps-scroll">
        <section class="ps-stories" :aria-label="t('stories')">
          <k-link
            component="button"
            class="ps-story-add"
            @click="beginStoryCompose"
          >
            <span class="ps-story-ring ps-story-ring--add">
              <span class="ps-avatar"><Plus /></span>
            </span>
            <small>{{ t('yourStory') }}</small>
          </k-link>
          <k-link
            v-for="group in storyGroups"
            :key="group.stories[0].profile_id"
            component="button"
            class="ps-story-link"
            @click="openStoryGroup(group.stories)"
          >
            <span
              class="ps-story-ring"
              :class="{
                'ps-story-ring--seen': group.stories.every(
                  (story) => story.seen,
                ),
              }"
            >
              <span class="ps-avatar">
                <img v-if="group.avatar" :src="group.avatar" alt="" />
                <span v-else>{{ initials(group.handle) }}</span>
              </span>
            </span>
            <small>{{ group.handle }}</small>
          </k-link>
        </section>

        <div v-if="!store.feed.length" class="ps-state ps-state--inline">
          <Images />
          <strong>{{ t('emptyFeed') }}</strong>
          <span>{{ t('emptyFeedBody') }}</span>
          <k-button rounded @click="showTab('explore')">{{
            t('discoverPeople')
          }}</k-button>
        </div>

        <k-card v-for="post in store.feed" :key="post.id" class="ps-post">
          <div class="ps-post__header">
            <k-link
              component="button"
              class="ps-author"
              @click="openProfile(post.profile_id)"
            >
              <span class="ps-avatar ps-avatar--small">
                <img v-if="post.avatar_url" :src="post.avatar_url" alt="" />
                <span v-else>{{ initials(post.display_name) }}</span>
              </span>
              <span>
                <span class="ps-author__name">
                  <strong>{{ post.handle }}</strong>
                  <Check
                    v-if="post.verified"
                    class="ps-verified"
                    :stroke-width="3"
                  />
                </span>
                <small v-if="post.location"
                  ><MapPin />{{ post.location }}</small
                >
              </span>
            </k-link>
            <k-link
              component="button"
              icon-only
              :aria-label="t('more')"
              @click="showPostActions(post)"
              ><MoreHorizontal
            /></k-link>
          </div>
          <div
            class="ps-media"
            @scroll.passive="updateCarousel(post, $event)"
            @dblclick="likeFromMedia(post)"
          >
            <img
              v-for="media in post.media"
              :key="media.id"
              :src="media.url"
              :alt="post.caption"
              loading="lazy"
            />
          </div>
          <div v-if="post.media.length > 1" class="ps-dots">
            <span
              v-for="(_, index) in post.media"
              :key="index"
              :class="{ active: (carouselIndexes[post.id] ?? 0) === index }"
            />
          </div>
          <div class="ps-post__actions">
            <span>
              <k-link
                component="button"
                icon-only
                :aria-label="t(post.is_liked ? 'unlike' : 'like')"
                @click="react(post, 'like')"
              >
                <Heart
                  :class="{ 'ps-liked': post.is_liked }"
                  :fill="post.is_liked ? 'currentColor' : 'none'"
                />
              </k-link>
              <k-link
                component="button"
                icon-only
                :aria-label="t('comments')"
                @click="openComments(post)"
                ><MessageCircle
              /></k-link>
            </span>
            <k-link
              component="button"
              icon-only
              :aria-label="t(post.is_saved ? 'unsave' : 'save')"
              @click="react(post, 'save')"
            >
              <Bookmark :fill="post.is_saved ? 'currentColor' : 'none'" />
            </k-link>
          </div>
          <div class="ps-post__copy">
            <strong>{{ t('likes', { count: count(post.like_count) }) }}</strong>
            <p v-if="post.caption">
              <b>@{{ post.handle }}</b> {{ post.caption }}
            </p>
            <k-link
              v-if="post.comment_count"
              component="button"
              @click="openComments(post)"
            >
              {{ t('viewComments', { count: count(post.comment_count) }) }}
            </k-link>
            <small>{{ relativeTime(post.created_at) }}</small>
          </div>
        </k-card>
        <k-button
          v-if="store.feedCursor"
          class="ps-load-more"
          tonal
          rounded
          @click="store.loadFeed(true)"
        >
          {{ t('following') }}
        </k-button>
      </main>

      <main v-else-if="tab === 'explore'" class="ps-scroll ps-explore">
        <k-searchbar
          :placeholder="t('searchPlaceholder')"
          :value="search"
          @input="search = inputValue($event)"
          @clear="search = ''"
        />
        <k-list v-if="search && store.searchProfiles.length" inset strong>
          <k-list-item
            v-for="profile in store.searchProfiles"
            :key="profile.id"
            link
            :title="profile.display_name"
            :subtitle="`@${profile.handle}`"
            :after="count(profile.followers)"
            @click="openProfile(profile)"
          >
            <template #media>
              <span class="ps-avatar ps-avatar--list">
                <img
                  v-if="profile.avatar_url"
                  :src="profile.avatar_url"
                  alt=""
                />
                <span v-else>{{ initials(profile.display_name) }}</span>
              </span>
            </template>
          </k-list-item>
        </k-list>
        <div
          v-if="
            search && !store.searchProfiles.length && !store.searchPosts.length
          "
          class="ps-state ps-state--inline"
        >
          <Search />
          <strong>{{ t('noResults') }}</strong>
          <span>{{ t('noResultsBody') }}</span>
        </div>
        <div class="ps-grid">
          <k-link
            v-for="post in search ? store.searchPosts : store.explore"
            :key="post.id"
            component="button"
            class="ps-grid__tile"
            :aria-label="post.caption || t('post')"
            @click="openPost(post)"
          >
            <img :src="post.media[0]?.url" :alt="post.caption" loading="lazy" />
            <k-badge v-if="post.media.length > 1" class="ps-grid__badge">{{
              post.media.length
            }}</k-badge>
          </k-link>
        </div>
        <k-button
          v-if="!search && store.exploreCursor"
          class="ps-load-more"
          tonal
          rounded
          @click="store.loadExplore(true)"
        >
          {{ t('explore') }}
        </k-button>
      </main>

      <main v-else-if="tab === 'create'" class="ps-scroll ps-compose">
        <k-segmented strong>
          <k-segmented-button
            :active="composeKind === 'post'"
            @click="setComposeKind('post')"
          >
            {{ t('newPost') }}
          </k-segmented-button>
          <k-segmented-button
            :active="composeKind === 'story'"
            @click="setComposeKind('story')"
          >
            {{ t('newStory') }}
          </k-segmented-button>
        </k-segmented>
        <k-card class="ps-picker-card">
          <div v-if="selectedMedia.length" class="ps-compose-preview">
            <img
              v-for="media in selectedMedia"
              :key="media.id"
              :src="media.url"
              alt=""
            />
          </div>
          <div v-else class="ps-picker-card__empty">
            <Images /><span>{{
              t(composeKind === 'post' ? 'choosePhotosHint' : 'chooseStoryHint')
            }}</span>
          </div>
          <k-button rounded @click="chooseComposeMedia">
            {{
              t(
                selectedMedia.length
                  ? 'changePhotos'
                  : composeKind === 'post'
                    ? 'choosePhotos'
                    : 'choosePhoto',
              )
            }}
          </k-button>
          <k-chip v-if="selectedMedia.length">
            {{ t('selectedPhotos', { count: String(selectedMedia.length) }) }}
          </k-chip>
        </k-card>
        <k-list inset strong>
          <k-list-input
            v-if="composeKind === 'post'"
            type="textarea"
            :label="t('caption')"
            :placeholder="t('captionPlaceholder')"
            :maxlength="800"
            :value="caption"
            @input="caption = inputValue($event)"
          />
          <k-list-input
            v-if="composeKind === 'post'"
            :label="t('location')"
            :placeholder="t('locationPlaceholder')"
            :maxlength="80"
            :value="location"
            @input="location = inputValue($event)"
          />
          <k-list-input
            v-else
            type="textarea"
            :label="t('story')"
            :placeholder="t('storyTextPlaceholder')"
            :maxlength="160"
            :value="storyText"
            @input="storyText = inputValue($event)"
          />
          <k-list-item
            v-if="composeKind === 'post'"
            :title="t('allowComments')"
          >
            <template #after
              ><k-toggle
                :checked="commentsEnabled"
                @change="commentsEnabled = !commentsEnabled"
            /></template>
          </k-list-item>
        </k-list>
        <k-button
          large
          rounded
          :disabled="!selectedMedia.length || publishing"
          @click="publish"
        >
          <k-preloader v-if="publishing" />
          <span v-else>{{ t(composeKind) }}</span>
        </k-button>
      </main>

      <main v-else-if="tab === 'activity'" class="ps-scroll ps-activity">
        <div v-if="!store.activities.length" class="ps-state ps-state--inline">
          <Bell />
          <strong>{{ t('noActivity') }}</strong>
        </div>
        <k-list v-else inset strong>
          <k-list-item
            v-for="activity in store.activities"
            :key="activity.id"
            :class="{ 'ps-activity--unread': !activity.read_at }"
            link
            :title="activity.display_name"
            :subtitle="t(`activityKinds.${activity.kind}`)"
            :after="relativeTime(activity.created_at)"
            @click="activityProfile(activity)"
          >
            <template #media>
              <span class="ps-avatar ps-avatar--list">
                <img
                  v-if="activity.avatar_url"
                  :src="activity.avatar_url"
                  alt=""
                />
                <span v-else>{{ initials(activity.display_name) }}</span>
              </span>
            </template>
            <template v-if="activity.kind === 'follow_request'" #footer>
              <div class="ps-request-actions">
                <k-button
                  small
                  rounded
                  @click.stop="store.respondFollow(activity.profile_id, true)"
                  >{{ t('accept') }}</k-button
                >
                <k-button
                  small
                  rounded
                  tonal
                  @click.stop="store.respondFollow(activity.profile_id, false)"
                  >{{ t('decline') }}</k-button
                >
              </div>
            </template>
          </k-list-item>
        </k-list>
      </main>

      <main
        v-else-if="tab === 'profile' && currentProfile"
        class="ps-scroll ps-profile"
      >
        <section class="ps-profile__header">
          <span class="ps-avatar ps-avatar--profile">
            <img
              v-if="currentProfile.avatar_url"
              :src="currentProfile.avatar_url"
              alt=""
            />
            <span v-else>{{ initials(currentProfile.display_name) }}</span>
          </span>
          <h1>
            {{ currentProfile.display_name }}
            <Check
              v-if="currentProfile.verified"
              class="ps-verified"
              :stroke-width="3"
            />
          </h1>
          <p>@{{ currentProfile.handle }}</p>
          <div class="ps-profile__stats">
            <span
              ><strong>{{ count(currentProfile.post_count) }}</strong
              ><small>{{ t('posts') }}</small></span
            >
            <span
              ><strong>{{ count(currentProfile.followers) }}</strong
              ><small>{{ t('followers') }}</small></span
            >
            <span
              ><strong>{{ count(currentProfile.following) }}</strong
              ><small>{{ t('following') }}</small></span
            >
          </div>
          <p class="ps-profile__bio">
            {{ currentProfile.bio || t('emptyBio') }}
          </p>
          <k-button
            v-if="currentProfile.is_owner"
            rounded
            @click="editProfile"
            >{{ t('editProfile') }}</k-button
          >
          <k-button
            v-else
            rounded
            :tonal="currentProfile.is_following || currentProfile.is_requested"
            @click="follow(currentProfile)"
          >
            {{
              t(
                currentProfile.is_following
                  ? 'unfollow'
                  : currentProfile.is_requested
                    ? 'requested'
                    : 'follow',
              )
            }}
          </k-button>
        </section>
        <k-block v-if="currentProfile.locked" class="ps-private">
          <LockKeyhole />
          <strong>{{ t('privateProfile') }}</strong>
          <p>{{ t('privateProfileBody') }}</p>
        </k-block>
        <template v-else>
          <k-segmented
            v-if="currentProfile.is_owner"
            strong
            class="ps-profile__segments"
          >
            <k-segmented-button
              :active="profileSection === 'photos'"
              @click="profileSection = 'photos'"
            >
              <Images /> {{ t('photos') }}
            </k-segmented-button>
            <k-segmented-button
              :active="profileSection === 'saved'"
              @click="profileSection = 'saved'"
            >
              <Bookmark /> {{ t('saved') }}
            </k-segmented-button>
          </k-segmented>
          <div class="ps-grid">
            <k-link
              v-for="post in profileGrid"
              :key="post.id"
              component="button"
              class="ps-grid__tile"
              @click="openPost(post)"
            >
              <img
                :src="post.media[0]?.url"
                :alt="post.caption"
                loading="lazy"
              />
              <k-badge v-if="post.media.length > 1" class="ps-grid__badge">{{
                post.media.length
              }}</k-badge>
            </k-link>
          </div>
        </template>
      </main>

      <k-tabbar
        v-if="!selectedPost"
        class="ps-tabbar"
        inner-class="ps-tabbar__inner"
        labels
        icons
      >
        <k-toolbar-pane>
          <k-tabbar-link
            :active="tab === 'home'"
            :label="t('home')"
            @click="showTab('home')"
            ><template #icon><Home /></template
          ></k-tabbar-link>
          <k-tabbar-link
            :active="tab === 'explore'"
            :label="t('explore')"
            @click="showTab('explore')"
            ><template #icon><Compass /></template
          ></k-tabbar-link>
          <k-tabbar-link
            :active="tab === 'create'"
            :label="t('create')"
            @click="showTab('create')"
            ><template #icon
              ><span class="ps-create-icon"><Plus /></span></template
          ></k-tabbar-link>
          <k-tabbar-link
            :active="tab === 'activity'"
            :label="t('activity')"
            @click="showTab('activity')"
          >
            <template #icon
              ><span class="ps-badge-icon"
                ><Bell /><k-badge v-if="unreadCount">{{
                  unreadCount
                }}</k-badge></span
              ></template
            >
          </k-tabbar-link>
          <k-tabbar-link
            :active="tab === 'profile'"
            :label="t('profile')"
            @click="showTab('profile')"
            ><template #icon><UserRound /></template
          ></k-tabbar-link>
        </k-toolbar-pane>
      </k-tabbar>
    </template>

    <k-sheet :opened="commentsOpen" @backdropclick="commentsOpen = false">
      <div class="ps-sheet ps-sheet--comments">
        <div class="ps-sheet__handle" />
        <k-toolbar top class="ps-sheet__toolbar">
          <k-toolbar-pane class="ps-sheet__toolbar-pane">
            <strong>{{ t('comments') }}</strong>
            <k-link component="button" @click="commentsOpen = false">
              {{ t('done') }}
            </k-link>
          </k-toolbar-pane>
        </k-toolbar>
        <div class="ps-comments">
          <div class="ps-comments__body">
            <div
              v-if="!store.comments.length"
              class="ps-state ps-state--inline"
            >
              <MessageCircle /><span>{{ t('noComments') }}</span>
            </div>
            <k-list v-else inset strong>
              <k-list-item
                v-for="comment in store.comments"
                :key="comment.id"
                :title="comment.display_name"
                :subtitle="comment.body"
                :after="relativeTime(comment.created_at)"
              >
                <template #media>
                  <span class="ps-avatar ps-avatar--comment">
                    <img
                      v-if="comment.avatar_url"
                      :src="comment.avatar_url"
                      alt=""
                    />
                    <span v-else>{{ initials(comment.display_name) }}</span>
                  </span>
                </template>
                <template #footer>
                  <div class="ps-comment-actions">
                    <k-link
                      component="button"
                      @click="replyTo = comment.parent_id ?? comment.id"
                      >{{ t('reply') }}</k-link
                    >
                    <k-link
                      v-if="comment.is_owner || selectedPost?.is_owner"
                      component="button"
                      class="ps-danger"
                      @click="store.removeComment(comment.id)"
                      >{{ t('removeComment') }}</k-link
                    >
                    <k-link
                      v-else
                      component="button"
                      class="ps-danger"
                      @click="startReport('comment', comment.id, t('comment'))"
                      >{{ t('report') }}</k-link
                    >
                  </div>
                </template>
              </k-list-item>
            </k-list>
          </div>
          <k-chip
            v-if="replyTo"
            class="ps-reply-chip"
            delete-button
            @delete="replyTo = undefined"
            >{{ t('reply') }}</k-chip
          >
          <k-messagebar
            class="ps-comment-composer"
            :placeholder="t('addComment')"
            right-class="ps-comment-composer__right"
            :value="commentBody"
            @input="commentBody = inputValue($event).slice(0, 300)"
          >
            <template #right>
              <k-link
                component="button"
                icon-only
                :aria-label="t('post')"
                :disabled="!commentBody.trim()"
                @click="submitComment"
              >
                <Send />
              </k-link>
            </template>
          </k-messagebar>
        </div>
      </div>
    </k-sheet>

    <k-sheet :opened="profileEditOpen" @backdropclick="profileEditOpen = false">
      <div class="ps-sheet ps-sheet--tall">
        <div class="ps-sheet__handle" />
        <k-toolbar top class="ps-sheet__toolbar">
          <k-toolbar-pane class="ps-sheet__toolbar-pane">
            <strong>{{ t('editProfile') }}</strong>
            <k-link component="button" @click="profileEditOpen = false">
              {{ t('done') }}
            </k-link>
          </k-toolbar-pane>
        </k-toolbar>
        <div class="ps-edit">
          <span class="ps-avatar ps-avatar--profile">
            <img v-if="selectedAvatar" :src="selectedAvatar.url" alt="" />
            <img
              v-else-if="!removeAvatar && store.profile?.avatar_url"
              :src="store.profile.avatar_url"
              alt=""
            />
            <span v-else>{{ initials(profileDraft.displayName) }}</span>
          </span>
          <div class="ps-edit__avatar-actions">
            <k-button small rounded tonal @click="chooseAvatar">{{
              t('chooseAvatar')
            }}</k-button>
            <k-button small rounded tonal @click="clearAvatarSelection">{{
              t('removeAvatar')
            }}</k-button>
          </div>
          <k-list inset strong>
            <k-list-input
              :label="t('displayName')"
              :value="profileDraft.displayName"
              :maxlength="40"
              @input="profileDraft.displayName = inputValue($event)"
            />
            <k-list-input
              :label="t('username')"
              :value="profileDraft.handle"
              :maxlength="24"
              autocapitalize="none"
              @input="profileDraft.handle = inputValue($event)"
            />
            <k-list-input
              type="textarea"
              :label="t('bio')"
              :value="profileDraft.bio"
              :maxlength="160"
              @input="profileDraft.bio = inputValue($event)"
            />
            <k-list-item
              :title="t('privateProfileSetting')"
              :subtitle="t('privacyHint')"
            >
              <template #after
                ><k-toggle
                  :checked="profileDraft.private"
                  @change="profileDraft.private = !profileDraft.private"
              /></template>
            </k-list-item>
          </k-list>
          <k-button large rounded @click="saveProfile">{{
            t('saveProfile')
          }}</k-button>
        </div>
      </div>
    </k-sheet>

    <k-sheet
      :opened="Boolean(selectedStory)"
      @backdropclick="selectedStory = null"
    >
      <div v-if="selectedStory" class="ps-story-viewer">
        <img :src="selectedStory.url" :alt="selectedStory.body" />
        <div class="ps-story-viewer__progress" aria-hidden="true">
          <span
            v-for="(story, index) in selectedStoryGroup"
            :key="story.id"
            :class="{ active: index <= selectedStoryGroupPosition }"
          />
        </div>
        <k-glass class="ps-story-viewer__header">
          <span class="ps-avatar ps-avatar--small">
            <img
              v-if="selectedStory.avatar_url"
              :src="selectedStory.avatar_url"
              alt=""
            />
            <span v-else>{{ initials(selectedStory.display_name) }}</span>
          </span>
          <strong>@{{ selectedStory.handle }}</strong>
          <small>{{ relativeTime(selectedStory.created_at) }}</small>
          <k-link
            component="button"
            icon-only
            :aria-label="t('closeStory')"
            @click="selectedStory = null"
            ><Plus class="ps-close"
          /></k-link>
        </k-glass>
        <p v-if="selectedStory.body" class="ps-story-viewer__text">
          {{ selectedStory.body }}
        </p>
        <div class="ps-story-viewer__nav">
          <k-link
            component="button"
            icon-only
            :aria-label="t('nextStory')"
            @click="nextStory(-1)"
            ><ChevronLeft
          /></k-link>
          <k-link
            component="button"
            icon-only
            :aria-label="t('nextStory')"
            @click="nextStory(1)"
            ><ChevronRight
          /></k-link>
        </div>
        <div class="ps-story-viewer__actions">
          <k-button
            v-if="selectedStory.is_owner"
            rounded
            tonal
            @click="showStoryViewers(selectedStory)"
          >
            <Eye />
            {{ t('seenBy', { count: count(selectedStory.view_count) }) }}
          </k-button>
          <k-button
            v-if="selectedStory.is_owner"
            rounded
            tonal
            @click="removeSelectedStory"
          >
            <Trash2 /> {{ t('removeStory') }}
          </k-button>
          <k-button v-else rounded tonal @click="reportSelectedStory">
            <ShieldAlert /> {{ t('report') }}
          </k-button>
        </div>
      </div>
    </k-sheet>

    <k-sheet
      :opened="storyViewersOpen"
      @backdropclick="storyViewersOpen = false"
    >
      <div class="ps-sheet">
        <div class="ps-sheet__handle" />
        <k-toolbar top class="ps-sheet__toolbar">
          <k-toolbar-pane class="ps-sheet__toolbar-pane">
            <strong>{{ t('storyViewers') }}</strong>
            <k-link component="button" @click="storyViewersOpen = false">
              {{ t('done') }}
            </k-link>
          </k-toolbar-pane>
        </k-toolbar>
        <div class="ps-comments ps-comments--viewers">
          <k-list inset strong>
            <k-list-item
              v-for="viewer in store.storyViewers"
              :key="viewer.id"
              :title="viewer.display_name"
              :subtitle="`@${viewer.handle}`"
              :after="relativeTime(viewer.created_at)"
            >
              <template #media
                ><span class="ps-avatar ps-avatar--list"
                  ><img
                    v-if="viewer.avatar_url"
                    :src="viewer.avatar_url"
                    alt=""
                  /><span v-else>{{ initials(viewer.display_name) }}</span></span
                ></template
              >
            </k-list-item>
          </k-list>
        </div>
      </div>
    </k-sheet>

    <k-sheet :opened="reportOpen" @backdropclick="reportOpen = false">
      <div class="ps-sheet ps-sheet--tall">
        <div class="ps-sheet__handle" />
        <k-toolbar top class="ps-sheet__toolbar">
          <k-toolbar-pane class="ps-sheet__toolbar-pane">
            <strong>{{
              t('reportTarget', {
                target: reportTarget?.label ?? t('post'),
              })
            }}</strong>
            <k-link component="button" @click="reportOpen = false">
              {{ t('cancel') }}
            </k-link>
          </k-toolbar-pane>
        </k-toolbar>
        <div class="ps-report">
          <k-list inset strong>
            <k-list-item
              v-for="reason in reportReasons"
              :key="reason"
              link
              :title="t(`reportReasons.${reason}`)"
              :after="reportReason === reason ? '✓' : ''"
              @click="reportReason = reason"
            />
            <k-list-input
              type="textarea"
              :label="t('reportDetails')"
              :value="reportDetails"
              :maxlength="500"
              @input="reportDetails = inputValue($event)"
            />
          </k-list>
          <k-button large rounded @click="submitReport">{{
            t('submitReport')
          }}</k-button>
        </div>
      </div>
    </k-sheet>

    <k-sheet :opened="moderationOpen" @backdropclick="moderationOpen = false">
      <div class="ps-sheet ps-sheet--tall">
        <div class="ps-sheet__handle" />
        <k-toolbar top class="ps-sheet__toolbar">
          <k-toolbar-pane class="ps-sheet__toolbar-pane">
            <strong>{{ t('moderation') }}</strong>
            <k-link component="button" @click="moderationOpen = false">
              {{ t('done') }}
            </k-link>
          </k-toolbar-pane>
        </k-toolbar>
        <div class="ps-moderation">
          <div v-if="!store.reports.length" class="ps-state ps-state--inline">
            <ShieldAlert /><span>{{ t('noReports') }}</span>
          </div>
          <k-card
            v-for="report in store.reports"
            :key="report.id"
            class="ps-report-card"
          >
            <strong
              >{{ t(`reportTargets.${report.target_type}`) }} ·
              {{ t(`reportReasons.${report.reason}`) }}</strong
            >
            <p>
              @{{ report.reporter_handle }} ·
              {{ report.details || t('noDetails') }}
            </p>
            <div class="ps-report-card__actions">
              <k-button
                small
                rounded
                tonal
                @click="store.resolveReport(report.id, 'dismiss')"
                >{{ t('dismiss') }}</k-button
              >
              <k-button
                small
                rounded
                tonal
                @click="store.resolveReport(report.id, 'hide')"
                >{{ t('hide') }}</k-button
              >
              <k-button
                small
                rounded
                @click="store.resolveReport(report.id, 'remove')"
                >{{ t('remove') }}</k-button
              >
            </div>
          </k-card>
        </div>
      </div>
    </k-sheet>

    <k-actions :opened="actionsOpen" @backdropclick="actionsOpen = false">
      <k-actions-group v-if="selectedPost">
        <template v-if="selectedPost.is_owner">
          <k-actions-button @click="archiveSelectedPost">{{
            t('archive')
          }}</k-actions-button>
          <k-actions-button @click="deleteDialogOpen = true">{{
            t('deletePost')
          }}</k-actions-button>
        </template>
        <template v-else>
          <k-actions-button
            @click="startReport('post', selectedPost.id, t('post'))"
            >{{ t('report') }}</k-actions-button
          >
          <k-actions-button @click="blockDialogOpen = true">{{
            t('block')
          }}</k-actions-button>
        </template>
      </k-actions-group>
      <k-actions-group v-else-if="currentProfile && !currentProfile.is_owner">
        <k-actions-button @click="reportCurrentProfile">{{
          t('report')
        }}</k-actions-button>
        <k-actions-button @click="blockDialogOpen = true">{{
          t('block')
        }}</k-actions-button>
      </k-actions-group>
      <k-actions-group v-else-if="currentProfile?.is_owner">
        <k-actions-button @click="editProfileFromActions">{{
          t('editProfile')
        }}</k-actions-button>
        <k-actions-button
          v-if="store.isAdmin"
          @click="openModerationFromActions"
          >{{ t('moderation') }}</k-actions-button
        >
        <k-actions-button @click="logoutDialogOpen = true">{{
          t('logout')
        }}</k-actions-button>
      </k-actions-group>
      <k-actions-group
        ><k-actions-button bold @click="actionsOpen = false">{{
          t('cancel')
        }}</k-actions-button></k-actions-group
      >
    </k-actions>

    <k-dialog
      :opened="logoutDialogOpen"
      :title="t('signOutTitle')"
      :content="t('signOutBody')"
      @backdropclick="logoutDialogOpen = false"
    >
      <template #buttons>
        <k-dialog-button @click="logoutDialogOpen = false">{{
          t('cancel')
        }}</k-dialog-button>
        <k-dialog-button strong :disabled="logoutSubmitting" @click="signOut">{{
          t(logoutSubmitting ? 'signingOut' : 'logout')
        }}</k-dialog-button>
      </template>
    </k-dialog>

    <k-dialog
      :opened="deleteDialogOpen"
      :title="t('deletePostTitle')"
      :content="t('deletePostBody')"
      @backdropclick="deleteDialogOpen = false"
    >
      <template #buttons>
        <k-dialog-button @click="deleteDialogOpen = false">{{
          t('cancel')
        }}</k-dialog-button>
        <k-dialog-button strong @click="deleteSelectedPost">{{
          t('deletePost')
        }}</k-dialog-button>
      </template>
    </k-dialog>

    <k-dialog
      :opened="blockDialogOpen"
      :title="
        t('blockTitle', {
          handle: selectedPost?.handle ?? currentProfile?.handle ?? '',
        })
      "
      :content="t('blockBody')"
      @backdropclick="blockDialogOpen = false"
    >
      <template #buttons>
        <k-dialog-button @click="blockDialogOpen = false">{{
          t('cancel')
        }}</k-dialog-button>
        <k-dialog-button strong @click="confirmBlock">{{
          t('block')
        }}</k-dialog-button>
      </template>
    </k-dialog>

    <k-toast :opened="Boolean(feedback)" position="center">{{
      feedback
    }}</k-toast>
  </k-page>
</template>

<style scoped>
.picstagram-page {
  --ps-accent: #8b5cf6;
  --ps-coral: #fb7185;
  --ps-bg: #f7f7fb;
  --ps-surface: #ffffff;
  --ps-surface-raised: rgb(255 255 255 / 94%);
  --ps-text: #17121f;
  --ps-muted: #716b78;
  --ps-border: rgb(23 18 31 / 11%);
  --ps-avatar-border: #ffffff;
  background: var(--ps-bg);
  color: var(--ps-text);
  color-scheme: light;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.dark .picstagram-page) {
  --ps-bg: #070609;
  --ps-surface: #111014;
  --ps-surface-raised: rgb(26 24 30 / 96%);
  --ps-text: #faf8fc;
  --ps-muted: #aaa4b0;
  --ps-border: rgb(255 255 255 / 12%);
  --ps-avatar-border: #111014;
  background: var(--ps-bg);
  color: var(--ps-text);
  color-scheme: dark;
}

.ps-navbar,
.ps-tabbar {
  backdrop-filter: blur(24px) saturate(160%);
  flex: 0 0 auto;
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}

.ps-navbar {
  --k-safe-area-top: 32px;
  z-index: 30;
}

.ps-navbar :deep(.ps-navbar__right) {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background: transparent !important;
  box-shadow: none !important;
}

.ps-navbar :deep(.ps-navbar__right .k-link) {
  color: var(--ps-text);
}

.ps-navbar__actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.ps-navbar__actions svg {
  height: 22px;
  width: 22px;
}

.ps-navbar__create {
  border: 2px solid currentColor;
  border-radius: 7px;
  display: grid;
  height: 21px;
  place-items: center;
  width: 21px;
}

.ps-navbar__create svg {
  height: 15px;
  width: 15px;
}

.ps-wordmark {
  font-family: "Segoe Script", "Brush Script MT", cursive;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.8px;
}

.ps-tabbar {
  z-index: 30;
}

.ps-tabbar :deep(.ps-tabbar__inner) {
  width: 100% !important;
}

.ps-tabbar :deep(.k-toolbar-pane) {
  border: 1px solid var(--ps-border);
  margin-bottom: 2px;
  width: 100% !important;
}

.ps-tabbar :deep(.k-toolbar-pane > .k-link) {
  flex: 1 1 20%;
  min-width: 0 !important;
  padding-left: 6px;
  padding-right: 6px;
}

.ps-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: 0 0 12px;
  scrollbar-width: none;
}

.ps-scroll::-webkit-scrollbar,
.ps-media::-webkit-scrollbar,
.ps-stories::-webkit-scrollbar {
  display: none;
}

.ps-state {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  justify-content: center;
  opacity: 0.72;
  padding: 28px;
  text-align: center;
}

.ps-state svg {
  height: 36px;
  width: 36px;
}

.ps-state--inline {
  height: auto;
  min-height: 190px;
}

.ps-auth {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.ps-auth__body {
  align-items: center;
  background:
    radial-gradient(circle at 82% 16%, #fb718555, transparent 32%),
    radial-gradient(circle at 15% 85%, #22d3ee3d, transparent 35%),
    linear-gradient(145deg, #2e1065, #581c87 45%, #9f1239);
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  padding: 14px 16px 24px;
}

.ps-auth__glass {
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(255 255 255 / 50%);
  border-radius: 28px;
  box-shadow: 0 24px 70px rgb(12 4 31 / 34%);
  padding: 20px 14px;
  text-align: center;
  width: 100%;
}

:global(.dark .ps-auth__glass) {
  background: rgb(20 15 28 / 82%);
}

.ps-auth__glass > img {
  border-radius: 24px;
  box-shadow: 0 12px 30px rgb(58 18 97 / 35%);
  height: 78px;
  width: 78px;
}

.ps-auth__glass h1 {
  font-size: 21px;
  font-weight: 750;
  margin: 10px 0 4px;
}

.ps-auth__glass > p {
  font-size: 13px;
  line-height: 1.4;
  margin: 0 auto 14px;
  max-width: 280px;
  opacity: 0.72;
}

.ps-auth__form {
  margin: 12px 0;
  text-align: left;
}

.ps-auth__hint {
  font-size: 11px !important;
}

.ps-stories {
  background: var(--ps-surface);
  border-bottom: 1px solid var(--ps-border);
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 13px 12px 11px;
}

.ps-story-link,
.ps-story-add {
  align-items: center;
  color: inherit;
  display: flex;
  flex: 0 0 66px;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ps-story-link small,
.ps-story-add small {
  color: var(--ps-text);
  max-width: 66px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ps-story-ring {
  background: conic-gradient(
    from 180deg,
    #22d3ee,
    #8b5cf6,
    #fb7185,
    #fbbf24,
    #22d3ee
  );
  border-radius: 50%;
  display: grid;
  height: 62px;
  padding: 3px;
  place-items: center;
  width: 62px;
}

.ps-story-ring--seen {
  background: #9ca3af;
}

.ps-story-ring--add {
  background: linear-gradient(135deg, #8b5cf6, #22d3ee);
}

.ps-avatar {
  align-items: center;
  background: linear-gradient(145deg, #ede9fe, #fecdd3);
  border: 2px solid var(--ps-avatar-border);
  border-radius: 50%;
  color: #4c1d95;
  display: flex;
  font-size: 14px;
  font-weight: 800;
  height: 100%;
  justify-content: center;
  overflow: hidden;
  width: 100%;
}

.ps-avatar img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.ps-avatar--small {
  border-width: 1px;
  flex: 0 0 36px;
  height: 36px;
  width: 36px;
}

.ps-avatar--list {
  border-width: 1px;
  height: 42px;
  width: 42px;
}

.ps-avatar--comment {
  border-width: 1px;
  height: 34px;
  width: 34px;
}

.ps-avatar--profile {
  border: 3px solid var(--ps-avatar-border);
  box-shadow: 0 0 0 3px var(--ps-accent);
  font-size: 24px;
  height: 92px;
  width: 92px;
}

.ps-post {
  background: var(--ps-surface);
  border-bottom: 1px solid var(--ps-border);
  border-radius: 0;
  box-shadow: none;
  color: var(--ps-text);
  margin: 0;
  padding: 0 0 13px;
}

.ps-post__header,
.ps-post__actions {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 52px;
  padding: 8px 12px;
}

.ps-author {
  align-items: center;
  color: inherit;
  display: flex;
  gap: 8px;
  min-width: 0;
  text-align: left;
}

.ps-author > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ps-author__name {
  align-items: center;
  display: flex;
  gap: 4px;
  min-width: 0;
}

.ps-author strong,
.ps-author small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ps-author small {
  align-items: center;
  display: flex;
  font-size: 10px;
  opacity: 0.66;
}

.ps-author small svg {
  height: 11px;
  width: 11px;
}

.ps-verified {
  background: #0787ff;
  border-radius: 50%;
  color: #fff;
  filter: drop-shadow(0 0 4px rgb(7 135 255 / 48%));
  flex: 0 0 auto;
  height: 15px;
  padding: 2px;
  width: 15px;
}

.ps-media {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  width: 100%;
}

.ps-media img {
  aspect-ratio: 1;
  flex: 0 0 100%;
  object-fit: cover;
  scroll-snap-align: start;
  width: 100%;
}

.ps-dots {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin: 7px 0 -5px;
}

.ps-dots span {
  background: #a1a1aa;
  border-radius: 50%;
  height: 5px;
  width: 5px;
}

.ps-dots span.active {
  background: var(--ps-accent);
  width: 12px;
}

.ps-post__actions {
  min-height: auto;
  padding-bottom: 2px;
}

.ps-post__actions > span {
  display: flex;
  gap: 7px;
}

.ps-post__actions svg {
  height: 24px;
  width: 24px;
}

.ps-liked,
.ps-danger {
  color: #f43f5e;
}

.ps-post__copy {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
  padding: 0 13px;
}

.ps-post__copy p {
  line-height: 1.45;
  margin: 0;
  overflow-wrap: anywhere;
}

.ps-post__copy small {
  opacity: 0.5;
  text-transform: uppercase;
}

.ps-explore {
  padding-left: 8px;
  padding-right: 8px;
}

.ps-grid {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 8px;
}

.ps-grid__tile {
  aspect-ratio: 1;
  display: block;
  overflow: hidden;
  position: relative;
}

.ps-grid__tile img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.ps-grid__badge {
  position: absolute;
  right: 5px;
  top: 5px;
}

.ps-compose {
  padding-left: 12px;
  padding-right: 12px;
}

.ps-picker-card {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 14px 0;
}

.ps-picker-card__empty {
  align-items: center;
  aspect-ratio: 1.8;
  background: linear-gradient(145deg, #ede9fe, #ffe4e6);
  border-radius: 18px;
  color: #6d28d9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  padding: 18px;
  text-align: center;
  width: 100%;
}

:global(.dark .ps-picker-card__empty) {
  background: linear-gradient(145deg, #251a38, #311820);
  color: #c4b5fd;
}

.ps-compose-preview {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  width: 100%;
}

.ps-compose-preview img {
  aspect-ratio: 1;
  border-radius: 12px;
  object-fit: cover;
  width: 68%;
}

.ps-activity--unread {
  background: color-mix(in srgb, var(--ps-accent) 10%, transparent);
}

.ps-request-actions,
.ps-edit__avatar-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
}

.ps-edit__avatar-actions {
  flex-direction: column;
  width: 100%;
}

.ps-edit__avatar-actions :deep(.k-button) {
  white-space: nowrap;
}

.ps-report-card__actions {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding-top: 8px;
}

.ps-report-card__actions :deep(.k-button) {
  min-width: 0;
  padding-left: 4px;
  padding-right: 4px;
  width: 100%;
}

.ps-profile__header {
  align-items: center;
  background: var(--ps-surface);
  display: flex;
  flex-direction: column;
  padding: 22px 18px 16px;
  text-align: center;
}

.ps-profile__header h1 {
  align-items: center;
  display: flex;
  font-size: 20px;
  gap: 5px;
  margin: 14px 0 2px;
}

.ps-profile__header > p {
  margin: 0;
  opacity: 0.64;
}

.ps-profile__stats {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, 1fr);
  margin: 18px 0 12px;
  width: 100%;
}

.ps-profile__stats span {
  display: flex;
  flex-direction: column;
}

.ps-profile__stats strong {
  font-size: 18px;
}

.ps-profile__stats small {
  opacity: 0.62;
}

.ps-profile__bio {
  line-height: 1.45;
  margin-bottom: 14px !important;
  white-space: pre-wrap;
}

.ps-profile__segments {
  margin: 0 12px 10px;
}

.ps-private {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 34px;
  text-align: center;
}

.ps-load-more {
  margin: 16px auto;
}

.ps-create-icon {
  background: linear-gradient(135deg, #8b5cf6, #fb7185);
  border-radius: 9px;
  color: #fff;
  display: grid;
  padding: 2px 8px;
  place-items: center;
}

.ps-badge-icon {
  display: inline-flex;
  position: relative;
}

.ps-badge-icon > :last-child:not(:first-child) {
  position: absolute;
  right: -9px;
  top: -7px;
}

.ps-sheet {
  background: var(--ps-surface-raised);
  color: var(--ps-text);
  display: flex;
  flex-direction: column;
  max-height: 78vh;
  overflow: hidden;
}

.ps-sheet--tall {
  max-height: 86vh;
}

.ps-sheet--comments {
  height: min(68vh, 560px);
}

.ps-sheet__handle {
  background: var(--ps-muted);
  border-radius: 4px;
  flex: 0 0 auto;
  height: 5px;
  margin: 8px auto;
  opacity: 0.6;
  width: 38px;
}

.ps-sheet__toolbar {
  color: var(--ps-text);
  flex: 0 0 auto;
  padding-bottom: 6px;
}

.ps-sheet__toolbar-pane {
  min-width: 100%;
  padding: 0 14px;
}

.ps-sheet__toolbar-pane strong {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ps-comments,
.ps-edit,
.ps-report,
.ps-moderation {
  color: var(--ps-text);
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px max(18px, var(--k-safe-area-bottom));
}

.ps-comments {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.ps-comments__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.ps-comments--viewers {
  overflow-y: auto;
  padding-bottom: max(18px, var(--k-safe-area-bottom));
}

.ps-comment-actions {
  display: flex;
  gap: 10px;
}

.ps-reply-chip {
  align-self: flex-start;
  margin: 6px 12px;
}

.ps-comment-composer {
  bottom: auto;
  flex: 0 0 auto;
  position: relative;
}

.ps-comment-composer :deep(.k-toolbar) {
  padding-bottom: calc(max(8px, var(--k-safe-area-bottom)) + 6px);
}

.ps-comment-composer :deep(.ps-comment-composer__right) {
  align-items: center;
  display: flex;
  line-height: 0;
}

.ps-comment-composer svg {
  height: 21px;
  width: 21px;
}

.ps-edit {
  align-items: center;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
}

.ps-edit :deep(.k-list),
.ps-edit > :deep(ul) {
  width: 100%;
}

.ps-edit > :deep(.k-button),
.ps-report > :deep(.k-button) {
  width: 100%;
}

.ps-report,
.ps-moderation {
  padding-top: 4px;
}

.ps-story-viewer {
  background: #050509;
  height: 100vh;
  max-height: 100%;
  overflow: hidden;
  position: relative;
}

.ps-story-viewer > img {
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.ps-story-viewer__progress {
  display: flex;
  gap: 4px;
  left: 12px;
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;
}

.ps-story-viewer__progress span {
  background: rgb(255 255 255 / 38%);
  border-radius: 999px;
  flex: 1 1 auto;
  height: 3px;
}

.ps-story-viewer__progress span.active {
  background: #fff;
}

.ps-story-viewer__header {
  align-items: center;
  background: rgb(12 10 16 / 48%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 18px;
  color: #fff;
  display: flex;
  gap: 8px;
  left: 8px;
  padding: 8px;
  position: absolute;
  right: 8px;
  top: 24px;
}

.ps-story-viewer__header small {
  opacity: 0.7;
}

.ps-story-viewer__header > :last-child {
  margin-left: auto;
}

.ps-close {
  transform: rotate(45deg);
}

.ps-story-viewer__text {
  background: rgb(0 0 0 / 46%);
  border-radius: 14px;
  bottom: 78px;
  color: #fff;
  left: 22px;
  margin: 0;
  padding: 10px 12px;
  position: absolute;
  right: 22px;
  text-align: center;
}

.ps-story-viewer__nav {
  display: flex;
  justify-content: space-between;
  left: 4px;
  position: absolute;
  right: 4px;
  top: 48%;
}

.ps-story-viewer__nav :deep(button) {
  background: rgb(0 0 0 / 35%);
  border-radius: 50%;
  color: #fff;
  padding: 8px;
}

.ps-story-viewer__actions {
  display: flex;
  gap: 8px;
  bottom: 18px;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
}

.ps-story-viewer__actions svg {
  height: 16px;
  width: 16px;
}

.ps-report-card {
  margin: 10px 0;
}

.ps-report-card p {
  font-size: 12px;
  opacity: 0.7;
}

@media (prefers-reduced-motion: no-preference) {
  .ps-liked {
    animation: ps-heart 240ms ease-out;
  }
}

@keyframes ps-heart {
  50% {
    transform: scale(1.28);
  }
}
</style>
