import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')

const desiredPlugin =
  'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")'

const pluginPattern =
  /id\("org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\("[^"]+"\)/

const candidates = [
  resolve(
    repositoryRoot,
    'node_modules/@react-native/gradle-plugin/settings.gradle.kts',
  ),
  resolve(
    repositoryRoot,
    'mobile/node_modules/@react-native/gradle-plugin/settings.gradle.kts',
  ),
]

let located = false

for (const file of candidates) {
  if (!existsSync(file)) {
    continue
  }

  located = true

  const current = readFileSync(file, 'utf8')

  if (current.includes(desiredPlugin)) {
    console.log(`[foojay] Já está em 1.0.0: ${file}`)
    continue
  }

  if (!pluginPattern.test(current)) {
    throw new Error(
      `Plugin foojay não encontrado no formato esperado: ${file}`,
    )
  }

  const patched = current.replace(pluginPattern, desiredPlugin)

  writeFileSync(file, patched, 'utf8')
  console.log(`[foojay] Atualizado para 1.0.0: ${file}`)
}

if (!located) {
  throw new Error(
    'Não foi localizado @react-native/gradle-plugin após a instalação.',
  )
}
