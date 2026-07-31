import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../packages/training-domain/curation/wger-starter-pack.v1.ts', import.meta.url), 'utf8')
const count = (source.match(/^    \['[a-z0-9_]+',/gm) ?? []).length
if (count < 35 || count > 50 || /REJECTED|rejectedItemsIncluded:\s*[1-9]/.test(source)) {
  throw new Error(`Manifesto fora do gate: ${count} aprovados.`)
}
console.log(`Manifesto: ${count} aprovados; 0 rejeitados incluídos.`)
