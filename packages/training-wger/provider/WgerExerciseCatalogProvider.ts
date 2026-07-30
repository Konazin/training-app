import type {
  ExternalExerciseCandidate,
  ExternalExerciseCatalogPage,
  ExternalExerciseCatalogProvider,
  ExternalExerciseCatalogQuery,
} from '@training/training-domain'
import { getExerciseProviderDescriptor } from '@training/training-domain'
import { WgerClient } from '../client/WgerClient'
import { mapWgerExercise } from '../mapper/mapWgerExercise'

export class WgerExerciseCatalogProvider implements ExternalExerciseCatalogProvider {
  readonly descriptor = getExerciseProviderDescriptor('WGER')!

  constructor(private readonly client = new WgerClient()) {}

  async search(query: ExternalExerciseCatalogQuery, signal?: AbortSignal): Promise<ExternalExerciseCatalogPage> {
    const [page, metadata] = await Promise.all([
      this.client.search(query, signal),
      this.client.getMetadata(signal),
    ])
    const mapped = page.results
      .map((item) => mapWgerExercise(item, metadata, query.language, query.fallbackLanguage))
      .filter((item): item is ExternalExerciseCandidate => item !== null)
      .filter((item) => !query.onlyWithImage || item.media.some((media) => media.type === 'IMAGE'))
      .filter((item) => !query.onlyWithVideo || item.media.some((media) => media.type === 'VIDEO'))
    return {
      items: mapped,
      page: query.page,
      pageSize: query.pageSize,
      total: page.count,
      hasNext: page.next !== null,
      hasPrevious: page.previous !== null,
      ...(page.next ? { nextCursor: page.next } : {}),
    }
  }

  async findByExternalId(externalId: string, language = 'pt-br', signal?: AbortSignal) {
    const [item, metadata] = await Promise.all([
      this.client.findByExternalId(externalId, language, signal),
      this.client.getMetadata(signal),
    ])
    return item ? mapWgerExercise(item, metadata, language, 'en') : null
  }
}
