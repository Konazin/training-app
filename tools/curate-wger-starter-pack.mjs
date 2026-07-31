import { mkdir, readFile, writeFile } from 'node:fs/promises'

const API = 'https://wger.de/api/v2'
const intentsPath = new URL('./wger-starter-pack-intents.v1.json', import.meta.url)
const auditPath = new URL('../artifacts/curation/wger-starter-pack-candidate-audit.v1.json', import.meta.url)
const reportPath = new URL('../docs/WGER_STARTER_PACK_CURATION.md', import.meta.url)
const { intents, version } = JSON.parse(await readFile(intentsPath, 'utf8'))
await mkdir(new URL('../artifacts/curation/', import.meta.url), { recursive: true })
const muscleAliases = {
  peitoral: ['chest', 'pectoralis'],
  costas: ['back', 'latissimus', 'trapezius'],
  ombros: ['shoulders', 'deltoid'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quadriceps: ['quadriceps'],
  posteriores: ['hamstrings', 'gluteus'],
  gluteos: ['gluteus'],
  panturrilhas: ['calves', 'gastrocnemius', 'soleus'],
  core: ['abs', 'abdominals', 'core'],
}

if (intents.length !== 50 || new Set(intents.map(({ semanticKey }) => semanticKey)).size !== 50) {
  throw new Error('A lista precisa conter 50 chaves únicas.')
}

const [languagesPage, licensesPage] = await Promise.all([
  fetchJson(`${API}/language/?limit=100`),
  fetchJson(`${API}/license/?limit=100`),
])
const languages = new Map(languagesPage.results.map((item) => [item.id, normalizeLanguage(item.short_name)]))
const licenses = new Map(licensesPage.results.map((item) => [item.id, item]))
const audits = []

for (const [index, intent] of intents.entries()) {
  process.stdout.write(`[${index + 1}/50] ${intent.semanticKey}\n`)
  const queries = [
    { text: intent.ptBrQuery, language: 'pt-br' },
    { text: intent.ptBrQuery, language: 'pt' },
    { text: intent.enQuery, language: 'en' },
  ]
  const summaries = new Map()
  for (const query of queries) {
    const url = new URL(`${API}/exerciseinfo/`)
    url.searchParams.set('limit', '12')
    url.searchParams.set('name__search', query.text)
    const page = await fetchJson(url, query.language)
    for (const item of page.results ?? []) {
      if (Number.isInteger(item?.id)) summaries.set(item.id, item)
    }
  }
  const details = []
  for (const id of [...summaries.keys()].slice(0, 20)) {
    details.push(await fetchJson(`${API}/exerciseinfo/${id}/`, 'en'))
  }
  const ranked = details.map((candidate) => validate(intent, candidate, languages, licenses))
    .sort((a, b) => b.score - a.score || a.providerId - b.providerId)
  const valid = ranked.filter((candidate) => candidate.valid)
  const selected = valid[0] && (!valid[1] || valid[1].score !== valid[0].score)
    ? valid[0]
    : null
  audits.push({
    semanticKey: intent.semanticKey,
    intent,
    selected,
    validationResult: selected ? 'APROVADO' : valid.length > 1 ? 'AMBÍGUO' : 'SEM_CANDIDATO',
    rejectedAlternatives: ranked.filter((item) => item !== selected).slice(0, 12),
  })
}

const selectedIds = new Map()
for (const item of audits) {
  if (!item.selected) continue
  const previous = selectedIds.get(item.selected.providerId)
  if (!previous) {
    selectedIds.set(item.selected.providerId, item.semanticKey)
    continue
  }
  item.rejectedAlternatives.unshift({
    ...item.selected,
    valid: false,
    reasons: [`ID já selecionado para ${previous}`],
  })
  item.selected = null
  item.validationResult = 'ID_DUPLICADO'
}
const selectedCount = audits.filter(({ selected }) => selected).length
const audit = {
  auditVersion: 1,
  intentVersion: version,
  provider: 'WGER',
  generatedAt: new Date().toISOString(),
  selectedCount,
  requiredCount: 50,
  manifestGenerated: false,
  items: audits,
}
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
await writeFile(reportPath, report(audit))
process.stdout.write(`Curadoria concluída: ${selectedCount}/50 aprovados.\n`)
process.exitCode = selectedCount === 50 ? 0 : 2

async function fetchJson(input, language) {
  const response = await fetch(input, {
    headers: {
      Accept: 'application/json',
      ...(language ? { 'Accept-Language': language } : {}),
    },
  })
  if (response.status === 429) throw new Error('Limite de consultas do Wger atingido.')
  if (!response.ok) throw new Error(`Wger respondeu HTTP ${response.status}.`)
  return response.json()
}

function validate(intent, item, languageMap, licenseMap) {
  const reasons = []
  const providerId = Number(item?.id)
  const translations = Array.isArray(item?.translations) ? item.translations : []
  const translation = selectTranslation(translations, languageMap)
  const name = text(translation?.name)
  const description = text(translation?.description_source) || stripHtml(text(translation?.description))
  const muscles = names(item?.muscles)
  const equipment = names(item?.equipment)
  const image = (Array.isArray(item?.images) ? item.images : [])
    .find((entry) => entry?.is_main && https(entry?.image))
    ?? (Array.isArray(item?.images) ? item.images : []).find((entry) => https(entry?.image))
  const license = typeof item?.license === 'object' ? item.license : licenseMap.get(item?.license)
  const sourceUrl = Number.isInteger(providerId)
    ? `https://wger.de/en/exercise/${providerId}/view`
    : null
  if (!Number.isInteger(providerId)) reasons.push('ID ausente')
  if (!name) reasons.push('nome ausente')
  if (!description) reasons.push('descrição e instruções ausentes')
  const similarity = nameSimilarity(intent, translations)
  if (similarity < 2) reasons.push('movimento ambíguo ou incompatível')
  if (unexpectedVariant(intent, translations)) reasons.push('variante diferente da intenção')
  const muscleCompatible = compatibleMuscle(intent.expectedPrimaryMuscle, muscles)
  if (!muscleCompatible) reasons.push('músculo incompatível')
  const equipmentCompatible = compatibleEquipment(intent.equipmentAliases, equipment)
  if (!equipmentCompatible) reasons.push('equipamento incompatível')
  const categoryCompatible = compatibleCategory(intent.expectedCategory, item?.category?.name)
  if (!categoryCompatible) reasons.push('categoria incompatível')
  if (mediaPolicy(intent) === 'REQUIRED' && !image) reasons.push('imagem real ausente')
  if (image && !https(image.image)) reasons.push('imagem sem HTTPS')
  if (!https(sourceUrl) || !text(license?.full_name || license?.short_name)
    || !https(license?.url)) reasons.push('fonte ou licença incompleta')
  const score = similarity * 20 + Number(muscleCompatible) * 16
    + Number(equipmentCompatible) * 12 + Number(categoryCompatible) * 8
    + languageScore(translation, languageMap) + Number(Boolean(description)) * 3
    + Number(Boolean(image)) * 3 + Number(https(license?.url)) * 2
  return {
    providerId,
    providerName: name,
    language: languageMap.get(translation?.language) ?? 'desconhecido',
    muscles,
    equipment,
    category: text(item?.category?.name),
    sourceUrl,
    imageUrl: image?.image ?? null,
    license: text(license?.full_name || license?.short_name) || null,
    licenseUrl: license?.url ?? null,
    score,
    valid: reasons.length === 0,
    reasons,
  }
}

function selectTranslation(translations, languageMap) {
  for (const language of ['pt-br', 'pt', 'en']) {
    const found = translations.find((item) => languageMap.get(item?.language) === language && text(item?.name))
    if (found) return found
  }
  return translations.find((item) => text(item?.name))
}

function nameSimilarity(intent, translations) {
  const names = translations.map((item) => normalize(item?.name)).filter(Boolean)
  const expected = [normalize(intent.ptBrQuery), normalize(intent.enQuery)]
  if (names.some((name) => expected.includes(name))) return 4
  if (names.some((name) => expected.some((wanted) => name.includes(wanted) || wanted.includes(name)))) return 3
  return names.some((name) => expected.some((wanted) => tokenOverlap(name, wanted) >= 0.6)) ? 2 : 0
}

function unexpectedVariant(intent, translations) {
  const expected = normalize(`${intent.ptBrQuery} ${intent.enQuery}`)
  const names = normalize(translations.map((item) => item?.name).join(' '))
  return ['pike'].some((marker) => names.includes(marker) && !expected.includes(marker))
}

function tokenOverlap(value, expected) {
  const actual = new Set(value.split(' ').filter((token) => token.length > 2))
  const wanted = expected.split(' ').filter((token) => token.length > 2)
  return wanted.length ? wanted.filter((token) => actual.has(token)).length / wanted.length : 0
}

function compatibleMuscle(expected, values) {
  const wanted = normalize(expected).split(' ')[0]
  const aliases = muscleAliases[wanted] ?? [wanted]
  const actual = normalize(values.join(' '))
  return aliases.some((alias) => actual.includes(alias))
}

function compatibleEquipment(expected, values) {
  const actual = normalize(values.join(' '))
  const aliases = {
    barra: ['barbell'],
    halter: ['dumbbell'],
    halteres: ['dumbbell'],
    cabo: ['cable'],
    polia: ['cable'],
    maquina: ['machine'],
    'peso corporal': ['bodyweight', 'none'],
    'sem equipamento': ['bodyweight', 'none'],
    'barra fixa': ['pull-up bar', 'bodyweight'],
    corda: ['rope', 'cable'],
  }
  return expected.some((value) => (aliases[normalize(value)] ?? [normalize(value)])
    .some((alias) => actual.includes(alias)))
}

function compatibleCategory(expected, value) {
  const broad = normalize(expected)
  const category = normalize(value)
  if (['forca', 'core'].includes(broad)) return !/(cardio|stretch|mobil)/.test(category)
  if (broad === 'condicionamento') return /(cardio)/.test(category)
  if (broad === 'mobilidade') return /(mobil)/.test(category)
  if (broad === 'alongamento') return /(stretch|mobil)/.test(category)
  return false
}

function names(value) {
  return Array.isArray(value)
    ? value.map((item) => text(item?.name_en) || text(item?.name)).filter(Boolean)
    : []
}

function languageScore(translation, languagesMap) {
  return { 'pt-br': 6, pt: 4, en: 2 }[languagesMap.get(translation?.language)] ?? 0
}

function report(audit) {
  const unresolved = audit.items.filter(({ selected }) => !selected)
  const selected = audit.items.filter((item) => item.selected)
  const languages = selected.reduce((counts, item) => {
    const language = item.selected.language
    counts[language] = (counts[language] ?? 0) + 1
    return counts
  }, {})
  return `# Curadoria do pacote inicial Wger

Gerada em ${audit.generatedAt}. Resultado: **${audit.selectedCount}/50 aprovados**.

O manifesto de produção não foi gerado. O pacote recomendado permanece
desabilitado até que todas as 50 intenções tenham um exercício real, imagem
HTTPS e atribuição completa revisados.

## Seleções estritas

${selected.map((item) => `- \`${item.semanticKey}\`: Wger ${item.selected.providerId} — ${item.selected.providerName} (${item.selected.language})`).join('\n')}

Distribuição de idioma: ${Object.entries(languages).map(([language, count]) => `${language}: ${count}`).join('; ')}.

## Intenções não resolvidas

${unresolved.map((item) => `- \`${item.semanticKey}\`: ${item.validationResult}`).join('\n') || '- Nenhuma.'}

  O audit bruto fica em artefato local ignorado em
  \`artifacts/curation/wger-starter-pack-candidate-audit.v1.json\`.
`
}

function normalizeLanguage(value) {
  return text(value).toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-')
}

function normalize(value) {
  return text(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function https(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function mediaPolicy(intent) {
  return ['mobilidade', 'alongamento', 'condicionamento'].includes(normalize(intent.expectedCategory))
    ? 'OPTIONAL'
    : 'REQUIRED'
}
