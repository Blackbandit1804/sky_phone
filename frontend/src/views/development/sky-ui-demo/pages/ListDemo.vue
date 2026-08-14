<script setup lang="ts">
import { UserRound } from 'lucide-vue-next'

import {
  SkyBadge,
  SkyBlock,
  SkyBlockTitle,
  SkyIcon,
  SkyList,
  SkyListGroup,
  SkyListItem,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'
import albumOne from '../assets/people-160x160-1.jpg'
import albumTwo from '../assets/people-160x160-2.jpg'
import albumThree from '../assets/people-160x160-3.jpg'

const people = ['Ivan Petrov', 'John Doe', 'Jenna Smith']
const alphabetGroups = [
  { letter: 'A', names: ['Aaron', 'Abbie', 'Adam'] },
  { letter: 'B', names: ['Bailey', 'Barclay', 'Bartolo'] },
  { letter: 'C', names: ['Caiden', 'Calvin', 'Candy'] },
]
const songs = [
  {
    artist: 'Beatles',
    image: albumOne,
    price: '$15',
    title: 'Yellow Submarine',
  },
  {
    artist: 'Queen',
    image: albumTwo,
    price: '$22',
    title: "Don't Stop Me Now",
  },
  {
    artist: 'Michael Jackson',
    image: albumThree,
    price: '$16',
    title: 'Billie Jean',
  },
]
const mediaText =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sagittis tellus ut turpis condimentum, ut dignissim lacus tincidunt. Cras dolor metus, ultrices condimentum sodales sit amet, pharetra sodales eros. Phasellus vel felis tellus. Mauris rutrum ligula nec dapibus feugiat. In vel dui laoreet, commodo augue id, pulvinar lacus.'
const mailItems = [
  {
    after: '17:14',
    subtitle: 'New messages from John Doe',
    title: 'Facebook',
  },
  {
    after: '17:11',
    subtitle: 'John Doe (@_johndoe) mentioned you on Twitter!',
    title: 'John Doe (via Twitter)',
  },
  {
    after: '16:48',
    subtitle: 'New messages from John Doe',
    title: 'Facebook',
  },
  {
    after: '15:32',
    subtitle: 'John Doe (@_johndoe) mentioned you on Twitter!',
    title: 'John Doe (via Twitter)',
  },
]
</script>

<template>
  <SkyUiDemoPage title="List">
    <SkyBlockTitle>Simple List</SkyBlockTitle>
    <SkyList dividers>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Strong List</SkyBlockTitle>
    <SkyList dividers strong>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Strong Outline List</SkyBlockTitle>
    <SkyList dividers outline strong>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Strong Inset List</SkyBlockTitle>
    <SkyList dividers inset strong>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Strong Outline Inset List</SkyBlockTitle>
    <SkyList dividers inset outline strong>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Strong List with Dividers</SkyBlockTitle>
    <SkyList dividers strong>
      <SkyListItem v-for="index in 3" :key="index" :title="`Item ${index}`" />
    </SkyList>

    <SkyBlockTitle>Simple Links List</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem
        v-for="index in 3"
        :key="index"
        link
        :title="`Link ${index}`"
      />
    </SkyList>

    <SkyBlockTitle>Data list, with icons</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem
        v-for="(person, index) in people"
        :key="person"
        :after="index === 0 ? 'CEO' : undefined"
        :title="person"
      >
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
        <template v-if="index === 1" #after
          ><SkyBadge tone="info">5</SkyBadge></template
        >
      </SkyListItem>
    </SkyList>

    <SkyBlockTitle>Links</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem
        v-for="(person, index) in people"
        :key="person"
        :after="index === 0 ? 'CEO' : index === 1 ? 'Cleaner' : undefined"
        link
        :title="person"
      >
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
      </SkyListItem>
    </SkyList>

    <SkyBlockTitle>Links, Header, Footer</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem after="Edit" header="Name" link title="John Doe">
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
      </SkyListItem>
      <SkyListItem after="Edit" header="Phone" link title="+7 90 111-22-3344">
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
      </SkyListItem>
      <SkyListItem
        after="Edit"
        footer="Home"
        header="Email"
        link
        title="john@doe"
      >
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
      </SkyListItem>
      <SkyListItem
        after="Edit"
        footer="Work"
        header="Email"
        link
        title="john@konsta"
      >
        <template #media>
          <span class="sky-ui-demo-list__person-icon">
            <SkyIcon :size="22"><UserRound /></SkyIcon>
          </span>
        </template>
      </SkyListItem>
    </SkyList>

    <SkyBlockTitle>Links, no icons</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem link title="Ivan Petrov" />
      <SkyListItem link title="John Doe" />
      <SkyListItem group-title title="Group title Here" />
      <SkyListItem link title="Ivan Petrov" />
      <SkyListItem link title="Jenna Smith" />
    </SkyList>

    <SkyBlockTitle>Grouped with sticky titles</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListGroup v-for="group in alphabetGroups" :key="group.letter">
        <SkyListItem
          class="sky-ui-demo-list__sticky-title"
          group-title
          :title="group.letter"
        />
        <SkyListItem v-for="name in group.names" :key="name" :title="name" />
      </SkyListGroup>
    </SkyList>

    <SkyBlockTitle large>Media Lists</SkyBlockTitle>
    <SkyBlock>
      <p class="sky-ui-demo-copy">
        Media Lists are almost the same as Data Lists, but with a more flexible
        layout for visualization of more complex data, like products, services,
        users, and more.
      </p>
    </SkyBlock>

    <SkyBlockTitle>Songs</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem
        v-for="song in songs"
        :key="song.title"
        :after="song.price"
        :chevron="false"
        link
        :subtitle="song.artist"
        :text="mediaText"
        :title="song.title"
      >
        <template #media>
          <img class="sky-ui-demo-list__album" :src="song.image" alt="" />
        </template>
      </SkyListItem>
    </SkyList>

    <SkyBlockTitle>Mail App</SkyBlockTitle>
    <SkyList outline strong>
      <SkyListItem
        v-for="mail in mailItems"
        :key="`${mail.title}-${mail.after}`"
        :after="mail.after"
        :chevron="false"
        link
        :subtitle="mail.subtitle"
        :text="mediaText"
        :title="mail.title"
      />
    </SkyList>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-list__person-icon,
.sky-ui-demo-list__album {
  display: inline-grid;
  place-items: center;
  flex: none;
  background: var(--sky-app-accent-soft);
  color: var(--sky-app-accent);
}

.sky-ui-demo-list__person-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.sky-ui-demo-list__album {
  width: 80px;
  height: 80px;
  border-radius: 10px;
}

.sky-ui-demo-list__sticky-title {
  position: sticky;
  z-index: 2;
  top: 0;
}
</style>
