import { describe, expect, it } from 'vitest'
import { canonicalMuscle, equipmentLabel, equipmentTokens } from './exerciseTaxonomy'

describe('taxonomia de exercícios', () => {
  it('unifica músculos em inglês e português', () => {
    expect(canonicalMuscle('pectorals')).toBe('Peito')
    expect(canonicalMuscle('Chest')).toBe('Peito')
    expect(canonicalMuscle('Peito')).toBe('Peito')
    expect(canonicalMuscle('Quads')).toBe('Quadríceps')
    expect(canonicalMuscle('Não informado')).toBe('Outros')
    expect(canonicalMuscle('piriformis')).toBe('Piriformis')
  })
  it('divide equipamento composto e reconhece peso corporal nas três fontes', () => {
    expect(equipmentTokens('barbell, bench')).toEqual(['Barra', 'Banco'])
    expect(equipmentTokens('Halteres e banco')).toEqual(['Halteres', 'Banco'])
    expect(equipmentTokens('bodyweight')).toEqual(['Peso corporal'])
    expect(equipmentTokens('none (bodyweight exercise)')).toEqual(['Peso corporal'])
    expect(equipmentTokens('Sem equipamento')).toEqual(['Peso corporal'])
    expect(equipmentTokens('Não informado')).toEqual(['Outros'])
    expect(equipmentLabel('cable, EZ bar')).toBe('Cabos · Barra')
  })
})
