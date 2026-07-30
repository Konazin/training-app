Continue o desenvolvimento do repositório `training-app` a partir do commit:

1e9f4469a44f9a8e5dad3ca7f993d0ca1fc20d08

Este é um PATCH DE ESTABILIZAÇÃO do Marco 1:

CICLO DE VIDA DAS FICHAS E LIXEIRA LOCAL

O Marco 1 já foi implementado, mas não deve ser considerado encerrado enquanto
existirem problemas de concorrência, feedback incorreto após mutations
confirmadas, divergências de UX e lacunas de teste.

Commit sugerido:

fix(mobile): stabilize training plan trash lifecycle

Não implementar funcionalidades do Marco 2.

Não adicionar:

- templates;
- dropdowns de categoria;
- dropdowns de dificuldade;
- nova Home;
- temas;
- animações;
- novas APIs;
- catálogo inicial;
- thumbnails;
- IA;
- nuvem;
- novas migrations, salvo se uma necessidade real e comprovada for encontrada.

Trabalhar apenas em:

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

==================================================
1. OBJETIVO PRINCIPAL
==================================================

Substituir a lógica genérica e ambígua do método `run` do controller da lixeira
por um fluxo explícito que diferencie:

1. mutation não iniciada;
2. mutation falhou antes do commit;
3. mutation foi confirmada no SQLite;
4. refresh após mutation teve sucesso;
5. refresh após mutation falhou;
6. operação de desfazer disponível;
7. operação de desfazer em andamento;
8. operação de desfazer consumida ou expirada.

A UI nunca deve afirmar que a mutation falhou quando o SQLite já confirmou a
alteração.

O botão Desfazer nunca deve desaparecer sem restaurar a ficha apenas porque um
refresh ainda estava em andamento.

==================================================
2. PROBLEMA ATUAL DO `run`
==================================================

A implementação atual trata mutation e refresh como uma única operação:

- executa a mutation;
- publica mensagem e callback de Desfazer;
- ainda mantém o lock global;
- executa refresh;
- retorna sucesso ou falha de forma genérica.

Isso permite a seguinte corrida:

1. `moveToTrash` confirma a alteração no SQLite;
2. Snackbar é exibido;
3. refresh ainda está em andamento;
4. usuário toca em Desfazer;
5. o callback limpa o ID pendente;
6. o lock global rejeita a restauração;
7. o Snackbar fecha;
8. a ficha permanece na lixeira.

Também existe outro problema:

1. mutation confirma no SQLite;
2. refresh falha;
3. controller retorna false;
4. tela informa falha ou não navega;
5. banco já foi alterado.

Corrigir os dois problemas na raiz.

Não apenas adicionar `setTimeout`, aumentar a duração do Snackbar ou inserir
outro booleano em torno do código existente.

==================================================
3. REMOVER OU REESTRUTURAR O `run`
==================================================

Remover o helper genérico atual ou substituí-lo por uma abstração com semântica
explícita.

Criar tipos semelhantes a:

type CommittedMutationResult<T> =
  | {
      status: 'committed'
      value: T
      refreshStatus: 'success'
    }
  | {
      status: 'committed'
      value: T
      refreshStatus: 'failed'
      refreshError: unknown
    }
  | {
      status: 'failed'
      error: unknown
    }

O nome exato pode variar, mas deve ser impossível confundir:

- mutation falhou;
- mutation confirmou e refresh falhou.

Criar uma função interna como:

executeCommittedMutation<T>(
  operationKey: string,
  mutation: () => Promise<T>,
  refresh: () => Promise<void>
): Promise<CommittedMutationResult<T>>

Regras:

1. adquirir lock;
2. executar mutation;
3. registrar localmente que a mutation foi confirmada;
4. tentar refresh;
5. capturar falha do refresh separadamente;
6. liberar lock em `finally`;
7. retornar resultado estruturado;
8. nunca publicar Snackbar dentro desse helper;
9. nunca navegar dentro desse helper;
10. nunca limpar estado de Desfazer dentro desse helper.

Nenhum callback de UI deve ser disponibilizado enquanto o lock da mutation
original ainda estiver ativo.

==================================================
4. LOCK E OPERAÇÕES CONCORRENTES
==================================================

Substituir o booleano global pouco expressivo por estado explícito.

Pode usar:

- `activeOperationRef: string | null`;
- ou `busyKeysRef: Set<string>`.

Operações destrutivas da lixeira podem continuar serializadas.

Chaves sugeridas:

- trash:move:<planId>
- trash:restore:<planId>
- trash:delete:<planId>
- trash:empty
- trash:purge
- trash:undo:<planId>

Regras:

- a mesma operação não pode iniciar duas vezes;
- duplo toque deve resultar em uma única mutation;
- o lock deve ser liberado em `finally`;
- falha de refresh não pode manter lock;
- falha de mensagem ou callback não pode manter lock;
- nenhuma operação deve depender de estado React assíncrono para garantir
  exclusão mútua;
- usar refs para a garantia imediata de concorrência.

Não criar mutex externo ou biblioteca nova.

==================================================
5. PUBLICAÇÃO DO SNACKBAR DESFAZER
==================================================

O Snackbar com Desfazer só pode ser publicado depois de:

1. `moveToTrash` ter sido confirmado;
2. tentativa de refresh ter terminado;
3. lock da operação ter sido liberado.

Fluxo correto:

mutation
→ tentativa de refresh
→ liberação do lock
→ navegação
→ publicação do Snackbar com Desfazer

Caso a mutation confirme e o refresh falhe:

- considerar a exclusão concluída;
- navegar normalmente;
- disponibilizar Desfazer;
- informar:
  “Ficha movida para a lixeira, mas a tela não pôde ser atualizada.”
- oferecer ação para tentar atualizar novamente quando adequado.

Não mostrar:

“Não foi possível mover a ficha”

quando a ficha já foi movida.

==================================================
6. ESTADO TOKENIZADO DE DESFAZER
==================================================

Substituir o estado baseado apenas em `undoPlanId` por um objeto tokenizado.

Criar tipo semelhante a:

interface PendingTrashUndo {
  token: string
  planId: number
  planName: string
  createdAt: number
  expiresAt: number
  status: 'available' | 'running'
}

Guardar em ref e expor o necessário para a UI.

Cada nova ação de mover para a lixeira deve criar um token único.

Pode usar:

- contador incremental local;
- combinação segura de timestamp e contador;
- `crypto.randomUUID()` apenas se disponível no ambiente sem polyfill adicional.

Não depender exclusivamente de `Date.now()` se duas operações puderem ocorrer no
mesmo milissegundo.

==================================================
7. CALLBACK DE DESFAZER
==================================================

Criar:

undoMoveToTrash(token: string): Promise<boolean>

Fluxo:

1. verificar se existe pending undo;
2. verificar se o token recebido ainda é o token atual;
3. verificar se não expirou;
4. verificar se não está em execução;
5. adquirir lock de undo;
6. marcar status como running;
7. executar `repository.restore(planId)`;
8. considerar a restauração confirmada assim que o SQLite concluir;
9. tentar atualizar os controllers;
10. liberar lock;
11. limpar pending undo somente depois de a restauração ter sido confirmada;
12. retornar true quando a ficha foi restaurada;
13. retornar false quando nada foi restaurado.

Se o refresh falhar depois de restaurar:

- considerar Desfazer concluído;
- limpar o pending undo;
- informar:
  “Ficha restaurada, mas a tela não pôde ser atualizada.”
- não tentar restaurar outra vez.

Se a mutation de restore falhar:

- manter o pending undo disponível enquanto ainda estiver no prazo;
- retornar false;
- não fechar automaticamente o Snackbar;
- mostrar erro amigável.

Não limpar token antes de obter sucesso na mutation.

==================================================
8. CALLBACKS OBSOLETOS
==================================================

O `onDismiss` de um Snackbar antigo não pode limpar um undo novo.

Criar:

clearPendingUndo(token: string): void

A função só limpa quando:

pendingUndo.token === token

Exemplo de caso a proteger:

1. ficha A gera Snackbar token A;
2. ficha B gera Snackbar token B;
3. callback atrasado de A executa;
4. token B deve permanecer intacto.

Adicionar teste específico.

==================================================
9. COMPONENTE TOAST/SNACKBAR
==================================================

Atualizar o componente atual para aceitar ação assíncrona de forma segura.

Contrato sugerido:

interface ToastAction {
  label: string
  onPress: () => boolean | void | Promise<boolean | void>
}

Ou props equivalentes:

- actionLabel;
- onAction;
- actionBusy opcional;
- onDismiss.

Regras:

- impedir duplo toque enquanto a ação estiver em execução;
- área de toque mínima de 48 dp;
- mostrar estado visual de execução quando necessário;
- chamar `onAction`;
- aguardar Promise;
- se o resultado for false, manter Snackbar visível;
- se o resultado for true ou void, fechar;
- chamar `onDismiss` somente quando realmente fechar;
- fechamento automático deve respeitar token atual;
- timer deve ser cancelado durante ação assíncrona;
- timer não pode fechar Snackbar enquanto Desfazer está rodando;
- erro do callback não deve causar unhandled rejection;
- ação antiga não pode executar após troca de mensagem.

Não armazenar callback no SQLite ou no domínio.

==================================================
10. EXPIRAÇÃO DO DESFAZER
==================================================

A duração visual continua sendo aproximadamente seis segundos.

Quando expirar:

- limpar apenas o token correspondente;
- não alterar a ficha;
- não executar restore;
- não produzir erro.

Caso o usuário toque exatamente durante a expiração:

- no máximo uma decisão deve vencer;
- ou a restauração inicia e o timer é cancelado;
- ou o token expira e a restauração não inicia;
- nunca restaurar duas vezes;
- nunca deixar o Snackbar sem estado consistente.

Adicionar teste com timers falsos.

==================================================
11. RESULTADOS PÚBLICOS DO CONTROLLER
==================================================

Evitar retornar apenas boolean quando a UI precisa distinguir estados.

Para `moveToTrash`, retornar resultado como:

type TrashUiResult =
  | { status: 'success'; refreshWarning: false }
  | { status: 'success'; refreshWarning: true }
  | { status: 'failed' }

O nome pode variar.

O editor deve navegar para trás quando:

status === 'success'

mesmo que:

refreshWarning === true

Somente permanecer na tela quando a mutation falhou.

Aplicar a mesma distinção, quando necessário, a:

- restore;
- deletePermanently;
- emptyTrash;
- purgeExpired.

Não transformar todas as operações do aplicativo inteiro neste patch.

Limitar a mudança ao controller da lixeira e integrações diretas.

==================================================
12. REFRESH CONSISTENTE
==================================================

Criar função separada:

refreshTrashDependents(): Promise<void>

Ela deve atualizar de forma explícita:

- lista normal de fichas;
- ficha selecionada;
- dashboard;
- lixeira;
- contador/badge.

Usar `Promise.allSettled`, ou tratamento equivalente, quando múltiplos refreshes
independentes forem executados.

Não interromper a coleta das falhas na primeira Promise rejeitada.

Retornar ou lançar um erro agregado sanitizado contendo quais partes falharam.

Não executar a mutation novamente para corrigir falha de refresh.

Adicionar ação ou método:

retryRefresh(): Promise<boolean>

Essa ação apenas recarrega dados.

==================================================
13. CORRIGIR EXCLUSÃO PERMANENTE
==================================================

Na confirmação individual, mostrar:

Título:

Excluir “<nome da ficha>” permanentemente?

Descrição:

“A programação desta ficha não poderá ser recuperada. Seu histórico de sessões
será preservado.”

Botões:

- Cancelar;
- Excluir permanentemente.

O botão destrutivo deve usar exatamente:

“Excluir permanentemente”

Não usar apenas “Excluir”.

Adicionar teste de interface verificando:

- nome da ficha;
- texto sobre histórico;
- texto do botão.

==================================================
14. CORRIGIR CARD DA LIXEIRA
==================================================

Cada card deve mostrar:

- nome;
- categoria;
- dificuldade;
- data em que foi movida;
- label de expiração;
- restaurar;
- excluir permanentemente.

Não omitir dificuldade.

Acessibilidade deve descrever:

“<nome>, categoria <categoria>, dificuldade <dificuldade>, será apagada em X
dias.”

==================================================
15. NÍVEIS VISUAIS DE EXPIRAÇÃO
==================================================

Aplicar exatamente:

- mais de 2 dias: `textSecondary`;
- 2 dias ou menos, mas ainda não vencida: `warning`;
- vencida: `danger`.

Não depender apenas da cor.

Manter texto explícito:

- “Será apagada em X dias”;
- “Será apagada amanhã”;
- “Será apagada hoje”;
- “Pronta para exclusão”.

Adicionar função pura ou contrato visual testável para determinar a intenção:

type TrashUrgency =
  | 'normal'
  | 'warning'
  | 'expired'

==================================================
16. TEXTO SOBRE EXPURGO
==================================================

Substituir textos que afirmem exclusão automática em background.

Usar:

“As fichas ficam na lixeira por sete dias. Depois do prazo, são removidas na
próxima abertura do app ou atualização desta tela.”

No estado vazio:

“Não há fichas na lixeira.”

Descrição:

“As fichas excluídas podem ser restauradas durante sete dias.”

Atualizar README e documentação com a mesma semântica.

==================================================
17. MODAL ESVAZIAR
==================================================

Substituir o `TextInput` cru por `ThemedTextInput`.

Mostrar quantidade exata:

- “1 ficha será excluída permanentemente.”
- “3 fichas serão excluídas permanentemente.”

Informar:

- backup será criado primeiro;
- histórico de sessões será preservado;
- programação não poderá ser recuperada.

Manter confirmação digitada:

ESVAZIAR

Normalização:

value.trim().toUpperCase() === 'ESVAZIAR'

Botão destrutivo deve permanecer desabilitado até a confirmação válida.

Durante a operação:

- impedir duplo envio;
- não fechar modal antes do resultado;
- mostrar loading;
- se backup falhar, manter modal e dados;
- se emptyTrash confirmar mas refresh falhar, fechar modal e mostrar warning,
  pois a lixeira já foi esvaziada.

==================================================
18. BACKUP E MENSAGENS
==================================================

Manter:

BEFORE_EMPTY_TRASH

Garantir:

- backup termina antes da mutation;
- falha de backup impede mutation;
- backup criado não é apagado caso refresh falhe;
- mensagem de sucesso diferencia:
  - backup e esvaziamento concluídos;
  - esvaziamento concluído, refresh falhou.

Não alterar o schema do backup neste patch.

==================================================
19. DOCUMENTAÇÃO DO BACKUP
==================================================

Corrigir referências ao nome físico do arquivo.

Não afirmar que o arquivo se chama literalmente:

training-backup-v2.json

Documentar:

- formato interno: schemaVersion 2;
- nome do arquivo manual:
  `training-backup-<timestamp>.json`;
- nome do backup automático:
  `training-auto-backup-<timestamp>.json`.

Atualizar:

README.md
docs/BACKUP_AND_RESTORE.md
docs/TRAINING_PLAN_LIFECYCLE.md
docs/PRODUCT_ROADMAP.md

Não marcar o Marco 2 como iniciado.

==================================================
20. CASOS SQLITE FALTANTES
==================================================

Adicionar testes reais para:

1. sessão PAUSED bloqueia moveToTrash;
2. ficha arquivada pode ser movida para lixeira e deixa de ser arquivada;
3. ficha na lixeira não pode ser ativada;
4. ficha na lixeira não pode iniciar sessão;
5. ficha na lixeira não pode ser editada;
6. purgeExpired não remove ficha associada a sessão ativa;
7. purgeExpired não remove ficha associada a sessão pausada;
8. emptyTrash faz rollback integral quando uma exclusão falha;
9. backup v2 restaura ficha não vencida e ela permanece na lixeira;
10. backup v2 restaura ficha vencida e purgeExpired a remove;
11. exclusão permanente preserva histórico;
12. contador permanece correto após rollback.

Não usar mocks para atomicidade SQLite.

==================================================
21. TESTES DE CONCORRÊNCIA DO CONTROLLER
==================================================

Adicionar testes determinísticos usando Promises controladas/deferred.

Caso 1: Desfazer não aparece antes de liberar lock

1. mutation resolve;
2. refresh permanece pendente;
3. confirmar que pending undo ainda não foi publicado;
4. resolver refresh;
5. confirmar que lock foi liberado;
6. confirmar que Snackbar/undo foi publicado.

Caso 2: refresh falha depois do commit

1. mutation confirma;
2. refresh rejeita;
3. resultado público é success com warning;
4. navegação pode ocorrer;
5. pending undo continua disponível;
6. mensagem não afirma que mutation falhou.

Caso 3: toque rápido em Desfazer

1. publicar pending undo;
2. tocar Desfazer;
3. repository.restore é chamado exatamente uma vez;
4. segundo toque não inicia outra chamada;
5. token só é limpo após commit da restauração.

Caso 4: restauração falha

1. repository.restore rejeita;
2. callback retorna false;
3. Snackbar permanece;
4. token permanece enquanto válido;
5. usuário pode tentar novamente.

Caso 5: callback antigo

1. criar token A;
2. criar token B;
3. executar dismiss de A;
4. token B permanece.

Caso 6: expiração concorrente

1. iniciar ação antes do timer vencer;
2. avançar timers;
3. restore executa uma vez;
4. Snackbar fecha de forma consistente.

Caso 7: unmount

1. iniciar refresh;
2. desmontar controller;
3. resolver promises;
4. não atualizar estado desmontado;
5. não deixar unhandled rejection.

==================================================
22. TESTES DO TOAST/SNACKBAR
==================================================

Cobrir:

- ação síncrona com sucesso fecha;
- ação assíncrona com sucesso fecha;
- ação retorna false e permanece;
- ação rejeita e permanece ou fecha com erro tratado, conforme contrato
  documentado;
- duplo toque chama onAction uma vez;
- timer pausa durante ação;
- onDismiss chamado uma vez;
- mensagem nova invalida callback antigo;
- touch target mínimo;
- acessibilidade;
- Snackbar não cobre tab bar;
- ThemedTextInput no modal ESVAZIAR.

==================================================
23. TESTES VISUAIS E DE TELA
==================================================

Adicionar testes para:

- nome na confirmação permanente;
- botão “Excluir permanentemente”;
- dificuldade no card;
- quantidade no modal;
- singular e plural;
- urgência normal;
- urgência warning;
- urgência expired;
- texto correto sobre remoção após abertura;
- badge escondido quando zero;
- badge atualizado após mutation;
- erro de refresh não desfaz sucesso visual da mutation.

==================================================
24. CI
==================================================

No job `local-mobile`, adicionar:

- run: npm run typecheck --workspace=@training/training-wger
- run: npm run test --workspace=@training/training-wger

A ordem recomendada:

1. training-domain;
2. training-local-db;
3. training-wger;
4. training-mobile;
5. umamusume-mobile;
6. Expo install check;
7. Expo export;
8. git diff --check.

O job local-mobile não pode usar `continue-on-error`.

Não chamar Wger real no CI.

==================================================
25. ROADMAP
==================================================

Atualizar:

docs/PRODUCT_ROADMAP.md

O Marco 1 só pode ser marcado como:

ESTABILIZADO

depois de:

- corrida do Desfazer coberta;
- mutation e refresh separados;
- UX corrigida;
- testes adicionados;
- CI atualizado;
- validações passando.

Não marcar:

Marco 2 em andamento

neste commit.

==================================================
26. VERSÃO
==================================================

Manter:

- mobile version: 0.4.0;
- android.versionCode: 6.

Não incrementar versão neste patch.

Não gerar APK.

O versionCode será incrementado apenas quando for gerado outro APK instalável.

==================================================
27. VALIDAÇÃO
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

Não declarar sucesso se qualquer comando falhar.

==================================================
28. CRITÉRIOS DE CONCLUSÃO
==================================================

O patch estará aprovado somente quando:

- Desfazer não puder falhar por causa do lock da mutation original;
- pending undo só aparecer depois da liberação do lock;
- token não for apagado antes do restore confirmado;
- duplo toque não duplicar restore;
- callback antigo não apagar token novo;
- refresh falho não transformar mutation confirmada em falha;
- editor navegar depois de mutation confirmada;
- UI comunicar warning de refresh separadamente;
- confirmação permanente mostrar nome;
- dificuldade aparecer no card;
- urgência visual seguir o contrato;
- modal ESVAZIAR usar ThemedTextInput;
- quantidade aparecer no modal;
- documentação do backup estar correta;
- testes faltantes existirem;
- training-wger estiver no CI;
- todas as validações passarem.

==================================================
29. ENTREGA
==================================================

Informar:

1. commit final;
2. causa da corrida original;
3. estrutura removida ou alterada no antigo `run`;
4. novo modelo de resultado de mutation;
5. novo modelo de pending undo;
6. política de locks;
7. comportamento em refresh falho;
8. comportamento do Snackbar assíncrono;
9. testes de concorrência adicionados;
10. testes SQLite adicionados;
11. correções de UX;
12. correções de documentação;
13. alteração do CI;
14. resultado de todos os comandos;
15. limitações restantes;
16. confirmação de que o Marco 1 pode ou não ser marcado como estabilizado.

Não iniciar o Marco 2.