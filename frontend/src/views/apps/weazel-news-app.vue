<script setup lang="ts">
import {
  SkyButton,
  SkyCard,
  SkyDialog,
  SkyDialogButton,
  SkyIcon,
  SkyLink,
  SkyList,
  SkyField,
  SkyListItem,
  SkyNavbar,
  SkyNavbarBackLink,
  SkyAppPage,
  SkySpinner,
  SkySearchbar,
  SkySegmented,
  SkySegmentedButton,
  SkySheet,
  SkyTabBar,
  SkyTabButton,
  SkyToast,
  SkyToolbarPane,
} from '@/ui'
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  House,
  ImagePlus,
  LayoutGrid,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useMessageMediaStore } from '@/stores/messageMedia'
import { usePhoneStore } from '@/stores/phone'
import { useWeazelNewsStore } from '@/stores/weazel-news'
import type {
  WeazelNewsArticle,
  WeazelNewsArticleDraft,
  WeazelNewsArticleSummary,
  WeazelNewsCategoryId,
  WeazelNewsManageStatus,
} from '@/types/weazel-news'
import { WEAZEL_NEWS_CATEGORY_IDS } from '@/types/weazel-news'

type MainTab = 'home' | 'categories' | 'search' | 'editorial'
type Screen = 'main' | 'detail' | 'composer'
type ComposerChoice = 'category' | 'status'
type ComposerChoiceOption = { label: string; value: string }
type SelectedCover = { id: number; url: string }
type ComposerContext = {
  article: WeazelNewsArticle | null
  cover: SelectedCover | null
  draft: WeazelNewsArticleDraft
  originTab: MainTab
}

const phone = usePhoneStore()
const news = useWeazelNewsStore()
const messageMedia = useMessageMediaStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<MainTab>('home')
const screen = ref<Screen>('main')
const detailManaged = ref(false)
const selectedCategory = ref<WeazelNewsCategoryId | null>(null)
const searchQuery = ref('')
const submittedSearchQuery = ref('')
const searchSubmitted = ref(false)
const editorialStatus = ref<WeazelNewsManageStatus>('all')
const editingArticle = ref<WeazelNewsArticle | null>(null)
const selectedCover = ref<SelectedCover | null>(null)
const deleteTarget = ref<WeazelNewsArticle | null>(null)
const deleteDialogOpened = ref(false)
const composerChoice = ref<ComposerChoice | null>(null)
const toastOpened = ref(false)
const toastText = ref('')
let toastTimer: number | undefined

function emptyDraft(): WeazelNewsArticleDraft {
  return {
    body: '',
    category: 'news',
    imageMediaId: null,
    status: 'draft',
    title: '',
  }
}

const draft = ref<WeazelNewsArticleDraft>(emptyDraft())

const categoryIcons = {
  business: Building2,
  events: CalendarDays,
  jobs: BriefcaseBusiness,
  news: Newspaper,
  official: Megaphone,
}

const featuredArticle = computed(() => news.publicItems[0] ?? null)
const secondaryArticles = computed(() => news.publicItems.slice(1))
const selectedArticle = computed(() => news.selected)
const composerChoiceOptions = computed<ComposerChoiceOption[]>(() =>
  composerChoice.value === 'status'
    ? [
        { label: t('composer.statusDraft'), value: 'draft' },
        { label: t('composer.statusPublished'), value: 'published' },
      ]
    : WEAZEL_NEWS_CATEGORY_IDS.map((category) => ({
        label: categoryLabel(category),
        value: category,
      })),
)
const composerChoiceLabel = computed(() =>
  composerChoice.value === 'status'
    ? t('composer.status')
    : t('composer.category'),
)
const knownErrors = new Set([
  'feature_disabled',
  'invalid_article',
  'invalid_draft',
  'invalid_publish',
  'invalid_request',
  'invalid_image',
  'invalid_attachment',
  'not_authorized',
  'article_not_found',
  'not_found',
  'revision_conflict',
  'rate_limited',
  'request_failed',
])
const activeError = computed(() => {
  if (screen.value !== 'main') return news.detailError
  if (activeTab.value === 'editorial') {
    return news.context ? news.managedError : news.contextError
  }
  if (activeTab.value === 'categories') return news.contextError
  return news.publicError
})
const contextualError = computed(() =>
  phone.t(
    `Apps.weazelNews.errors.${knownErrors.has(activeError.value) ? activeError.value : 'default'}`,
  ),
)
const currentSurfaceLoading = computed(() => {
  if (screen.value !== 'main') return news.detailLoading
  if (activeTab.value === 'editorial') {
    return news.context ? news.managedLoading : news.contextLoading
  }
  if (activeTab.value === 'categories') return news.contextLoading
  if (activeTab.value === 'search') {
    return searchSubmitted.value && news.publicLoading
  }
  return news.publicLoading
})

function t(path: string, replacements: Record<string, string> = {}): string {
  return phone.t(`Apps.weazelNews.${path}`, replacements)
}

function eventValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value
}

function categoryLabel(category: WeazelNewsCategoryId | null): string {
  return t(`categories.${category ?? 'all'}`)
}

function categoryCount(category: WeazelNewsCategoryId): number {
  return (
    news.context?.categories.find((entry) => entry.id === category)?.count ?? 0
  )
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(phone.lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function statusLabel(status: WeazelNewsArticle['status']): string {
  return t(
    status === 'published'
      ? 'composer.statusPublished'
      : 'composer.statusDraft',
  )
}

function showToast(key: string): void {
  if (toastTimer !== undefined) window.clearTimeout(toastTimer)
  toastText.value = t(key)
  toastOpened.value = true
  toastTimer = window.setTimeout(() => {
    toastOpened.value = false
  }, 3000)
}

function errorKey(code: string): string {
  return `errors.${knownErrors.has(code) ? code : 'default'}`
}

async function loadHome(): Promise<void> {
  await news.loadPublic({ category: selectedCategory.value })
}

async function selectTab(tab: MainTab): Promise<void> {
  activeTab.value = tab
  screen.value = 'main'
  news.error = ''

  if (tab === 'home') await loadHome()
  if (tab === 'categories') await news.loadContext()
  if (tab === 'search' && searchSubmitted.value) await submitSearch()
  if (tab === 'editorial') await loadEditorial()
}

async function loadEditorial(): Promise<void> {
  if (!news.context && !(await news.loadContext())) return
  if (news.context?.canManage) await news.loadManaged(editorialStatus.value)
}

async function selectCategory(
  category: WeazelNewsCategoryId | null,
): Promise<void> {
  selectedCategory.value = category
  activeTab.value = 'home'
  screen.value = 'main'
  await loadHome()
}

async function submitSearch(): Promise<void> {
  submittedSearchQuery.value = searchQuery.value.trim()
  searchSubmitted.value = true
  await news.loadPublic({ search: submittedSearchQuery.value })
}

async function loadMoreSearch(): Promise<void> {
  await news.loadPublic({
    append: true,
    offset: news.publicItems.length,
    search: submittedSearchQuery.value,
  })
}

function clearSearch(): void {
  searchQuery.value = ''
  submittedSearchQuery.value = ''
  searchSubmitted.value = false
  news.publicError = ''
  news.error = ''
}

async function openArticle(
  article: WeazelNewsArticleSummary,
  managed = false,
): Promise<void> {
  if (!(await news.loadArticle(article.id, managed))) {
    showToast(errorKey(news.detailError))
    return
  }
  detailManaged.value = managed
  screen.value = 'detail'
}

function closeDetail(): void {
  screen.value = 'main'
  news.selected = null
  if (activeTab.value === 'editorial' && news.context?.canManage) {
    void news.loadManaged(editorialStatus.value)
  }
}

function createArticle(): void {
  if (!news.context?.canManage) return
  editingArticle.value = null
  selectedCover.value = null
  draft.value = emptyDraft()
  screen.value = 'composer'
}

function editArticle(article: WeazelNewsArticle): void {
  if (!news.context?.canManage) return
  editingArticle.value = article
  selectedCover.value =
    article.imageMediaId && article.imageUrl
      ? { id: article.imageMediaId, url: article.imageUrl }
      : null
  draft.value = {
    body: article.body,
    category: article.category,
    imageMediaId: article.imageMediaId ?? null,
    status: article.status,
    title: article.title,
  }
  screen.value = 'composer'
}

function closeComposer(): void {
  composerChoice.value = null
  screen.value = editingArticle.value ? 'detail' : 'main'
}

function selectComposerChoice(option: ComposerChoiceOption): void {
  if (composerChoice.value === 'category') {
    draft.value.category = option.value as WeazelNewsCategoryId
  } else if (composerChoice.value === 'status') {
    draft.value.status = option.value as WeazelNewsArticleDraft['status']
  }
  composerChoice.value = null
}

function chooseCover(): void {
  messageMedia.begin(
    'weazel-news:cover',
    'photo',
    '/apps/weazel-news?compose=1',
    1,
    {
      article: editingArticle.value,
      cover: selectedCover.value,
      draft: { ...draft.value },
      originTab: activeTab.value,
    } satisfies ComposerContext,
  )
  void router.push({
    path: '/apps/photos',
    query: { mediaAttachment: 'photo' },
  })
}

function removeCover(): void {
  selectedCover.value = null
  draft.value.imageMediaId = null
}

async function saveArticle(
  status?: WeazelNewsArticleDraft['status'],
): Promise<void> {
  if (news.mutating) return

  const nextStatus = status ?? draft.value.status
  const title = draft.value.title.trim()
  const body = draft.value.body.trim()
  const titleLength = Array.from(title).length
  const bodyLength = Array.from(body).length

  if (nextStatus === 'draft' && (titleLength < 1 || bodyLength < 1)) {
    showToast('errors.invalid_draft')
    return
  }
  if (nextStatus === 'published' && (titleLength < 1 || bodyLength < 1)) {
    showToast('errors.invalid_publish')
    return
  }

  const payload: WeazelNewsArticleDraft = {
    ...draft.value,
    body,
    status: nextStatus,
    title,
  }
  const wasEditing = editingArticle.value !== null
  const article = editingArticle.value
    ? await news.update(editingArticle.value, payload)
    : await news.create(payload)

  if (!article) {
    showToast(errorKey(news.error))
    return
  }

  editingArticle.value = article
  news.selected = article
  detailManaged.value = true
  screen.value = 'detail'
  showToast(wasEditing ? 'feedback.updated' : 'feedback.created')
}

function requestDelete(article: WeazelNewsArticle): void {
  deleteTarget.value = article
  deleteDialogOpened.value = true
}

async function confirmDelete(): Promise<void> {
  const article = deleteTarget.value
  if (!article) return
  deleteDialogOpened.value = false
  if (!(await news.remove(article))) {
    showToast(errorKey(news.error))
    return
  }
  deleteTarget.value = null
  news.selected = null
  screen.value = 'main'
  activeTab.value = 'editorial'
  showToast('feedback.deleted')
  void news.loadManaged(editorialStatus.value)
}

async function changeEditorialStatus(
  status: WeazelNewsManageStatus,
): Promise<void> {
  editorialStatus.value = status
  await news.loadManaged(status)
}

async function loadMoreManaged(): Promise<void> {
  await news.loadManaged(editorialStatus.value, {
    append: true,
    offset: news.managedItems.length,
  })
}

async function initialize(): Promise<void> {
  const selection =
    messageMedia.consumeMany<ComposerContext>('weazel-news:cover')
  if (selection?.context) {
    editingArticle.value = selection.context.article
    selectedCover.value = selection.context.cover
    draft.value = selection.context.draft
    activeTab.value = selection.context.originTab
    screen.value = 'composer'
  }
  const media = selection?.media[0]
  if (media) {
    selectedCover.value = { id: media.id, url: media.url }
    draft.value.imageMediaId = media.id
  }

  await news.loadContext()
  await loadHome()
  if (route.query.compose === '1') {
    void router.replace('/apps/weazel-news')
  }
}

onMounted(() => void initialize())

onBeforeUnmount(() => {
  if (toastTimer !== undefined) window.clearTimeout(toastTimer)
})
</script>

<template>
  <sky-app-page
    component="main"
    class="weazel-app"
    :class="{ 'weazel-app--light': !phone.isDarkMode }"
    :aria-label="t('name')"
  >
    <template v-if="screen === 'main'">
      <sky-navbar class="weazel-navbar" :center-title="true">
        <template #title>
          <span class="weazel-brand" :aria-label="t('brand')">
            <span><Newspaper :size="16" :stroke-width="2.4" /></span>
            <b>{{ t('brand') }}</b>
          </span>
        </template>
      </sky-navbar>

      <div class="weazel-scroll">
        <template v-if="activeTab === 'home'">
          <header class="weazel-section-heading">
            <div>
              <span>{{ t('home.eyebrow') }}</span>
              <h1>{{ categoryLabel(selectedCategory) }}</h1>
            </div>
            <button
              v-if="selectedCategory"
              type="button"
              class="weazel-filter-clear"
              :aria-label="t('categories.all')"
              @click="selectCategory(null)"
            >
              <X :size="15" />
            </button>
          </header>

          <div v-if="currentSurfaceLoading" class="weazel-state">
            <sky-spinner class="text-[#d71920]" />
            <span>{{ t('states.loading') }}</span>
          </div>
          <div v-else-if="activeError" class="weazel-state">
            <Newspaper :size="34" />
            <strong>{{ t('states.errorTitle') }}</strong>
            <span>{{ contextualError }}</span>
            <sky-button rounded small @click="loadHome">{{
              t('retry')
            }}</sky-button>
          </div>
          <div v-else-if="!featuredArticle" class="weazel-state">
            <FileText :size="34" />
            <strong>{{ t('states.emptyTitle') }}</strong>
            <span>{{ t('states.emptyBody') }}</span>
          </div>
          <section v-else :aria-label="t('accessibility.articleList')">
            <sky-card :content-wrap="false" class="weazel-feature-card">
              <button
                type="button"
                :aria-label="
                  t('accessibility.openArticle', {
                    title: featuredArticle.title,
                  })
                "
                @click="openArticle(featuredArticle)"
              >
                <img
                  v-if="featuredArticle.imageUrl"
                  :src="featuredArticle.imageUrl"
                  :alt="t('article.coverAlt', { title: featuredArticle.title })"
                />
                <div v-else class="weazel-feature-placeholder">
                  <span>W</span>
                  <Newspaper :size="34" />
                </div>
                <div class="weazel-feature-copy">
                  <span>{{ categoryLabel(featuredArticle.category) }}</span>
                  <h2>{{ featuredArticle.title }}</h2>
                  <p>{{ featuredArticle.excerpt }}</p>
                  <small>
                    {{
                      t('article.byline', {
                        author: featuredArticle.authorName,
                      })
                    }}
                    · {{ formatDate(featuredArticle.publishedAt) }}
                  </small>
                </div>
              </button>
            </sky-card>

            <div class="weazel-latest-title">
              <span>{{ t('home.latest') }}</span>
              <i></i>
            </div>
            <div class="weazel-card-list">
              <sky-card
                v-for="article in secondaryArticles"
                :key="article.id"
                :content-wrap="false"
                class="weazel-article-card"
              >
                <button
                  type="button"
                  :aria-label="
                    t('accessibility.openArticle', { title: article.title })
                  "
                  @click="openArticle(article)"
                >
                  <div class="weazel-card-copy">
                    <span>{{ categoryLabel(article.category) }}</span>
                    <h2>{{ article.title }}</h2>
                    <p>{{ article.excerpt }}</p>
                    <small>{{ formatDate(article.publishedAt) }}</small>
                  </div>
                  <img
                    v-if="article.imageUrl"
                    :src="article.imageUrl"
                    :alt="t('article.coverAlt', { title: article.title })"
                  />
                  <span v-else class="weazel-card-mark">W</span>
                </button>
              </sky-card>
            </div>
            <sky-button
              v-if="news.publicHasMore"
              class="weazel-load-more"
              tonal
              rounded
              @click="
                news.loadPublic({
                  append: true,
                  category: selectedCategory,
                  offset: news.publicItems.length,
                })
              "
            >
              {{ t('loadMore') }}
            </sky-button>
          </section>
        </template>

        <template v-else-if="activeTab === 'categories'">
          <header class="weazel-section-heading">
            <div>
              <span>{{ t('name') }}</span>
              <h1>{{ t('categories.title') }}</h1>
              <p>{{ t('categories.subtitle') }}</p>
            </div>
          </header>
          <sky-list
            inset
            strong
            class="weazel-category-list"
            :aria-label="t('accessibility.categoryList')"
          >
            <sky-list-item
              v-for="category in WEAZEL_NEWS_CATEGORY_IDS"
              :key="category"
              link
              link-component="button"
              :link-props="{ type: 'button' }"
              :title="categoryLabel(category)"
              :after="String(categoryCount(category))"
              :aria-label="
                t('accessibility.openCategory', {
                  category: categoryLabel(category),
                })
              "
              @click="selectCategory(category)"
            >
              <template #media>
                <span class="weazel-category-icon">
                  <component :is="categoryIcons[category]" :size="19" />
                </span>
              </template>
            </sky-list-item>
          </sky-list>
        </template>

        <template v-else-if="activeTab === 'search'">
          <header class="weazel-section-heading">
            <div>
              <span>{{ t('name') }}</span>
              <h1>{{ t('search.title') }}</h1>
            </div>
          </header>
          <div class="weazel-search-shell">
            <sky-searchbar
              component="form"
              class="weazel-searchbar"
              input-id="weazel-news-search"
              :clear-button="false"
              :value="searchQuery"
              :placeholder="t('search.placeholder')"
              :aria-label="t('accessibility.search')"
              @input="searchQuery = eventValue($event)"
              @submit.prevent="submitSearch"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="weazel-search-clear"
              :aria-label="t('accessibility.clearSearch')"
              @click="clearSearch"
            >
              <X :size="17" />
            </button>
          </div>
          <label class="weazel-sr-only" for="weazel-news-search">
            {{ t('accessibility.search') }}
          </label>
          <div
            v-if="currentSurfaceLoading"
            class="weazel-state weazel-state--compact"
          >
            <sky-spinner class="text-[#d71920]" />
            <span>{{ t('states.loading') }}</span>
          </div>
          <div
            v-else-if="activeError"
            class="weazel-state weazel-state--compact"
          >
            <Newspaper :size="34" />
            <strong>{{ t('states.errorTitle') }}</strong>
            <span>{{ contextualError }}</span>
            <sky-button rounded small @click="submitSearch">{{
              t('retry')
            }}</sky-button>
          </div>
          <div
            v-else-if="searchSubmitted && !news.publicItems.length"
            class="weazel-state weazel-state--compact"
          >
            <Search :size="34" />
            <strong>{{ t('search.emptyTitle') }}</strong>
            <span>{{ t('search.emptyBody') }}</span>
          </div>
          <div v-else-if="searchSubmitted" class="weazel-card-list">
            <sky-card
              v-for="article in news.publicItems"
              :key="article.id"
              :content-wrap="false"
              class="weazel-article-card"
            >
              <button type="button" @click="openArticle(article)">
                <div class="weazel-card-copy">
                  <span>{{ categoryLabel(article.category) }}</span>
                  <h2>{{ article.title }}</h2>
                  <p>{{ article.excerpt }}</p>
                  <small>{{ formatDate(article.publishedAt) }}</small>
                </div>
                <img v-if="article.imageUrl" :src="article.imageUrl" alt="" />
                <ChevronRight v-else :size="20" />
              </button>
            </sky-card>
          </div>
          <sky-button
            v-if="
              searchSubmitted && news.publicHasMore && !currentSurfaceLoading
            "
            class="weazel-load-more"
            tonal
            rounded
            @click="loadMoreSearch"
          >
            {{ t('loadMore') }}
          </sky-button>
        </template>

        <template v-else>
          <header class="weazel-section-heading weazel-editorial-heading">
            <div>
              <span>{{ t('name') }}</span>
              <h1>{{ t('editorial.title') }}</h1>
              <p>{{ t('editorial.subtitle') }}</p>
            </div>
          </header>

          <div
            v-if="currentSurfaceLoading && !news.context"
            class="weazel-state"
          >
            <sky-spinner class="text-[#d71920]" />
            <span>{{ t('states.loading') }}</span>
          </div>
          <div v-else-if="activeError && !news.context" class="weazel-state">
            <Newspaper :size="34" />
            <strong>{{ t('states.errorTitle') }}</strong>
            <span>{{ contextualError }}</span>
            <sky-button rounded small @click="loadEditorial">{{
              t('retry')
            }}</sky-button>
          </div>
          <div v-else-if="!news.context?.canManage" class="weazel-state">
            <UserRound :size="36" />
            <strong>{{ t('states.readOnlyTitle') }}</strong>
            <span>{{ t('states.readOnlyBody') }}</span>
          </div>
          <template v-else>
            <sky-card :content-wrap="false" class="weazel-access-card">
              <div class="weazel-access-content">
                <span class="weazel-access-avatar">W</span>
                <div class="weazel-access-identity">
                  <strong>{{ news.context.jobLabel }}</strong>
                  <small>{{
                    t('editorial.jobAccess', {
                      job:
                        news.context.jobGradeLabel ||
                        news.context.jobLabel ||
                        t('name'),
                    })
                  }}</small>
                </div>
                <sky-button
                  rounded
                  small
                  class="weazel-new-article"
                  :aria-label="t('accessibility.newArticle')"
                  @click="createArticle"
                >
                  <Plus :size="17" /> {{ t('editorial.newArticle') }}
                </sky-button>
              </div>
            </sky-card>

            <sky-segmented strong rounded class="weazel-editorial-filter">
              <sky-segmented-button
                v-for="status in [
                  'all',
                  'published',
                  'draft',
                ] as WeazelNewsManageStatus[]"
                :key="status"
                :active="editorialStatus === status"
                @click="changeEditorialStatus(status)"
              >
                {{ t(`editorial.${status === 'draft' ? 'drafts' : status}`) }}
              </sky-segmented-button>
            </sky-segmented>

            <div
              v-if="currentSurfaceLoading"
              class="weazel-state weazel-state--compact"
            >
              <sky-spinner class="text-[#d71920]" />
            </div>
            <div
              v-else-if="activeError"
              class="weazel-state weazel-state--compact"
            >
              <Newspaper :size="34" />
              <strong>{{ t('states.errorTitle') }}</strong>
              <span>{{ contextualError }}</span>
              <sky-button rounded small @click="loadEditorial">{{
                t('retry')
              }}</sky-button>
            </div>
            <div
              v-else-if="!news.managedItems.length"
              class="weazel-state weazel-state--compact"
            >
              <FileText :size="34" />
              <strong>{{ t('states.noManagedTitle') }}</strong>
              <span>{{ t('states.noManagedBody') }}</span>
            </div>
            <sky-list
              v-else
              inset
              strong
              class="weazel-editorial-list"
              :aria-label="t('accessibility.editorialList')"
            >
              <sky-list-item
                v-for="article in news.managedItems"
                :key="article.id"
                link
                link-component="button"
                :link-props="{ type: 'button' }"
                content-class="weazel-editorial-item__content"
                inner-class="weazel-editorial-item__inner"
                title-wrap-class="weazel-editorial-item__title-wrap"
                :title="article.title"
                :subtitle="`${categoryLabel(article.category)} · ${formatDate(article.updatedAt)}`"
                @click="openArticle(article, true)"
              >
                <template #media>
                  <span class="weazel-editorial-thumb">
                    <img
                      v-if="article.imageUrl"
                      :src="article.imageUrl"
                      alt=""
                    />
                    <FileText v-else :size="18" />
                  </span>
                </template>
                <template #after>
                  <span class="weazel-status" :class="`is-${article.status}`">
                    {{ statusLabel(article.status) }}
                  </span>
                </template>
              </sky-list-item>
            </sky-list>
            <sky-button
              v-if="
                news.managedItems.length &&
                news.managedHasMore &&
                !currentSurfaceLoading
              "
              class="weazel-load-more"
              tonal
              rounded
              @click="loadMoreManaged"
            >
              {{ t('loadMore') }}
            </sky-button>
          </template>
        </template>
      </div>

      <sky-tab-bar
        component="nav"
        icons
        labels
        class="weazel-tabbar"
        inner-class="weazel-tabbar__inner"
        :aria-label="t('navigation')"
      >
        <sky-toolbar-pane class="weazel-tabbar__pane">
          <sky-tab-button
            component="button"
            class="weazel-tabbar__link"
            :active="activeTab === 'home'"
            :link-props="{ type: 'button' }"
            @click="selectTab('home')"
          >
            <template #icon
              ><sky-icon><House :size="22" /></sky-icon
            ></template>
            <template #label>{{ t('tabs.home') }}</template>
          </sky-tab-button>
          <sky-tab-button
            component="button"
            class="weazel-tabbar__link"
            :active="activeTab === 'categories'"
            :link-props="{ type: 'button' }"
            @click="selectTab('categories')"
          >
            <template #icon
              ><sky-icon><LayoutGrid :size="22" /></sky-icon
            ></template>
            <template #label>{{ t('tabs.categories') }}</template>
          </sky-tab-button>
          <sky-tab-button
            component="button"
            class="weazel-tabbar__link"
            :active="activeTab === 'search'"
            :link-props="{ type: 'button' }"
            @click="selectTab('search')"
          >
            <template #icon
              ><sky-icon><Search :size="22" /></sky-icon
            ></template>
            <template #label>{{ t('tabs.search') }}</template>
          </sky-tab-button>
          <sky-tab-button
            component="button"
            class="weazel-tabbar__link"
            :active="activeTab === 'editorial'"
            :link-props="{ type: 'button' }"
            @click="selectTab('editorial')"
          >
            <template #icon
              ><sky-icon><UserRound :size="22" /></sky-icon
            ></template>
            <template #label>{{ t('tabs.editorial') }}</template>
          </sky-tab-button>
        </sky-toolbar-pane>
      </sky-tab-bar>
    </template>

    <template v-else-if="screen === 'detail' && selectedArticle">
      <sky-navbar class="weazel-navbar" :title="t('article.readMore')">
        <template #left>
          <sky-navbar-back-link
            component="button"
            :text="t('back')"
            @click="closeDetail"
          />
        </template>
        <template v-if="news.context?.canManage && detailManaged" #right>
          <sky-link
            component="button"
            icon-only
            :aria-label="
              t('accessibility.editArticle', { title: selectedArticle.title })
            "
            @click="editArticle(selectedArticle)"
          >
            <Pencil :size="19" />
          </sky-link>
        </template>
      </sky-navbar>
      <article class="weazel-detail-scroll">
        <img
          v-if="selectedArticle.imageUrl"
          class="weazel-detail-cover"
          :src="selectedArticle.imageUrl"
          :alt="t('article.coverAlt', { title: selectedArticle.title })"
        />
        <div v-else class="weazel-detail-masthead">
          <span>W</span><Newspaper :size="38" />
        </div>
        <div class="weazel-detail-copy">
          <span class="weazel-kicker">{{
            categoryLabel(selectedArticle.category)
          }}</span>
          <h1>{{ selectedArticle.title }}</h1>
          <div class="weazel-byline">
            <span>{{
              selectedArticle.authorName.charAt(0).toUpperCase()
            }}</span>
            <div>
              <strong>{{
                t('article.byline', { author: selectedArticle.authorName })
              }}</strong>
              <small>{{
                t('article.published', {
                  date: formatDate(
                    selectedArticle.publishedAt || selectedArticle.updatedAt,
                  ),
                })
              }}</small>
            </div>
          </div>
          <p>{{ selectedArticle.body }}</p>
        </div>
        <div
          v-if="news.context?.canManage && detailManaged"
          class="weazel-detail-actions"
        >
          <sky-button rounded tonal @click="editArticle(selectedArticle)">
            <Pencil :size="18" /> {{ t('editorial.edit') }}
          </sky-button>
          <sky-button
            rounded
            tonal
            class="weazel-danger"
            @click="requestDelete(selectedArticle)"
          >
            <Trash2 :size="18" /> {{ t('editorial.delete') }}
          </sky-button>
        </div>
      </article>
    </template>

    <template v-else-if="screen === 'composer'">
      <sky-navbar
        class="weazel-navbar"
        :title="t(editingArticle ? 'composer.editTitle' : 'composer.newTitle')"
      >
        <template #left>
          <sky-navbar-back-link
            component="button"
            :text="t('back')"
            @click="closeComposer"
          />
        </template>
      </sky-navbar>
      <div class="weazel-composer-scroll">
        <section class="weazel-composer-cover">
          <img
            v-if="selectedCover"
            :src="selectedCover.url"
            :alt="t('composer.coverAlt')"
          />
          <div v-else>
            <ImagePlus :size="34" /><span>{{ t('composer.cover') }}</span>
          </div>
          <div class="weazel-cover-actions">
            <sky-button
              rounded
              tonal
              class="weazel-cover-picker"
              @click="chooseCover"
            >
              <ImagePlus aria-hidden="true" />
              <span class="weazel-cover-picker__label">
                {{
                  t(
                    selectedCover
                      ? 'composer.changeCover'
                      : 'composer.chooseCover',
                  )
                }}
              </span>
            </sky-button>
            <sky-button
              v-if="selectedCover"
              rounded
              clear
              class="weazel-danger weazel-cover-remove"
              @click="removeCover"
            >
              {{ t('composer.removeCover') }}
            </sky-button>
          </div>
        </section>

        <sky-list nested :dividers="false" class="weazel-composer-list">
          <sky-field
            outline
            class="weazel-composer-field"
            input-class="weazel-composer-input"
            maxlength="160"
            :label="t('composer.title')"
            :placeholder="t('composer.titlePlaceholder')"
            :value="draft.title"
            @input="draft.title = eventValue($event)"
          />
          <sky-field
            outline
            class="weazel-composer-field"
            type="textarea"
            maxlength="12000"
            :label="t('composer.body')"
            :placeholder="t('composer.bodyPlaceholder')"
            :value="draft.body"
            input-class="weazel-composer-input weazel-body-input"
            @input="draft.body = eventValue($event)"
          />
          <sky-list-item
            link
            link-component="button"
            :chevron="false"
            class="weazel-choice-trigger"
            content-class="weazel-choice-trigger__content"
            inner-class="weazel-choice-trigger__inner"
            :link-props="{
              type: 'button',
              'aria-haspopup': 'dialog',
              'aria-expanded': composerChoice === 'category',
            }"
            @click="composerChoice = 'category'"
          >
            <template #inner>
              <span class="weazel-choice-trigger__copy">
                <small>{{ t('composer.category') }}</small>
                <strong>{{ categoryLabel(draft.category) }}</strong>
              </span>
              <ChevronDown
                class="weazel-choice-trigger__icon"
                :class="{ 'is-open': composerChoice === 'category' }"
              />
            </template>
          </sky-list-item>
          <sky-list-item
            v-if="editingArticle"
            link
            link-component="button"
            :chevron="false"
            class="weazel-choice-trigger"
            content-class="weazel-choice-trigger__content"
            inner-class="weazel-choice-trigger__inner"
            :link-props="{
              type: 'button',
              'aria-haspopup': 'dialog',
              'aria-expanded': composerChoice === 'status',
            }"
            @click="composerChoice = 'status'"
          >
            <template #inner>
              <span class="weazel-choice-trigger__copy">
                <small>{{ t('composer.status') }}</small>
                <strong>{{ statusLabel(draft.status) }}</strong>
              </span>
              <ChevronDown
                class="weazel-choice-trigger__icon"
                :class="{ 'is-open': composerChoice === 'status' }"
              />
            </template>
          </sky-list-item>
        </sky-list>

        <div class="weazel-composer-actions">
          <template v-if="!editingArticle">
            <sky-button
              large
              rounded
              tonal
              :disabled="news.mutating"
              @click="saveArticle('draft')"
            >
              {{ t('composer.saveDraft') }}
            </sky-button>
            <sky-button
              large
              rounded
              :disabled="news.mutating"
              @click="saveArticle('published')"
            >
              {{ t('composer.publish') }}
            </sky-button>
          </template>
          <sky-button
            v-else
            large
            rounded
            :disabled="news.mutating"
            @click="saveArticle()"
          >
            {{ t('composer.saveChanges') }}
          </sky-button>
        </div>
      </div>
    </template>

    <sky-sheet
      :opened="composerChoice !== null"
      class="weazel-choice-sheet"
      @backdropclick="composerChoice = null"
    >
      <section
        v-if="composerChoice"
        class="weazel-choice-sheet__content"
        role="dialog"
        aria-modal="true"
        :aria-label="composerChoiceLabel"
      >
        <div class="weazel-choice-sheet__handle" aria-hidden="true" />
        <header class="weazel-choice-sheet__header">
          <h2>{{ composerChoiceLabel }}</h2>
          <sky-link
            component="button"
            icon-only
            class="weazel-choice-sheet__close"
            :aria-label="phone.t('Common.close')"
            :link-props="{ type: 'button' }"
            @click="composerChoice = null"
          >
            <X />
          </sky-link>
        </header>
        <sky-list
          nested
          :dividers="false"
          class="weazel-choice-options"
          role="listbox"
        >
          <sky-list-item
            v-for="option in composerChoiceOptions"
            :key="option.value"
            link
            link-component="button"
            :chevron="false"
            :title="option.label"
            :link-props="{
              type: 'button',
              role: 'option',
              'aria-selected':
                composerChoice === 'category'
                  ? option.value === draft.category
                  : option.value === draft.status,
            }"
            class="weazel-choice-option"
            content-class="weazel-choice-option__content"
            inner-class="weazel-choice-option__inner"
            title-wrap-class="weazel-choice-option__title"
            @click="selectComposerChoice(option)"
          >
            <template #after>
              <Check
                v-if="
                  composerChoice === 'category'
                    ? option.value === draft.category
                    : option.value === draft.status
                "
              />
            </template>
          </sky-list-item>
        </sky-list>
      </section>
    </sky-sheet>

    <sky-dialog
      :opened="deleteDialogOpened"
      @backdropclick="deleteDialogOpened = false"
    >
      <template #title>{{ t('delete.title') }}</template>
      <p>{{ t('delete.body') }}</p>
      <template #buttons>
        <sky-dialog-button @click="deleteDialogOpened = false">
          {{ t('delete.cancel') }}
        </sky-dialog-button>
        <sky-dialog-button strong class="text-red-500" @click="confirmDelete">
          {{ t('delete.confirm') }}
        </sky-dialog-button>
      </template>
    </sky-dialog>

    <sky-toast
      :opened="toastOpened"
      position="center"
      @click="toastOpened = false"
    >
      {{ toastText }}
    </sky-toast>
  </sky-app-page>
</template>

<style scoped>
.weazel-app {
  --weazel-bg: #070707;
  --weazel-surface: #151515;
  --weazel-surface-strong: #1d1d1f;
  --weazel-text: #f5f5f5;
  --weazel-muted: #929296;
  --weazel-line: rgb(255 255 255 / 10%);
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--weazel-bg) !important;
  color: var(--weazel-text);
}

.weazel-app--light {
  --weazel-bg: #f4f1ec;
  --weazel-surface: #fff;
  --weazel-surface-strong: #ebe7e1;
  --weazel-text: #121212;
  --weazel-muted: #69696e;
  --weazel-line: rgb(0 0 0 / 10%);
}

.weazel-navbar {
  --sky-safe-area-top: 46px;
  position: absolute;
  z-index: 10;
  top: 0;
  right: 0;
  left: 0;
  color: var(--weazel-text);
}

.weazel-brand {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--weazel-text);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 21px;
  letter-spacing: -0.8px;
}

.weazel-brand > span {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  margin-right: 2px;
  border-radius: 7px;
  background: #d71920;
  color: #fff;
}

.weazel-brand b {
  font-weight: 800;
}

.weazel-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.weazel-scroll,
.weazel-detail-scroll,
.weazel-composer-scroll {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 100px 14px 86px;
  padding: 12.4cqh 1.7cqh 10.6cqh;
  scrollbar-width: none;
}

.weazel-detail-scroll,
.weazel-composer-scroll {
  padding-bottom: 32px;
  padding-bottom: 4cqh;
}

.weazel-scroll::-webkit-scrollbar,
.weazel-detail-scroll::-webkit-scrollbar,
.weazel-composer-scroll::-webkit-scrollbar {
  display: none;
}

.weazel-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 4px 18px;
}

.weazel-section-heading span,
.weazel-kicker,
.weazel-card-copy > span,
.weazel-feature-copy > span {
  color: #d71920;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.25px;
  text-transform: uppercase;
}

.weazel-section-heading h1 {
  margin: 2px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -1.1px;
}

.weazel-section-heading p {
  max-width: 300px;
  margin: 7px 0 0;
  color: var(--weazel-muted);
  font-size: 12px;
  line-height: 1.4;
}

.weazel-filter-clear {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--weazel-surface-strong);
  color: var(--weazel-text);
}

.weazel-state {
  min-height: 410px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 28px;
  color: var(--weazel-muted);
  text-align: center;
}

.weazel-state--compact {
  min-height: 260px;
}

.weazel-state strong {
  color: var(--weazel-text);
  font-size: 18px;
}

.weazel-state span {
  max-width: 270px;
  font-size: 12px;
  line-height: 1.45;
}

.weazel-feature-card,
.weazel-article-card,
.weazel-access-card {
  overflow: hidden;
  margin: 0 0 12px !important;
  border: 1px solid var(--weazel-line);
  border-radius: 20px !important;
  background: var(--weazel-surface) !important;
  box-shadow: 0 12px 28px rgb(0 0 0 / 13%);
}

.weazel-feature-card button,
.weazel-article-card button {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.weazel-feature-card img,
.weazel-feature-placeholder {
  width: 100%;
  height: 178px;
  display: block;
  object-fit: cover;
}

.weazel-feature-placeholder,
.weazel-detail-masthead {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(215 25 32 / 92%), rgb(76 5 8 / 94%)), #d71920;
  color: #fff;
}

.weazel-feature-placeholder::after,
.weazel-detail-masthead::after {
  position: absolute;
  inset: -45%;
  border: 1px solid rgb(255 255 255 / 18%);
  content: '';
  transform: rotate(24deg);
}

.weazel-feature-placeholder span,
.weazel-detail-masthead span {
  font-family: Georgia, serif;
  font-size: 70px;
  font-weight: 900;
  line-height: 1;
}

.weazel-feature-copy {
  padding: 17px 18px 19px;
}

.weazel-feature-copy h2,
.weazel-card-copy h2 {
  margin: 5px 0 7px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  line-height: 1.08;
  letter-spacing: -0.55px;
}

.weazel-feature-copy p,
.weazel-card-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0 0 10px;
  color: var(--weazel-muted);
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.weazel-feature-copy small,
.weazel-card-copy small {
  color: var(--weazel-muted);
  font-size: 10px;
}

.weazel-latest-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 22px 4px 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.weazel-latest-title i {
  height: 1px;
  flex: 1;
  background: var(--weazel-line);
}

.weazel-article-card button {
  min-height: 132px;
  display: flex;
  align-items: stretch;
}

.weazel-card-copy {
  min-width: 0;
  flex: 1;
  padding: 15px;
}

.weazel-card-copy h2 {
  display: -webkit-box;
  overflow: hidden;
  font-size: 17px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.weazel-card-copy p {
  -webkit-line-clamp: 2;
}

.weazel-article-card img,
.weazel-card-mark {
  width: 115px;
  min-height: 132px;
  flex: 0 0 115px;
  object-fit: cover;
}

.weazel-card-mark {
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #d71920, #510609);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 48px;
  font-weight: 900;
}

.weazel-load-more {
  width: 100%;
  margin-top: 6px;
}

.weazel-category-list,
.weazel-editorial-list {
  margin-right: 0 !important;
  margin-left: 0 !important;
  overflow: hidden;
  border: 1px solid var(--weazel-line);
  border-radius: 20px !important;
  background: var(--weazel-surface) !important;
}

.weazel-category-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgb(215 25 32 / 14%);
  color: #d71920;
}

.weazel-search-shell {
  position: relative;
  margin: 0 0 14px;
}

.weazel-search-clear {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: 14px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  border: 0;
  border-radius: 999px;
  background: var(--weazel-line);
  color: var(--weazel-muted);
}

.weazel-access-content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px 8px;
  gap: 0.9cqh 1cqh;
  padding: 9px;
  padding: 1.1cqh;
}

.weazel-access-card :deep(.sky-card__content) {
  padding: 0 !important;
}

.weazel-access-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
}

.weazel-access-identity strong {
  overflow: hidden;
  font-size: 14px;
  font-size: 1.73cqh;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-access-card small {
  overflow: hidden;
  color: var(--weazel-muted);
  font-size: 10px;
  font-size: 1.24cqh;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-access-avatar {
  width: 38px;
  width: 4.7cqh;
  height: 38px;
  height: 4.7cqh;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border-radius: 1.1cqh;
  background: #d71920;
  color: #fff;
  font-family: Georgia, serif;
  font-size: 18px;
  font-size: 2.23cqh;
  font-weight: 900;
}

.weazel-new-article {
  width: 100%;
  min-width: 0;
  height: 34px !important;
  height: 4.2cqh !important;
  min-height: 34px;
  min-height: 4.2cqh;
  grid-column: 1 / -1;
  justify-content: center;
  font-size: 13px;
  font-size: 1.61cqh;
  white-space: nowrap;
}

.weazel-new-article :deep(svg) {
  width: 16px;
  width: 1.98cqh;
  height: 16px;
  height: 1.98cqh;
}

.weazel-editorial-filter {
  margin: 11px 0;
  margin: 1.36cqh 0;
}

.weazel-editorial-thumb {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 9px;
  background: var(--weazel-surface-strong);
  color: #d71920;
}

.weazel-editorial-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.weazel-editorial-list :deep(.weazel-editorial-item__content) {
  min-height: 68px;
  min-height: 8.42cqh;
}

.weazel-editorial-list :deep(.weazel-editorial-item__inner) {
  min-width: 0;
  padding-top: 8px;
  padding-top: 1cqh;
  padding-bottom: 8px;
  padding-bottom: 1cqh;
  text-align: left;
}

.weazel-editorial-list :deep(.weazel-editorial-item__title-wrap) {
  min-width: 0;
  align-items: center;
  gap: 6px;
  gap: 0.74cqh;
}

.weazel-editorial-list
  :deep(.weazel-editorial-item__title-wrap > div:first-child) {
  min-width: 0;
  display: -webkit-box;
  overflow: hidden;
  flex: 1;
  font-size: 14px;
  font-size: 1.73cqh;
  line-height: 1.25;
  text-align: left;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.weazel-editorial-list :deep(.weazel-editorial-item__inner > div:nth-child(2)) {
  overflow: hidden;
  color: var(--weazel-muted);
  font-size: 10px;
  font-size: 1.24cqh;
  line-height: 1.3;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-editorial-list
  :deep(.weazel-editorial-item__title-wrap > div:nth-last-child(2)) {
  padding-left: 0;
}

.weazel-editorial-list :deep(.weazel-editorial-item__title-wrap > svg) {
  width: 14px;
  width: 1.73cqh;
  margin-left: 2px;
  margin-left: 0.25cqh;
}

.weazel-status {
  padding: 3px 5px;
  padding: 0.37cqh 0.62cqh;
  border-radius: 999px;
  background: rgb(142 142 147 / 14%);
  color: var(--weazel-muted);
  font-size: 9px;
  font-size: 1.11cqh;
  font-weight: 700;
  text-transform: uppercase;
}

.weazel-status.is-published {
  background: rgb(52 199 89 / 14%);
  color: #34c759;
}

.weazel-tabbar {
  position: absolute !important;
  z-index: 20;
  right: 9px;
  right: 1.1cqh;
  bottom: 25px;
  bottom: 3.1cqh;
  left: 9px;
  left: 1.1cqh;
  width: auto !important;
  padding: 0 !important;
  color: var(--weazel-text);
  overflow: hidden;
}

.weazel-tabbar :deep(> div:first-child) {
  height: 100% !important;
}

.weazel-tabbar :deep(.weazel-tabbar__inner) {
  width: 100% !important;
  height: 50px !important;
  height: 6.2cqh !important;
  max-width: none !important;
  gap: 0 !important;
  padding: 0 3px !important;
  padding: 0 0.37cqh !important;
}

.weazel-tabbar :deep(.weazel-tabbar__pane) {
  width: 100% !important;
  max-width: none !important;
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 0;
}

.weazel-tabbar :deep(.weazel-tabbar__link) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  justify-content: center;
  overflow: hidden;
  padding: 0 !important;
}

.weazel-tabbar :deep(.weazel-tabbar__link > span) {
  min-width: 0;
  gap: 1px;
  gap: 0.12cqh;
  padding: 3px 0 !important;
  padding: 0.37cqh 0 !important;
}

.weazel-tabbar :deep(.weazel-tabbar__link.sky-link) {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

.weazel-tabbar :deep(.sky-tab-button__icon),
.weazel-tabbar :deep(.sky-icon) {
  width: 22px !important;
  width: 2.72cqh !important;
  height: 22px !important;
  height: 2.72cqh !important;
}

.weazel-tabbar :deep(.sky-tab-button__label) {
  width: 100%;
  overflow: hidden;
  font-size: 9.5px;
  font-size: 1.18cqh;
  line-height: 1.15;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-tabbar :deep(.text-primary) {
  color: #d71920 !important;
}

.weazel-detail-cover,
.weazel-detail-masthead {
  width: calc(100% + 30px);
  height: 240px;
  margin: 0 -15px;
  object-fit: cover;
}

.weazel-detail-copy {
  padding: 22px 4px 10px;
}

.weazel-detail-copy h1 {
  margin: 7px 0 16px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 31px;
  line-height: 1.08;
  letter-spacing: -1px;
}

.weazel-byline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 17px;
  border-top: 1px solid var(--weazel-line);
  border-bottom: 1px solid var(--weazel-line);
}

.weazel-byline > span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #d71920;
  color: #fff;
  font-weight: 800;
}

.weazel-byline > div {
  display: flex;
  flex-direction: column;
}

.weazel-byline small {
  margin-top: 2px;
  color: var(--weazel-muted);
  font-size: 10px;
}

.weazel-detail-copy > p {
  margin: 22px 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.68;
  white-space: pre-wrap;
}

.weazel-detail-actions,
.weazel-composer-actions,
.weazel-cover-actions {
  display: flex;
  gap: 10px;
}

.weazel-detail-actions > *,
.weazel-composer-actions > * {
  flex: 1;
}

.weazel-danger {
  color: #ff453a !important;
}

.weazel-composer-cover {
  overflow: hidden;
  margin-bottom: 14px;
  border: 1px solid var(--weazel-line);
  border-radius: 20px;
  background: var(--weazel-surface);
}

.weazel-composer-cover > img,
.weazel-composer-cover > div:first-child {
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.weazel-composer-cover > div:first-child {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--weazel-muted);
}

.weazel-cover-actions {
  padding: 10px;
}

.weazel-cover-actions > * {
  height: 36px !important;
  height: 4.45cqh !important;
  min-width: 0;
  flex: 1 1 0;
  padding-block: 0 !important;
}

.weazel-cover-picker {
  gap: 6px;
  gap: 0.74cqh;
  padding-inline: 10px !important;
  padding-inline: 1.24cqh !important;
  font-size: 12px !important;
  font-size: 1.48cqh !important;
  line-height: 1.15;
}

.weazel-cover-picker :deep(svg) {
  width: 16px;
  width: 1.98cqh;
  height: 16px;
  height: 1.98cqh;
  flex: none;
}

.weazel-cover-picker__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-cover-remove {
  padding-inline: 8px !important;
  padding-inline: 1cqh !important;
  font-size: 12px !important;
  font-size: 1.48cqh !important;
}

.weazel-composer-list {
  margin: 0 !important;
  overflow: visible;
  background: transparent !important;
}

.weazel-composer-list :deep(.weazel-composer-field) {
  margin-block: 13px !important;
  margin-block: 1.61cqh !important;
}

.weazel-composer-list :deep(.weazel-composer-field > .relative) {
  margin-inline: 0 !important;
  padding-inline-start: 0 !important;
  border-radius: 9px !important;
  border-radius: 1.11cqh !important;
}

.weazel-composer-list :deep(.weazel-composer-field > .relative > .w-full) {
  padding-block: 0 !important;
  padding-inline-end: 0 !important;
}

.weazel-composer-list
  :deep(.weazel-composer-field > .relative > .w-full > .relative) {
  margin-top: -7px !important;
  margin-top: -0.87cqh !important;
  margin-bottom: -7px !important;
  margin-bottom: -0.87cqh !important;
}

.weazel-composer-list :deep(.weazel-composer-field .text-xs) {
  margin-top: -11px !important;
  margin-top: -1.36cqh !important;
  font-size: 10px !important;
  font-size: 1.24cqh !important;
  line-height: 1.25;
}

.weazel-composer-list :deep(.weazel-composer-field .text-xs > div) {
  top: -1px !important;
  top: -0.12cqh !important;
  margin: -1px !important;
  margin: -0.12cqh !important;
  padding: 2px 4px !important;
  padding: 0.25cqh 0.5cqh !important;
}

.weazel-composer-list :deep(.weazel-composer-input) {
  height: 44px !important;
  height: 5.45cqh !important;
  padding-inline: 2px !important;
  padding-inline: 0.25cqh !important;
  color: var(--weazel-text);
  font-size: 13px !important;
  font-size: 1.61cqh !important;
  line-height: 1.35;
}

.weazel-composer-list :deep(.weazel-body-input) {
  height: 210px !important;
  height: 26cqh !important;
  min-height: 210px !important;
  min-height: 26cqh !important;
  padding-block: 8px !important;
  padding-block: 1cqh !important;
  resize: none;
}

.weazel-choice-trigger {
  margin-block: 13px;
  margin-block: 1.61cqh;
}

.weazel-composer-list :deep(.weazel-choice-trigger__content) {
  min-height: 44px;
  min-height: 5.45cqh;
  padding-inline: 10px !important;
  padding-inline: 1.24cqh !important;
  border: 1px solid var(--weazel-line);
  border-radius: 9px;
  border-radius: 1.11cqh;
  background: var(--weazel-surface);
}

.weazel-composer-list :deep(.weazel-choice-trigger__inner) {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  gap: 1cqh;
  padding: 0 !important;
}

.weazel-choice-trigger__copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  gap: 0.25cqh;
  text-align: left;
}

.weazel-choice-trigger__copy small {
  color: var(--weazel-muted);
  font-size: 10px;
  font-size: 1.24cqh;
  line-height: 1.15;
}

.weazel-choice-trigger__copy strong {
  overflow: hidden;
  color: var(--weazel-text);
  font-size: 13px;
  font-size: 1.61cqh;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-choice-trigger__icon {
  width: 16px;
  width: 1.98cqh;
  height: 16px;
  height: 1.98cqh;
  flex: none;
  color: var(--weazel-muted);
  transition: transform 0.18s ease;
}

.weazel-choice-trigger__icon.is-open {
  transform: rotate(180deg);
}

.weazel-choice-sheet {
  right: 0 !important;
  left: 0 !important;
  width: 100% !important;
  border-radius: 18px 18px 0 0 !important;
  border-radius: 2.23cqh 2.23cqh 0 0 !important;
  background: var(--weazel-surface) !important;
  color: var(--weazel-text);
}

.weazel-choice-sheet__content {
  max-height: 436px;
  max-height: 54cqh;
  overflow-y: auto;
  padding: 6px 10px 20px;
  padding: 0.74cqh 1.24cqh 2.48cqh;
  border-radius: 18px 18px 0 0;
  border-radius: 2.23cqh 2.23cqh 0 0;
  background: var(--weazel-surface);
  color: var(--weazel-text);
  scrollbar-width: none;
}

.weazel-choice-sheet__content::-webkit-scrollbar {
  display: none;
}

.weazel-choice-sheet__handle {
  width: 34px;
  width: 4.2cqh;
  height: 4px;
  height: 0.5cqh;
  margin: 0 auto 6px;
  margin: 0 auto 0.74cqh;
  border-radius: 999px;
  background: var(--weazel-line);
}

.weazel-choice-sheet__header {
  min-height: 36px;
  min-height: 4.45cqh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  gap: 1cqh;
  padding-inline: 4px;
  padding-inline: 0.5cqh;
}

.weazel-choice-sheet__header h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  font-size: 1.98cqh;
  line-height: 1.15;
}

.weazel-choice-sheet__close {
  width: 30px !important;
  width: 3.71cqh !important;
  height: 30px !important;
  height: 3.71cqh !important;
  min-width: 30px !important;
  min-width: 3.71cqh !important;
  padding: 0 !important;
  border-radius: 999px;
  background: var(--weazel-surface-strong);
  color: var(--weazel-muted);
}

.weazel-choice-sheet__close :deep(svg) {
  width: 15px;
  width: 1.86cqh;
  height: 15px;
  height: 1.86cqh;
}

.weazel-choice-options {
  margin: 5px 0 0 !important;
  margin: 0.62cqh 0 0 !important;
}

.weazel-choice-options :deep(.weazel-choice-option__content) {
  min-height: 40px;
  min-height: 4.95cqh;
  padding-inline: 8px !important;
  padding-inline: 1cqh !important;
  border-radius: 8px;
  border-radius: 1cqh;
}

.weazel-choice-options :deep(.weazel-choice-option__inner) {
  min-width: 0;
  padding: 0 !important;
}

.weazel-choice-options :deep(.weazel-choice-option__title) {
  min-height: 40px !important;
  min-height: 4.95cqh !important;
  font-size: 13px !important;
  font-size: 1.61cqh !important;
  line-height: 1.2;
}

.weazel-choice-options :deep(.weazel-choice-option__title > div:first-child) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weazel-choice-options :deep(.weazel-choice-option__title > div:nth-child(2)) {
  gap: 2px;
  gap: 0.25cqh;
  padding-inline-start: 3px;
  padding-inline-start: 0.37cqh;
}

.weazel-choice-options :deep(.weazel-choice-option__title svg) {
  width: 16px;
  width: 1.98cqh;
  height: 16px;
  height: 1.98cqh;
  color: #d71920;
}

.weazel-composer-actions {
  margin: 16px 0 5px;
}

.weazel-composer-actions > * {
  height: 44px !important;
  height: 5.45cqh !important;
  padding: 0 8px !important;
  padding: 0 1cqh !important;
  font-size: 14px !important;
  font-size: 1.73cqh !important;
  line-height: 1.15;
}
</style>
