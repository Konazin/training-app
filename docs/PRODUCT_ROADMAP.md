# Roadmap do produto

1. **Ciclo de vida das fichas e lixeira — Marco 1 IMPLEMENTADO**
2. **Editor de ficha, templates e duplicação — Marco 2 IMPLEMENTADO, smoke consolidado pendente**
3. **Home semanal e progresso — Marco 3 IMPLEMENTADO, smoke consolidado pendente**
4. **Temas, movimento e acessibilidade — Marco 4 IMPLEMENTADO, smoke físico pendente**
5. **Biblioteca inicial e mídia — Marco 5 IMPLEMENTADO, smoke físico pendente**
6. **Providers, inteligência local e release candidate — Marco 6 EM VALIDAÇÃO**

## Marco 1 estabilizado

- lixeira local com retenção de sete dias;
- badge com quantidade e aviso de expiração;
- backup antes de esvaziar;
- mutation, refresh e Desfazer serializados;
- backup `schemaVersion: 2`.

## Marco 2 implementado

- seletores de categoria e dificuldade;
- seis templates locais restritos à criação;
- criação e duplicação transacionais;
- prévia persistida para fichas existentes;
- locks mantidos até o fim dos refreshes;
- migrations 1 a 5 preservadas;
- versão mobile 0.5.0, `versionCode` 7.

As verificações automatizadas e o export Android passaram. O smoke manual
continua pendente por falta de aparelho ou emulador; consulte
[`MARCO_2_ANDROID_SMOKE.md`](MARCO_2_ANDROID_SMOKE.md).

## Marco 3 implementado

- Home orientada ao treino de hoje;
- semana local de segunda-feira a domingo com nove estados textuais;
- descanso planejado e progresso limitado a cem por cento, contando somente
  dias atualmente configurados como treino;
- histórico preservado mesmo quando um dia concluído passa a ser descanso;
- sessão ativa ou pausada visível mesmo sem ficha ativa resolvida;
- referência de cargas concluídas anteriores isolada por ficha, sem recomendação;
- início da sessão de hoje pelo fluxo SQLite existente;
- resumo semanal expansível e atalhos operacionais;
- seis métricas movidas para Histórico e progresso;
- taxa de conclusão baseada em concluídas e não concluídas;
- data e semana recalculadas por foco, foreground e refresh;
- estado visual de refresh dedicado, deduplicado e mantido até o fim de todas
  as leituras, preservando conteúdo em falha parcial;
- artefatos `.eas-inspect`, `.expo` e `dist` fora da coleta do Vitest;
- versão mobile 0.6.0, `versionCode` 8;
- sem migration nova e com backup `schemaVersion: 2`.

O smoke Android do Marco 3 permanece pendente até existir dispositivo. A
migração de `react-test-renderer` para Testing Library é dívida técnica.

## Marco 4 em validação

- quatro presets com variantes clara e escura;
- preferência de aparência e movimento seguindo ou ignorando o sistema;
- prévia não persistida e confirmação atômica no AsyncStorage;
- alto contraste dedicado à sessão;
- feedback tátil isolado e desativável;
- prévia de movimento reiniciada ao reativar animações;
- término do descanso roteado pelo helper tátil central;
- auditoria dos estados, rótulos, progresso e modais acessíveis.

O Marco 4 permanece em validação até a execução do roteiro em um aparelho ou
emulador Android com TalkBack, fonte ampliada e redução de movimento.

## Marco 5 em validação

- catálogo offline com 40 exercícios originais em português;
- sincronização transacional e idempotente por slug estável;
- migration 6 para catálogo, aliases, favoritos e recentes;
- busca local normalizada, visualização em lista ou por músculo, filtros e
  quatro packs;
- biblioteca e seletor com favoritos, recentes e proteção contra toque duplo;
- mídia real diferenciada de placeholders e vídeo sob ação;
- atribuição externa preservada e notas editáveis separadamente;
- backup v2 ampliado apenas com campos opcionais;
- restauração e sincronização do catálogo em uma única transação;
- testes comportamentais renderizados dos fluxos críticos;
- candidato mobile 0.8.1, `versionCode` 11.

O Marco 5 permanece em validação até o smoke Android do catálogo, mídia,
upgrade e backup. O Wger continua manual e não participa do bootstrap.

## Marco 6 em validação

- registry tipado de providers, mantendo Wger como integração manual;
- último desempenho baseado em snapshots concluídos;
- progressão determinística, explicada, dispensável e nunca automática;
- substituição local com motivo e desfazer;
- anotações de série, exercício e sessão;
- migration 7 aditiva, preservando byte a byte as migrations 1 a 6;
- backups v2 antigos compatíveis;
- avisos locais e onboarding dispensável somente em instalações novas;
- versão mobile 0.9.0, `versionCode` 12.

O release candidate 0.9.0 só passa a **PRONTO PARA TESTES** depois de todas as
validações automatizadas e da geração e inspeção do APK. O smoke físico segue
pendente e o produto não está marcado como pronto para produção.

## Adiado

- ordenação avançada da lixeira;
- auditoria detalhada da origem da exclusão;
- itens explicitamente reservados para os marcos seguintes.
