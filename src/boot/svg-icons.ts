// src/boot/svg-icons.ts
import { boot } from 'quasar/wrappers'
import 'virtual:svg-icons-register'
import { Quasar } from 'quasar'

export default boot(() => {
  // @ts-expect-error: iconMapFn es interno
  Quasar.iconMapFn = (iconName: string) => {
    // devuelve svgUse, no icon
    return {
      svgUse: `icon-${iconName}`
    }
  }
})
