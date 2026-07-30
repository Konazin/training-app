# Roadmap do produto

1. **Ciclo de vida das fichas e lixeira — Marco 1 ESTABILIZADO**
2. **Editor de ficha, templates e duplicação — Marco 2 IMPLEMENTADO, smoke Android pendente**
3. **Home semanal e progresso — Marco 3 EM VALIDAÇÃO**
4. Skins, animações e acessibilidade
5. Biblioteca inicial e mídia
6. Providers, inteligência local e release candidate

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

## Marco 3 em validação

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

## Adiado

- ordenação avançada da lixeira;
- auditoria detalhada da origem da exclusão;
- itens explicitamente reservados para os marcos seguintes.
