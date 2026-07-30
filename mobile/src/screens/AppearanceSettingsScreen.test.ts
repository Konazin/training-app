import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appearanceSource = readFileSync(new URL('./AppearanceSettingsScreen.tsx', import.meta.url), 'utf8')
const sessionSource = readFileSync(
  new URL('../features/workout-session/views/WorkoutSessionScreen.tsx', import.meta.url),
  'utf8',
)
const providerSource = readFileSync(new URL('../theme/index.tsx', import.meta.url), 'utf8')

describe('contratos de aparência e acessibilidade', () => {
  it('oferece todos os controles e cancela a prévia ao sair', () => {
    for (const label of [
      'Tema',
      'Aparência',
      'Movimento',
      'Usar configuração do sistema',
      'Completo',
      'Reduzido',
      'Desativado',
      'Alto contraste durante o treino',
      'Feedback tátil',
      'Restaurar padrões',
    ]) expect(appearanceSource).toContain(label)
    expect(appearanceSource).toContain('useEffect(() => cancelPreview')
    expect(appearanceSource).toContain('savePreferences')
    expect(appearanceSource).toContain('accessibilityRole="switch"')
    expect(appearanceSource).toContain('accessibilityState={{ checked }}')
  })

  it('mantém estados de treino em texto e progresso acessível', () => {
    for (const label of ['SESSÃO PAUSADA', 'SESSÃO EM ANDAMENTO', 'Concluída', 'Pendente', 'Abandonar sessão']) {
      expect(sessionSource).toContain(label)
    }
    expect(sessionSource).toContain('accessibilityValue')
    expect(sessionSource).toContain('preferences.workoutHighContrast')
  })

  it('protege carregamento assíncrono contra atualização após desmontagem', () => {
    expect(providerSource).toContain('let mounted = true')
    expect(providerSource).toContain('if (!mounted) return')
    expect(providerSource).toContain('mounted = false')
    expect(providerSource).toContain('subscription.remove()')
  })
})
