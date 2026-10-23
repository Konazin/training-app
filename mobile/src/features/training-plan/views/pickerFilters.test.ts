import { describe, expect, it } from 'vitest'
import type { ExerciseDefinition } from '@training/training-domain'
import { applyPickerFilters } from './pickerFilters'


const item = (id: number, overrides: Partial<ExerciseDefinition>) => ({
  id, name: `Ex ${id}`, normalizedName: `ex ${id}`, aliases: [], primaryMuscleGroup: 'Peito', secondaryMuscleGroups: [],
  equipment: 'Barra', source: 'BUNDLED', archived: false, favorite: false, media: [], externalId: `e${id}`, ...overrides,
}) as unknown as ExerciseDefinition

describe('filtros combinados do picker', () => {
  const list = [
    item(1, { source: 'BUNDLED', primaryMuscleGroup: 'Peito', equipment: 'Barra e banco' }),
    item(2, { source: 'EXERCISEDB', primaryMuscleGroup: 'pectorals', equipment: 'barbell' }),
    item(3, { source: 'EXERCISEDB', primaryMuscleGroup: 'biceps', equipment: 'dumbbell' }),
    item(4, { source: 'WGER', primaryMuscleGroup: 'Chest', equipment: 'none (bodyweight exercise)' }),
  ]
  const none = { source: null, muscle: null, equipment: null, pack: null }
  it('restringe por fonte e músculo ao mesmo tempo', () => {
    expect(applyPickerFilters(list, '', 'ALL', none)).toHaveLength(4)
    expect(applyPickerFilters(list, '', 'ALL', { ...none, muscle: 'Peito' }).map((e) => e.id).sort()).toEqual([1, 2, 4])
    expect(applyPickerFilters(list, '', 'ALL', { ...none, muscle: 'Peito', source: 'EXERCISEDB' }).map((e) => e.id)).toEqual([2])
    expect(applyPickerFilters(list, '', 'ALL', { ...none, equipment: 'Barra' }).map((e) => e.id).sort()).toEqual([1, 2])
    expect(applyPickerFilters(list, '', 'BODYWEIGHT', none).map((e) => e.id)).toEqual([4])
  })
})
