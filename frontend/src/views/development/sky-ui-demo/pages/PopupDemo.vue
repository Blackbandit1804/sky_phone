<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref } from 'vue'

import {
  SkyBlock,
  SkyButton,
  SkyIcon,
  SkyLink,
  SkyNavbar,
  SkyPopup,
  SkyScrollArea,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'

const popupOpened = ref(false)
</script>

<template>
  <SkyUiDemoPage title="Popup">
    <SkyBlock class="sky-ui-demo-stack" inset strong>
      <p class="sky-ui-demo-copy">
        Popup is a modal window with any HTML content that pops up over the
        app's main content. Like the other overlays, it is part of the temporary
        views.
      </p>
      <SkyButton rounded @click="popupOpened = true">Open Popup</SkyButton>
    </SkyBlock>

    <template #fixed>
      <SkyPopup
        aria-label="Popup"
        class="sky-ui-demo-popup"
        :opened="popupOpened"
        @backdropclick="popupOpened = false"
        @escape="popupOpened = false"
      >
        <div class="sky-app-page sky-ui-demo-overlay-page">
          <SkyNavbar title="Popup">
            <template #right>
              <SkyLink
                aria-label="Close popup"
                icon-only
                @click="popupOpened = false"
              >
                <SkyIcon :size="24"><X /></SkyIcon>
              </SkyLink>
            </template>
          </SkyNavbar>
          <SkyScrollArea>
            <SkyBlock class="sky-ui-demo-stack" inset strong>
              <p class="sky-ui-demo-copy">
                Here comes popup. You can put anything here, even an independent
                view with its own navigation. By default a popup also adapts to
                its available device size; on a phone it is fullscreen.
              </p>
              <p class="sky-ui-demo-copy">
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
              <p class="sky-ui-demo-copy">
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
      </SkyPopup>
    </template>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-popup :deep(.sky-popup__panel) {
  overflow: hidden;
}
</style>
