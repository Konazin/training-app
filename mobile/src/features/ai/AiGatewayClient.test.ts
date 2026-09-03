import { describe, expect, it, vi } from 'vitest'
import { AiGatewayClient, AI_PRIVACY_NOTICE } from './AiGatewayClient'

describe('AiGatewayClient', () => {
  it('does not make a request when no optional gateway URL exists', async () => {
    const request = vi.fn()
    await expect(new AiGatewayClient(null, request).parseMeal({ text: '2 ovos e 150g de arroz', context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [] } })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(request).not.toHaveBeenCalled()
  })

  it('validates the gateway draft before returning it', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ draft: { items: [{ query: 'ovos', quantity: 2, unit: 'unit' }] } }), { status: 200 }))
    await expect(new AiGatewayClient('https://gateway.example', request).parseMeal({ text: '2 ovos', context: { locale: 'pt-BR', foodPreferences: [], avoidedFoods: [], allergies: [], dietaryRestrictions: [] } })).resolves.toEqual({ items: [{ query: 'ovos', quantity: 2, unit: 'unit' }] })
  })

  it('contains the required privacy disclosure without storing a provider key', () => {
    expect(AI_PRIVACY_NOTICE).toContain('Free Tier')
  })
})
