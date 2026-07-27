Continue o hardening incremental do repositório `training-app` a partir do commit:

a76ae785bd5d371173aaa9aa61f942978e184b27

Esta etapa é um patch de estabilidade e usabilidade. Não extraia novas features e não implemente o Modo Umamusume.

O APK React Native/Expo continua sendo o produto principal. A web serve apenas para debugging.

==================================================
1. OBJETIVO
==================================================

Corrigir problemas residuais da feature `training-plan`, tornar os testes mobile reproduzíveis, garantir integridade dos sete dias e adicionar CI básico.

Não fazer redesign amplo.

==================================================
2. PROTEGER FORMULÁRIOS NÃO SALVOS
==================================================

Criar um hook reutilizável, por exemplo:

src/core/navigation/useUnsavedChangesGuard.ts

Aplicar em:

- TrainingPlanEditorScreen
- TrainingPlanDayScreen
- DayExerciseEditorScreen
- RestActivityEditorScreen

Regras:

- comparar o formulário atual com um snapshot inicial normalizado;
- considerar `dirty` somente quando houver alteração real;
- interceptar botão voltar do Android, gesto de voltar e navegação programática;
- exibir confirmação:
  - continuar editando;
  - descartar alterações;
- não exibir confirmação quando nada mudou;
- após salvar com sucesso, atualizar o snapshot antes de sair;
- evitar alertas duplicados;
- não bloquear navegação após uma operação concluída.

==================================================
3. CORRIGIR ESTADO DO DIA
==================================================

Em `TrainingPlanDayScreen`, a interface atualmente usa o valor persistido `day.restDay` para decidir se mostra exercícios ou atividades, embora o checkbox use o estado local `restDay`.

Corrigir para que:

- a interface reaja imediatamente ao estado local `restDay`;
- ao marcar descanso, os exercícios sejam escondidos e as atividades apareçam;
- ao desmarcar, os exercícios reapareçam;
- nenhuma informação seja apagada;
- iniciar treino continue permitido somente após o estado ter sido salvo no backend;
- alterações não salvas sejam protegidas pelo guard.

Após salvar, sincronizar o formulário e o snapshot com a resposta atualizada.

==================================================
4. FICHAS ARQUIVADAS
==================================================

Adicionar uma rota/tela simples:

ArchivedTrainingPlansScreen

Permitir:

- listar fichas arquivadas;
- visualizar nome, categoria e última atualização;
- restaurar ficha usando `archive(id, false)`;
- editar ou ativar somente depois de restaurar;
- mostrar estado vazio quando não houver arquivadas.

Adicionar acesso pela tela de edição/gestão de fichas.

A aba principal deve continuar escondendo fichas arquivadas.

Ao arquivar a ficha selecionada:

- selecionar outra ficha não arquivada;
- não chamar `setSelectedTrainingPlanId` dentro do callback de `setTrainingPlans`;
- manter os setters de estado puros;
- usar uma função de reconciliação ou efeito separado.

==================================================
5. AÇÕES DESTRUTIVAS
==================================================

Adicionar confirmação antes de remover atividade de descanso.

Texto deve informar claramente:

- nome da atividade;
- que a remoção não poderá ser desfeita.

Também impedir múltiplos toques durante a remoção.

Manter a confirmação já existente para exercícios.

==================================================
6. SELETOR DE EXERCÍCIOS ESCALÁVEL
==================================================

Remover a renderização da biblioteca inteira dentro do `ScrollView` de `TrainingPlanDayScreen`.

Criar uma tela ou componente dedicado:

ExercisePickerScreen

Requisitos:

- usar `FlatList`;
- busca por nome, grupo muscular e equipamento;
- filtro opcional por categoria;
- excluir exercícios arquivados;
- mostrar estado vazio;
- preservar a confirmação quando o exercício já existe no dia;
- abrir `DayExerciseEditorScreen` somente após a seleção.

Reutilizar uma versão pesquisável para escolher exercício alternativo.

Não renderizar centenas de exercícios como chips horizontais.

Não extrair ainda a feature `exercise-library`.

==================================================
7. TESTE REAL DO CRONÔMETRO
==================================================

O arquivo atual `workoutSession.test.ts` contém asserts, mas não é executado por nenhum script.

Adicionar uma suíte de testes mobile mínima e reproduzível.

Preferência:

- Vitest;
- somente testes de funções puras nesta etapa;
- sem testes de UI.

Converter o teste atual para uma suíte real cobrindo:

- +15 segundos em timer ativo;
- -15 segundos em timer ativo sem ficar negativo;
- +15 segundos em timer pausado usando `pausedAt`;
- -15 segundos em timer pausado respeitando o limite congelado;
- retomar preservando o tempo restante.

Adicionar ao `package.json`:

npm run test

O comando deve executar os testes e retornar código diferente de zero em falha.

==================================================
8. INTEGRIDADE DOS SETE DIAS
==================================================

Garantir no banco que uma ficha não possa possuir dois registros para o mesmo weekday.

Adicionar constraint única para:

(training_plan_id, weekday)

Requisitos:

- atualizar a entidade JPA;
- criar migração compatível com o H2 atual;
- não apagar silenciosamente dias duplicados que contenham exercícios ou atividades;
- se existirem duplicatas com dados, interromper a migração com mensagem clara;
- duplicatas vazias podem ser consolidadas de forma segura, caso necessário;
- validar a migração com testes.

Remover reparos durante endpoints GET.

Atualmente `findAll` e `findById` podem completar dias ausentes e escrever no banco. Leituras devem ser puras.

Mover a correção de bases antigas para:

- inicialização/migração controlada; ou
- serviço específico de reparo executado uma vez.

Criação e duplicação de ficha devem continuar gerando exatamente sete dias.

Adicionar testes para:

- rejeitar weekday duplicado;
- completar dias ausentes em base antiga;
- não duplicar dias ao executar reparo mais de uma vez;
- ficha criada possuir exatamente sete weekdays únicos;
- endpoints GET não modificarem dados.

==================================================
9. ERROS E CHAVES DE OPERAÇÃO
==================================================

Substituir chaves genéricas como:

day:{id}

por chaves contextuais:

- day:update:{id}
- day:exercise:add:{id}
- day:exercise:reorder:{id}
- day:activity:add:{id}
- day:activity:reorder:{id}
- exercise:update:{id}
- exercise:remove:{id}
- activity:update:{id}
- activity:remove:{id}

Cada erro deve aparecer próximo à ação correspondente.

Não permitir que erro de ordenação apareça como erro do formulário do dia.

==================================================
10. DOCUMENTAÇÃO
==================================================

Atualizar README e ARCHITECTURE.md:

- arquitetura MVC por feature no mobile;
- novos endpoints da ficha;
- comandos reais de teste mobile;
- quantidade atual de testes sem fixar número que ficará obsoleto;
- deixar claro que o fluxo legado `Workout` ainda existe;
- não chamar o aplicativo inteiro de “completo”;
- documentar que o APK ainda depende da API e não possui offline.

Não documentar funcionalidades não implementadas.

==================================================
11. CI NO GITHUB
==================================================

Criar:

.github/workflows/ci.yml

Usar:

- Java 21;
- Maven;
- Node compatível com `>=20.19.4`;
- cache de Maven e npm.

Jobs:

Backend:
- mvn test

Mobile:
- npm ci
- npm run typecheck
- npm run test
- npx expo install --check
- EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist

Web:
- npm ci
- npm run build

Não exigir secrets.

==================================================
12. FORA DO ESCOPO
==================================================

Não implementar:

- Modo Umamusume;
- extração de exercise-library;
- remoção do domínio legado Workout;
- SQLite;
- offline;
- sincronização;
- autenticação;
- gráficos;
- drag-and-drop;
- redesign amplo;
- testes de componentes React Native.

==================================================
13. VALIDAÇÃO FINAL
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

Não declarar conclusão se algum comando falhar.

==================================================
14. ENTREGA
==================================================

Ao finalizar, informar:

1. bugs corrigidos;
2. arquivos criados e alterados;
3. comportamento dos guards de formulário;
4. estratégia usada para integridade dos sete dias;
5. testes adicionados;
6. resultado de cada comando;
7. workflow de CI criado;
8. limitações restantes.

Não avançar para outra feature.