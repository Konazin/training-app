import { describe, expect, it } from 'vitest'
import { normalizeMuscleAlias } from './muscleAliases'
import { resolveMuscleRegions } from './resolveMuscleRegions'

describe('resolveMuscleRegions', () => {
  it('normaliza acentos, caixa, hífens e espaços', () => {
    expect(normalizeMuscleAlias('  LATÍSSIMO-do  DORSO ')).toBe('latissimo do dorso')
    expect(resolveMuscleRegions({ primaryMuscleGroup: 'TRÍCEPS', secondaryMuscleGroups: ['Oblíquos'] }))
      .toMatchObject({ primary: ['triceps'], secondary: ['obliques'] })
  })

  it.each([
    ['peitoral maior', 'chest'], ['chest', 'chest'], ['deltoide anterior', 'front-shoulder'],
    ['front deltoid', 'front-shoulder'], ['deltoide posterior', 'rear-shoulder'],
    ['rear deltoid', 'rear-shoulder'], ['dorsal', 'lats'], ['lats', 'lats'],
    ['trapézio', 'traps'], ['traps', 'traps'], ['bíceps', 'biceps'], ['biceps', 'biceps'],
    ['antebraço', 'forearms'], ['forearms', 'forearms'], ['abdominais', 'abs'], ['abs', 'abs'],
    ['oblíquos', 'obliques'], ['lower back', 'lower-back'], ['glúteos', 'glutes'],
    ['quads', 'quads'], ['isquiotibiais', 'hamstrings'], ['hamstrings', 'hamstrings'],
    ['adutores', 'adductors'], ['panturrilhas', 'calves'], ['calves', 'calves'],
  ])('resolve o alias %s', (alias, expected) => {
    expect(resolveMuscleRegions({ primaryMuscleGroup: alias, secondaryMuscleGroups: [] }).primary)
      .toContain(expected)
  })

  it('faz o principal vencer o secundário', () => {
    expect(resolveMuscleRegions({ primaryMuscleGroup: 'peitoral', secondaryMuscleGroups: ['chest', 'tríceps'] }))
      .toEqual({ primary: ['chest'], secondary: ['triceps'], unknown: [] })
  })

  it('aceita alias com múltiplas regiões', () => {
    expect(resolveMuscleRegions({ primaryMuscleGroup: 'shoulders', secondaryMuscleGroups: [] }).primary)
      .toEqual(['front-shoulder', 'rear-shoulder'])
  })

  it('preserva desconhecidos como texto e aceita arrays vazios', () => {
    expect(resolveMuscleRegions({ primaryMuscleGroup: 'Serrátil anterior', secondaryMuscleGroups: ['Outro músculo'] }))
      .toEqual({ primary: [], secondary: [], unknown: ['Serrátil anterior', 'Outro músculo'] })
    expect(resolveMuscleRegions({ primaryMuscleGroup: '', secondaryMuscleGroups: [] }))
      .toEqual({ primary: [], secondary: [], unknown: [] })
  })
})
