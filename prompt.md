Continue o desenvolvimento do repositório `training-app` a partir do commit:

422474d312145c735aa4a512af70a713c5440597

Esta etapa deve endurecer o núcleo já implementado do Modo Umamusume.

Não implemente corridas, eventos narrativos, skills, personagens, gacha ou novas mecânicas de progressão.

==================================================
1. OBJETIVO
==================================================

Corrigir os seguintes problemas:

1. atividade de descanso aceita pode deixar a carreira presa se a ficha for alterada;
2. efeitos registrados no histórico podem diferir dos efeitos realmente aplicados por causa do clamp;
3. uma sessão Umamusume retomada pela Home perde sua origem;
4. “Continuar treino” aceita qualquer sessão ativa, mesmo de outro fluxo;
5. histórico pode mostrar dados vazios ou de outra carreira durante o carregamento;
6. não existe navegação adequada entre carreiras anteriores;
7. não existe saída segura para atividade de descanso pendente.

Esta etapa deve preservar o loop atual e torná-lo recuperável.

==================================================
2. ATIVIDADE ACEITA NÃO DEVE DEPENDER DA FICHA VIVA
==================================================

Atualmente, concluir uma atividade aceita consulta novamente o estado atual do `TrainingPlanDay`.

Remover essa dependência.

Ao concluir uma atividade de descanso pendente:

- localizar o turno atual da carreira;
- validar que ele é `REST_ACTIVITY`;
- validar que está `IN_PROGRESS`;
- validar o `restActivityId` associado;
- usar apenas os snapshots persistidos no turno:
  - nome;
  - categoria;
  - duração;
- calcular os efeitos pela categoria armazenada;
- concluir o turno;
- avançar o dia.

Não chamar `requireRestDay(career)` durante a conclusão.

A atividade deve continuar concluível mesmo que, após ser aceita:

- o dia tenha sido transformado em treino;
- a atividade tenha sido editada;
- a atividade tenha sido removida;
- a ficha tenha sido arquivada;
- o nome ou categoria original tenham sido alterados.

O turno aceito representa um compromisso já iniciado e deve ser independente da configuração futura.

==================================================
3. CANCELAMENTO DE ATIVIDADE PENDENTE
==================================================

Adicionar endpoint:

POST /api/umamusume/careers/{careerId}/rest-activity/cancel

Regras:

- somente cancelar um turno `REST_ACTIVITY` com status `IN_PROGRESS`;
- não aplicar ganhos ou penalidades;
- remover o turno pendente para permitir escolher outra ação no mesmo dia;
- não avançar o dia;
- não permitir usar esse endpoint para turno de treino;
- não permitir cancelar turno já concluído ou abandonado.

A remoção é aceitável nesta etapa porque o turno ainda não produziu resultado.

Adicionar operação correspondente no repository e controller mobile:

cancelRestActivity()

Na interface da atividade aceita, mostrar:

- “Concluir atividade”;
- “Cancelar atividade”.

Antes de cancelar, exibir confirmação clara.

==================================================
4. ABANDONO DA CARREIRA COM AÇÃO PENDENTE
==================================================

Alterar `abandonCareer`.

Se houver atividade de descanso pendente:

- remover ou cancelar a atividade pendente;
- encerrar a carreira como `ABANDONED`;
- preencher `completedAt`.

Se houver treino pendente com uma sessão ativa:

- continuar exigindo que a sessão seja abandonada pela tela de sessão;
- retornar mensagem clara indicando que o treino precisa ser encerrado primeiro.

Não deixar uma carreira impossível de abandonar por causa de uma atividade aceita.

==================================================
5. EFEITOS REALMENTE APLICADOS
==================================================

Atualmente o turno persiste os efeitos solicitados pela regra, mesmo quando o clamp reduz o efeito real.

Exemplo:

- energia antes: 99;
- regra: +18;
- energia final: 100;
- efeito efetivamente aplicado: +1.

Refatorar a aplicação dos efeitos.

Criar método puro ou claramente isolado, por exemplo:

UmaEffects applyAndReturnEffectiveEffects(
    UmaCareer career,
    UmaEffects requested
)

O método deve:

1. guardar todos os valores anteriores;
2. aplicar os efeitos solicitados;
3. aplicar limites;
4. calcular a diferença real entre valor anterior e final;
5. retornar `UmaEffects` com os deltas realmente aplicados.

`completeTurn` deve persistir e apresentar somente os efeitos efetivos:

UmaEffects applied = applyAndReturnEffectiveEffects(career, requested);
turn.setEffects(applied);
turn.setResultText(resultText(status, applied));

Os limites permanecem:

- atributos principais: 0–999;
- energia, fadiga, humor e confiança: 0–100.

Adicionar testes para limite máximo e mínimo de todos os grupos.

==================================================
6. RESULTADO DO TURNO
==================================================

Melhorar `resultText`.

Não incluir atributos com delta zero.

Exemplo desejado:

Treino concluído: Força +2 · Disciplina +2 · Energia -10 · Fadiga +14

Para abandono:

Sessão abandonada: Disciplina -2 · Energia -5 · Fadiga +2 · Humor -4 · Confiança -3

Para descanso:

Descanso concluído: Energia +1 · Fadiga -4

Usar os efeitos efetivamente aplicados, não os solicitados.

Manter o texto persistido como snapshot histórico.

==================================================
7. DETECÇÃO DA ORIGEM DA SESSÃO
==================================================

Criar uma função pura no mobile para determinar se uma sessão pertence à carreira atual.

Exemplo:

isUmaCareerSession(
    career: UmaCareer | null,
    sessionId: number | null
): boolean

Retornar true somente quando:

- carreira estiver `ACTIVE`;
- existir `pendingTurn`;
- o turno for `TRAINING`;
- o turno estiver `IN_PROGRESS`;
- `pendingTurn.workoutSessionId` for igual ao ID da sessão ativa.

Adicionar testes Vitest.

==================================================
8. RETOMADA PELA HOME
==================================================

A Home atualmente navega para Session sem informar origem.

Corrigir:

- se a sessão ativa corresponder ao turno pendente da carreira, navegar com:
  `{ origin: 'UMAMUSUME' }`;
- caso contrário, navegar com:
  `{ origin: 'NORMAL' }`.

Ao concluir ou abandonar uma sessão Umamusume retomada pela Home:

- atualizar a carreira;
- voltar para `UmaCareer`.

Sessões normais devem continuar indo para o histórico normal.

Não usar apenas a existência de uma carreira ativa como critério. Comparar o `workoutSessionId`.

==================================================
9. CONTINUAR TREINO COM ID CORRETO
==================================================

Na tela da carreira, substituir:

canContinueTraining = Boolean(activeSession)

por uma validação de identidade.

“Continuar treino” deve ficar habilitado somente quando:

- o turno pendente for de treino;
- existir sessão ativa;
- o ID da sessão ativa for igual ao `workoutSessionId` do turno.

Se existir turno pendente de treino, mas:

- não houver sessão ativa; ou
- houver uma sessão ativa diferente;

mostrar estado de inconsistência:

“Não foi possível localizar a sessão desta carreira.”

Oferecer botão:

“Atualizar”

Esse botão deve executar:

- refresh da sessão;
- refresh da carreira.

Não iniciar uma nova sessão automaticamente.

==================================================
10. HISTÓRICO SEM CONDIÇÃO DE CORRIDA
==================================================

Refatorar o estado de histórico no `useUmaCareerController`.

Adicionar:

- turnsCareerId;
- turnsLoading;
- turnsError.

Criar método:

loadTurns(careerId)

Regras:

- ao iniciar, limpar ou ocultar os turnos da carreira anterior;
- marcar `turnsLoading`;
- armazenar o ID da carreira carregada;
- tratar erro separado da mensagem global;
- impedir resultado antigo de sobrescrever uma requisição mais nova;
- não depender de `void refreshTurns()` antes de navegar.

`UmaCareerHistoryScreen` deve receber `careerId` pela rota e carregar o histórico ao entrar.

Mostrar:

- loading;
- erro com botão “Tentar novamente”;
- estado vazio;
- lista correta.

Não mostrar temporariamente o histórico de outra carreira.

==================================================
11. LISTA DE CARREIRAS
==================================================

Adicionar rota:

UmaCareerList

Criar tela:

UmaCareerListScreen

A tela deve listar:

- carreira ativa;
- carreiras concluídas;
- carreiras abandonadas.

Cada item deve mostrar:

- nome;
- status;
- ficha utilizada;
- semana alcançada;
- total de semanas;
- data de criação;
- atributos finais principais.

Permitir abrir qualquer carreira em modo de consulta.

No controller mobile, adicionar:

- selectedCareerId;
- selectCareer(id);
- getCareer(id), se necessário.

Ao atualizar a aplicação:

1. selecionar carreira ativa;
2. se não houver, manter a carreira anteriormente selecionada caso ainda exista;
3. caso contrário, selecionar a mais recente;
4. se não houver carreiras, usar null.

A tela `UmaCareerScreen` deve funcionar tanto para carreira ativa quanto histórica.

Para carreira concluída ou abandonada:

- mostrar atributos finais;
- mostrar histórico;
- bloquear ações;
- permitir criar nova carreira.

Adicionar acesso “Ver todas as carreiras” na tela principal.

==================================================
12. CONTROLLER MOBILE
==================================================

Não transformar o controller em outro controller global.

Manter responsabilidades apenas da feature Umamusume.

Separar busy keys:

- career:create;
- career:abandon;
- training:start;
- rest:accept:{activityId};
- rest:complete:{activityId};
- rest:cancel;
- rest:full;
- turns:load:{careerId}.

Não bloquear todas as operações por uma única string global quando isso não for necessário.

Manter proteção contra múltiplos envios da mesma operação.

==================================================
13. BACKEND E CONCORRÊNCIA
==================================================

Continuar usando `@Version` em `UmaCareer`.

Tratar conflitos de optimistic locking com mensagem compreensível:

“A carreira foi atualizada em outra operação. Atualize os dados e tente novamente.”

Garantir que duas requisições simultâneas não consigam:

- concluir o mesmo turno duas vezes;
- aplicar efeitos duplicados;
- avançar dois dias;
- aceitar duas atividades no mesmo turno.

As constraints atuais devem continuar preservadas.

Adicionar testes concorrentes ou testes que simulem versão desatualizada, caso seja viável sem tornar a suíte excessivamente complexa.

==================================================
14. TESTES BACKEND
==================================================

Adicionar testes para:

1. atividade aceita continuar concluível depois de o dia virar treino;
2. atividade aceita continuar concluível depois de ser removida da ficha;
3. atividade usar categoria snapshot;
4. cancelar atividade não avançar o dia;
5. após cancelar, permitir escolher outra ação;
6. abandonar carreira com atividade pendente;
7. impedir abandono direto com treino ativo;
8. clamp registrar delta efetivamente aplicado;
9. energia 99 com descanso +18 registrar +1;
10. fadiga 4 com descanso -12 registrar -4;
11. atributo em 998 recebendo +2 registrar +1;
12. atributo em 0 recebendo penalidade registrar 0;
13. listener continuar idempotente;
14. turno não avançar duas vezes;
15. `resultText` não conter atributos com delta zero.

==================================================
15. TESTES MOBILE
==================================================

Adicionar testes Vitest para:

- identificar sessão Umamusume pelo ID;
- rejeitar sessão ativa de outro fluxo;
- rejeitar turno sem sessão;
- identificar origem NORMAL e UMAMUSUME;
- seleção inicial da carreira;
- histórico não reutilizar dados de outra carreira;
- formatação de resultado sem deltas zero, caso essa formatação exista também no mobile.

Não adicionar testes de componentes React Native nesta etapa.

==================================================
16. DOCUMENTAÇÃO
==================================================

Atualizar README e ARCHITECTURE.md.

Documentar:

- turno aceito usa snapshots;
- efeitos históricos são deltas efetivamente aplicados;
- retomada da sessão detecta origem por ID;
- carreiras anteriores podem ser consultadas;
- ficha continua viva e editável durante a carreira;
- snapshot completo da ficha continua fora do escopo.

Não afirmar que corridas ou eventos narrativos existem.

==================================================
17. FORA DO ESCOPO
==================================================

Não implementar:

- corridas;
- provas;
- ranking;
- eventos narrativos;
- escolhas aleatórias;
- skills;
- árvore de habilidades;
- personagens;
- gacha;
- moedas;
- loja;
- achievements;
- notificações;
- offline;
- SQLite;
- snapshot completo da ficha;
- redesign geral;
- extração da biblioteca;
- remoção do domínio Workout.

==================================================
18. VALIDAÇÃO
==================================================

Executar:

Backend:
cd backend
mvn test

Mobile:
cd mobile
npm ci
npm run typecheck
npm run test
npx expo install --check
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

Web:
cd web
npm ci
npm run build

Geral:
git diff --check

Não declarar conclusão se qualquer comando falhar.

==================================================
19. ENTREGA
==================================================

Ao finalizar, informar:

1. problemas corrigidos;
2. comportamento de turnos pendentes;
3. estratégia para efeitos efetivamente aplicados;
4. mudanças na recuperação de sessões;
5. fluxo de histórico e seleção de carreiras;
6. endpoints adicionados;
7. testes adicionados;
8. resultados de todas as validações;
9. limitações restantes.

Não avançar para eventos narrativos ou corridas.