Continue o desenvolvimento do repositório `training-app` a partir do commit:

e1d09254030de51bdc3cc3d21d5b3ecc91d83426

Implemente a primeira versão jogável do **Modo Umamusume**.

O APK React Native/Expo é o produto principal. A web continua sendo apenas uma interface de debugging.

Esta etapa deve criar o loop central do modo, sem implementar corridas, personagens oficiais, gacha, skills ou eventos aleatórios complexos.

==================================================
1. OBJETIVO DA ETAPA
==================================================

O usuário deve conseguir:

1. abrir o Modo Umamusume;
2. criar uma carreira usando uma ficha semanal existente;
3. começar na segunda-feira da primeira semana;
4. executar o treino real configurado para o dia;
5. receber evolução de atributos ao concluir a sessão;
6. realizar ou recusar atividades em dias de descanso;
7. avançar de segunda a domingo;
8. avançar semanas;
9. concluir uma carreira após 8, 12 ou 16 semanas;
10. fechar e reabrir o app sem perder o progresso.

O modo deve usar os treinos reais do aplicativo. Não criar sessões falsas ou simuladas.

==================================================
2. NOMENCLATURA E DIREITOS AUTORAIS
==================================================

O nome da funcionalidade deve permanecer:

Modo Umamusume

Porém:

- não usar personagens oficiais;
- não usar nomes de personagens oficiais;
- não copiar textos, artes, músicas, ícones ou assets oficiais;
- usar avatar neutro ou placeholder original;
- usar apenas o design e a paleta já existentes no projeto.

O projeto é open source, portanto não incorporar material protegido de terceiros.

==================================================
3. ARQUITETURA BACKEND POR FEATURE
==================================================

Criar uma feature isolada:

backend/src/main/java/com/trainingapp/umamusume/
├── controller/
├── dto/
├── model/
├── repository/
├── service/
├── rules/
└── listener/

Não colocar regras do modo em:

- WorkoutSessionController;
- WorkoutSessionService;
- TrainingPlanService;
- controllers mobile;
- componentes visuais.

A integração com sessões deve ocorrer por serviço e pelos eventos de domínio já existentes.

==================================================
4. MODELO DA CARREIRA
==================================================

Criar a entidade `UmaCareer`.

Campos mínimos:

- id;
- name;
- trainingPlan;
- status;
- totalWeeks;
- currentWeek;
- currentWeekday;
- strength;
- endurance;
- agility;
- technique;
- discipline;
- energy;
- fatigue;
- mood;
- confidence;
- createdAt;
- updatedAt;
- completedAt;
- version para optimistic locking.

Enums:

CareerStatus:
- ACTIVE
- COMPLETED
- ABANDONED

Atributos iniciais:

- strength: 10
- endurance: 10
- agility: 10
- technique: 10
- discipline: 10
- energy: 100
- fatigue: 0
- mood: 60
- confidence: 50
- currentWeek: 1
- currentWeekday: MONDAY

Limites:

- atributos principais: 0–999;
- energy: 0–100;
- fatigue: 0–100;
- mood: 0–100;
- confidence: 0–100.

Permitir somente uma carreira ACTIVE nesta etapa.

`totalWeeks` deve aceitar apenas:

- 8;
- 12;
- 16.

==================================================
5. REGISTRO DOS TURNOS
==================================================

Criar `UmaCareerTurn`.

Cada turno representa um dia da carreira.

Campos mínimos:

- id;
- career;
- weekNumber;
- weekday;
- actionType;
- status;
- trainingPlanDay;
- workoutSessionId opcional;
- restActivityId opcional;
- actionTitleSnapshot;
- resultText;
- efeitos aplicados;
- createdAt;
- completedAt.

Enums:

TurnActionType:
- TRAINING
- REST_ACTIVITY
- FULL_REST

TurnStatus:
- IN_PROGRESS
- COMPLETED
- ABANDONED

Criar constraint única para:

(career_id, week_number, weekday)

Não permitir executar duas ações para o mesmo turno.

Persistir os efeitos aplicados ao turno para que o histórico explique por que cada atributo mudou.

Os efeitos podem ser armazenados com um `@Embeddable` contendo os deltas de cada atributo.

==================================================
6. CALENDÁRIO DA CARREIRA
==================================================

A carreira começa sempre em:

Semana 1 · Segunda-feira

O dia atual deve utilizar o dia correspondente da ficha associada:

- MONDAY usa o TrainingPlanDay de segunda;
- TUESDAY usa o de terça;
- e assim por diante.

Ao concluir uma ação:

- segunda avança para terça;
- terça avança para quarta;
- domingo avança para segunda e incrementa a semana.

Ao concluir o domingo da última semana:

- status passa para COMPLETED;
- completedAt é preenchido;
- nenhuma nova ação pode ser iniciada.

Nesta etapa, a carreira pode usar a ficha atual diretamente.

Não implementar snapshot completo da ficha ainda, mas documentar essa limitação.

==================================================
7. DIAS DE TREINO
==================================================

Quando o dia atual não for descanso:

- exibir o treino correspondente;
- permitir iniciar a sessão real;
- usar os exercícios configurados no TrainingPlanDay;
- criar um UmaCareerTurn com tipo TRAINING e status IN_PROGRESS;
- associar o ID da WorkoutSession criada ao turno;
- abrir a tela normal de execução de sessão.

Criar endpoint semelhante a:

POST /api/umamusume/careers/{careerId}/start-training

O backend deve:

1. validar que a carreira está ativa;
2. validar que o dia atual é de treino;
3. validar que ainda não há turno para o dia;
4. iniciar a sessão usando WorkoutSessionService;
5. criar o turno ligado à sessão;
6. retornar carreira e sessão.

Se a sessão não puder ser iniciada, não deixar turno incompleto salvo.

==================================================
8. CONCLUSÃO E ABANDONO DA SESSÃO
==================================================

Criar listener para:

- TrainingDomainEvent.SessionCompleted;
- TrainingDomainEvent.SessionAbandoned.

Ao receber o evento:

- localizar um UmaCareerTurn pelo workoutSessionId;
- ignorar sessões que não pertençam ao modo;
- impedir aplicação duplicada;
- aplicar os efeitos;
- completar ou abandonar o turno;
- avançar o dia da carreira.

Sessão concluída:

- aplica ganhos conforme os exercícios realmente concluídos;
- usa somente séries marcadas como concluídas;
- avança o dia.

Sessão abandonada:

- não concede ganhos positivos de treino;
- aplica penalidade;
- marca o turno como ABANDONED;
- avança o dia.

Penalidade inicial de abandono:

- discipline: -2
- mood: -4
- confidence: -3
- energy: -5
- fatigue: +2

Centralizar esses valores em uma classe de regras, não espalhá-los pelo listener.

==================================================
9. REGRAS DE PROGRESSÃO DO TREINO
==================================================

Criar uma classe pura:

UmaProgressionRules

Ela deve receber uma WorkoutSession concluída e retornar os deltas.

Regras iniciais por exercício concluído:

STRENGTH ou HYPERTROPHY:
- strength +2

ENDURANCE ou CARDIO:
- endurance +2
- agility +1

MOBILITY ou STRETCHING:
- technique +2
- fatigue -2

TECHNIQUE:
- technique +2
- confidence +1

RECOVERY:
- energy +4
- fatigue -5

Ganhos gerais por sessão concluída:

- discipline +2
- mood +2
- confidence +2

Custos da sessão:

- energy diminui em `8 + quantidade de séries concluídas`;
- limitar a perda máxima de energy a 30;
- fatigue aumenta em:
  - 5;
  - mais o RPE geral arredondado, usando 5 quando não informado;
  - mais metade das séries concluídas;
- limitar o ganho máximo de fatigue a 25.

Aplicar clamp após todos os efeitos.

Esses números são regras iniciais de balanceamento e devem ficar centralizados para ajuste futuro.

==================================================
10. DIAS DE DESCANSO
==================================================

Quando o dia atual for descanso:

- não permitir iniciar sessão convencional;
- listar as atividades opcionais configuradas no TrainingPlanDay;
- oferecer também “Descanso completo”.

Atividade opcional deve possuir dois passos:

1. aceitar;
2. concluir depois de realizar.

Endpoints sugeridos:

POST /api/umamusume/careers/{careerId}/rest-activities/{activityId}/accept

POST /api/umamusume/careers/{careerId}/rest-activities/{activityId}/complete

Ao aceitar:

- criar turno IN_PROGRESS;
- salvar nome, categoria e duração como snapshot;
- não aplicar efeitos;
- não avançar o dia.

Ao concluir:

- aplicar efeitos;
- marcar turno COMPLETED;
- avançar o dia.

Se o aplicativo for fechado após aceitar, a atividade deve continuar pendente ao reabrir.

==================================================
11. REGRAS DE ATIVIDADES DE DESCANSO
==================================================

Centralizar em `UmaProgressionRules`.

Normalizar categoria ignorando maiúsculas, minúsculas e acentos quando necessário.

Caminhada:

- endurance +2
- discipline +2
- mood +3
- energy -5
- fatigue -1

Mobilidade ou alongamento:

- technique +2
- discipline +1
- energy -2
- fatigue -5

Recuperação ativa:

- energy +5
- fatigue -8
- mood +1

Descanso completo:

- energy +18
- fatigue -12
- discipline -1

Categoria personalizada:

- discipline +1
- mood +1
- energy -3

Criar endpoint:

POST /api/umamusume/careers/{careerId}/full-rest

Esse endpoint representa recusar as atividades opcionais e descansar.

Ele deve:

- criar e completar o turno;
- aplicar os efeitos de descanso completo;
- avançar o dia.

==================================================
12. API
==================================================

Criar endpoints mínimos:

GET /api/umamusume/careers
GET /api/umamusume/careers/active
GET /api/umamusume/careers/{id}
GET /api/umamusume/careers/{id}/turns

POST /api/umamusume/careers
POST /api/umamusume/careers/{id}/start-training
POST /api/umamusume/careers/{id}/rest-activities/{activityId}/accept
POST /api/umamusume/careers/{id}/rest-activities/{activityId}/complete
POST /api/umamusume/careers/{id}/full-rest
POST /api/umamusume/careers/{id}/abandon

As respostas da carreira devem incluir:

- atributos;
- semana atual;
- weekday atual;
- ficha associada;
- dados resumidos do dia atual;
- turno atual pendente;
- progresso percentual da carreira;
- últimos resultados.

Controllers devem permanecer finos.

==================================================
13. ARQUITETURA MOBILE
==================================================

Criar:

mobile/src/features/umamusume/
├── model/
├── repository/
├── service/
├── controller/
└── views/

Criar `UmaCareerRepository` e implementação HTTP.

Criar controller próprio, sem adicionar estado ao `useTrainingController`.

Operações mínimas:

- refresh;
- createCareer;
- startTraining;
- acceptRestActivity;
- completeRestActivity;
- fullRest;
- abandonCareer.

==================================================
14. NAVEGAÇÃO MOBILE
==================================================

Adicionar “Modo Umamusume” à tela `More`.

A tela `MoreScreen` atualmente contém apenas os atalhos legados e biblioteca; ampliar o contrato sem misturar regras nela.

Adicionar rotas tipadas:

- UmaCareer
- UmaCareerCreate
- UmaCareerHistory

Fluxo:

Mais
→ Modo Umamusume
→ carreira ativa ou criação

Ao iniciar treino pelo modo:

- navegar para a tela Session já existente;
- marcar a origem da navegação como UMAMUSUME.

Atualizar a rota Session para aceitar:

origin?: NORMAL | UMAMUSUME

Ao concluir ou abandonar uma sessão:

- NORMAL retorna ao Histórico;
- UMAMUSUME retorna à tela da carreira;
- atualizar a carreira ao retornar.

Não duplicar a tela de execução de treino.

==================================================
15. INTEGRAÇÃO COM O CONTROLLER DE SESSÃO
==================================================

O endpoint de início da carreira deve retornar a WorkoutSession criada.

Adicionar ao `useWorkoutSessionController` uma operação explícita, por exemplo:

adoptSession(session)

Ela deve:

- definir a sessão retornada como ativa;
- atualizar a lista local;
- não iniciar uma segunda requisição;
- não duplicar regras de sessão.

Não expor setters React diretamente.

==================================================
16. TELA PRINCIPAL DO MODO
==================================================

Criar uma tela mobile-first para 360–430 px.

Exibir:

- nome da carreira;
- semana atual e total;
- dia atual;
- progresso da temporada;
- ficha associada;
- status principais;
- energy;
- fatigue;
- mood;
- confidence;
- ação disponível para o dia;
- resultado do último turno.

Atributos principais:

- Força
- Resistência
- Agilidade
- Técnica
- Disciplina

Usar barras compactas para:

- energia;
- fadiga;
- humor;
- confiança.

Não usar gráficos complexos.

Não copiar a interface oficial. Criar uma interface original coerente com o aplicativo atual.

==================================================
17. AÇÃO DO DIA
==================================================

Dia de treino:

- mostrar nome;
- quantidade de exercícios;
- duração estimada;
- botão “Iniciar treino”.

Se já existir uma sessão ativa do modo:

- mostrar “Continuar treino”.

Dia de descanso sem atividade aceita:

- listar atividades opcionais;
- botão para aceitar cada atividade;
- botão “Descanso completo”.

Atividade aceita:

- mostrar nome e duração;
- botão “Concluir atividade”;
- não permitir escolher outra ação.

Carreira concluída:

- mostrar resumo final;
- bloquear novas ações.

==================================================
18. TESTES BACKEND
==================================================

Adicionar testes para:

- criar carreira com ficha válida;
- rejeitar duração diferente de 8, 12 ou 16;
- impedir duas carreiras ativas;
- iniciar na segunda da semana 1;
- impedir treino em dia de descanso;
- impedir atividade de descanso em dia de treino;
- concluir sessão de força e aplicar ganhos;
- concluir sessão de cardio e aplicar ganhos;
- abandonar sessão, aplicar penalidade e avançar;
- ignorar sessão não vinculada a uma carreira;
- aceitar atividade sem avançar;
- concluir atividade e avançar;
- descanso completo;
- impedir duas ações no mesmo turno;
- domingo avançar para próxima semana;
- último domingo concluir a carreira;
- atributos respeitarem limites;
- listener não aplicar efeitos duas vezes.

Testar `UmaProgressionRules` separadamente como regra pura.

==================================================
19. TESTES MOBILE
==================================================

Usar Vitest somente para regras puras nesta etapa.

Adicionar testes para:

- cálculo de progresso da carreira;
- formatação de semana e dia;
- clamp visual dos atributos;
- identificação de ação disponível pelo estado recebido.

Não adicionar testes de componentes React Native agora.

==================================================
20. FORA DO ESCOPO
==================================================

Não implementar nesta etapa:

- corridas;
- provas;
- ranking;
- skills;
- árvore de habilidades;
- eventos aleatórios narrativos;
- escolhas aleatórias;
- personagens oficiais;
- criação de personagem;
- roupas;
- gacha;
- moedas;
- loja;
- achievements;
- notificações;
- offline;
- SQLite;
- sincronização;
- snapshot completo da ficha;
- redesign das telas normais.

==================================================
21. VALIDAÇÃO
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
22. ENTREGA
==================================================

Ao finalizar, informar:

1. entidades e enums criados;
2. regras de progressão;
3. endpoints;
4. integração com eventos de sessão;
5. estrutura mobile criada;
6. fluxo de navegação;
7. testes adicionados;
8. resultados das validações;
9. limitações restantes.

Não avançar para corridas ou eventos narrativos nesta etapa.