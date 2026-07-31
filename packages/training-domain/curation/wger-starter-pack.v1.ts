export const WGER_STARTER_PACK_MANIFEST_VERSION = 'wger-starter-pack.v1'

export interface ApprovedWgerExercise {
  intentKey: string
  effectiveMovementKey: string
  provider: 'WGER'
  providerExerciseId: number
  originalName: string
  reviewedPtBrName: string
  expectedPrimaryMuscles: readonly string[]
  expectedEquipment: readonly string[]
  expectedCategory: string
  mediaRequirement: 'REQUIRED' | 'OPTIONAL'
  imageUrl: string | null
  attribution: string
  license: string
  licenseUrl: string
  sourceUrl: string
  reviewStatus: 'APPROVED'
  reviewedAt: string
  manifestVersion: typeof WGER_STARTER_PACK_MANIFEST_VERSION
}

type ReviewedRow = readonly [
  string, string, number, string, string, readonly string[], readonly string[], string,
  'REQUIRED' | 'OPTIONAL', string | null, string, string, string,
]

// Dados de identidade revisados a partir do catálogo Wger consultado em 2026-07-30.
// Descrição, instruções e demais dados de conteúdo continuam sendo obtidos do Wger no import.
const REVIEWED_ROWS: readonly ReviewedRow[] = Object.freeze([
  ['bench_press', 'bench_press', 73, 'Bench Press', 'Supino reto com barra', ['Chest'], ['Barbell', 'Bench'], 'Chest', 'REQUIRED', 'https://wger.de/media/exercise-images/192/Bench-press-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['cable_chest_fly', 'cable_chest_fly', 237, 'Fly With Cable', 'Crucifixo no cabo', ['Chest'], ['Cable machine'], 'Chest', 'REQUIRED', 'https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['incline_barbell_press', 'incline_barbell_press', 538, 'Incline Bench Press - Barbell', 'Supino inclinado com barra', ['Chest'], ['Barbell', 'Incline bench'], 'Chest', 'REQUIRED', 'https://wger.de/media/exercise-images/41/Incline-bench-press-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['push_up', 'push_up', 1551, 'Push-Up', 'Flexão de braços', ['Chest'], ['none (bodyweight exercise)'], 'Chest', 'REQUIRED', 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png', 'Settebello', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['dumbbell_chest_fly', 'dumbbell_chest_fly', 238, 'Fly With Dumbbells', 'Crucifixo com halteres', ['Chest'], ['Dumbbell'], 'Chest', 'REQUIRED', 'https://wger.de/media/exercise-images/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png', 'cshep442', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['pull_up', 'pull_up', 475, 'Pull-ups', 'Barra fixa', ['Lats'], ['Pull-up bar'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg', 'Imobard', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['barbell_row', 'barbell_row', 83, 'Bent Over Rowing', 'Remada curvada com barra', ['Lats'], ['Barbell'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['dumbbell_row', 'dumbbell_row', 81, 'Bent Over Dumbbell Rows', 'Remada curvada com halteres', ['Lats'], ['Bench', 'Dumbbell'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/81/a751a438-ae2d-4751-8d61-cef0e9292174.png', 'Franpol', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['seated_cable_row', 'seated_cable_row', 1117, 'Seated Cable Row', 'Remada sentada no cabo', ['Lats'], ['Cable machine'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png', 'Franpol', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['incline_reverse_fly', 'incline_reverse_fly', 828, 'Incline Bench Reverse Fly', 'Crucifixo inverso inclinado', ['Shoulders', 'Trapezius'], ['Dumbbell', 'Incline bench'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/828/2e959dab-f39b-4c7c-9063-eb43064ab5eb.png', 'cshep442', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['trx_row', 'trx_row', 959, 'TRX Rows', 'Remada no TRX', ['Shoulders', 'Biceps', 'Lats'], ['none (bodyweight exercise)'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/959/53a5e008-bc31-4ee0-9463-69a858c2ec18.png', 'clafal', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['high_pulley_pullover', 'high_pulley_pullover', 1137, 'High-pulley pullover', 'Pullover na polia alta', ['Lats', 'Serratus anterior'], ['Cable machine'], 'Back', 'REQUIRED', 'https://wger.de/media/exercise-images/1137/42f22229-c0a0-4bfc-aca6-66fe5e1ab10d.PNG', 'Franpol', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['dumbbell_shoulder_press', 'dumbbell_shoulder_press', 567, 'Shoulder Press, Dumbbells', 'Desenvolvimento com halteres', ['Shoulders'], ['Dumbbell'], 'Shoulders', 'REQUIRED', 'https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['dumbbell_lateral_raise', 'dumbbell_lateral_raise', 1338, 'Shoulder Raise (Dumbbell)', 'Elevação lateral com halteres', ['Shoulders'], ['Dumbbell'], 'Shoulders', 'REQUIRED', 'https://wger.de/media/exercise-images/1338/9d157b4d-5af0-43c1-bd34-f52144ba1b54.webp', 'Anastasious', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['front_raise', 'front_raise', 256, 'Front Raises', 'Elevação frontal', ['Shoulders'], ['Barbell', 'Dumbbell'], 'Shoulders', 'REQUIRED', 'https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png', 'philip', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['barbell_shoulder_press', 'barbell_shoulder_press', 566, 'Shoulder Press, Barbell', 'Desenvolvimento com barra', ['Shoulders'], ['Barbell'], 'Shoulders', 'REQUIRED', 'https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['cable_rear_delt_fly', 'cable_rear_delt_fly', 822, 'Cable Rear Delt Fly', 'Crucifixo inverso no cabo', ['Shoulders', 'Trapezius'], ['Cable machine'], 'Shoulders', 'REQUIRED', 'https://wger.de/media/exercise-images/822/74affc0d-03b6-4f33-b5f4-a822a2615f68.png', 'cshep442', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['barbell_curl', 'barbell_curl', 91, 'Biceps Curls With Barbell', 'Rosca direta com barra', ['Biceps'], ['Barbell'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/74/Bicep-curls-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['hammer_curl', 'hammer_curl', 272, 'Hammer Curls', 'Rosca martelo', ['Biceps'], ['Dumbbell'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/86/Bicep-hammer-curl-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['cable_triceps_pushdown', 'cable_triceps_pushdown', 1185, 'Triceps Pushdown', 'Extensão de tríceps na polia', ['Triceps'], ['Cable machine'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg', 'anto.kreegyr', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['close_grip_bench_press', 'close_grip_bench_press', 76, 'Bench Press Narrow Grip', 'Supino fechado', ['Triceps'], ['Barbell', 'Bench'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/88/Narrow-grip-bench-press-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['dumbbell_curl', 'dumbbell_curl', 92, 'Biceps Curls With Dumbbell', 'Rosca com halteres', ['Biceps'], ['Dumbbell'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/81/Biceps-curl-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['skullcrusher', 'skullcrusher', 246, 'Skullcrusher SZ-bar', 'Tríceps testa com barra EZ', ['Triceps'], ['Bench', 'SZ-Bar'], 'Arms', 'REQUIRED', 'https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['romanian_deadlift', 'romanian_deadlift', 1652, 'Dumbbell Romanian Deadlift', 'Levantamento terra romeno com halteres', ['Hamstrings', 'Glutes'], ['Dumbbell'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp', 'AlucardEvil40', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['bodyweight_lunge', 'bodyweight_lunge', 984, 'Lunges', 'Avanço', ['Glutes', 'Quads'], ['none (bodyweight exercise)'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png', 'Franpol', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['goblet_squat', 'goblet_squat', 203, 'Dumbbell Goblet Squat', 'Agachamento goblet com halter', ['Quads'], ['Dumbbell'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg', 'philip', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['front_squat', 'front_squat', 257, 'Front Squats', 'Agachamento frontal', ['Glutes'], ['Barbell'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/191/Front-squat-1-857x1024.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['leg_curl', 'leg_curl', 365, 'Leg Curls (laying)', 'Mesa flexora', ['Hamstrings'], ['none (bodyweight exercise)'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/154/lying-leg-curl-machine-large-1.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['standing_calf_raise', 'standing_calf_raise', 622, 'Standing Calf Raises', 'Elevação de panturrilhas em pé', ['Calves'], ['none (bodyweight exercise)'], 'Calves', 'REQUIRED', 'https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg', 'clafal', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['seated_dumbbell_calf_raise', 'seated_dumbbell_calf_raise', 1620, 'Seated Dumbbell Calf Raise', 'Elevação de panturrilha sentado com halter', ['Calves'], ['Dumbbell'], 'Calves', 'REQUIRED', 'https://wger.de/media/exercise-images/1620/edd40e39-e337-4460-a8dd-6127d40ddd16.jpeg', 'AlucardEvil40', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['seated_calf_stretch', 'seated_calf_stretch', 1274, 'Sitting Calf Stretch (Dorsiflexion)', 'Alongamento sentado de panturrilha', ['Calves', 'Soleus'], ['none (bodyweight exercise)'], 'Legs', 'OPTIONAL', 'https://wger.de/media/exercise-images/1274/bcffdf52-3c36-4b0c-b787-fb84f20bf82d.png', 'erikocobra', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['plank', 'plank', 458, 'Plank', 'Prancha', ['Obliquus externus abdominis', 'Abs'], ['none (bodyweight exercise)'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png', 'utkb', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['bird_dog', 'bird_dog', 1572, 'Bird Dog', 'Bird dog', ['Abs'], ['none (bodyweight exercise)'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png', 'Settebello', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['crunch', 'crunch', 167, 'Crunches', 'Abdominal curto', ['Abs'], ['Gym mat'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/91/Crunches-1.png', 'wger.de', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['lying_leg_raise', 'lying_leg_raise', 377, 'Leg Raises, Lying', 'Elevação de pernas deitado', ['Abs'], ['Gym mat'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/125/Leg-raises-2.png', 'Everkinetic', 'Creative Commons Attribution Share Alike 3', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'],
  ['ab_wheel', 'ab_wheel', 1573, 'Ab wheel', 'Roda abdominal', ['Abs'], ['none (bodyweight exercise)'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/1573/a9ab402b-61ef-4d60-b91a-df52bf7f41a9.jpg', 'lhegedus', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['kettlebell_swing', 'kettlebell_swing', 960, 'Kettlebell Swing', 'Balanço com kettlebell', ['Shoulders', 'Glutes'], ['Kettlebell'], 'Legs', 'REQUIRED', 'https://wger.de/media/exercise-images/960/da4d0560-da89-4bb5-b91f-746458fb04ad.png', 'clafal', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['heel_to_glute_run', 'heel_to_glute_run', 1285, 'Talons fesses', 'Corrida calcanhar-glúteo', ['Calves'], ['none (bodyweight exercise)'], 'Cardio', 'OPTIONAL', 'https://wger.de/media/exercise-images/1285/1ab8005d-41e4-4505-9a7d-5277d59bb3cd.jpg', 'painDpice', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['plank_shoulder_tap', 'plank_shoulder_tap', 1091, 'Plank Shoulder Taps', 'Prancha com toque nos ombros', ['Shoulders', 'Glutes', 'Abs'], ['Gym mat'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/1091/50c8912d-54ef-46c9-99d1-633b6196aa1e.jpg', 'clafal', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
  ['pallof_press', 'pallof_press', 1194, 'Pallof Press', 'Pallof press', ['Shoulders', 'Glutes', 'Obliquus externus abdominis', 'Abs', 'Serratus anterior', 'Trapezius'], ['Cable machine'], 'Abs', 'REQUIRED', 'https://wger.de/media/exercise-images/1194/074e1766-4208-4a67-a211-9721772d99b0.png', 'prevail90', 'Creative Commons Attribution Share Alike 4', 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'],
])

export const WGER_STARTER_PACK: readonly ApprovedWgerExercise[] = Object.freeze(REVIEWED_ROWS.map((row) => {
  const [intentKey, effectiveMovementKey, providerExerciseId, originalName, reviewedPtBrName,
    expectedPrimaryMuscles, expectedEquipment, expectedCategory, mediaRequirement, imageUrl,
    attribution, license, licenseUrl] = row
  return {
    intentKey, effectiveMovementKey, provider: 'WGER' as const, providerExerciseId,
    originalName, reviewedPtBrName, expectedPrimaryMuscles, expectedEquipment, expectedCategory,
    mediaRequirement, imageUrl, attribution, license, licenseUrl,
    sourceUrl: `https://wger.de/en/exercise/${providerExerciseId}/view`,
    reviewStatus: 'APPROVED' as const, reviewedAt: '2026-07-30',
    manifestVersion: WGER_STARTER_PACK_MANIFEST_VERSION as typeof WGER_STARTER_PACK_MANIFEST_VERSION,
  }
}))

export function validateWgerStarterPackManifest(manifest: readonly ApprovedWgerExercise[] = WGER_STARTER_PACK) {
  if (manifest.length < 35 || manifest.length > 50) throw new Error(`Manifesto Wger fora do gate: ${manifest.length} itens.`)
  const semanticKeys = new Set<string>()
  const providerIds = new Set<string>()
  const movements = new Set<string>()
  for (const item of manifest) {
    const providerIdentity = `${item.provider}:${item.providerExerciseId}`
    if (!/^[a-z0-9_]+$/.test(item.intentKey) || semanticKeys.has(item.intentKey)
      || !item.effectiveMovementKey || movements.has(item.effectiveMovementKey)
      || item.provider !== 'WGER' || !Number.isInteger(item.providerExerciseId) || item.providerExerciseId <= 0
      || providerIds.has(providerIdentity) || !item.originalName.trim() || !item.reviewedPtBrName.trim()
      || !item.expectedPrimaryMuscles.length || item.expectedPrimaryMuscles.some((value) => !value.trim())
      || !item.expectedEquipment.length || item.expectedEquipment.some((value) => !value.trim())
      || !item.expectedCategory.trim() || !['REQUIRED', 'OPTIONAL'].includes(item.mediaRequirement)
      || item.reviewStatus !== 'APPROVED' || item.manifestVersion !== WGER_STARTER_PACK_MANIFEST_VERSION
      || !https(item.sourceUrl) || !https(item.licenseUrl) || !item.license.trim() || !item.attribution.trim()
      || (item.mediaRequirement === 'REQUIRED' && !https(item.imageUrl))
      || (item.imageUrl !== null && !https(item.imageUrl))) {
      throw new Error(`Manifesto Wger inválido: ${item.intentKey || 'sem chave'}.`)
    }
    semanticKeys.add(item.intentKey)
    providerIds.add(providerIdentity)
    movements.add(item.effectiveMovementKey)
  }
  return manifest
}

function https(value: string | null): value is string {
  if (!value) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
