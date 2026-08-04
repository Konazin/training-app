import type { MuscleRegion } from './muscleRegions'

export function normalizeMuscleAlias(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const aliases: Array<[readonly string[], readonly MuscleRegion[]]> = [
  [['peitoral', 'peitoral maior', 'chest', 'pectorals', 'pectoralis major'], ['chest']],
  [['tríceps', 'triceps'], ['triceps']],
  [['deltoide anterior', 'front deltoid', 'anterior deltoid', 'ombro anterior'], ['front-shoulder']],
  [['deltoide posterior', 'rear deltoid', 'posterior deltoid', 'ombro posterior'], ['rear-shoulder']],
  [['ombros', 'shoulders', 'deltoides', 'deltoids'], ['front-shoulder', 'rear-shoulder']],
  [['latíssimo do dorso', 'latissimus dorsi', 'dorsal', 'dorsais', 'lats'], ['lats']],
  [['trapézio', 'trapezio', 'trapezius', 'traps'], ['traps']],
  [['bíceps', 'biceps'], ['biceps']],
  [['antebraço', 'antebraco', 'antebraços', 'forearm', 'forearms'], ['forearms']],
  [['abdômen', 'abdomen', 'abdominais', 'abdominal', 'abs'], ['abs']],
  [['oblíquos', 'obliquos', 'oblíquo', 'oblique', 'obliques'], ['obliques']],
  [['lombar', 'lombares', 'lower back', 'lowerback'], ['lower-back']],
  [['glúteos', 'gluteos', 'glúteo', 'glute', 'glutes'], ['glutes']],
  [['quadríceps', 'quadriceps', 'quads'], ['quads']],
  [['posterior de coxa', 'posteriores de coxa', 'isquiotibiais', 'isquiotibial', 'hamstring', 'hamstrings'], ['hamstrings']],
  [['adutores', 'adutor', 'adductors', 'adductor'], ['adductors']],
  [['panturrilha', 'panturrilhas', 'calf', 'calves'], ['calves']],
]

export const MUSCLE_ALIASES: ReadonlyMap<string, readonly MuscleRegion[]> = new Map(
  aliases.flatMap(([names, regions]) => names.map((name) => [normalizeMuscleAlias(name), regions] as const)),
)
