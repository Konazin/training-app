Continue o desenvolvimento do repositório `training-app` a partir do commit:

f0eb7601bbdd1d4dd723fcafa56366d7a074d26f

Este é o MARCO 1 do novo roadmap do aplicativo:

CICLO DE VIDA DAS FICHAS E LIXEIRA LOCAL

O aplicativo deve continuar:

- local-only;
- offline-first;
- sem backend obrigatório;
- sem VPS;
- sem login;
- com SQLite como fonte de verdade;
- com histórico baseado em snapshots;
- compatível com a integração Wger já implementada.

Trabalhe principalmente em:

packages/training-domain/
packages/training-local-db/
mobile/
docs/

Não alterar funcionalmente:

backend/
web/
umamusume-mobile/
packages/training-wger/

Não implementar nesta etapa:

- nova Home;
- templates de ficha;
- novos temas;
- animações;
- catálogo inicial expandido;
- thumbnails;
- múltiplos providers;
- IA;
- Health Connect;
- nuvem;
- novas funcionalidades de treino.

==================================================
1. OBJETIVO DO MARCO
==================================================

Implementar uma lixeira local segura para fichas de treino.

O ciclo de vida deve distinguir claramente:

1. ficha ativa;
2. ficha inativa;
3. ficha arquivada;
4. ficha na lixeira;
5. ficha apagada permanentemente.

Arquivar e excluir não são a mesma ação.

Arquivar:

- mantém a ficha salva;
- mantém a ficha fora da seleção principal;
- permite restauração normal;
- não inicia contagem para exclusão.

Mover para a lixeira:

- desativa a ficha;
- remove a ficha das listas normais;
- inicia retenção de sete dias;
- permite desfazer e restaurar;
- resulta em exclusão permanente após a retenção.

==================================================
2. ROADMAP DO PRODUTO
==================================================

Criar:

docs/PRODUCT_ROADMAP.md

Registrar os seis marcos planejados:

1. ciclo de vida das fichas e lixeira;
2. editor de ficha e templates;
3. Home semanal limpa;
4. skins, animações e acessibilidade;
5. biblioteca inicial e mídia;
6. providers, inteligência local e release candidate.

No Marco 1, registrar como aprovados:

- lixeira com sete dias;
- badge com quantidade;
- aviso de expiração;
- backup antes de esvaziar;
- lixeira incluída no backup;
- confirmação reforçada para exclusão permanente.

Registrar que estão adiados:

- ordenação avançada da lixeira;
- auditoria detalhada da origem da exclusão.

Não implementar itens dos marcos seguintes.

==================================================
3. MODELO DE DOMÍNIO
==================================================

Adicionar ao modelo TrainingPlan:

- deletedAt: string | null;
- purgeAt: string | null.

Não substituir `active` e `archived` por um enum nesta etapa.

Regras válidas:

Ficha normal:
- deletedAt = null;
- purgeAt = null.

Ficha na lixeira:
- deletedAt contém timestamp ISO UTC;
- purgeAt contém timestamp ISO UTC;
- purgeAt é exatamente sete dias após deletedAt;
- active = false;
- archived = false.

Ficha arquivada:
- archived = true;
- active = false;
- deletedAt = null;
- purgeAt = null.

Ficha ativa:
- active = true;
- archived = false;
- deletedAt = null;
- purgeAt = null.

Nunca permitir:

- ficha ativa e arquivada;
- ficha ativa e na lixeira;
- ficha arquivada e na lixeira;
- deletedAt sem purgeAt;
- purgeAt sem deletedAt;
- purgeAt menor ou igual a deletedAt.

==================================================
4. FUNÇÕES PURAS DE DOMÍNIO
==================================================

Criar funções puras e testáveis:

computeTrainingPlanPurgeAt(
  deletedAt: Date,
  retentionDays?: number
): string

trainingPlanTrashDaysRemaining(
  purgeAt: string,
  now?: Date
): number

trainingPlanTrashStatusLabel(
  purgeAt: string,
  now?: Date
): string

validateTrainingPlanLifecycle(plan): void

A retenção padrão deve ser:

7 dias exatos, equivalentes a 7 * 24 horas.

Labels esperadas:

- mais de um dia:
  “Será apagada em 5 dias”

- um dia:
  “Será apagada amanhã”

- menos de 24 horas:
  “Será apagada hoje”

- vencida:
  “Pronta para exclusão”

O cálculo deve ser determinístico e não depender do timezone para comparar
timestamps UTC.

==================================================
5. MIGRATION SQLITE
==================================================

Não editar migrations 1, 2, 3 ou 4.

Criar migration 5:

training_plan_trash

Adicionar em training_plans:

- deleted_at TEXT;
- purge_at TEXT.

Adicionar índice:

training_plan_trash_lookup

sobre:

- deleted_at;
- purge_at.

Adicionar índice ou ajuste de consulta para listagem das fichas normais sem
prejudicar a listagem da lixeira.

Quando viável sem reconstrução insegura da tabela, criar triggers que impeçam:

- active = 1 com archived = 1;
- active = 1 com deleted_at preenchido;
- archived = 1 com deleted_at preenchido;
- apenas um dos timestamps deleted_at/purge_at preenchido.

Caso triggers tornem a migration excessivamente complexa, manter as garantias
no domínio e repositories, mas documentar a decisão.

Não usar `IF NOT EXISTS` para esconder inconsistências do histórico de
migrations.

Testar:

- upgrade migration 4 para 5;
- banco novo migrations 1 a 5;
- segunda inicialização;
- checksums imutáveis;
- dados antigos preservados;
- fichas existentes recebem deleted_at e purge_at nulos.

==================================================
6. REPOSITORY DE LIXEIRA
==================================================

Criar interface separada:

TrainingPlanTrashRepository

Métodos:

list(): Promise<TrainingPlan[]>

count(): Promise<number>

moveToTrash(
  planId: number,
  deletedAt?: Date
): Promise<TrainingPlan>

restore(
  planId: number
): Promise<TrainingPlan>

deletePermanently(
  planId: number
): Promise<void>

emptyTrash(): Promise<number>

purgeExpired(
  now?: Date
): Promise<number>

Adicionar ao composition root:

repositories.planTrash

Não misturar operações de lixeira com `BackupRepository.reset()`.

==================================================
7. MOVER PARA A LIXEIRA
==================================================

`moveToTrash` deve executar em transação.

Fluxo:

1. buscar ficha;
2. rejeitar ficha inexistente;
3. rejeitar ficha já na lixeira;
4. verificar sessão ativa ou pausada;
5. caso exista sessão ativa ligada à ficha, bloquear;
6. calcular deletedAt;
7. calcular purgeAt em sete dias;
8. definir active = false;
9. definir archived = false;
10. persistir deleted_at e purge_at;
11. atualizar updated_at;
12. retornar a ficha alterada.

Erro de domínio sugerido:

ACTIVE_SESSION_USES_TRAINING_PLAN

Mensagem:

“Conclua ou abandone a sessão ativa antes de excluir esta ficha.”

Não abandonar ou concluir sessão automaticamente.

==================================================
8. LISTAGENS E CONSULTAS
==================================================

Por padrão, fichas na lixeira não podem aparecer em:

- lista normal de fichas;
- seletor de ficha;
- ficha ativa;
- dashboard;
- tela de arquivadas;
- criação de sessão;
- duplicação;
- ativação;
- edição;
- reordenação;
- busca normal por ID.

A tela de lixeira deve usar uma consulta explícita que retorna apenas:

deleted_at IS NOT NULL

A tela de arquivadas deve retornar apenas:

archived = 1
AND deleted_at IS NULL

A listagem normal deve retornar apenas:

archived = 0
AND deleted_at IS NULL

A ativação deve exigir:

archived = 0
AND deleted_at IS NULL

O início de sessão deve rejeitar uma ficha na lixeira mesmo que um ID antigo seja
fornecido diretamente.

==================================================
9. RESTAURAÇÃO
==================================================

Ao restaurar uma ficha:

- deletedAt = null;
- purgeAt = null;
- active = false;
- archived = false;
- updatedAt atualizado.

A ficha volta como inativa.

Não reativar automaticamente, mesmo que fosse ativa antes da exclusão.

Não registrar estado anterior nesta etapa.

Não restaurar fichas já apagadas permanentemente.

==================================================
10. EXCLUSÃO PERMANENTE
==================================================

`deletePermanently` deve aceitar apenas fichas que já estejam na lixeira.

Não permitir apagar permanentemente:

- ficha normal;
- ficha arquivada;
- ficha ativa;
- ficha usada por sessão ativa ou pausada.

A exclusão deve:

- apagar training_plan_days por cascade;
- apagar training_day_exercises por cascade;
- apagar rest_activities por cascade;
- preservar workout_sessions;
- preservar workout_session_exercises;
- preservar workout_set_logs;
- preservar nomes e snapshots do histórico.

O histórico não pode depender da existência posterior da ficha.

Adicionar teste explícito:

1. criar ficha;
2. iniciar e concluir sessão;
3. mover ficha para lixeira;
4. excluir permanentemente;
5. confirmar que o histórico e snapshots continuam legíveis.

==================================================
11. EXPURGO AUTOMÁTICO
==================================================

Executar purgeExpired:

- durante o bootstrap local, após migrations e inicialização;
- ao abrir a tela da lixeira;
- após restaurar um backup.

O expurgo deve remover apenas fichas onde:

deleted_at IS NOT NULL
AND purge_at <= now

Não apagar:

- ficha normal;
- ficha arquivada;
- ficha ainda dentro dos sete dias;
- ficha ligada a sessão ativa ou pausada.

O expurgo deve ser transacional.

Não executar serviço em background.

Não adicionar WorkManager, cron job, servidor ou processo externo.

==================================================
12. BADGE DA LIXEIRA
==================================================

Na tela Mais, adicionar entrada:

Lixeira de fichas

Exibir badge com a quantidade atual.

Exemplos:

- sem itens: sem badge ou badge oculto;
- um item: 1;
- nove itens: 9;
- mais de 99: 99+.

O badge deve atualizar após:

- mover ficha;
- desfazer;
- restaurar;
- excluir permanentemente;
- esvaziar;
- expurgo;
- restaurar backup.

Acessibilidade:

“Lixeira de fichas, 3 itens”

Não alterar a Home neste marco.

==================================================
13. TELA DA LIXEIRA
==================================================

Criar rota:

TrainingPlanTrash

Criar tela:

TrainingPlanTrashScreen

Cada card deve mostrar:

- nome da ficha;
- categoria;
- dificuldade;
- data da exclusão;
- aviso de tempo restante;
- Restaurar;
- Excluir permanentemente.

Estados:

- carregando;
- vazia;
- com itens;
- erro;
- expurgando;
- restaurando;
- excluindo;
- esvaziando.

Estado vazio:

“Não há fichas na lixeira.”

Descrição:

“As fichas excluídas ficam aqui por sete dias antes da remoção permanente.”

Adicionar ação:

Esvaziar lixeira

Mostrar apenas quando houver pelo menos uma ficha.

Não implementar ordenação avançada neste marco.

Ordenar inicialmente por:

purge_at ASC

ou seja, fichas próximas de expirar primeiro.

Essa ordenação básica é necessária para segurança e não constitui o sistema
avançado adiado.

==================================================
14. AVISO DE EXPIRAÇÃO
==================================================

Exibir labels usando a função pura do domínio.

Estilos:

- mais de 2 dias: texto secundário;
- 2 dias ou menos: warning;
- pronta para exclusão: danger.

Não depender apenas da cor.

Usar também texto explícito.

Exemplo:

“Será apagada amanhã”

Não atualizar a tela a cada segundo.

Atualizar ao:

- abrir tela;
- voltar do background;
- restaurar;
- excluir;
- realizar pull-to-refresh.

==================================================
15. DESFAZER EXCLUSÃO
==================================================

Depois de mover uma ficha para a lixeira:

- voltar para a tela anterior;
- mostrar Snackbar global;
- mensagem:
  “Ficha movida para a lixeira.”
- ação:
  “Desfazer”

A ação Desfazer deve restaurar a ficha.

Como a restauração sempre volta inativa, desfazer também retorna a ficha como
inativa.

Estender o componente Toast/Snackbar atual para aceitar opcionalmente:

- actionLabel;
- onAction;
- duração configurável.

Requisitos:

- ação acessível;
- ação com touch target mínimo;
- não cobrir tab bar;
- não cobrir teclado;
- não armazenar callback no domínio ou SQLite;
- limpar a ação ao expirar;
- evitar executar duas vezes.

Duração recomendada para Snackbar com ação:

6 segundos.

Se o desfazer falhar, mostrar erro normal e manter a ficha na lixeira.

==================================================
16. EDITOR DA FICHA
==================================================

No TrainingPlanEditorScreen, manter:

- Salvar;
- Ativar;
- Duplicar;
- Arquivar.

Adicionar seção visual separada:

ZONA DE PERIGO

Conteúdo:

“Mover ficha para a lixeira”

Descrição:

“Ela poderá ser restaurada durante sete dias.”

A ação deve:

- exigir que não existam alterações não salvas;
- pedir confirmação;
- chamar moveToTrash;
- navegar para trás quando concluída;
- mostrar Snackbar com Desfazer.

Não adicionar ainda:

- dropdown de categoria;
- dropdown de dificuldade;
- templates;
- nova organização completa do editor.

Esses itens pertencem ao Marco 2.

==================================================
17. CONFIRMAÇÃO REFORÇADA
==================================================

Mover para a lixeira:

- confirmação simples;
- informar retenção de sete dias;
- não usar linguagem de exclusão permanente.

Excluir uma ficha permanentemente:

- abrir confirmação específica;
- mostrar o nome da ficha;
- explicar que histórico será preservado;
- explicar que a programação da ficha não poderá ser recuperada;
- usar ação destructive com texto:
  “Excluir permanentemente”

Esvaziar lixeira:

- usar modal de confirmação reforçada;
- mostrar quantidade de fichas;
- informar que um backup será criado;
- exigir digitação da palavra:
  ESVAZIAR

A comparação deve:

- ignorar espaços externos;
- aceitar maiúsculas/minúsculas;
- não aceitar texto parcial.

Não usar o nome da ficha como confirmação em exclusão individual, porque isso
torna a operação excessivamente incômoda no celular.

==================================================
18. BACKUP ANTES DE ESVAZIAR
==================================================

Adicionar motivo:

BEFORE_EMPTY_TRASH

ao tipo AutomaticBackupReason.

Antes de esvaziar a lixeira:

1. exportar backup automático;
2. persistir metadados do backup;
3. confirmar que o arquivo foi criado;
4. somente então executar emptyTrash.

Caso o backup falhe:

- não esvaziar;
- mostrar erro;
- manter todos os dados;
- não executar exclusão parcial.

Após sucesso:

“Backup de segurança criado e lixeira esvaziada.”

Não criar backup automático antes do expurgo normal de fichas já vencidas.

A retenção de sete dias já é a proteção para esse fluxo.

==================================================
19. BACKUP COM LIXEIRA
==================================================

Atualizar o formato para:

training-backup-v2.json

Definir:

schemaVersion: 2

Adicionar aos registros de trainingPlans:

- deleted_at;
- purge_at.

O backup deve incluir:

- fichas normais;
- fichas arquivadas;
- fichas na lixeira;
- dias e exercícios de todas elas;
- deletedAt original;
- purgeAt original.

Não incluir:

- callbacks de Snackbar;
- estado transitório de desfazer;
- contador derivado;
- labels de expiração calculadas.

Manter compatibilidade de leitura com schemaVersion 1.

Ao importar backup v1:

- deleted_at = null;
- purge_at = null;
- preservar todo o restante.

Ao importar backup v2, validar:

- os timestamps são ISO UTC;
- ambos são nulos ou ambos preenchidos;
- purge_at > deleted_at;
- ficha na lixeira tem active = 0;
- ficha na lixeira tem archived = 0;
- apenas uma ficha normal pode estar ativa;
- ficha ativa não pode estar na lixeira;
- ficha arquivada não pode estar na lixeira.

Não exportar app_metadata.

==================================================
20. RESTAURAÇÃO DE BACKUP
==================================================

A restauração deve continuar transacional.

Fluxo:

1. validar backup completo;
2. converter backup v1 para representação v2;
3. criar backup de segurança do banco atual;
4. restaurar em transação;
5. executar purgeExpired;
6. atualizar controllers;
7. atualizar badge da lixeira.

Se a restauração falhar:

- rollback integral;
- manter banco anterior;
- manter lixeira anterior;
- não apagar backup de segurança.

Adicionar testes para:

- importar v1;
- importar v2;
- importar v2 com ficha na lixeira;
- importar v2 com timestamps inconsistentes;
- rollback;
- backup contendo ficha expirada;
- histórico preservado.

==================================================
21. CONTROLLER
==================================================

Criar hook separado:

useTrainingPlanTrashController

Responsabilidades:

- carregar itens;
- carregar contador;
- mover para lixeira;
- restaurar;
- excluir permanentemente;
- esvaziar;
- expurgar;
- controlar loading e busy keys;
- mensagens;
- Snackbar com Desfazer;
- sincronizar demais controllers.

Não esconder repository em singleton global.

Injetar explicitamente:

- TrainingPlanTrashRepository;
- função para criar backup automático;
- callback de refresh das fichas;
- callback de refresh do dashboard;
- callback de refresh da lixeira.

Uma operação em andamento deve impedir duplo clique equivalente.

==================================================
22. PROTEÇÃO DAS OPERAÇÕES EXISTENTES
==================================================

Atualizar operações existentes para rejeitar fichas na lixeira:

- update;
- duplicate;
- activate;
- archive;
- updateDay;
- addExercise;
- updateExercise;
- removeExercise;
- reorderExercise;
- addRestActivity;
- updateRestActivity;
- removeRestActivity;
- reorderRestActivities;
- start session.

Usar erro de domínio consistente:

TRAINING_PLAN_IN_TRASH

Mensagem:

“Esta ficha está na lixeira e precisa ser restaurada antes de ser alterada.”

Não reutilizar `notFound` para esconder todos os casos nos repositories internos.

Na UI pública, pode ser mostrada mensagem amigável sem expor detalhes do banco.

==================================================
23. TESTES DE DOMÍNIO
==================================================

Adicionar testes para:

- purgeAt sete dias depois;
- dias restantes;
- amanhã;
- hoje;
- vencida;
- ciclo normal;
- ativa não pode estar na lixeira;
- arquivada não pode estar na lixeira;
- timestamps incompletos;
- purgeAt anterior a deletedAt;
- restauração sempre inativa;
- timezone não altera retenção.

==================================================
24. TESTES SQLITE
==================================================

Adicionar testes com transação real para:

1. migration 4 para 5;
2. banco novo até migration 5;
3. segunda inicialização;
4. ficha normal não aparece na lixeira;
5. ficha arquivada não aparece na lixeira;
6. mover ficha ativa desativa;
7. mover ficha arquivada remove archived;
8. sessão ativa bloqueia exclusão;
9. sessão pausada bloqueia exclusão;
10. sessão concluída não bloqueia;
11. restaurar retorna inativa;
12. ativação de ficha na lixeira falha;
13. edição de ficha na lixeira falha;
14. início de sessão com ficha na lixeira falha;
15. exclusão permanente preserva histórico;
16. expurgo remove apenas vencidas;
17. expurgo não remove fichas dentro do prazo;
18. emptyTrash remove todas as fichas na lixeira;
19. rollback em falha de emptyTrash;
20. count atualizado;
21. backup v1 compatível;
22. backup v2 preserva lixeira;
23. backup inválido rejeitado;
24. restauração faz rollback integral.

==================================================
25. TESTES MOBILE
==================================================

Adicionar testes para:

- badge oculto quando vazio;
- badge atualizado após exclusão;
- tela vazia;
- lista com dias restantes;
- alerta “amanhã”;
- mover ficha;
- Snackbar com Desfazer;
- Desfazer restaura;
- Desfazer não executa duas vezes;
- botão bloqueado com formulário sujo;
- erro de sessão ativa;
- restauração;
- confirmação permanente;
- palavra ESVAZIAR incorreta;
- palavra ESVAZIAR correta;
- backup criado antes de esvaziar;
- falha do backup impede esvaziar;
- navegação para lixeira;
- acessibilidade do badge e das ações.

==================================================
26. DOCUMENTAÇÃO
==================================================

Criar:

docs/TRAINING_PLAN_LIFECYCLE.md

Documentar:

- diferença entre inativa, arquivada e lixeira;
- retenção de sete dias;
- restauração;
- expurgo;
- exclusão permanente;
- proteção de sessão ativa;
- preservação do histórico;
- backup v1 e v2;
- comportamento offline.

Atualizar:

docs/BACKUP_AND_RESTORE.md
README.md

No README, incluir fluxo:

Ficha
→ Editar
→ Mover para lixeira
→ Restaurar em até sete dias
→ Exclusão automática

Não afirmar que o sistema apaga exatamente após sete dias em background.

Explicar corretamente:

“A ficha é removida após vencer o prazo na próxima inicialização ou abertura da
lixeira.”

==================================================
27. VERSÃO
==================================================

Atualizar somente o app padrão:

mobile/app.json:
- version: 0.4.0
- android.versionCode: 6

mobile/package.json:
- version: 0.4.0

Não alterar:

- package;
- slug;
- scheme;
- projectId;
- versão do Umamusume.

==================================================
28. VALIDAÇÃO
==================================================

Executar na raiz:

npm ci

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

npm run typecheck --workspace=@training/training-wger
npm run test --workspace=@training/training-wger

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile

npm run typecheck --workspace=umamusume-mobile

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

git diff --check

Não gerar APK neste marco.

Não declarar conclusão caso qualquer validação falhe.

==================================================
29. CRITÉRIOS DE CONCLUSÃO
==================================================

O Marco 1 estará aprovado somente quando:

- lixeira funcionar integralmente offline;
- retenção de sete dias estiver correta;
- arquivar e excluir forem distintos;
- sessão ativa bloquear exclusão;
- restauração retornar a ficha como inativa;
- histórico sobreviver à exclusão permanente;
- badge atualizar;
- labels de expiração funcionarem;
- Desfazer funcionar;
- backup for criado antes de esvaziar;
- backup v2 incluir a lixeira;
- backup v1 continuar importável;
- migrations antigas permanecerem imutáveis;
- testes e export Android passarem.

==================================================
30. ENTREGA
==================================================

Informar:

1. commit final;
2. migration adicionada;
3. modelo de ciclo de vida;
4. repository criado;
5. política de retenção;
6. proteção de sessão ativa;
7. funcionamento do expurgo;
8. funcionamento do badge;
9. funcionamento do Desfazer;
10. backup automático antes de esvaziar;
11. compatibilidade v1/v2;
12. testes adicionados;
13. resultado de todas as validações;
14. versão e versionCode;
15. limitações restantes.

Não iniciar o Marco 2.