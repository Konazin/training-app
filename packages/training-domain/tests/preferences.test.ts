import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DISPLAY_NAME,
  DISPLAY_NAME_MAX_LENGTH,
  LOCAL_PREFERENCES_KEY,
  createLocalPreferencesRepository,
  normalizeDisplayName,
  resolveDisplayName,
} from '../preferences'

describe('preferências locais', () => {
  it('normaliza nome, espaços, vazio e limite sem quebrar caracteres Unicode', () => {
    expect(normalizeDisplayName('  Marina  ')).toBe('Marina')
    expect(normalizeDisplayName('   ')).toBe(DEFAULT_DISPLAY_NAME)
    expect(normalizeDisplayName(null)).toBe(DEFAULT_DISPLAY_NAME)
    expect(Array.from(normalizeDisplayName('🏋️'.repeat(30)))).toHaveLength(DISPLAY_NAME_MAX_LENGTH)
  })

  it('resolve preferências antigas ou inválidas com o padrão', () => {
    expect(resolveDisplayName(undefined)).toBe('Atleta')
    expect(resolveDisplayName({})).toBe('Atleta')
    expect(resolveDisplayName({ displayName: 42 })).toBe('Atleta')
    expect(resolveDisplayName({ displayName: '  Bia ' })).toBe('Bia')
  })

  it('salva somente o valor normalizado no repositório local', async () => {
    const set = vi.fn(async () => ({ key: '', value: null, updatedAt: '' }))
    const repository = createLocalPreferencesRepository({
      get: async <T,>() => ({ displayName: '  Ana  ' }) as T,
      set,
    })
    await expect(repository.load()).resolves.toEqual({ displayName: 'Ana' })
    await expect(repository.saveDisplayName('  Lia  ')).resolves.toEqual({ displayName: 'Lia' })
    expect(set).toHaveBeenCalledWith(LOCAL_PREFERENCES_KEY, { displayName: 'Lia' })
  })
})
