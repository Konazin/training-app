import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const violations = []

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) visit(path)
    else if (['.ts', '.tsx'].includes(extname(path))) {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/fontSize\s*:\s*(\d+(?:\.\d+)?)/g)) {
        if (Number(match[1]) < 12) violations.push(`${path}:${source.slice(0, match.index).split('\n').length}`)
      }
    }
  }
}

visit(root)
if (violations.length) {
  console.error(`fontSize abaixo de 12:\n${violations.join('\n')}`)
  process.exit(1)
}
console.log('fontSize: nenhum valor numérico abaixo de 12 em mobile/src')
