<script setup lang="ts">
import {
  CalendarDays,
  CircleUserRound,
  CloudUpload,
  Mail,
} from 'lucide-vue-next'
import { ref } from 'vue'

import {
  SkyBadge,
  SkyGlass,
  SkyIcon,
  SkyList,
  SkyListItem,
  SkyTabBar,
  SkyTabButton,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'
import demoIcon from '../assets/demo-icon.png'

const activeTab = ref('inbox')
</script>

<template>
  <SkyUiDemoPage title="Badge" with-tabbar>
    <template #navbarRight>
      <SkyGlass
        aria-label="Profile, 5 notifications"
        class="badge-demo__profile-action"
        component="button"
        type="button"
      >
        <span class="badge-demo__icon-wrap">
          <SkyIcon :size="28"><CircleUserRound /></SkyIcon>
          <SkyBadge class="badge-demo__icon-badge" small tone="danger">
            5
          </SkyBadge>
        </span>
      </SkyGlass>
    </template>

    <SkyList inset strong>
      <SkyListItem title="Foo Bar">
        <template #media>
          <img class="badge-demo__list-icon" :src="demoIcon" alt="" />
        </template>
        <template #after><SkyBadge>0</SkyBadge></template>
      </SkyListItem>
      <SkyListItem title="Ivan Petrov">
        <template #media>
          <img class="badge-demo__list-icon" :src="demoIcon" alt="" />
        </template>
        <template #after><SkyBadge tone="info">CEO</SkyBadge></template>
      </SkyListItem>
      <SkyListItem title="John Doe">
        <template #media>
          <img class="badge-demo__list-icon" :src="demoIcon" alt="" />
        </template>
        <template #after><SkyBadge tone="success">5</SkyBadge></template>
      </SkyListItem>
      <SkyListItem title="Jane Doe">
        <template #media>
          <img class="badge-demo__list-icon" :src="demoIcon" alt="" />
        </template>
        <template #after><SkyBadge tone="warning">NEW</SkyBadge></template>
      </SkyListItem>
    </SkyList>

    <template #fixed>
      <SkyTabBar label="Badge demo tabs">
        <SkyTabButton
          :active="activeTab === 'inbox'"
          label="Inbox"
          @click="activeTab = 'inbox'"
        >
          <template #icon>
            <span class="badge-demo__icon-wrap">
              <Mail />
              <SkyBadge class="badge-demo__icon-badge" small tone="success">
                5
              </SkyBadge>
            </span>
          </template>
        </SkyTabButton>
        <SkyTabButton
          :active="activeTab === 'calendar'"
          label="Calendar"
          @click="activeTab = 'calendar'"
        >
          <template #icon>
            <span class="badge-demo__icon-wrap">
              <CalendarDays />
              <SkyBadge class="badge-demo__icon-badge" small tone="danger">
                7
              </SkyBadge>
            </span>
          </template>
        </SkyTabButton>
        <SkyTabButton
          :active="activeTab === 'upload'"
          label="Upload"
          @click="activeTab = 'upload'"
        >
          <template #icon>
            <span class="badge-demo__icon-wrap">
              <CloudUpload />
              <SkyBadge class="badge-demo__icon-badge" small tone="danger">
                1
              </SkyBadge>
            </span>
          </template>
        </SkyTabButton>
      </SkyTabBar>
    </template>
  </SkyUiDemoPage>
</template>

<style scoped>
.badge-demo__profile-action {
  box-sizing: border-box;
  width: var(--sky-touch-target, 44px);
  height: var(--sky-touch-target, 44px);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: inherit;
}

.badge-demo__profile-action:focus-visible {
  outline: 2px solid var(--sky-app-accent, #007aff);
  outline-offset: 2px;
}

.badge-demo__icon-wrap {
  width: 28px;
  height: 28px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge-demo__icon-wrap > svg {
  width: 100%;
  height: 100%;
}

.badge-demo__icon-badge {
  position: absolute;
  inset-block-start: -2px;
  inset-inline-end: -6px;
  color: #ffffff;
}

.badge-demo__list-icon {
  width: 32px;
  height: 32px;
  display: block;
  border-radius: 50%;
}
</style>
