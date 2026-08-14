<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  SkyApp,
  SkyButton,
  SkyCard,
  SkyEmptyState,
  SkyGlass,
  SkyInfiniteLoader,
  SkyListCard,
  SkyListItem,
  SkyNavbarBackLink,
  SkyPillNavigation,
  SkyProvider,
  SkyScrollRail,
  SkySection,
  SkySegmented,
  SkySegmentedButton,
  SkySettingsGroup,
  SkySettingsIcon,
  SkySettingsRangeRow,
  SkySettingsRow,
  SkyStatusCard,
  SkySurface,
  SkyWidgetFrame,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'
import { useSkyUiDemoContext } from '../context'

const range = ref(45)
const notifications = ref(true)
const selectedChoice = ref<'automatic' | 'manual'>('automatic')
const fullTab = ref(0)
const compactTab = ref(0)
const splitTab = ref(0)
const loaderState = ref<'error' | 'loading' | 'ready'>('loading')
const demo = useSkyUiDemoContext()

const loaderError = computed(() =>
  loaderState.value === 'error' ? 'Could not load the next page.' : false,
)

function retryLoading(): void {
  loaderState.value = 'loading'
}

function requestLoading(): void {
  loaderState.value = 'loading'
}

function resetExamples(): void {
  range.value = 45
  notifications.value = true
  selectedChoice.value = 'automatic'
  fullTab.value = 0
  compactTab.value = 0
  splitTab.value = 0
  loaderState.value = 'loading'
}
</script>

<template>
  <SkyUiDemoPage title="Sky Extensions">
    <SkySection title="Status and empty states">
      <div class="sky-ui-demo-stack">
        <SkyStatusCard
          indicator
          subtitle="Sky-only status primitive"
          title="Ready"
          tone="success"
        />
        <SkyEmptyState
          body="No additional results are available."
          title="Nothing here"
        >
          <template #actions><SkyButton small>Action</SkyButton></template>
        </SkyEmptyState>
        <SkyStatusCard
          v-if="loaderState === 'error'"
          aria-live="polite"
          subtitle="Use Retry to return to the loading state."
          title="Additional results unavailable"
          tone="danger"
        />
        <SkyInfiniteLoader
          :error="loaderError"
          :has-more="loaderState === 'ready'"
          :load-key="loaderState"
          :loading="loaderState === 'loading'"
          loading-label="Loading more results"
          retry-label="Retry loading results"
          @load="requestLoading"
          @retry="retryLoading"
        />
        <div class="sky-ui-demo-row sky-ui-demo-row--center">
          <SkyButton small @click="loaderState = 'loading'">Loading</SkyButton>
          <SkyButton small variant="secondary" @click="loaderState = 'error'">
            Error
          </SkyButton>
          <SkyButton small variant="secondary" @click="loaderState = 'ready'">
            Ready
          </SkyButton>
        </div>
      </div>
    </SkySection>

    <SkySection title="Cards and horizontal rail">
      <SkyListCard inset strong>
        <SkyListItem title="SkyListCard" subtitle="A list surface extension" />
      </SkyListCard>
      <SkyScrollRail label="Card examples">
        <SkyCard
          v-for="index in 4"
          :key="index"
          class="sky-ui-demo-extension-card"
        >
          Card {{ index }}
        </SkyCard>
      </SkyScrollRail>
    </SkySection>

    <SkySection title="Surface and nested theme provider">
      <div class="sky-ui-demo-stack">
        <SkySurface class="sky-ui-demo-extension-surface" highlight>
          SkySurface
        </SkySurface>
        <SkyProvider
          :accent="demo.accent.value"
          :accent-soft="demo.accentSoft.value"
          :dark="demo.dark.value"
          :safe-areas="false"
        >
          <SkyApp
            class="sky-ui-demo-extension-app"
            :accent="demo.accent.value"
            :accent-soft="demo.accentSoft.value"
            :dark="demo.dark.value"
            :safe-areas="false"
          >
            Nested SkyApp follows the demo theme
          </SkyApp>
        </SkyProvider>
      </div>
    </SkySection>

    <SkySection title="Widget sizes">
      <div class="sky-ui-demo-extension-widgets">
        <SkyWidgetFrame
          v-for="size in ['small', 'medium', 'large'] as const"
          :key="size"
          :label="`${size} widget`"
          :size="size"
        >
          <SkySurface class="sky-ui-demo-extension-widget">
            {{ size }}
          </SkySurface>
        </SkyWidgetFrame>
      </div>
    </SkySection>

    <SkySection title="Glass and standalone back link">
      <SkyGlass class="sky-ui-demo-extension-glass" component="button">
        Interactive SkyGlass
      </SkyGlass>
      <SkyNavbarBackLink
        ariaLabel="Standalone back link example"
        show-text
        text="Back"
        @click="demo.returnToCatalog"
      />
    </SkySection>

    <SkySettingsGroup title="Settings extensions">
      <SkySettingsRow kind="navigation" title="Navigation row">
        <template #leading><SkySettingsIcon>S</SkySettingsIcon></template>
      </SkySettingsRow>
      <SkySettingsRow
        v-model="notifications"
        description="Uses the toggle row variant"
        kind="toggle"
        title="Notifications"
      />
      <SkySettingsRow
        kind="choice"
        :selected="selectedChoice === 'automatic'"
        title="Automatic"
        @activate="selectedChoice = 'automatic'"
      />
      <SkySettingsRow
        kind="choice"
        :selected="selectedChoice === 'manual'"
        title="Manual"
        @activate="selectedChoice = 'manual'"
      />
      <SkySettingsRow kind="value" title="Current mode" value="High" />
      <SkySettingsRow
        kind="custom"
        title="Custom row"
        value="Slot-compatible"
      />
      <SkySettingsRow
        kind="action"
        title="Reset examples"
        tone="danger"
        @activate="resetExamples"
      />
      <SkySettingsRangeRow v-model="range" title="Range row" />
    </SkySettingsGroup>

    <SkySection title="Full pill navigation">
      <div class="sky-ui-demo-extension-navigation-stage">
        <SkyPillNavigation label="Full pill navigation" layout="full">
          <SkySegmented
            :active-index="fullTab"
            :item-count="3"
            aria-label="Full navigation tabs"
            navigation
            rounded
            strong
          >
            <SkySegmentedButton
              v-for="(label, index) in ['Apps', 'Games', 'Search']"
              :key="label"
              :active="fullTab === index"
              @click="fullTab = index"
            >
              {{ label }}
            </SkySegmentedButton>
          </SkySegmented>
        </SkyPillNavigation>
      </div>
    </SkySection>

    <SkySection title="Compact pill navigation">
      <div class="sky-ui-demo-extension-navigation-stage">
        <SkyPillNavigation
          align="start"
          label="Compact pill navigation"
          layout="compact"
        >
          <SkySegmented
            :active-index="compactTab"
            :item-count="2"
            aria-label="Compact navigation tabs"
            navigation
            rounded
            strong
          >
            <SkySegmentedButton
              v-for="(label, index) in ['Apps', 'Games']"
              :key="label"
              :active="compactTab === index"
              @click="compactTab = index"
            >
              {{ label }}
            </SkySegmentedButton>
          </SkySegmented>
        </SkyPillNavigation>
      </div>
    </SkySection>

    <SkySection title="Split pill navigation">
      <div class="sky-ui-demo-extension-navigation-stage">
        <SkyPillNavigation label="Split pill navigation" layout="split">
          <SkySegmented
            :active-index="Math.min(splitTab, 1)"
            :item-count="2"
            aria-label="Primary split navigation tabs"
            navigation
            rounded
            :strong="splitTab < 2"
          >
            <SkySegmentedButton
              v-for="(label, index) in ['Apps', 'Games']"
              :key="label"
              :active="splitTab === index"
              @click="splitTab = index"
            >
              {{ label }}
            </SkySegmentedButton>
          </SkySegmented>
          <template #end>
            <SkySegmented
              :active-index="0"
              :item-count="1"
              aria-label="Secondary split navigation tabs"
              navigation
              rounded
              :strong="splitTab === 2"
            >
              <SkySegmentedButton
                :active="splitTab === 2"
                @click="splitTab = 2"
              >
                Search
              </SkySegmentedButton>
            </SkySegmented>
          </template>
        </SkyPillNavigation>
      </div>
    </SkySection>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-extension-card {
  flex: 0 0 140px;
}

.sky-ui-demo-extension-surface,
.sky-ui-demo-extension-app,
.sky-ui-demo-extension-widget,
.sky-ui-demo-extension-glass {
  min-height: 92px;
  display: grid;
  place-items: center;
  padding: var(--sky-space-3);
}

.sky-ui-demo-extension-widgets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sky-space-3);
}

.sky-ui-demo-extension-widgets > :nth-child(1) {
  height: 104px;
}

.sky-ui-demo-extension-widgets > :nth-child(2) {
  height: 128px;
}

.sky-ui-demo-extension-widgets > :nth-child(3) {
  height: 152px;
}

.sky-ui-demo-extension-navigation-stage {
  min-height: 76px;
  position: relative;
}

.sky-ui-demo-extension-navigation-stage :deep(.sky-pill-navigation) {
  position: relative;
  right: auto;
  bottom: auto;
  left: auto;
}

@media (max-width: 360px) {
  .sky-ui-demo-extension-widgets {
    grid-template-columns: 1fr;
  }
}
</style>
