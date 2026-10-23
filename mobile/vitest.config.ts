import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { configDefaults, defineConfig, type Plugin } from 'vitest/config'

/**
 * `lucide-react-native` importa `react-native-svg`, que carrega o React Native real (sintaxe Flow)
 * e quebra no Node. Os testes do vitest não renderizam ícones, então usamos componentes vazios,
 * gerados a partir dos nomes realmente importados no código.
 */
function lucideStub(): Plugin {
  const id = '\0lucide-stub'
  const names = new Set<string>(['createLucideIcon'])
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) { if (entry !== 'node_modules') scan(path); continue }
      if (!/\.tsx?$/.test(entry)) continue
      for (const match of readFileSync(path, 'utf8').matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'lucide-react-native'/g)) {
        for (const part of match[1]!.split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0]!.replace(/^type\s+/, '')
          if (/^[A-Z]\w*$/.test(name)) names.add(name)
        }
      }
    }
  }
  scan(join(__dirname, 'src'))
  for (const file of ['App.tsx']) for (const match of readFileSync(join(__dirname, file), 'utf8').matchAll(/import\s+\{([^}]*)\}\s+from\s+'lucide-react-native'/g)) for (const part of match[1]!.split(',')) names.add(part.trim())
  return {
    name: 'lucide-stub',
    enforce: 'pre',
    resolveId: (source) => (source === 'lucide-react-native' ? id : null),
    load: (loaded) => (loaded === id ? [...names].filter((name) => /^[A-Z]\w*$/.test(name)).map((name) => `export const ${name} = () => null`).join('\n') : null),
  }
}

export default defineConfig({
  plugins: [lucideStub()],
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/.eas-inspect/**',
      '**/.expo/**',
      '**/dist/**',
      '**/*.rntl.test.tsx',
    ],
  },
})
