# Histórico e progresso

A aba visual **Progresso** mantém a chave de navegação `History`. Todos os
resultados são calculados localmente a partir das sessões do SQLite.

## Métricas

- **SESSÕES:** sessões concluídas;
- **ESTA SEMANA:** conclusões entre segunda-feira e domingo do calendário local,
  agrupadas por `scheduledDate`;
- **CONCLUSÃO:** `concluídas / (concluídas + não concluídas) × 100`;
- **EXERCÍCIOS:** exercícios marcados como concluídos dentro de sessões
  concluídas;
- **MINUTOS:** duração total das sessões concluídas;
- **VOLUME:** volume total das sessões concluídas.

Sessões em andamento e pausadas não entram no denominador da conclusão. Sem
histórico, todas as métricas retornam zero.

Cada sessão mostra status por texto — **Concluída**, **Não concluída**,
**Em andamento** ou **Pausada** — além da ficha, dia, data programada, séries,
duração e volume quando maior que zero. O status não depende somente de cor ou
ícone.

A semana é recalculada quando a aba ganha foco, quando o aplicativo volta ao
primeiro plano e depois do pull-to-refresh, mesmo que a lista de sessões não
tenha mudado. O próprio fluxo de refresh mantém o indicador visível até todas
as leituras locais terminarem, inclusive com histórico vazio, preserva a lista
atual e informa falhas parciais. Não existe sincronização em nuvem, chamada de
rede ou migration nova.

## Dívida técnica

Os testes de componentes ainda usam `react-test-renderer`, atualmente
depreciado. A migração gradual para Testing Library fica como dívida técnica;
uma troca integral não faz parte do Marco 3.
