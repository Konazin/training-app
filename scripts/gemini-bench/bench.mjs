#!/usr/bin/env node
// Reproduz a chamada de estimateMeal do app (mobile/src/features/nutrition/geminiNutritionProvider.ts)
// e mede tempos. Uso: node scripts/gemini-bench/bench.mjs <imagem> [--model X] [--thinking low|medium|high]
//   [--max-tokens N] [--runs N] [--timeout MS] [--list-models]
import { readFileSync, existsSync } from 'node:fs'
import { extname, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const envFile = join(dir, '.env')
const env = { ...process.env }
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !line.trim().startsWith('#') && m[2]) env[m[1]] ??= m[2]
  }
}

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const image = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const apiKey = env.GEMINI_API_KEY?.trim()
const model = flag('model', env.GEMINI_MODEL || 'gemini-3.8-flash')
const thinking = flag('thinking', null)
const maxTokens = Number(flag('max-tokens', 4096))
const runs = Number(flag('runs', 1))
const timeoutMs = Number(flag('timeout', env.TIMEOUT_MS || 90000))

if (!apiKey) { console.error('GEMINI_API_KEY ausente em scripts/gemini-bench/.env'); process.exit(1) }
const base = 'https://generativelanguage.googleapis.com/v1beta/models'

if (args.includes('--list-models')) {
  const r = await fetch(`${base}?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } })
  const j = await r.json()
  console.log(r.status, (j.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name).join('\n') || JSON.stringify(j))
  process.exit(0)
}
if (!image) { console.error('Informe o caminho da imagem.'); process.exit(1) }

const mimeType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(image).toLowerCase()]
if (!mimeType) { console.error('Use JPEG, PNG ou WebP.'); process.exit(1) }
const base64 = readFileSync(image).toString('base64')

// Mesmo prompt do app.
const prompt = [
  'Estimate the visible foods and edible portions in this meal photo.',
  'Return only JSON with title and items. Each item needs name, portionDescription, estimatedGrams, caloriesKcal, proteinGrams, carbohydratesGrams, fatGrams, fiberGrams, and confidence (0 to 1).',
  'Use approximate values, clearly prefer a conservative estimate, and do not claim medical or exact measurement. If a food or portion is uncertain, lower confidence.',
  'Do not include micronutrients unless reliable; the app will leave them empty.',
].join(' ')

const generationConfig = { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: maxTokens }
if (thinking) generationConfig.thinkingConfig = { thinkingLevel: thinking }
const body = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }],
  generationConfig,
})
console.log(`modelo=${model} thinking=${thinking ?? '(padrão)'} maxTokens=${maxTokens} imagem=${(base64.length / 1024).toFixed(0)}KB base64 corpo=${(body.length / 1024).toFixed(0)}KB timeout=${timeoutMs}ms`)

for (let run = 1; run <= runs; run++) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const t0 = performance.now()
  try {
    const res = await fetch(`${base}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      signal: controller.signal,
    })
    const tHeaders = performance.now() - t0
    const text = await res.text()
    const total = performance.now() - t0
    let info = ''
    try {
      const j = JSON.parse(text)
      const u = j.usageMetadata ?? {}
      const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text).find((t) => typeof t === 'string')
      info = `finish=${j.candidates?.[0]?.finishReason} tokens(prompt=${u.promptTokenCount} out=${u.candidatesTokenCount} thoughts=${u.thoughtsTokenCount ?? 0})`
      if (!res.ok) info = text.slice(0, 400)
      else if (!out) info += ' SEM TEXTO'
      else if (args.includes('--show')) info += '\n' + out
    } catch { info = `corpo não-JSON: ${text.slice(0, 200)}` }
    console.log(`#${run} HTTP ${res.status} headers=${(tHeaders / 1000).toFixed(1)}s total=${(total / 1000).toFixed(1)}s ${info}`)
  } catch (e) {
    console.log(`#${run} FALHA após ${((performance.now() - t0) / 1000).toFixed(1)}s: ${e.name === 'AbortError' ? 'TIMEOUT (abortado)' : e.message}`)
  } finally { clearTimeout(timer) }
}
