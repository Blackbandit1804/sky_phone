import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { isPhoneAppId } from '@/config/apps'
import PhoneAppWindow from '@/views/PhoneAppWindow.vue'
import SpringboardView from '@/views/SpringboardView.vue'

const developmentRoutes: RouteRecordRaw[] = import.meta.env.DEV
  ? [
      {
        component: () => import('@/views/development/SkyUiKitchenSinkView.vue'),
        name: 'development-sky-ui',
        path: '/development/sky-ui/:demo?',
      },
    ]
  : []

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      component: SpringboardView,
      name: 'home',
      path: '/',
    },
    {
      beforeEnter: (to) =>
        typeof to.params.appId === 'string' && isPhoneAppId(to.params.appId)
          ? true
          : '/',
      component: PhoneAppWindow,
      name: 'app',
      path: '/apps/:appId',
    },
    ...developmentRoutes,
  ],
})
