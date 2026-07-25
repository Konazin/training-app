Continue o hardening incremental do repositório atual `training-app`, a partir do commit:

b810861db20cfdfa6a5d5688a029804eef5423b0

O APK React Native/Expo é o produto principal. A web serve somente para debugging.

A feature `workout-session` já foi extraída para MVC por feature. Não refatore novamente essa feature, exceto pela pequena correção do cronômetro descrita abaixo.

O objetivo desta etapa é extrair e completar somente a feature `training-plan`.

==================================================
1. ESTADO ATUAL QUE DEVE SER RESPEITADO
==================================================

Atualmente:

- `useTrainingController` ainda controla fichas, biblioteca, dashboard e o domínio legado de Workout.
- `WeeklyPlanScreen` usa fichas semanais.
- exercícios adicionados ao dia recebem silenciosamente:
  - 3 séries;
  - 8–12 repetições;
  - carga 0;
  - descanso 60 segundos;
  - tipo NORMAL.
- atividades de descanso recebem silenciosamente:
  - 15 minutos;
  - categoria “Recuperação ativa”.
- o backend já suporta:
  - criar, atualizar, excluir, duplicar, ativar e arquivar ficha;
  - atualizar dia;
  - adicionar, remover e reordenar exercícios do dia;
  - adicionar e remover atividades de descanso.
- ainda faltam:
  - editar configuração do exercício do dia;
  - editar atividade de descanso;
  - reordenar atividades de descanso.
- o backend atualmente impede transformar um dia com exercícios em descanso.
- `ExerciseScreen` ainda contém um ramo legado para adicionar `PlanExercise` diretamente à ficha.

Não implemente o Modo Umamusume nesta etapa.

==================================================
2. ARQUITETURA MOBILE
==================================================

Criar:

src/features/training-plan/
├── model/
├── repository/
├── service/
├── controller/
└── views/

Criar a interface `TrainingPlanRepository` com:

- list()
- getById()
- create()
- update()
- activate()
- duplicate()
- archive()
- updateDay()
- addDayExercise()
- updateDayExercise()
- removeDayExercise()
- reorderDayExercises()
- addRestActivity()
- updateRestActivity()
- removeRestActivity()
- reorderRestActivities()

Criar implementação HTTP em:

src/features/training-plan/service/httpTrainingPlanRepository.ts

Extrair do `useTrainingController`:

- trainingPlans;
- selectedTrainingPlanId;
- selectedTrainingPlan;
- createTrainingPlan;
- removeTrainingPlan;
- activateTrainingPlan;
- updatePlanDay;
- addDayExercise;
- addRestActivity;
- demais operações da ficha.

Não duplicar esses estados entre controllers.

O controller da ficha deve atualizar somente o estado de `training-plan`. Alterar uma ficha não deve recarregar dashboard, workouts, biblioteca e histórico.

A biblioteca de exercícios pode continuar sendo fornecida como dependência somente para leitura. Não extraia `exercise-library` nesta etapa.

==================================================
3. REMOVER RAMO MOBILE LEGADO DA FICHA
==================================================

O fluxo moderno usa:

TrainingPlan
→ TrainingPlanDay
→ TrainingDayExercise

Remover do mobile o ramo que adiciona `PlanExercise` diretamente à ficha:

- remover destination `plan` de `ExerciseScreen`;
- remover `addPlanExercise` e `removePlanExercise` do controller mobile;
- remover o estado `exerciseDestination` quando ele deixar de ser necessário;
- manter `ExerciseScreen` somente para o domínio legado de Workout;
- não excluir ainda os endpoints de compatibilidade do backend.

Não adicionar novas funcionalidades ao domínio legado.

==================================================
4. NAVEGAÇÃO
==================================================

Integrar a feature nova com a navegação existente.

Adicionar rotas tipadas para:

- TrainingPlanEditor
- TrainingPlanDay
- DayExerciseEditor
- RestActivityEditor

A aba “Ficha” deve exibir a ficha ativa e permitir selecionar outra.

O controller deve selecionar inicialmente:

1. a ficha ativa;
2. se não houver, a primeira não arquivada;
3. se não houver ficha, nenhuma seleção.

Não selecionar simplesmente o primeiro item retornado pela API.

Não colocar toda a edição em um único modal.

==================================================
5. EDIÇÃO DA FICHA
==================================================

Permitir:

- criar ficha;
- editar nome;
- editar descrição;
- editar categoria;
- editar dificuldade;
- ativar;
- duplicar;
- arquivar.

Não excluir automaticamente fichas antigas ao ativar uma nova.

Toda ficha deve possuir exatamente os sete dias da semana.

Para bases antigas parcialmente preenchidas, completar apenas os dias ausentes sem duplicar dias existentes.

==================================================
6. EDIÇÃO DO DIA
==================================================

Cada dia deve permitir editar:

- título;
- descrição;
- duração estimada;
- observações;
- estado de descanso.

Usar um controle claro para:

[ ] Marcar como dia de descanso

Ao marcar como descanso:

- preservar todos os exercícios;
- não apagar ou desativar registros no banco;
- esconder a montagem convencional na interface;
- impedir iniciar sessão convencional;
- mostrar atividades opcionais.

Ao transformar novamente em treino:

- restaurar os exercícios já configurados.

Remover do backend a validação que obriga remover exercícios antes de marcar descanso.

Sessões históricas não devem ser alteradas.

==================================================
7. CONFIGURAÇÃO DOS EXERCÍCIOS
==================================================

Ao escolher um exercício da biblioteca, abrir `DayExerciseEditor`.

Não criar o exercício imediatamente com valores fixos.

Permitir configurar antes de salvar:

- séries;
- repetições mínimas;
- repetições máximas;
- carga planejada;
- duração planejada;
- distância planejada;
- descanso;
- RPE planejado;
- tipo de série;
- observações;
- exercício alternativo.

Tipos:

- NORMAL
- WARM_UP
- DROP_SET
- BI_SET
- CIRCUIT
- TO_FAILURE
- CONTROLLED_TEMPO

Mostrar campos conforme a categoria:

- força/hipertrofia: séries, repetições e carga;
- cardio: duração e distância;
- exercício temporizado: duração;
- mobilidade/alongamento: duração e observação.

Depois de adicionado, permitir:

- editar;
- remover;
- mover para cima;
- mover para baixo.

Nesta etapa, usar botões de subir/descer em vez de adicionar dependência de drag-and-drop.

A reordenação enviada ao backend deve:

- conter todos os IDs existentes;
- não conter IDs duplicados;
- não conter IDs pertencentes a outro dia.

Não proibir completamente exercícios duplicados no mesmo dia, pois podem existir usos intencionais. Pedir confirmação no mobile ao adicionar uma duplicata.

==================================================
8. ATIVIDADES DE DESCANSO
==================================================

Permitir criar e editar:

- nome;
- descrição;
- categoria;
- duração estimada;
- indicação de opcional.

Permitir:

- editar;
- remover;
- mover para cima;
- mover para baixo.

Categorias sugeridas na interface:

- caminhada;
- mobilidade;
- alongamento;
- recuperação ativa;
- descanso completo;
- personalizada.

Não transformar categorias em enum rígido no banco.

==================================================
9. BACKEND
==================================================

Adicionar:

PUT /api/training-plans/{planId}/days/{dayId}/exercises/{exerciseId}

PUT /api/training-plans/{planId}/days/{dayId}/rest-activities/{activityId}

PUT /api/training-plans/{planId}/days/{dayId}/rest-activities/order

Para atualizar exercício, criar um DTO próprio de configuração. Não permitir trocar silenciosamente o exercício-base pelo ID de outro exercício durante a edição.

Manter controller fino e regras em `TrainingPlanService`.

Validar:

- séries maiores que zero;
- repetições não negativas;
- máximo maior ou igual ao mínimo;
- carga, duração, distância e descanso não negativos;
- RPE entre 1 e 10;
- exercício pertencente ao dia e à ficha;
- atividade pertencente ao dia e à ficha;
- listas de reordenação sem IDs ausentes, externos ou duplicados.

==================================================
10. ESTADO E ERROS
==================================================

No controller da ficha:

- loading por operação;
- chave busy por ficha, dia, exercício ou atividade;
- erro contextual;
- impedir envios duplicados;
- preservar formulário quando a API falhar;
- não substituir toda a tela por loading;
- atualizar o estado usando a resposta retornada pelo backend;
- não executar refresh global depois de uma mutação.

==================================================
11. CORREÇÃO RESIDUAL DO CRONÔMETRO
==================================================

Corrigir apenas este problema em `useWorkoutSessionController`:

- ao usar +15 ou -15 durante uma sessão pausada, calcular a alteração com base no tempo restante congelado em `pausedAt`;
- não usar `Date.now()` como limite para um timer pausado;
- preservar corretamente o tempo restante após retomar.

Adicionar uma função pura para o cálculo, caso facilite o teste.

Não realizar outras refatorações na feature de sessão.

==================================================
12. TESTES
==================================================

Adicionar testes backend para:

- ficha criada com sete dias;
- completar dias ausentes sem duplicação;
- transformar treino com exercícios em descanso;
- voltar de descanso para treino preservando exercícios;
- editar exercício do dia;
- remover exercício;
- reordenar exercícios;
- rejeitar lista de reordenação duplicada;
- criar, editar, remover e reordenar atividade de descanso;
- impedir iniciar sessão convencional em descanso;
- manter sessão histórica intacta após alteração da ficha.

Executar:

Backend:
mvn test

Mobile:
npm run typecheck
EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

Web:
npm run build

Geral:
git diff --check

==================================================
13. FORA DO ESCOPO
==================================================

Não implementar:

- Modo Umamusume;
- eventos narrativos;
- atributos;
- SQLite;
- sincronização offline;
- autenticação;
- gráficos;
- dieta;
- drag-and-drop;
- extração da biblioteca;
- remoção dos endpoints legados backend;
- grande redesign visual.

==================================================
14. CRITÉRIOS DE ACEITAÇÃO
==================================================

Concluir somente quando:

- `training-plan` estiver em MVC por feature;
- o controller global não controlar mais fichas;
- o ramo móvel legado de PlanExercise tiver sido removido;
- ficha e dias puderem ser editados;
- descanso preservar exercícios;
- exercício puder ser configurado antes de ser adicionado;
- exercício puder ser editado, removido e reordenado;
- atividade de descanso puder ser criada, editada, removida e reordenada;
- nenhuma mutação da ficha recarregar as outras features;
- navegação Android funcionar;
- cronômetro pausado ajustar corretamente ±15 segundos;
- testes, typecheck, export Android, build web e diff check passarem.

Ao final, listar arquivos alterados, endpoints, testes, validações e limitações.
Não avançar para outra feature.