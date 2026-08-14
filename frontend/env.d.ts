/// <reference types="vite/client" />

declare module 'framework7-icons/vue/vue/*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent
  export default component
}

interface Window {
  GetParentResourceName?: () => string
}
