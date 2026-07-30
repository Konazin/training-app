Continue o desenvolvimento do repositório `training-app` a partir do commit:

85e951baa963068e2816e3bee79aa963f596bbbd

Este é o MARCO 2 do roadmap:

EDITOR DE FICHA, TEMPLATES E DUPLICAÇÃO CONFIGURÁVEL

O Marco 1 está estabilizado no núcleo. Antes de implementar qualquer função
nova deste marco, concluir a Etapa 2.0 com três ajustes operacionais pendentes.

O aplicativo deve permanecer:

- local-only;
- offline-first;
- sem backend obrigatório;
- sem VPS;
- sem login;
- com SQLite como fonte de verdade;
- compatível com backup schemaVersion 2;
- compatível com fichas arquivadas e lixeira;
- compatível com o catálogo Wger opcional.

Trabalhar principalmente em:

packages/training-domain/
packages/training-local-db/
mobile/
docs/
.github/workflows/

Não alterar funcionalmente:

backend/
web/
umamusume-mobile/
packages/training-wger/

Não implementar neste marco:

- nova Home semanal;
- skins ou temas novos;
- animações gerais do aplicativo;
- catálogo inicial expandido;
- thumbnails;
- favoritos;
- múltiplos providers;
- progressão automática;
- IA;
- Health Connect;
- nuvem;
- alterações de mídia;
- APK final.

==================================================
1. EXECUÇÃO EM ETAPAS
==================================================

Executar obrigatoriamente nesta ordem:

ETAPA 2.0
Fechamento operacional da lixeira.

ETAPA 2.1
Seletores de categoria e dificuldade.

ETAPA 2.2
Templates locais de ficha.

ETAPA 2.3
Prévia semanal.

ETAPA 2.4
Duplicação configurável.

ETAPA 2.5
Testes, documentação e validação geral.

Não iniciar a Etapa 2.1 enquanto os testes da Etapa 2.0 não estiverem passando.

Não marcar o Marco 2 como concluído se alguma etapa estiver parcial.

==================================================
2. ETAPA 2.0 — SNACKBAR DURANTE DESFAZER
==================================================

O controller da lixeira atualmente limpa a mensagem ao adquirir qualquer lock.

Isso faz o Snackbar desaparecer assim que o usuário toca em Desfazer, mesmo
existindo suporte visual para “Desfazendo…”.

Corrigir sem remover as proteções de concorrência já implementadas.

Fluxo esperado:

1. Snackbar mostra:
   “Ficha movida para a lixeira.”
   ação “Desfazer”.

2. usuário toca em Desfazer;

3. Snackbar permanece visível;

4. ação muda para:
   “Desfazendo…”;

5. botão da ação e botão fechar ficam desativados;

6. repository.restore confirma;

7. refresh é tentado;

8. Snackbar anterior fecha;

9. nova mensagem mostra:
   “Ficha restaurada.”

Em refresh falho:

“Ficha restaurada, mas a tela não pôde ser atualizada.”

Em restore falho:

- manter Snackbar visível;
- retornar a ação para “Desfazer”;
- permitir nova tentativa enquanto o token estiver válido;
- não limpar pending undo;
- mostrar mensagem de erro sem perder a possibilidade de tentar novamente.

Alterar `acquireOperation` para aceitar comportamento explícito, por exemplo:

acquireOperation(key, {
  clearMessage: boolean
})

Para operações `trash:undo:*`:

clearMessage = false

Não depender de verificar prefixo de string em vários lugares.

Centralizar essa decisão.

==================================================
3. ETAPA 2.0 — REFRESH GLOBAL
==================================================

O `refreshAll` atual considera uma Promise resolvida com `false` como sucesso.

Corrigir para que cada atualização seja validada.

Criar contrato estruturado semelhante a:

interface RefreshPartResult {
  name: string
  success: boolean
  error?: unknown
}

interface RefreshAllResult {
  success: boolean
  failedParts: string[]
}

Ou implementação equivalente.

O refresh global deve considerar:

- sessão;
- fichas;
- dashboard/biblioteca;
- lixeira;
- badge.

Usar `Promise.allSettled` quando as atualizações forem independentes.

Não interromper a coleta no primeiro erro.

Não repetir mutation para corrigir refresh.

Quando qualquer refresh retornar false ou rejeitar:

- considerar o refresh incompleto;
- informar quais partes falharam;
- não afirmar que toda a interface foi atualizada.

==================================================
4. ETAPA 2.0 — BACKUP E MUTATION CONFIRMADA
==================================================

O `useBackupController` também não deve tratar mutation confirmada mais refresh
falho como se a mutation inteira tivesse falhado.

Aplicar separação explícita ao menos às operações:

- importar backup;
- restaurar backup automático;
- apagar todos os dados;
- recriar dados iniciais.

Distinguir:

1. backup ou mutation falhou antes do commit;
2. banco foi alterado e refresh passou;
3. banco foi alterado e refresh falhou.

Exemplos:

Restauração confirmada e refresh completo:

“Backup restaurado com sucesso.”

Restauração confirmada e refresh incompleto:

“Backup restaurado, mas algumas telas não puderam ser atualizadas.”

Reset confirmado e refresh incompleto:

“Os dados foram recriados, mas algumas telas não puderam ser atualizadas.”

Nunca repetir restore/reset automaticamente por falha de refresh.

Nunca afirmar que a restauração falhou quando o SQLite já confirmou a operação.

Manter o backup de segurança criado.

Adicionar um método de retry apenas para refresh quando necessário.

==================================================
5. ETAPA 2.0 — MODAL DE ESVAZIAMENTO
==================================================

Enquanto `busy === true`:

- botão Cancelar desativado;
- `onRequestClose` não fecha o modal;
- voltar do Android não fecha o modal;
- input continua desativado;
- botão destrutivo continua desativado;
- modal permanece visível;
- indicador de carregamento permanece;
- não permitir segunda submissão.

Se backup falhar:

- modal permanece aberto;
- dados permanecem;
- confirmação digitada pode permanecer;
- mostrar erro.

Se emptyTrash confirmar e refresh falhar:

- fechar modal;
- mostrar warning;
- não comunicar cancelamento;
- não repetir emptyTrash.

Adicionar acessibilidade:

- modal anunciado como operação em andamento;
- botão Cancelar com estado disabled;
- texto “Esvaziando lixeira…” durante busy.

==================================================
6. TESTES OBRIGATÓRIOS DA ETAPA 2.0
==================================================

Adicionar testes para:

1. Snackbar permanece durante restore pendente;
2. actionBusyLabel mostra “Desfazendo…”;
3. botão fechar fica desativado durante restore;
4. restore falho mantém ação disponível;
5. restore bem-sucedido fecha Snackbar anterior;
6. refresh falho após restore mostra warning;
7. `trashRefresh` retornando false torna refreshAll incompleto;
8. refreshAll coleta múltiplas falhas;
9. restore de backup confirmado não é tratado como falha por refresh;
10. modal não fecha por Cancelar durante busy;
11. modal não fecha por onRequestClose durante busy;
12. modal fecha após emptyTrash confirmado;
13. modal permanece após falha do backup;
14. duplo toque continua bloqueado.

Somente após estes testes passarem, iniciar a Etapa 2.1.

==================================================
7. ETAPA 2.1 — CATEGORIAS PADRÃO
==================================================

Criar presets no domínio:

TRAINING_PLAN_CATEGORY_PRESETS

Valores de exibição e persistência:

- Força
- Hipertrofia
- Resistência muscular
- Condicionamento
- Mobilidade
- Recuperação
- Técnica
- Mista

Adicionar opção visual:

- Outra

“Outra” é apenas uma opção de interface.

Nunca persistir literalmente:

Outra

Quando Outra estiver selecionada:

- exibir campo “Categoria personalizada”;
- exigir valor não vazio;
- normalizar espaços;
- limitar a 50 caracteres;
- persistir o texto personalizado.

Ao editar ficha antiga:

- se a categoria pertence aos presets, selecionar o preset;
- caso contrário, selecionar Outra;
- preencher o campo personalizado com o valor existente;
- não perder categorias antigas.

Criar funções puras:

resolveTrainingPlanCategorySelection(value)

normalizeTrainingPlanCategory(value)

isTrainingPlanCategoryPreset(value)

Não criar enum SQLite.

Continuar persistindo categoria como TEXT.

==================================================
8. ETAPA 2.1 — DIFICULDADES PADRÃO
==================================================

Criar presets no domínio:

TRAINING_PLAN_DIFFICULTY_PRESETS

Valores:

- Iniciante
- Intermediário
- Avançado
- Adaptável

Adicionar opção visual:

- Outra

Não incluir Deload como dificuldade.

Deload é fase de programação e pertence a uma futura evolução do modelo.

Quando Outra estiver selecionada:

- exibir campo “Dificuldade personalizada”;
- exigir valor não vazio;
- normalizar espaços;
- limitar a 50 caracteres;
- persistir somente o valor personalizado.

Ao editar valor antigo não reconhecido:

- selecionar Outra;
- preservar o texto anterior.

Criar funções puras equivalentes às de categoria.

==================================================
9. COMPONENTE DE SELEÇÃO
==================================================

Criar componente reutilizável:

OptionPickerField

Responsabilidades:

- label;
- valor atual;
- placeholder;
- erro;
- disabled;
- acessibilidade;
- abrir seletor;
- mostrar seleção;
- indicar que é interativo.

Criar seletor mobile:

OptionPickerModal

Ou bottom sheet sem biblioteca externa.

Requisitos:

- SafeAreaView ou insets;
- KeyboardAvoidingView quando houver campo customizado;
- conteúdo rolável;
- touch targets mínimos;
- opção selecionada claramente;
- suporte a tema claro e escuro;
- botão Cancelar;
- botão Confirmar;
- fechar pelo Android apenas quando não estiver processando;
- não depender somente da cor;
- suporte a fonte ampliada.

Não instalar biblioteca de dropdown.

Não usar Picker nativo com comportamento inconsistente entre plataformas.

==================================================
10. EDITOR DE FICHA
==================================================

Substituir no TrainingPlanEditorScreen:

- FormField livre de Categoria;
- FormField livre de Dificuldade.

Usar os novos seletores.

Manter:

- Nome;
- Descrição;
- Salvar;
- Ativar;
- Duplicar;
- Arquivar;
- Zona de perigo;
- Mover para lixeira.

Organizar visualmente em seções:

DADOS DA FICHA

- nome;
- descrição;
- categoria;
- dificuldade.

ESTRUTURA SEMANAL

- prévia da semana;
- template selecionado quando aplicável.

GESTÃO

- ativar;
- duplicar;
- arquivar.

ZONA DE PERIGO

- mover para lixeira.

Não transformar o editor em um formulário excessivamente longo sem separadores.

==================================================
11. VALIDAÇÃO DO FORMULÁRIO
==================================================

Validar:

Nome:
- obrigatório;
- trim;
- máximo 80 caracteres.

Descrição:
- opcional;
- máximo 500 caracteres.

Categoria:
- preset válido ou personalizada;
- máximo 50 caracteres.

Dificuldade:
- preset válido ou personalizada;
- máximo 50 caracteres.

Mostrar erro no campo correspondente.

Não mostrar apenas erro geral no topo.

O botão Salvar deve:

- permanecer disponível visualmente;
- rejeitar submissão inválida;
- mover foco ou rolar até o primeiro erro quando viável.

Não remover useUnsavedChangesGuard.

A troca de template, categoria ou dificuldade deve marcar o formulário como sujo.

==================================================
12. SEM MIGRATION NESTE MARCO
==================================================

Não criar migration 6.

Categoria e dificuldade continuam TEXT.

Templates são definições de código e não registros permanentes próprios.

Modos de duplicação são parâmetros de operação e não campos do banco.

Backup continua:

schemaVersion: 2

Não alterar formato do backup.

Não editar migrations 1 a 5.

==================================================
13. ETAPA 2.2 — MODELO DE TEMPLATE
==================================================

Criar no domínio:

TrainingPlanTemplateId

Valores:

- PPL_3X
- FULL_BODY_3X
- UPPER_LOWER_4X
- RUNNING_BEGINNER
- MOBILITY_3X
- BLANK

Criar:

TrainingPlanTemplate

Campos sugeridos:

- id;
- name;
- description;
- category;
- difficulty;
- summary;
- days.

Cada dia deve conter:

- weekday;
- name;
- description;
- isRestDay;
- focus opcional.

Não incluir IDs SQLite.

Não incluir IDs de exercícios.

Não realizar chamadas Wger.

Não criar exercícios automaticamente.

Os templates deste marco definem a estrutura semanal, não uma prescrição
completa de exercícios.

O catálogo inicial completo pertence ao Marco 5.

==================================================
14. TEMPLATES INICIAIS
==================================================

Implementar:

1. PPL 3x

- segunda: Push;
- quarta: Pull;
- sexta: Legs;
- demais dias: descanso.

Categoria:
Hipertrofia

Dificuldade:
Intermediário

2. Full Body 3x

- segunda: Full Body A;
- quarta: Full Body B;
- sexta: Full Body C;
- demais dias: descanso.

Categoria:
Mista

Dificuldade:
Iniciante

3. Upper/Lower 4x

- segunda: Upper A;
- terça: Lower A;
- quinta: Upper B;
- sexta: Lower B;
- demais dias: descanso.

Categoria:
Hipertrofia

Dificuldade:
Intermediário

4. Corrida iniciante

- terça: Corrida leve;
- quinta: Estímulo técnico;
- sábado: Corrida longa;
- demais dias: descanso ou recuperação.

Categoria:
Condicionamento

Dificuldade:
Iniciante

Não prescrever velocidades ou distâncias médicas neste template.

5. Mobilidade 3x

- segunda: Mobilidade A;
- quarta: Mobilidade B;
- sexta: Mobilidade C;
- demais dias: descanso.

Categoria:
Mobilidade

Dificuldade:
Adaptável

6. Ficha vazia

- sete dias criados;
- nenhum dia de treino pré-configurado;
- nenhum exercício;
- categoria e dificuldade escolhidas pelo usuário.

==================================================
15. SELEÇÃO DE TEMPLATE
==================================================

Na criação de nova ficha, mostrar:

COMEÇAR COM UM TEMPLATE

Cards para os seis templates.

Cada card deve mostrar:

- nome;
- resumo;
- frequência;
- categoria sugerida;
- dificuldade sugerida.

Adicionar ação:

“Começar do zero”

Ao tocar em um template:

- abrir prévia;
- não criar ainda;
- permitir Cancelar;
- permitir “Usar este template”.

Ao confirmar:

- preencher o draft do editor;
- preencher categoria e dificuldade;
- preencher a estrutura semanal;
- preencher nome apenas se o campo estiver vazio;
- não salvar automaticamente;
- marcar formulário como alterado.

O usuário deve poder editar nome, descrição, categoria e dificuldade antes de
salvar.

Trocar de template com alterações existentes deve pedir confirmação quando
substituir estrutura semanal.

==================================================
16. CRIAÇÃO TRANSACIONAL COM ESTRUTURA SEMANAL
==================================================

Adicionar contrato explícito:

TrainingPlanCreationInput

Estrutura sugerida:

{
  plan: TrainingPlanInput
  days: TrainingPlanDayCreationInput[]
  templateId?: TrainingPlanTemplateId
}

`templateId` pode ser usado durante a operação ou para telemetria local futura,
mas não deve ser persistido sem necessidade.

Criar método repository:

createWithDays(input: TrainingPlanCreationInput):
  Promise<TrainingPlan>

O método deve executar em uma transação:

1. validar ficha;
2. validar exatamente sete weekdays sem duplicatas;
3. inserir training_plan;
4. criar sete dias;
5. aplicar nomes, descrições e descanso;
6. retornar ficha completa.

Falha em qualquer dia:

- rollback integral;
- nenhuma ficha parcial;
- nenhum dia órfão.

O método create atual pode delegar para createWithDays usando a estrutura padrão.

Não ativar automaticamente.

Não arquivar.

Não marcar como excluída.

==================================================
17. VALIDAÇÃO DOS TEMPLATES
==================================================

Criar validação pura:

validateTrainingPlanTemplate(template)

Rejeitar:

- ID vazio;
- nome vazio;
- menos ou mais de sete dias;
- weekday duplicado;
- weekday ausente;
- dia sem nome;
- categoria vazia;
- dificuldade vazia.

Validar todos os templates em teste.

Os templates devem ser imutáveis.

Usar readonly ou Object.freeze quando adequado.

Não permitir que alterações no draft modifiquem o objeto global do template.

==================================================
18. ETAPA 2.3 — PRÉVIA SEMANAL
==================================================

Criar componente:

TrainingPlanWeekPreview

Exibir os sete dias na ordem local:

- SEG
- TER
- QUA
- QUI
- SEX
- SÁB
- DOM

Cada item deve mostrar:

- abreviação;
- nome do dia;
- treino ou descanso;
- quantidade de exercícios quando existir;
- quantidade de atividades quando existir.

Estados visuais:

- treino configurado;
- descanso;
- dia vazio;
- dia com aviso.

A prévia deve funcionar para:

- template ainda não salvo;
- ficha existente;
- ficha recém-criada;
- ficha sem exercícios.

==================================================
19. AVISOS DA PRÉVIA
==================================================

Criar análise pura:

analyzeTrainingPlanWeekPreview(days)

Retornar avisos como:

- nenhum dia de treino configurado;
- dia de treino sem exercícios;
- weekday duplicado;
- weekday ausente;
- nome vazio;
- sete dias consecutivos de treino;
- nenhum dia de descanso.

Neste marco:

- avisos não bloqueiam salvar, salvo estrutura inválida;
- weekday duplicado ou ausente bloqueia criação;
- treino sem exercícios é apenas aviso;
- nenhum dia de descanso é warning;
- não emitir recomendação médica.

Mostrar mensagens claras:

“Este dia ainda não possui exercícios.”

“Esta ficha não possui dias de descanso.”

Não usar linguagem acusatória.

==================================================
20. PRÉVIA ANTES DE USAR TEMPLATE
==================================================

O modal de template deve mostrar:

- nome;
- descrição;
- categoria;
- dificuldade;
- divisão dos sete dias;
- quantidade de dias de treino;
- quantidade de dias de descanso;
- aviso de que exercícios serão adicionados depois.

Texto obrigatório:

“Este template cria a divisão semanal. Os exercícios podem ser adicionados
depois na ficha.”

Ações:

- Cancelar;
- Usar este template.

==================================================
21. PRÉVIA NO EDITOR
==================================================

Depois de escolher um template:

- exibir a prévia dentro do editor;
- permitir trocar template;
- permitir voltar para ficha vazia;
- não permitir editar dias diretamente nesta tela se isso exigir duplicar o
  editor de dias existente;
- após salvar, usar as telas de dia já existentes para editar detalhes.

Para ficha existente:

- mostrar a estrutura atual;
- mudanças feitas nas telas de dia devem aparecer após refresh.

==================================================
22. ETAPA 2.4 — MODOS DE DUPLICAÇÃO
==================================================

Criar:

TrainingPlanDuplicateMode

Valores:

- COMPLETE
- STRUCTURE_ONLY
- WITHOUT_LOADS

Alterar repository:

duplicate(
  planId: number,
  mode: TrainingPlanDuplicateMode
): Promise<TrainingPlan>

Não manter uma segunda implementação antiga sem modo.

==================================================
23. DUPLICAR COMPLETA
==================================================

COMPLETE:

Copiar:

- nome com sufixo de cópia;
- descrição;
- categoria;
- dificuldade;
- datas atualmente copiadas pela implementação existente;
- dias;
- nomes e descrições dos dias;
- dias de descanso;
- exercícios;
- ordem;
- séries;
- repetições;
- cargas planejadas;
- duração;
- distância;
- RPE;
- descansos;
- tipos de série;
- notas de programação;
- alternativas;
- atividades de descanso.

Não copiar:

- ID da ficha;
- IDs de dias;
- IDs das configurações;
- estado ativo;
- estado arquivado;
- deletedAt;
- purgeAt;
- sessões;
- histórico;
- snapshots.

Nova ficha:

- active = false;
- archived = false;
- deletedAt = null;
- purgeAt = null.

==================================================
24. DUPLICAR APENAS ESTRUTURA
==================================================

STRUCTURE_ONLY:

Copiar:

- dados gerais da ficha;
- dias;
- nomes;
- descrições;
- descanso;
- exercícios escolhidos;
- ordem dos exercícios;
- quantidade de séries;
- faixa de repetições;
- tempo de descanso;
- tipo de série;
- atividades de descanso.

Limpar:

- carga planejada;
- RPE planejado;
- notas específicas dos exercícios;
- alternativa específica quando representar escolha temporária.

Preservar:

- referência ao exercício;
- sets;
- minReps;
- maxReps;
- restSeconds;
- setType.

Documentar exatamente os campos preservados e limpos.

==================================================
25. DUPLICAR SEM CARGAS
==================================================

WITHOUT_LOADS:

Copiar tudo o que COMPLETE copia, exceto:

- plannedLoad deve ser null.

Preservar:

- séries;
- repetições;
- descanso;
- RPE;
- duração;
- distância;
- notas;
- alternativas;
- atividades.

Não interpretar duração ou distância como carga.

==================================================
26. NOMES DAS CÓPIAS
==================================================

Gerar nome legível e não conflitante:

Original:
“PPL”

Primeira cópia:
“PPL — Cópia”

Segunda:
“PPL — Cópia 2”

Terceira:
“PPL — Cópia 3”

Consultar fichas normais e arquivadas.

Ignorar fichas permanentemente apagadas.

Evitar conflito case-insensitive e com espaços normalizados.

O nome continua editável depois.

==================================================
27. UI DE DUPLICAÇÃO
==================================================

Ao tocar em “Duplicar ficha”, abrir modal com:

- Duplicar completa;
- Apenas estrutura;
- Sem cargas planejadas.

Cada opção deve mostrar descrição curta.

Completa:

“Copia toda a programação, incluindo cargas e notas.”

Apenas estrutura:

“Copia a divisão, exercícios, séries e repetições, mas limpa dados pessoais de
progressão.”

Sem cargas:

“Copia toda a programação e remove apenas as cargas planejadas.”

Ações:

- Cancelar;
- Duplicar.

Não duplicar imediatamente ao tocar no botão principal.

Durante duplicação:

- modal não fecha;
- opções ficam desativadas;
- indicador de carregamento;
- duplo toque bloqueado.

Após sucesso:

- fechar modal;
- selecionar a nova ficha;
- voltar ou navegar de acordo com o fluxo atual;
- mostrar feedback.

==================================================
28. DUPLICAÇÃO TRANSACIONAL
==================================================

Todo o processo deve ocorrer em uma transação.

Falha em qualquer cópia:

- rollback integral;
- nenhuma ficha parcial;
- nenhum dia órfão;
- nenhum exercício órfão;
- nenhuma atividade órfã.

Adicionar falha injetada em teste SQLite.

Não copiar sessões.

Não alterar a ficha original.

Não ativar a cópia automaticamente.

==================================================
29. CONTROLLER DE FICHAS
==================================================

Atualizar useTrainingPlanController.

Adicionar:

- createWithDays;
- duplicate com mode;
- resultados claros para operações novas.

Não repetir o problema anterior de mutation + refresh em um booleano ambíguo.

Para novas operações, distinguir:

- mutation falhou;
- mutation confirmou e atualização passou;
- mutation confirmou e atualização falhou.

Pode criar:

type TrainingPlanUiResult =
  | { status: 'success'; refreshWarning: boolean; plan: TrainingPlan }
  | { status: 'failed' }

A UI deve considerar sucesso quando a mutation foi confirmada, mesmo com
refreshWarning.

Não é obrigatório refatorar todas as operações antigas neste marco, mas:

- createWithDays;
- duplicate;
- template creation

devem usar o contrato correto.

==================================================
30. ESTADO NÃO SALVO
==================================================

O guard deve considerar:

- nome;
- descrição;
- categoria resolvida;
- dificuldade resolvida;
- categoria customizada;
- dificuldade customizada;
- template;
- draft dos dias.

Ao trocar de template com alterações:

- pedir confirmação;
- não descartar silenciosamente.

Ao sair:

- manter alerta de alterações não salvas.

Após salvar:

- atualizar baseline corretamente.

==================================================
31. ACESSIBILIDADE
==================================================

Garantir:

- seletores anunciados como botão;
- valor atual lido pelo leitor;
- modal com foco adequado;
- opção selecionada anunciada;
- cards de template com descrição;
- prévia semanal legível;
- textos não dependem somente de cor;
- touch targets mínimos de 48 dp;
- fonte ampliada sem corte;
- botões destrutivos identificados;
- loading anunciado.

==================================================
32. TESTES DE DOMÍNIO
==================================================

Adicionar testes para:

- presets de categoria;
- presets de dificuldade;
- valor customizado;
- normalização;
- limite de tamanho;
- valor antigo não preset;
- templates imutáveis;
- sete weekdays;
- duplicidade de weekday;
- template incompleto;
- análise semanal;
- dia de treino sem exercício;
- ausência de descanso;
- modos de duplicação;
- nome de cópia;
- segunda e terceira cópia.

==================================================
33. TESTES SQLITE
==================================================

Adicionar testes reais para:

1. createWithDays cria ficha e sete dias;
2. rollback quando criação de um dia falha;
3. template PPL;
4. template Full Body;
5. template Upper/Lower;
6. template corrida;
7. template mobilidade;
8. template vazio;
9. criação nunca ativa automaticamente;
10. criação nunca arquiva;
11. criação nunca entra na lixeira;
12. duplicação COMPLETE;
13. duplicação STRUCTURE_ONLY;
14. duplicação WITHOUT_LOADS;
15. IDs novos;
16. ficha original inalterada;
17. cópia inativa;
18. cópia fora da lixeira;
19. sessões não copiadas;
20. atividades copiadas corretamente;
21. notas limpas apenas no modo correto;
22. carga limpa apenas nos modos corretos;
23. rollback de duplicação;
24. nomes sem colisão;
25. backup schemaVersion 2 continua funcionando;
26. migrations continuam em versão 5.

==================================================
34. TESTES MOBILE
==================================================

Adicionar testes para:

- categoria preset;
- categoria Outra;
- dificuldade preset;
- dificuldade Outra;
- edição de valor antigo;
- erro de custom vazio;
- seletor acessível;
- template preview;
- cancelar template;
- usar template;
- trocar template com confirmação;
- prévia dos sete dias;
- aviso sem exercícios;
- opção ficha vazia;
- modal de duplicação;
- COMPLETE;
- STRUCTURE_ONLY;
- WITHOUT_LOADS;
- loading;
- duplo toque;
- formulário sujo;
- sucesso com refreshWarning;
- Etapa 2.0 integralmente coberta.

==================================================
35. TESTE MANUAL ANDROID
==================================================

Executar no aparelho ou emulador disponível:

1. abrir editor;
2. selecionar categoria;
3. selecionar dificuldade;
4. usar categoria Outra;
5. usar dificuldade Outra;
6. fechar e reabrir ficha;
7. confirmar persistência;
8. escolher PPL;
9. revisar prévia;
10. salvar;
11. editar dias;
12. duplicar completa;
13. duplicar apenas estrutura;
14. duplicar sem cargas;
15. comparar as três;
16. mover uma cópia para lixeira;
17. tocar Desfazer;
18. confirmar Snackbar “Desfazendo…”;
19. esvaziar lixeira;
20. tentar fechar modal durante loading;
21. verificar backup e badge.

Registrar em:

docs/MARCO_2_ANDROID_SMOKE.md

Caso não exista aparelho:

- registrar claramente como pendente;
- não inventar evidência.

==================================================
36. DOCUMENTAÇÃO
==================================================

Criar:

docs/TRAINING_PLAN_EDITOR.md
docs/TRAINING_PLAN_TEMPLATES.md

Documentar:

- categorias;
- dificuldades;
- valores personalizados;
- templates;
- limitações dos templates;
- prévia semanal;
- modos de duplicação;
- diferenças entre os modos;
- ausência de dependência da internet;
- ausência de criação automática de exercícios.

Atualizar:

README.md
docs/PRODUCT_ROADMAP.md
docs/TRAINING_PLAN_LIFECYCLE.md

No roadmap:

- Marco 1 permanece ESTABILIZADO;
- Marco 2 fica EM VALIDAÇÃO durante implementação;
- marcar CONCLUÍDO apenas após todas as validações.

==================================================
37. VERSÃO
==================================================

Ao concluir todas as etapas:

mobile/app.json:
- version: 0.5.0
- android.versionCode: 7

mobile/package.json:
- version: 0.5.0

Não alterar:

- package;
- slug;
- scheme;
- projectId;
- versão Umamusume.

Não gerar APK neste marco.

O APK será produzido após revisão rigorosa do commit.

==================================================
38. VALIDAÇÃO
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

Não declarar conclusão se qualquer comando falhar.

==================================================
39. CRITÉRIOS DE CONCLUSÃO
==================================================

O Marco 2 estará aprovado somente quando:

- Snackbar permanecer durante Desfazer;
- refreshAll tratar false como falha;
- backup distinguir commit de refresh;
- modal não fechar durante emptyTrash;
- categoria e dificuldade usarem seletores;
- valores antigos forem preservados;
- Outra funcionar;
- seis templates estiverem disponíveis;
- templates criarem estrutura transacional;
- nenhum template depender de exercícios externos;
- prévia semanal mostrar sete dias;
- avisos forem claros;
- duplicação possuir três modos;
- duplicação for transacional;
- cópias nunca forem ativas ou excluídas;
- histórico não for copiado;
- backup v2 continuar compatível;
- nenhuma migration nova for criada;
- testes passarem;
- export Android passar.

==================================================
40. ENTREGA
==================================================

Informar:

1. commit final;
2. resultado da Etapa 2.0;
3. correção do Snackbar;
4. contrato de refreshAll;
5. comportamento de backup com refresh falho;
6. bloqueio do modal;
7. presets criados;
8. tratamento de valores customizados;
9. templates implementados;
10. estratégia transacional de criação;
11. prévia semanal;
12. avisos semanais;
13. modos de duplicação;
14. campos preservados por modo;
15. testes de domínio;
16. testes SQLite;
17. testes mobile;
18. smoke Android;
19. documentação;
20. versão e versionCode;
21. resultado de todos os comandos;
22. limitações restantes;
23. confirmação de que o Marco 2 está CONCLUÍDO ou EM VALIDAÇÃO.

Não iniciar o Marco 3.