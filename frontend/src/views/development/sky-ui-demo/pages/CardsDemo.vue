<script setup lang="ts">
import { SkyBlockTitle, SkyCard, SkyLink, SkyList, SkyListItem } from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'
</script>

<template>
  <SkyUiDemoPage title="Cards">
    <SkyBlockTitle>Simple Cards</SkyBlockTitle>
    <div class="cards-demo__stack">
      <SkyCard>
        This is a simple card with plain text, but cards can also contain their
        own header, footer, list view, image, or any other element.
      </SkyCard>
      <SkyCard footer="Card footer" header="Card header">
        Card with header and footer. Card headers are used to display card
        titles and footers for additional information or just for custom
        actions.
      </SkyCard>
      <SkyCard>
        Another card. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Suspendisse feugiat sem est, non tincidunt ligula volutpat sit amet.
        Mauris aliquet magna justo.
      </SkyCard>
    </div>

    <SkyBlockTitle>Outline Cards</SkyBlockTitle>
    <div class="cards-demo__stack">
      <SkyCard outline>
        This is a simple card with plain text, but cards can also contain their
        own header, footer, list view, image, or any other element.
      </SkyCard>
      <SkyCard footer="Card footer" header="Card header" outline>
        Card with header and footer. Card headers are used to display card
        titles and footers for additional information or just for custom
        actions.
      </SkyCard>
      <SkyCard outline>
        Another card. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Suspendisse feugiat sem est, non tincidunt ligula volutpat sit amet.
        Mauris aliquet magna justo.
      </SkyCard>
    </div>

    <SkyBlockTitle>Outline With Dividers</SkyBlockTitle>
    <SkyCard
      footer="Card footer"
      footer-divider
      header="Card header"
      header-divider
      outline
    >
      Card with header and footer. Card headers are used to display card titles
      and footers for additional information or just for custom actions.
    </SkyCard>

    <SkyBlockTitle>Raised Cards</SkyBlockTitle>
    <div class="cards-demo__stack">
      <SkyCard raised>
        This is a simple card with plain text, but cards can also contain their
        own header, footer, list view, image, or any other element.
      </SkyCard>
      <SkyCard footer="Card footer" header="Card header" raised>
        Card with header and footer. Card headers are used to display card
        titles and footers for additional information or just for custom
        actions.
      </SkyCard>
      <SkyCard raised>
        Another card. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Suspendisse feugiat sem est, non tincidunt ligula volutpat sit amet.
        Mauris aliquet magna justo.
      </SkyCard>
    </div>

    <SkyBlockTitle>Card With List View</SkyBlockTitle>
    <SkyCard :content-wrap="false">
      <SkyList flush nested>
        <SkyListItem
          v-for="index in 5"
          :key="index"
          link
          :title="`Link ${index}`"
        />
      </SkyList>
    </SkyCard>

    <SkyBlockTitle>Styled Cards</SkyBlockTitle>
    <div class="cards-demo__grid">
      <SkyCard outline>
        <div class="cards-demo__image cards-demo__image--mountains">
          Journey To Mountains
        </div>
        <div class="cards-demo__date">Posted on January 21, 2021</div>
        <p class="cards-demo__copy">
          Quisque eget vestibulum nulla. Quisque quis dui quis ex ultricies
          efficitur vitae non felis. Phasellus quis nibh hendrerit...
        </p>
        <template #footer>
          <div class="cards-demo__actions">
            <SkyLink>Like</SkyLink>
            <SkyLink>Read more</SkyLink>
          </div>
        </template>
      </SkyCard>

      <SkyCard>
        <div class="cards-demo__image cards-demo__image--people">
          Lorem Ipsum
        </div>
        <div class="cards-demo__date">Posted on January 21, 2021</div>
        <p class="cards-demo__copy">
          Quisque eget vestibulum nulla. Quisque quis dui quis ex ultricies
          efficitur vitae non felis. Phasellus quis nibh hendrerit...
        </p>
        <template #footer>
          <div class="cards-demo__actions">
            <SkyLink>Like</SkyLink>
            <SkyLink>Read more</SkyLink>
          </div>
        </template>
      </SkyCard>
    </div>
  </SkyUiDemoPage>
</template>

<style scoped>
.cards-demo__stack {
  display: grid;
  gap: var(--sky-space-4);
}

.cards-demo__grid {
  display: grid;
  gap: var(--sky-space-4);
}

.cards-demo__image {
  height: 192px;
  margin: calc(var(--sky-space-4) * -1) calc(var(--sky-space-4) * -1)
    var(--sky-space-4);
  padding: var(--sky-space-4);
  display: flex;
  align-items: flex-end;
  color: #ffffff;
  background-color: #314864;
  background-position: center;
  background-size: cover;
  font-size: 22px;
  font-weight: 700;
}

.cards-demo__image--mountains {
  background-image:
    linear-gradient(to top, rgba(7, 20, 34, 0.82), rgba(7, 20, 34, 0.06)),
    url('../assets/nature-1000x600-3.jpg');
}

.cards-demo__image--people {
  background-image:
    linear-gradient(to top, rgba(24, 18, 32, 0.82), rgba(24, 18, 32, 0.05)),
    url('../assets/people-1000x600-6.jpg');
}

.cards-demo__date {
  margin-bottom: var(--sky-space-3);
  color: var(--sky-muted);
}

.cards-demo__copy {
  margin: 0;
}

.cards-demo__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sky-space-2);
}

@media (min-width: 640px) {
  .cards-demo__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
