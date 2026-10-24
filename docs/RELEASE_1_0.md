# Lançamento do APK 1.0

**Decisão atual: GO para 1.0, usando o build 0.12.2 (`versionCode` 20).**
**Smoke físico em Android: CONCLUÍDO em 2026-10-24, sem bugs observados.**

APK: `training-app-0.12.2-internal.apk`, 96.121.951 bytes, SHA-256
`66018bd66072dd362f12d1f555df3a76c149e3fa1ec805c0ebfd7b0d36fc0971`.
O binário testado é o mesmo distribuído; a 1.0 é um rótulo de lançamento e o
app continua se identificando como 0.12.2. A versão interna passa a 1.0.0 no
próximo build.

> As seções abaixo registram a avaliação feita antes do smoke (NO-GO). Os
> bloqueadores 1 a 4 foram resolvidos pelo teste em aparelho. Acessibilidade
> com TalkBack, fonte ampliada e movimento reduzido não foi validada
> formalmente e segue como limitação conhecida.

Pacote `com.konazin.trainingapp`, APK interno via EAS (perfil `preview`).
Este documento define o que a 1.0 promete, o que ainda impede o lançamento, o
procedimento de release e o checklist final. Avaliação feita em 2026-10-24 a
partir do [roadmap](PRODUCT_ROADMAP.md) e do estado do repositório.

## O que a 1.0 promete

Alinhado à visão do roadmap:

- Treinos, planos, biblioteca, histórico, progresso e nutrição funcionam
  offline; os dados ficam no aparelho, sem conta, backend ou sincronização.
- Backup e restauração locais e explícitos; backups não levam a chave do
  Gemini nem imagens transitórias.
- Catálogos externos (ExerciseDB, Wger) e IA (Gemini) só acessam a rede após
  ação da pessoa, com aviso do que será enviado e confirmação.
- Aparência coesa (tema Ink, Geist, Lucide), com acessibilidade validada.

Fora do escopo da 1.0: web, tablet, conta, sincronização, publicidade.

## Avaliação do roadmap

| Marco | Estado no roadmap | Bloqueia a 1.0? |
| --- | --- | --- |
| M0 — Fechamento do candidato Android | Nenhum item concluído; APK do código atual e smoke físico pendentes | **Sim** |
| M* — UI/UX majestosa | Fundações e telas centrais prontas; auditoria em aparelho, temas claro/escuro, diálogos secundários e conteúdo longo pendentes | **Sim** (itens de aparelho e de acessibilidade) |
| M1 — Profundidade de treino | Marcado como planejado, mas o código já entrega progresso por exercício com 1RM e recordes, recorde na sessão e repetir treino (commits 18dee2f, 887b3d0) | Não; atualizar o status no roadmap |
| M2 — Confiabilidade técnica | Planejado: 45 avisos de `npm audit` (31 altos, 14 moderados) e testes antigos com `react-test-renderer` | Parcial: ver riscos |
| M3 — Pronto para distribuição | Depende de M0 e dos bloqueadores de M* | **Sim** |

### Bloqueadores (precisam fechar antes da 1.0)

1. **Nenhum teste em aparelho físico.** Todas as validações até hoje são
   automatizadas (testes, typecheck, export Expo). O ambiente de
   desenvolvimento não tem `adb`, emulador nem Android SDK. Sem isso, não há
   evidência de que instalação, migração e fluxos reais funcionam.
2. **APK candidato inexistente para o código atual.** O último APK
   verificado (0.11.0, 17/10) antecede Nutrição, o redesign e as versões
   0.12.x. Gerar um novo build e registrar checksum.
3. **Upgrade sobre dados existentes não validado.** Instalação limpa e
   atualização sobre 0.9.3 (migrations, dados, backups) nunca foram
   exercitadas em aparelho.
4. **Gemini em Android real não validado.** Análise por foto, cancelamento,
   cadeia de modelos com fallback e confirmação de envio só foram testados por
   benchmark e testes automatizados.
5. **Acessibilidade em aparelho.** TalkBack, fonte ampliada, movimento
   reduzido e feedback tátil precisam de validação física (compromisso do
   marco M*).
6. **Revisão visual pendente do M\*.** Quatro temas em claro e escuro,
   diálogos e confirmações nativas restantes, nomes e conteúdos longos.

### Riscos aceitáveis se registrados nas notas da versão

- **Regressão de memória do Hermes V1 (Expo SDK 56).** O `expo-doctor` acusa
  o Hermes 250829098.0.10; a correção está no SDK 57 (Hermes .0.16+). Sem
  problema observado no smoke. O check `validate` da CI falha por isso e foi
  aceito para a 1.0; atualizar para o SDK 57 é a prioridade da 1.1.

- **Avisos de `npm audit` (45, nenhum crítico).** A correção automática
  sugere downgrades de Expo/React Native; não aplicar às cegas. Antes da 1.0,
  reavaliar quais afetam o app em runtime (a maioria está em ferramentas de
  build) e registrar a decisão. Atualização coordenada de SDK fica para 1.1.
- **Testes com `react-test-renderer`.** Dívida de teste, sem impacto para o
  usuário; migração para React Native Testing Library em 1.1.

### Pendências de higiene

- `mobile/package.json` está em `0.11.0` enquanto `mobile/app.json` está em
  `0.12.2`. Alinhar ambos com a versão final.
- `PRODUCT_ROADMAP.md` e `LOCAL_ANDROID_APK.md` ainda citam 0.11.0 como o
  candidato atual. Atualizar quando o novo APK for gerado.
- Engines do Node: o projeto exige `>=20.19.4`; já houve avisos com
  `20.19.2`. Use a versão exigida ao gerar o release.

## Quando dá para chamar de 1.0

Critério mínimo, em ordem:

1. Gerar APK do código atual e registrar nome, tamanho, SHA-256 e `unzip -t`.
2. Executar o [roteiro de smoke](LOCAL_ONLY_SMOKE_TEST.md) em aparelho
   Android físico, em modo avião e com rede.
3. Instalação limpa e atualização sobre 0.9.3, com backup restaurado.
4. Validar Gemini com chave de teste (foto, cancelamento, erro de rede, chave
   inválida).
5. Passar TalkBack, fonte ampliada, movimento reduzido e feedback tátil.
6. Corrigir tudo de severidade bloqueadora ou alta e repetir o roteiro
   afetado.
7. Concluir o checklist abaixo.

Estimativa realista: a 1.0 está **perto no código, longe na evidência**. O
trabalho restante é de validação em aparelho e correções que ela revelar, não
de novas funcionalidades. Sugestão: publicar uma **1.0.0-rc.1** interna,
rodar o roteiro e promover a 1.0.0 sem mudanças de código se nada falhar.

## Procedimento de release

1. Branch de release a partir de `main`, após o merge da branch
   `feat/m-star-ui-ux`.
2. Definir a versão:
   - `mobile/app.json`: `"version": "1.0.0"` e `android.versionCode` maior
     que 20 (próximo valor livre);
   - `mobile/package.json`: mesma versão.
3. Rodar os gates na raiz e em `mobile/`: testes dos workspaces, typecheck,
   `npx expo-doctor` e exportação Android.
4. Gerar o APK:

   ```bash
   cd mobile
   npx eas-cli@latest build --platform android --profile preview --json
   ```

   Autentique com `npx eas-cli@latest login` ou `EXPO_TOKEN` fora do
   repositório. Se a quota gratuita do EAS estiver esgotada (já ocorreu na
   0.9.3), aguarde o reset ou use outro plano.
5. Baixar o artefato para `mobile/artifacts/` (ignorado pelo Git) e registrar:

   ```bash
   file training-app-1.0.0-internal.apk
   sha256sum training-app-1.0.0-internal.apk
   unzip -t training-app-1.0.0-internal.apk
   ```

6. Instalar em aparelho e executar o checklist.
7. Atualizar `LOCAL_ANDROID_APK.md` (build ID, tamanho, SHA-256), marcar
   M0, M\* e M3 no roadmap e criar a tag `v1.0.0`.
8. Distribuir o APK por canal controlado (por exemplo, GitHub Release
   anexando APK e checksum). APK e credenciais nunca entram no Git.

## Checklist final

### Build e integridade

- [ ] Versão e `versionCode` atualizados em `app.json` e `package.json`.
- [ ] Testes, typecheck, Expo Doctor e export Android passando.
- [ ] APK gerado, com build ID, tamanho, SHA-256 e `unzip -t` registrados.

### Instalação e dados

- [ ] Instalação limpa abre e passa pelo onboarding.
- [ ] Atualização sobre 0.9.3 preserva fichas, histórico, nutrição e
      preferências.
- [ ] Reinício do app mantém os dados.
- [ ] Exportar backup, apagar dados, restaurar: tudo volta; o backup não
      contém a chave do Gemini.

### Fluxos principais (modo avião)

- [ ] Criar plano a partir de modelo, editar, duplicar, arquivar, lixeira e
      desfazer.
- [ ] Iniciar sessão, registrar séries, descanso, pausar, abandonar (registros
      preservados) e concluir.
- [ ] Histórico, progresso por exercício, 1RM e recordes coerentes.
- [ ] Biblioteca: busca, filtros, favoritos, recentes, pack local.
- [ ] Nutrição: refeições, favoritas, água, metas, resumo de 7 dias.

### Fluxos com rede (opcionais)

- [ ] Catálogo ExerciseDB/Wger só consulta após ação manual; mídia com
      atribuição.
- [ ] Gemini: aviso de envio e confirmação; foto cancelável; fallback de
      modelo; chave inválida e falta de rede tratadas; sugestão não entra no
      diário sem ação.
- [ ] Chave do Gemini fica no SecureStore e some ao removê-la.

### Aparência e acessibilidade

- [ ] Quatro temas, claro/escuro/sistema; campos legíveis no tema preto.
- [ ] TalkBack navega os fluxos principais com rótulos corretos.
- [ ] Fonte ampliada sem cortes; alvos de toque de pelo menos 48 dp.
- [ ] Movimento reduzido e feedback tátil respeitados.

### Privacidade e comunicação

- [ ] Notas da versão publicadas com mudanças, limitações conhecidas e avisos
      de dependências.
- [ ] Texto de privacidade confere com o comportamento: dados locais, rede
      apenas por ação explícita.

## Notas da versão (rascunho)

**Training App 1.0.0**

- Treinos, planos, biblioteca e histórico 100% offline, com dados somente no
  aparelho.
- Progresso por exercício com estimativa de 1RM e recordes, avisados durante a
  sessão.
- Nutrição com refeições favoritas, contador de água, metas e resumos.
- Análise de refeição por foto e sugestão de cardápio com Gemini, opcionais,
  com sua própria chave e confirmação antes de cada envio.
- Backup e restauração locais.
- Nova identidade visual, quatro temas e opções de acessibilidade.

Limitações conhecidas: distribuição por APK interno (sem loja); avisos de
dependência de ferramentas de build em avaliação; o Expo SDK 56 usa um Hermes
V1 com regressão de memória conhecida, corrigida só no SDK 57 (1.1).
