<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { reactive } from 'vue'

import {
  SkyBlock,
  SkyBlockTitle,
  SkyButton,
  SkyIcon,
  SkyLink,
  SkyNavbar,
  SkyPanel,
  SkyScrollArea,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'

type PanelId = 'left' | 'leftFloating' | 'right' | 'rightFloating'

const panels = [
  { floating: false, id: 'left', side: 'left', title: 'Left Panel' },
  { floating: false, id: 'right', side: 'right', title: 'Right Panel' },
  { floating: true, id: 'leftFloating', side: 'left', title: 'Left Panel' },
  { floating: true, id: 'rightFloating', side: 'right', title: 'Right Panel' },
] as const
const opened = reactive<Record<PanelId, boolean>>({
  left: false,
  leftFloating: false,
  right: false,
  rightFloating: false,
})

function openPanel(id: PanelId): void {
  opened[id] = true
}

function closePanel(id: PanelId): void {
  opened[id] = false
}
</script>

<template>
  <SkyUiDemoPage title="Panel / Side Panels">
    <SkyBlock class="sky-ui-demo-stack" inset strong>
      <p class="sky-ui-demo-copy">
        Sky UI comes with two panels, one on the left and one on the right. Both
        are optional and can contain lists, forms, custom content, or an
        independent view.
      </p>
    </SkyBlock>

    <SkyBlock class="sky-ui-demo-panel-actions" inset strong>
      <SkyButton block rounded @click="openPanel('left')">Left Panel</SkyButton>
      <SkyButton block rounded @click="openPanel('right')"
        >Right Panel</SkyButton
      >
    </SkyBlock>

    <SkyBlockTitle>Floating Panels</SkyBlockTitle>
    <SkyBlock class="sky-ui-demo-panel-actions" inset strong>
      <SkyButton block rounded @click="openPanel('leftFloating')">
        Left Panel
      </SkyButton>
      <SkyButton block rounded @click="openPanel('rightFloating')">
        Right Panel
      </SkyButton>
    </SkyBlock>

    <template #fixed>
      <SkyPanel
        v-for="panel in panels"
        :key="panel.id"
        :aria-label="panel.title"
        class="sky-ui-demo-panel"
        :floating="panel.floating"
        :opened="opened[panel.id]"
        :side="panel.side"
        @backdropclick="closePanel(panel.id)"
        @escape="closePanel(panel.id)"
      >
        <div class="sky-app-page sky-ui-demo-panel-page">
          <SkyNavbar :title="panel.title">
            <template #right>
              <SkyLink
                :aria-label="`Close ${panel.title.toLowerCase()}`"
                icon-only
                @click="closePanel(panel.id)"
              >
                <SkyIcon :size="24"><X /></SkyIcon>
              </SkyLink>
            </template>
          </SkyNavbar>
          <SkyScrollArea>
            <SkyBlock class="sky-ui-demo-stack">
              <p class="sky-ui-demo-copy">Here comes {{ panel.side }} panel.</p>
              <p v-if="panel.side === 'left'" class="sky-ui-demo-copy">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Suspendisse faucibus mauris leo, eu bibendum neque congue non.
                Ut leo mauris, eleifend eu commodo a, egestas ac urna. Maecenas
                in lacus faucibus, viverra ipsum pulvinar, molestie arcu. Etiam
                lacinia venenatis dignissim. Suspendisse non nisl semper tellus
                malesuada suscipit eu et eros. Nulla eu enim quis quam elementum
                vulputate. Mauris ornare consequat nunc viverra pellentesque.
                Aenean semper eu massa sit amet aliquam. Integer et neque sed
                libero mollis elementum at vitae ligula. Vestibulum pharetra sed
                libero sed porttitor. Suspendisse a faucibus lectus.
              </p>
              <p v-else class="sky-ui-demo-copy">
                Duis ut mauris sollicitudin, venenatis nisi sed, luctus ligula.
                Phasellus blandit nisl ut lorem semper pharetra. Nullam tortor
                nibh, suscipit in consequat vel, feugiat sed quam. Nam risus
                libero, auctor vel tristique ac, malesuada ut ante. Sed
                molestie, est in eleifend sagittis, leo tortor ullamcorper erat,
                at vulputate eros sapien nec libero. Mauris dapibus laoreet nibh
                quis bibendum. Fusce dolor sem, suscipit in iaculis id, pharetra
                at urna. Pellentesque tempor congue massa quis faucibus.
                Vestibulum nunc eros, convallis blandit dui sit amet, gravida
                adipiscing libero.
              </p>
            </SkyBlock>
          </SkyScrollArea>
        </div>
      </SkyPanel>
    </template>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-panel-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sky-space-3);
}

.sky-ui-demo-panel-page {
  min-height: 100%;
}

.sky-ui-demo-panel :deep(.sky-panel__panel) {
  overflow: hidden;
}
</style>
