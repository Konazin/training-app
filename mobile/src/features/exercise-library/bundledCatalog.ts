import { BUNDLED_EXERCISES } from '@training/training-domain'
import type { BundledCatalog } from '@training/training-local-db'

export const bundledCatalog: BundledCatalog = Object.freeze({
  version: 2,
  exercises: BUNDLED_EXERCISES,
})
