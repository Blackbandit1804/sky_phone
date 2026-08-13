<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { usePhoneStore } from '@/stores/phone'
import {
  SkyActionButton,
  SkyActionGroup,
  SkyActionSheet,
  SkyActionsLabel,
  SkyApp,
  SkyAppPage,
  SkyBadge,
  SkyBlock,
  SkyBlockFooter,
  SkyBlockHeader,
  SkyBlockTitle,
  SkyBreadcrumbs,
  SkyBreadcrumbsCollapsed,
  SkyBreadcrumbsItem,
  SkyBreadcrumbsSeparator,
  SkyButton,
  SkyCard,
  SkyCheckbox,
  SkyChip,
  SkyDialog,
  SkyDialogButton,
  SkyEmptyState,
  SkyFab,
  SkyField,
  SkyGlass,
  SkyIcon,
  SkyInfiniteLoader,
  SkyLink,
  SkyList,
  SkyListButton,
  SkyListCard,
  SkyListGroup,
  SkyListItem,
  SkyMenuList,
  SkyMenuListItem,
  SkyMessage,
  SkyMessagebar,
  SkyMessages,
  SkyMessagesTitle,
  SkyNavbar,
  SkyNavbarBackLink,
  SkyNotification,
  SkyPanel,
  SkyPillNavigation,
  SkyPopover,
  SkyPopup,
  SkyProgress,
  SkyProvider,
  SkyRadio,
  SkyRange,
  SkyScrollArea,
  SkyScrollRail,
  SkySearchbar,
  SkySection,
  SkySegmented,
  SkySegmentedButton,
  SkySettingsGroup,
  SkySettingsIcon,
  SkySettingsRangeRow,
  SkySettingsRow,
  SkySheet,
  SkySpinner,
  SkyStatusCard,
  SkyStepper,
  SkySurface,
  SkyTabBar,
  SkyTabButton,
  SkyTable,
  SkyTableBody,
  SkyTableCell,
  SkyTableHead,
  SkyTableRow,
  SkyToast,
  SkyToggle,
  SkyToolbar,
  SkyToolbarPane,
  SkyWidgetFrame,
} from '@/ui'

const phone = usePhoneStore()
const router = useRouter()

const checked = ref(true)
const fieldValue = ref('Sky UI')
const messageValue = ref('')
const radioValue = ref('first')
const rangeValue = ref(58)
const searchValue = ref('')
const segmentIndex = ref(0)
const stepperValue = ref(2)
const toggleValue = ref(true)

const actionSheetOpened = ref(false)
const dialogOpened = ref(false)
const notificationOpened = ref(false)
const panelOpened = ref(false)
const popoverOpened = ref(false)
const popupOpened = ref(false)
const sheetOpened = ref(false)
const toastOpened = ref(false)
</script>

<template>
  <SkyAppPage
    class="sky-ui-kitchen-sink"
    :label="phone.t('Apps.settings.skyUiKitchenSink')"
  >
    <SkyNavbar
      :back-label="phone.t('Apps.settings.back')"
      show-back
      :title="phone.t('Apps.settings.skyUiKitchenSink')"
      @back="router.back()"
    />

    <SkyScrollArea class="sky-ui-kitchen-sink__scroll">
      <SkyBlockHeader component="header" inset>
        {{ phone.t('Apps.settings.skyUiKitchenSinkDescription') }}
      </SkyBlockHeader>

      <SkySection title="SkyApp / SkyProvider / SkySurface / SkyGlass">
        <div class="sky-ui-kitchen-sink__grid">
          <SkyApp class="sky-ui-kitchen-sink__mini-app" :safe-areas="false">
            <SkyProvider :safe-areas="false">
              <SkySurface highlight>
                <SkyGlass component="button" type="button"> SkyGlass </SkyGlass>
              </SkySurface>
            </SkyProvider>
          </SkyApp>
          <SkyWidgetFrame label="SkyWidgetFrame" size="small">
            <SkyIcon label="SkyIcon" :size="28">S</SkyIcon>
          </SkyWidgetFrame>
        </div>
      </SkySection>

      <SkySection title="SkyBlock / SkyCard / SkyStatusCard">
        <SkyBlockTitle medium>SkyBlockTitle</SkyBlockTitle>
        <SkyBlock inset outline strong>
          <SkyBlockHeader>SkyBlockHeader</SkyBlockHeader>
          SkyBlock
          <SkyBlockFooter>SkyBlockFooter</SkyBlockFooter>
        </SkyBlock>
        <div class="sky-ui-kitchen-sink__grid">
          <SkyCard header="SkyCard" footer="Footer" header-divider outline>
            Content
          </SkyCard>
          <SkyStatusCard
            indicator
            subtitle="SkyStatusCard"
            title="Ready"
            tone="success"
          />
        </div>
      </SkySection>

      <SkySection title="SkyButton / SkyLink / SkyChip / SkyBadge / SkyFab">
        <div class="sky-ui-kitchen-sink__row">
          <SkyButton>SkyButton</SkyButton>
          <SkyButton outline variant="secondary">Outline</SkyButton>
          <SkyLink>SkyLink</SkyLink>
          <SkyChip delete-button delete-label="Remove SkyChip">
            SkyChip
          </SkyChip>
          <SkyBadge tone="danger">3</SkyBadge>
          <SkyFab text="SkyFab">+</SkyFab>
        </div>
      </SkySection>

      <SkySection title="SkyField / SkySearchbar / selection controls">
        <SkyList inset strong>
          <SkyField
            v-model="fieldValue"
            clear-button
            clear-label="Clear field"
            label="SkyField"
          />
        </SkyList>
        <SkySearchbar
          v-model="searchValue"
          cancel-button
          cancel-label="Cancel"
          clear-label="Clear search"
          label="SkySearchbar"
          placeholder="SkySearchbar"
        />
        <div class="sky-ui-kitchen-sink__row">
          <SkyCheckbox v-model="checked">SkyCheckbox</SkyCheckbox>
          <SkyRadio v-model="radioValue" value="first">SkyRadio</SkyRadio>
          <SkyToggle v-model="toggleValue">SkyToggle</SkyToggle>
        </div>
        <SkyRange
          v-model="rangeValue"
          aria-label="SkyRange"
          caption="SkyRange"
        />
        <SkyStepper
          v-model="stepperValue"
          decrement-label="Decrease"
          increment-label="Increase"
          input
          input-label="SkyStepper value"
        />
      </SkySection>

      <SkySection title="SkyList / SkyMenuList">
        <SkyListCard>
          <SkyListItem title="SkyListItem" subtitle="Subtitle" after="After" />
          <SkyListGroup inset strong>
            <SkyListItem title="SkyListGroup" />
          </SkyListGroup>
          <SkyListButton value="SkyListButton" />
        </SkyListCard>
        <SkyMenuList aria-label="SkyMenuList" inset strong>
          <SkyMenuListItem active title="SkyMenuListItem" footer="Active" />
          <SkyMenuListItem title="Second item" />
        </SkyMenuList>
      </SkySection>

      <SkySection title="SkyBreadcrumbs / SkyNavbarBackLink / SkyToolbar">
        <SkyBreadcrumbs aria-label="SkyBreadcrumbs">
          <SkyBreadcrumbsItem component="button">First</SkyBreadcrumbsItem>
          <SkyBreadcrumbsSeparator />
          <SkyBreadcrumbsCollapsed ariaLabel="Collapsed breadcrumbs" />
          <SkyBreadcrumbsSeparator />
          <SkyBreadcrumbsItem active>Current</SkyBreadcrumbsItem>
        </SkyBreadcrumbs>
        <SkyToolbar aria-label="SkyToolbar" outline>
          <SkyToolbarPane>
            <SkyNavbarBackLink
              ariaLabel="Back"
              show-text
              text="SkyNavbarBackLink"
            />
            <SkyButton small>Action</SkyButton>
          </SkyToolbarPane>
        </SkyToolbar>
      </SkySection>

      <SkySection title="SkySegmented / SkyPillNavigation / SkyTabBar">
        <SkySegmented
          :active-index="segmentIndex"
          aria-label="SkySegmented"
          :item-count="2"
          navigation
        >
          <SkySegmentedButton
            :active="segmentIndex === 0"
            tab
            @click="segmentIndex = 0"
          >
            First
          </SkySegmentedButton>
          <SkySegmentedButton
            :active="segmentIndex === 1"
            tab
            @click="segmentIndex = 1"
          >
            Second
          </SkySegmentedButton>
        </SkySegmented>
        <div class="sky-ui-kitchen-sink__inline-navigation">
          <SkyPillNavigation label="SkyPillNavigation">
            <SkyButton small>Apps</SkyButton>
            <SkyButton small variant="secondary">Games</SkyButton>
          </SkyPillNavigation>
          <SkyTabBar label="SkyTabBar">
            <SkyTabButton active label="First" />
            <SkyTabButton label="Second" />
          </SkyTabBar>
        </div>
      </SkySection>

      <SkySection title="SkyScrollRail / loading and feedback">
        <SkyScrollRail label="SkyScrollRail">
          <SkyCard
            v-for="index in 4"
            :key="index"
            class="sky-ui-kitchen-sink__rail-card"
          >
            SkyCard {{ index }}
          </SkyCard>
        </SkyScrollRail>
        <div class="sky-ui-kitchen-sink__stack">
          <SkyProgress label="SkyProgress" :progress="0.68" />
          <SkySpinner label="SkySpinner" />
          <SkyInfiniteLoader
            :has-more="false"
            loading
            loading-label="SkyInfiniteLoader"
            retry-label="Retry"
          />
          <SkyEmptyState body="SkyEmptyState body" title="SkyEmptyState">
            <template #actions><SkyButton small>Action</SkyButton></template>
          </SkyEmptyState>
        </div>
      </SkySection>

      <SkySection title="SkyTable">
        <SkyTable aria-label="SkyTable" compact striped>
          <SkyTableHead>
            <SkyTableRow header>
              <SkyTableCell header scope="col">Component</SkyTableCell>
              <SkyTableCell header numeric scope="col">Count</SkyTableCell>
            </SkyTableRow>
          </SkyTableHead>
          <SkyTableBody>
            <SkyTableRow selected>
              <SkyTableCell>SkyTableRow</SkyTableCell>
              <SkyTableCell numeric>1</SkyTableCell>
            </SkyTableRow>
          </SkyTableBody>
        </SkyTable>
      </SkySection>

      <SkySection title="SkyMessages / SkyMessagebar">
        <SkyMessages>
          <SkyMessagesTitle>SkyMessagesTitle</SkyMessagesTitle>
          <SkyMessage text="SkyMessage received" type="received" />
          <SkyMessage text="SkyMessage sent" type="sent" />
        </SkyMessages>
        <SkyMessagebar
          v-model="messageValue"
          aria-label="SkyMessagebar"
          placeholder="SkyMessagebar"
        />
      </SkySection>

      <SkySection title="SkySettingsGroup / SkySettingsRow">
        <SkySettingsGroup title="SkySettingsGroup">
          <SkySettingsRow kind="navigation" title="SkySettingsRow">
            <template #leading>
              <SkySettingsIcon color="#5856d6">S</SkySettingsIcon>
            </template>
          </SkySettingsRow>
          <SkySettingsRangeRow
            v-model="rangeValue"
            title="SkySettingsRangeRow"
          />
        </SkySettingsGroup>
      </SkySection>

      <SkySection title="Overlays">
        <div class="sky-ui-kitchen-sink__row">
          <SkyButton @click="actionSheetOpened = true"
            >SkyActionSheet</SkyButton
          >
          <SkyButton @click="dialogOpened = true">SkyDialog</SkyButton>
          <SkyButton @click="notificationOpened = true"
            >SkyNotification</SkyButton
          >
          <SkyButton @click="panelOpened = true">SkyPanel</SkyButton>
          <SkyButton id="sky-ui-popover-anchor" @click="popoverOpened = true">
            SkyPopover
          </SkyButton>
          <SkyButton @click="popupOpened = true">SkyPopup</SkyButton>
          <SkyButton @click="sheetOpened = true">SkySheet</SkyButton>
          <SkyButton @click="toastOpened = true">SkyToast</SkyButton>
        </div>
      </SkySection>
    </SkyScrollArea>

    <SkyActionSheet
      aria-label="SkyActionSheet"
      :opened="actionSheetOpened"
      @backdropclick="actionSheetOpened = false"
      @escape="actionSheetOpened = false"
    >
      <SkyActionGroup>
        <SkyActionsLabel>SkyActionsLabel</SkyActionsLabel>
        <SkyActionButton>SkyActionButton</SkyActionButton>
      </SkyActionGroup>
      <SkyActionGroup>
        <SkyActionButton bold @click="actionSheetOpened = false">
          Close
        </SkyActionButton>
      </SkyActionGroup>
    </SkyActionSheet>

    <SkyDialog
      :opened="dialogOpened"
      title="SkyDialog"
      @backdropclick="dialogOpened = false"
      @escape="dialogOpened = false"
    >
      <p>SkyDialog content</p>
      <template #buttons>
        <SkyDialogButton strong @click="dialogOpened = false">
          Close
        </SkyDialogButton>
      </template>
    </SkyDialog>

    <SkyNotification
      button="Close"
      close-label="Close notification"
      :opened="notificationOpened"
      text="SkyNotification text"
      title="SkyNotification"
      @close="notificationOpened = false"
    />

    <SkyPanel
      aria-label="SkyPanel"
      :opened="panelOpened"
      @backdropclick="panelOpened = false"
      @escape="panelOpened = false"
    >
      <SkyBlock
        ><SkyButton @click="panelOpened = false">Close</SkyButton></SkyBlock
      >
    </SkyPanel>

    <SkyPopover
      aria-label="SkyPopover"
      :opened="popoverOpened"
      target="#sky-ui-popover-anchor"
      @backdropclick="popoverOpened = false"
      @escape="popoverOpened = false"
    >
      <SkyBlock
        ><SkyButton @click="popoverOpened = false">Close</SkyButton></SkyBlock
      >
    </SkyPopover>

    <SkyPopup
      aria-label="SkyPopup"
      :opened="popupOpened"
      @backdropclick="popupOpened = false"
      @escape="popupOpened = false"
    >
      <SkyBlock
        ><SkyButton @click="popupOpened = false">Close</SkyButton></SkyBlock
      >
    </SkyPopup>

    <SkySheet
      aria-label="SkySheet"
      :opened="sheetOpened"
      @backdropclick="sheetOpened = false"
      @escape="sheetOpened = false"
    >
      <SkyBlock
        ><SkyButton @click="sheetOpened = false">Close</SkyButton></SkyBlock
      >
    </SkySheet>

    <SkyToast :opened="toastOpened">
      SkyToast
      <template #button>
        <SkyButton small @click="toastOpened = false">Close</SkyButton>
      </template>
    </SkyToast>
  </SkyAppPage>
</template>

<style scoped>
.sky-ui-kitchen-sink__scroll {
  display: grid;
  gap: var(--sky-space-5);
  padding: var(--sky-space-4) var(--sky-page-gutter)
    calc(var(--sky-space-6) + var(--sky-safe-area-bottom));
}

.sky-ui-kitchen-sink__grid {
  display: grid;
  gap: var(--sky-space-3);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sky-ui-kitchen-sink__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sky-space-2);
}

.sky-ui-kitchen-sink__stack {
  display: grid;
  gap: var(--sky-space-3);
}

.sky-ui-kitchen-sink__mini-app {
  border-radius: var(--sky-radius-card);
  min-height: 96px;
  overflow: hidden;
  padding: var(--sky-space-3);
}

.sky-ui-kitchen-sink__mini-app :deep(.sky-surface) {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  min-height: 72px;
}

.sky-ui-kitchen-sink__rail-card {
  flex: 0 0 140px;
}

.sky-ui-kitchen-sink__inline-navigation {
  display: grid;
  gap: var(--sky-space-3);
  margin-top: var(--sky-space-3);
}

.sky-ui-kitchen-sink__inline-navigation :deep(.sky-pill-navigation),
.sky-ui-kitchen-sink__inline-navigation :deep(.sky-tabbar) {
  position: relative;
}

@media (max-width: 420px) {
  .sky-ui-kitchen-sink__grid {
    grid-template-columns: 1fr;
  }
}
</style>
