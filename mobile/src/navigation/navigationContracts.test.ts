import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')

describe('navegação do Marco 3', () => {
  it('mantém quatro abas, a chave History e todas as rotas da Home', () => {
    expect([...app.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map((match) => match[1]))
      .toEqual(['Today', 'Plan', 'History', 'More'])
    expect(app).toContain("History: 'Progresso'")
    for (const route of [
      'TrainingPlanEditor',
      'TrainingPlanDay',
      'Session',
      'ArchivedTrainingPlans',
      'TrainingPlanTrash',
      'Library',
      'Integrations',
    ]) {
      expect(app).toContain(`navigate('${route}'`)
    }
  })
})
