# Versão 1.1 (em desenvolvimento)

Branch de trabalho: `development-1.1`, criada a partir de `main` após a 1.0.
A `origin/development` antiga foi mantida; por isso o nome com hífen.

## Contexto: lançamento da 1.0

- Lançada em 2026-10-24: https://github.com/Konazin/training-app/releases/tag/v1.0.0
- Binário: `training-app-0.12.2-internal.apk` (app 0.12.2, `versionCode` 20),
  SHA-256 `66018bd66072dd362f12d1f555df3a76c149e3fa1ec805c0ebfd7b0d36fc0971`.
- O smoke físico foi feito no aparelho do autor, sem bugs. O APK é o mesmo
  que foi testado; a 1.0 é um rótulo de lançamento.
- O PR #3 foi mergeado com o check `validate` da CI vermelho, por decisão do
  autor: `expo-doctor` acusava o Hermes V1 do Expo SDK 56 (regressão de
  memória). Veja [`RELEASE_1_0.md`](RELEASE_1_0.md).

## Feito até agora

### Migração para o Expo SDK 57

- `expo` 57.0.31, React Native 0.86.3, `react` 19.2.3 e pacotes `expo-*` no SDK
  57; `@react-native/jest-preset` e `babel-preset-expo` alinhados.
- Aplicado em `mobile`, `umamusume-mobile`, `packages/training-local-db`
  (`expo-sqlite`) e `packages/workout-session-core` (`react-native`), para o
  monorepo ficar em uma única versão.
- Removido o `expo-font` fixado em `package.json` da raiz: não era usado e
  mantinha um `expo-modules-core` antigo, gerando duplicatas.
- Após editar versões, foi preciso apagar os `node_modules`, reinstalar e
  rodar `npm dedupe`; sem isso o `expo-doctor` acusa duplicatas.
- O app não usa `react-native-reanimated` nem `react-native-worklets`; a
  regressão de memória do Hermes V1 afeta apps que os importam, então o risco
  prático no SDK 56 era provavelmente baixo. O SDK 57 resolve o aviso e a CI.

Gates locais após a migração: `expo-doctor` 21/21, typecheck de `mobile` e
`umamusume-mobile`, 188 testes Vitest, 35 testes Jest, testes dos pacotes e
`expo export --platform android`. A CI da branch passou nos workflows
executados no último push.

## Pendente

- [ ] Subir `version` e `versionCode` (hoje 0.12.2 / 20; `mobile/package.json`
  ainda diz 0.11.0), gerar novo APK e repetir o smoke físico, pois o React
  Native mudou.
- [ ] Exportar e importar fichas de treino (veja o roadmap, "Pós-1.0").
- [ ] Validar TalkBack, fonte ampliada e movimento reduzido em aparelho.
- [ ] Revisar os 17 avisos do `npm audit` (5 moderados, 12 altos) após a
  migração e migrar testes de `react-test-renderer` para Testing Library.
- [ ] Abrir o PR de `development-1.1` para `main` quando houver build testado.

## Observações

- Um teste de Jest falhou uma vez de forma intermitente durante a atualização
  de dependências e passou em todas as execuções seguintes; vale ficar de
  olho.
- Gerar o build exige login no EAS e quota disponível (já houve recusa por
  quota na 0.9.3).
