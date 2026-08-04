export const MUSCLE_REGIONS = [
  'chest',
  'front-shoulder',
  'rear-shoulder',
  'traps',
  'lats',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'lower-back',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
] as const

export type MuscleRegion = typeof MUSCLE_REGIONS[number]
export type MuscleMapView = 'front' | 'back'

export const MUSCLE_REGION_LABELS: Record<MuscleRegion, string> = {
  chest: 'Peitoral',
  'front-shoulder': 'Deltoide anterior',
  'rear-shoulder': 'Deltoide posterior',
  traps: 'Trapézio',
  lats: 'Latíssimo do dorso',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraços',
  abs: 'Abdômen',
  obliques: 'Oblíquos',
  'lower-back': 'Lombar',
  glutes: 'Glúteos',
  quads: 'Quadríceps',
  hamstrings: 'Posterior de coxa',
  adductors: 'Adutores',
  calves: 'Panturrilhas',
}
