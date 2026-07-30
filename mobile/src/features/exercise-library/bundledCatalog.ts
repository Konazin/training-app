import {
  BUNDLED_CATALOG_VERSION,
  BUNDLED_EXERCISES,
} from '@training/training-domain'
import type { BundledCatalog } from '@training/training-local-db'

export const bundledCatalog: BundledCatalog = Object.freeze({
  version: BUNDLED_CATALOG_VERSION,
  exercises: BUNDLED_EXERCISES,
})
