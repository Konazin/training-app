import { describe, expect, it } from 'vitest'
import {
  BUNDLED_EXERCISES,
  EXERCISE_PACKS,
  normalizeName,
  rankExerciseSearch,
} from '..'

describe('catálogo integrado de exercícios', () => {
  it('contém exatamente 40 exercícios completos e slugs únicos', () => {
    expect(BUNDLED_EXERCISES).toHaveLength(40)
    expect(new Set(BUNDLED_EXERCISES.map((item) => item.slug)).size).toBe(40)
    for (const exercise of BUNDLED_EXERCISES) {
      expect(exercise.externalId).toBe(exercise.slug)
      expect(exercise.normalizedName).toBe(normalizeName(exercise.name))
      expect(exercise.name).not.toBe('')
      expect(exercise.description).not.toBe('')
      expect(exercise.primaryMuscleGroup).not.toBe('')
      expect(exercise.equipment).not.toBe('')
      expect(exercise.instructions).not.toBe('')
      expect(exercise.media.attribution).toBe('Ilustração genérica do aplicativo')
    }
  })

  it('cobre grupos, equipamentos e categorias previstos', () => {
    const text = JSON.stringify(BUNDLED_EXERCISES)
    for (const expected of [
      'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps',
      'Posteriores', 'Glúteos', 'Panturrilhas', 'Core', 'Mobilidade',
      'Condicionamento', 'Peso corporal', 'Halteres', 'Barra', 'Máquina',
      'Elástico', 'Sem equipamento',
    ]) expect(text).toContain(expected)
  })

  it('normaliza aliases, acentos, pontuação e classifica resultados', () => {
    expect(normalizeName('  Elevação... PÉLVICA  ')).toBe('elevacao pelvica')
    const exact = rankExerciseSearch(BUNDLED_EXERCISES, 'supino reto com barra')
    expect(exact[0]?.slug).toBe('supino_reto_barra')
    const alias = rankExerciseSearch(BUNDLED_EXERCISES, 'puxador frente')
    expect(alias[0]?.slug).toBe('puxada_frente_maquina')
    const accentless = rankExerciseSearch(BUNDLED_EXERCISES, 'triceps')
    expect(accentless.some((item) => item.primaryMuscleGroup === 'Tríceps')).toBe(true)
    expect(rankExerciseSearch(BUNDLED_EXERCISES, 'halter').length).toBeGreaterThan(5)
  })

  it('resolve todas as referências dos quatro pacotes por slug', () => {
    expect(EXERCISE_PACKS).toHaveLength(4)
    const slugs = new Set(BUNDLED_EXERCISES.map((item) => item.slug))
    for (const pack of EXERCISE_PACKS) {
      expect(pack.slugs.length).toBeGreaterThan(0)
      expect(pack.slugs.every((slug) => slugs.has(slug))).toBe(true)
    }
  })

  it('mantém catálogo e metadados imutáveis', () => {
    expect(Object.isFrozen(BUNDLED_EXERCISES)).toBe(true)
    expect(Object.isFrozen(BUNDLED_EXERCISES[0])).toBe(true)
    expect(Object.isFrozen(BUNDLED_EXERCISES[0]!.aliases)).toBe(true)
    expect(Object.isFrozen(BUNDLED_EXERCISES[0]!.media)).toBe(true)
  })
})
