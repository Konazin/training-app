import { mediaPolicyFor, type StarterPackIntent } from './index'

export const WGER_STARTER_PACK_MANIFEST_VERSION = 'wger-starter-pack.v1'

export interface ApprovedWgerExercise {
  intentKey: string
  provider: 'WGER'
  providerExerciseId: number
  originalName: string
  reviewedPtBrName: string
  sourceUrl: string
  primaryMuscles: readonly string[]
  equipment: readonly string[]
  category: string
  mediaRequirement: 'REQUIRED' | 'OPTIONAL'
  imageUrl: string | null
  attribution: string
  license: string
  licenseUrl: string
  reviewStatus: 'APPROVED'
  reviewedAt: string
  manifestVersion: typeof WGER_STARTER_PACK_MANIFEST_VERSION
}

// Snapshot of the real, manually reviewed entries from the last Wger audit.
// The package remains disabled until the 35-item minimum is reached.
export const WGER_STARTER_PACK: readonly ApprovedWgerExercise[] = Object.freeze(([
    ['barbell_bench_press', 73, 'Bench Press', 'Supino reto com barra', ['Chest'], ['Barbell', 'Bench'], 'Chest', 'https://wger.de/media/exercise-images/192/Bench-press-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['incline_dumbbell_press', 537, 'Supino Inclinado com Halteres.', 'Supino inclinado com halteres', ['Chest'], ['Dumbbell', 'Incline bench'], 'Chest', 'https://wger.de/media/exercise-images/16/Incline-press-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['cable_chest_fly', 237, 'Fly With Cable', 'Crucifixo no cabo', ['Chest'], ['Cable machine'], 'Chest', 'https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['dumbbell_shoulder_press', 567, 'Shoulder Press, Dumbbells', 'Desenvolvimento com halteres', ['Shoulders'], ['Dumbbell'], 'Shoulders', 'https://wger.de/media/exercise-images/567/Shoulder-press-dumbbells-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['dumbbell_lateral_raise', 1338, 'Shoulder Raise (Dumbbell)', 'Elevação lateral com halteres', ['Shoulders'], ['Dumbbell'], 'Shoulders', 'https://wger.de/media/exercise-images/1338/Shoulder-raise-dumbbell-1.png', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
    ['barbell_curl', 91, 'Rosca direta com barra reta', 'Rosca direta com barra', ['Biceps'], ['Barbell'], 'Arms', 'https://wger.de/media/exercise-images/74/Bicep-curls-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['hammer_curl', 272, 'Biceps Martelo', 'Rosca martelo', ['Biceps'], ['Dumbbell'], 'Arms', 'https://wger.de/media/exercise-images/272/Hammer-curls-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['cable_triceps_pushdown', 1185, 'Triceps Pushdown', 'Extensão de tríceps na polia', ['Triceps'], ['Cable machine'], 'Arms', 'https://wger.de/media/exercise-images/1185/Triceps-pushdown-1.png', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
    ['close_grip_bench_press', 76, 'Bench Press Narrow Grip', 'Supino fechado', ['Triceps'], ['Barbell', 'Bench'], 'Arms', 'https://wger.de/media/exercise-images/88/Narrow-grip-bench-press-1.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['romanian_deadlift', 1652, 'Dumbbell Romanian Deadlift', 'Levantamento terra romeno com halteres', ['Hamstrings', 'Glutes'], ['Dumbbell'], 'Legs', 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
    ['plank', 458, 'Prancha horizontal', 'Prancha frontal', ['Abs'], ['none (bodyweight exercise)'], 'Abs', 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
    ['bird_dog', 1572, 'Bird Dog', 'Bird dog', ['Abs'], ['none (bodyweight exercise)'], 'Abs', 'https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ].map((row) => {
    const [intentKey, providerExerciseId, originalName, reviewedPtBrName, primaryMuscles, equipment, category, imageUrl, license, licenseUrl] = row as [string, number, string, string, string[], string[], string, string, string, string]
    return {
    intentKey, provider: 'WGER' as const, providerExerciseId, originalName, reviewedPtBrName,
    sourceUrl: `https://wger.de/en/exercise/${providerExerciseId}/view`, primaryMuscles, equipment, category,
    mediaRequirement: 'REQUIRED' as const, imageUrl, attribution: 'Wger', license, licenseUrl,
    reviewStatus: 'APPROVED' as const, reviewedAt: '2026-07-31', manifestVersion: WGER_STARTER_PACK_MANIFEST_VERSION as typeof WGER_STARTER_PACK_MANIFEST_VERSION,
    }
  })
))

export function validateWgerStarterPackManifest(manifest: readonly ApprovedWgerExercise[] = WGER_STARTER_PACK) {
  const ids = new Set<number>()
  for (const item of manifest) {
    if (ids.has(item.providerExerciseId) || item.reviewStatus !== 'APPROVED' || item.manifestVersion !== WGER_STARTER_PACK_MANIFEST_VERSION
      || !item.sourceUrl.startsWith('https://') || !item.license || !item.licenseUrl.startsWith('https://')
      || (item.mediaRequirement === 'REQUIRED' && !item.imageUrl?.startsWith('https://'))) {
      throw new Error(`Manifesto Wger inválido: ${item.intentKey}`)
    }
    ids.add(item.providerExerciseId)
  }
  return manifest
}
