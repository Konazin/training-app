import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relative: string) {
  return readFileSync(new URL(relative, import.meta.url), 'utf8')
}

describe('UI da biblioteca integrada', () => {
  it('oferece filtros, pacotes, esqueleto, mídia e favorito acessível', () => {
    const library = source('./ExerciseLibraryScreen.tsx')
    for (const label of [
      'Todos', 'Favoritos', 'Recentes', 'Com mídia', 'Peso corporal',
      'GRUPO MUSCULAR', 'EQUIPAMENTO', 'CATEGORIA', 'FONTE', 'PACOTES',
    ]) expect(library).toContain(label)
    expect(library).toContain('<SkeletonList')
    expect(library).toContain('accessibilityState={{ selected: exercise.favorite }}')
    expect(library).toContain("exercise.media.length ? 'Com mídia' : 'Sem mídia'")
    expect(library).toContain('useTheme()')
  })

  it('detalhe exige ação para vídeo e edita somente notas pessoais', () => {
    const detail = source('./ExerciseDetailScreen.tsx')
    expect(detail).toContain('!showVideo')
    expect(detail).toContain('setShowVideo(true)')
    expect(detail).toContain('Minhas notas')
    expect(detail).toContain('onUpdateNotes')
    expect(detail).toContain('Ilustração genérica do aplicativo')
    expect(detail).toContain('Consultar licença')
  })

  it('picker protege toque duplo e oferece busca por alias, favoritos e recentes', () => {
    const picker = source('../training-plan/views/ExercisePicker.tsx')
    expect(picker).toContain('lastSelection')
    expect(picker).toContain('< 800')
    expect(picker).toContain('Nome, alias, músculo ou equipamento')
    expect(picker).toContain('Favoritos')
    expect(picker).toContain('Recentes')
    expect(picker).toContain('EXERCISE_PACKS')
  })

  it('player não inicia sozinho, pausa sem foco e encerra no unmount', () => {
    const video = source('./ExerciseVideo.tsx')
    expect(video).toContain('created.pause()')
    expect(video).toContain('if (!focused) player.pause()')
    expect(video).toContain('player.currentTime = 0')
  })

  it('mantém alto contraste do treino depois da integração', () => {
    const workout = source('../workout-session/views/WorkoutSessionScreen.tsx')
    expect(workout).toContain('preferences.workoutHighContrast')
    expect(workout).toContain('Estado: {statusLabel}')
  })
})
