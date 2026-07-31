import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../packages/training-domain/curation/wger-starter-pack.v1.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
new Function('exports', 'module', javascript)(module.exports, module)

const { WGER_STARTER_PACK: manifest, validateWgerStarterPackManifest: validate } = module.exports
validate(manifest)
const required = manifest.filter((item) => item.mediaRequirement === 'REQUIRED')
const optional = manifest.filter((item) => item.mediaRequirement === 'OPTIONAL')
const withoutMedia = manifest.filter((item) => !item.imageUrl)
const identities = new Set(manifest.map((item) => `${item.provider}:${item.providerExerciseId}`))
const movements = new Set(manifest.map((item) => item.effectiveMovementKey))

console.log(`Manifesto: ${manifest.length} aprovados; gate 35–50.`)
console.log(`Mídia: ${required.length} REQUIRED; ${optional.length} OPTIONAL; ${withoutMedia.length} sem mídia.`)
console.log(`Duplicidades: ${manifest.length - identities.size} provider+ID; ${manifest.length - movements.size} movimentos efetivos.`)
