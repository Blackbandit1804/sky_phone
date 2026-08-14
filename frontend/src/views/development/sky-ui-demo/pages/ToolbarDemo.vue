<script setup lang="ts">
import { ref } from 'vue'

import { SkyBlock, SkyButton, SkyLink, SkyToolbar, SkyToolbarPane } from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'

const isTop = ref(false)
</script>

<template>
  <SkyUiDemoPage title="Toolbar" :with-tabbar="!isTop">
    <SkyToolbar
      v-if="isTop"
      aria-label="Top toolbar example"
      class="sky-ui-demo-toolbar sky-ui-demo-toolbar--top"
      component="nav"
      top
    >
      <SkyToolbarPane>
        <SkyLink>Link 1</SkyLink>
        <SkyLink>Link 2</SkyLink>
      </SkyToolbarPane>
      <SkyToolbarPane><SkyLink>Link 3</SkyLink></SkyToolbarPane>
    </SkyToolbar>

    <SkyBlock class="sky-ui-demo-stack" inset strong>
      <p class="sky-ui-demo-copy">
        Toolbar supports both top and bottom positions. Click the following
        button to change its position.
      </p>
      <SkyButton rounded @click="isTop = !isTop">
        Toggle Toolbar Position
      </SkyButton>
    </SkyBlock>
    <SkyBlock class="sky-ui-demo-stack" inset strong>
      <p class="sky-ui-demo-copy">
        Mauris fermentum neque et luctus venenatis. Vivamus a sem rhoncus,
        ornare tellus eu, euismod mauris. In porta turpis at semper convallis.
        Duis adipiscing leo eu nulla lacinia, quis rhoncus metus condimentum.
        Etiam nec malesuada nibh. Maecenas quis lacinia nisl, vel posuere dolor.
        Vestibulum condimentum, nisl ac vulputate egestas, neque enim dignissim
        elit, rhoncus volutpat magna enim a est.
      </p>
      <p class="sky-ui-demo-copy">
        In hac habitasse platea dictumst. Etiam varius, ante vel ornare
        facilisis, velit massa rutrum dolor, ac porta magna magna lacinia nunc.
        Curabitur cursus laoreet. Aenean vel tempus augue. Pellentesque in
        imperdiet nibh. Mauris rhoncus nulla id sem suscipit volutpat.
      </p>
      <p class="sky-ui-demo-copy">
        Duis et ultricies nibh. Sed facilisis turpis urna, ac imperdiet erat
        venenatis eu. Proin sit amet faucibus tortor, et varius sem. Etiam vitae
        lacinia neque. Aliquam nisi purus, interdum in arcu sed, ultrices rutrum
        arcu.
      </p>
    </SkyBlock>

    <template #fixed>
      <SkyToolbar
        v-if="!isTop"
        aria-label="Bottom toolbar example"
        class="sky-ui-demo-toolbar sky-ui-demo-toolbar--bottom"
        component="nav"
      >
        <SkyToolbarPane>
          <SkyLink>Link 1</SkyLink>
          <SkyLink>Link 2</SkyLink>
        </SkyToolbarPane>
        <SkyToolbarPane><SkyLink>Link 3</SkyLink></SkyToolbarPane>
      </SkyToolbar>
    </template>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-toolbar--top {
  position: sticky;
  top: 0;
}

.sky-ui-demo-toolbar--bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>
