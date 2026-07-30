Continue o desenvolvimento do repositório `training-app` a partir do commit:

c4bce5b7e19306db2770657dcd4d0887be21ac32

Esta sprint deve implementar a primeira integração externa real do aplicativo
local-only: importação explícita de exercícios do catálogo público Wger para o
SQLite do aparelho.

Também deve corrigir os problemas visuais residuais encontrados na revisão da
versão 0.2.1.

O aplicativo continua local-only:

- nenhuma VPS;
- nenhum backend próprio;
- nenhum login obrigatório;
- nenhuma chamada de rede no bootstrap;
- nenhuma sincronização silenciosa;
- nenhum dado de treino enviado para fora;
- nenhuma dependência de internet após o exercício ser importado, exceto mídia
  remota que não tenha sido baixada.

A rede deve ser usada somente quando o usuário abrir a integração e iniciar uma
busca ou atualização.

Ao final, preparar e gerar o APK preview:

- version: 0.3.0
- android.versionCode: 5

==================================================
1. OBJETIVO DO FLUXO
==================================================

O usuário deve conseguir:

1. abrir Mais;
2. abrir Integrações;
3. escolher Wger;
4. ler claramente o que será consultado e salvo;
5. iniciar a consulta;
6. navegar pelos exercícios retornados;
7. filtrar e buscar nos resultados;
8. abrir uma prévia;
9. selecionar exercícios;
10. importar os selecionados;
11. fechar o aplicativo;
12. abrir em modo avião;
13. encontrar os exercícios importados na biblioteca;
14. adicioná-los à ficha;
15. iniciar e concluir uma sessão com eles.

Nenhuma etapa normal do app deve depender do Wger.

==================================================
2. ARQUITETURA
==================================================

Criar package:

packages/training-wger/

Estrutura sugerida:

packages/training-wger/
├── client/
│   ├── WgerClient.ts
│   ├── WgerHttpError.ts
│   └── types.ts
├── mapper/
│   ├── mapWgerExercise.ts
│   ├── language.ts
│   ├── category.ts
│   └── sanitizeText.ts
├── provider/
│   └── WgerExerciseCatalogProvider.ts
├── fixtures/
├── tests/
├── index.ts
├── package.json
└── tsconfig.json

Dependências permitidas:

- @training/training-domain;
- APIs padrão do JavaScript;
- fetch injetado.

Não depender de:

- React;
- React Native;
- Expo;
- SQLite;
- backend Spring;
- Axios;
- DOMParser;
- bibliotecas HTML pesadas.

O package deve ser reutilizável e testável em Node.

==================================================
3. CONTRATOS DO DOMÍNIO
==================================================

Substituir o placeholder atual:

ExternalExerciseCatalogProvider.preview(
  filters: Record<string, unknown>
): Promise<ExerciseDefinitionInput[]>

por tipos explícitos.

Criar:

ExternalExerciseCatalogQuery

Campos:

- page;
- pageSize;
- language;
- fallbackLanguage;
- text;
- categoryIds;
- muscleIds;
- equipmentIds;
- onlyWithImage;
- onlyWithVideo.

Criar:

ExternalExerciseMediaCandidate

Campos:

- type;
- source;
- externalId;
- remoteUrl;
- thumbnailRemoteUrl;
- mimeType;
- width;
- height;
- durationSeconds;
- main;
- sortOrder;
- licenseName;
- licenseUrl;
- author;
- sourceUrl.

Criar:

ExternalExerciseCandidate

Campos:

- provider;
- externalId;
- name;
- description;
- primaryMuscleGroup;
- secondaryMuscleGroups;
- equipment;
- category;
- difficulty;
- instructions;
- unilateral;
- timed;
- sourceUrl;
- licenseName;
- licenseUrl;
- author;
- media;
- warnings.

Criar:

ExternalExerciseCatalogPage

Campos:

- items;
- page;
- pageSize;
- total;
- hasNext;
- hasPrevious;
- nextCursor opcional.

Interface:

ExternalExerciseCatalogProvider {
  search(query: ExternalExerciseCatalogQuery):
    Promise<ExternalExerciseCatalogPage>

  findByExternalId(externalId: string, language?: string):
    Promise<ExternalExerciseCandidate | null>
}

Não usar ExerciseDefinitionInput como representação de um exercício externo,
porque esse tipo não possui origem, externalId, licença ou mídia.

==================================================
4. CONTRATO WGER
==================================================

Usar por padrão:

https://wger.de/api/v2

Consultar o OpenAPI atual antes de implementar:

https://wger.de/api/v2/schema

Endpoint principal esperado:

/exerciseinfo/

Não assumir campos pela memória ou pelo backend Java antigo.

Antes de escrever DTOs:

1. baixar ou consultar o OpenAPI;
2. localizar o schema real de exerciseinfo;
3. documentar os campos utilizados;
4. salvar fixtures representativas;
5. implementar parser defensivo.

Não consultar o OpenAPI durante o uso normal do aplicativo.

O runtime deve usar apenas endpoints necessários ao catálogo.

==================================================
5. SEGURANÇA DO CLIENTE
==================================================

Configuração padrão:

WGER_BASE_URL=https://wger.de/api/v2
WGER_TIMEOUT_MS=15000
WGER_PAGE_SIZE=20
WGER_MAX_PAGE_SIZE=50
WGER_MAX_PAGES_PER_ACTION=5

Regras:

- somente HTTPS;
- aceitar apenas origem wger.de nesta versão;
- não seguir paginação para outro host;
- validar a URL de `next`;
- timeout com AbortController;
- aceitar somente JSON;
- rejeitar resposta excessivamente grande;
- não registrar corpo completo da resposta;
- não registrar dados sensíveis;
- não usar token;
- não solicitar chave de API;
- não enviar fichas, sessões, histórico ou identificadores locais.

Headers:

- Accept: application/json;
- Accept-Language quando aplicável.

Não inventar User-Agent proibido pelo ambiente React Native.

==================================================
6. PAGINAÇÃO E ERROS
==================================================

O cliente deve interpretar:

- count;
- next;
- previous;
- results.

Tratar explicitamente:

- offline;
- timeout;
- DNS;
- HTTP 400;
- HTTP 404;
- HTTP 429;
- HTTP 500–599;
- JSON inválido;
- schema incompatível;
- resposta vazia.

Para 429:

- ler Retry-After;
- mostrar tempo aproximado;
- não repetir automaticamente.

Não implementar retry automático agressivo.

Permitir apenas retry manual iniciado pelo usuário.

==================================================
7. IDIOMAS
==================================================

Seleção da tradução:

1. pt-br exato;
2. pt exato;
3. en exato;
4. primeira tradução válida.

Normalizar:

- maiúsculas/minúsculas;
- hífen e underscore;
- espaços.

Nunca usar tradução sem nome.

Quando português não existir:

- mostrar indicador “Tradução em inglês”;
- preservar o idioma original no candidate;
- não esconder que houve fallback.

Adicionar testes para:

- pt-br;
- pt;
- en;
- fallback;
- tradução vazia;
- múltiplas traduções incompletas.

==================================================
8. TEXTO E HTML
==================================================

Descrição e instruções vindas do Wger podem conter formatação.

Armazenar texto plano sanitizado.

Suportar ao menos:

- parágrafos;
- quebras de linha;
- listas;
- entidades HTML comuns.

Remover:

- tags;
- scripts;
- estilos;
- URLs javascript:;
- caracteres de controle;
- espaços repetidos excessivos.

Não renderizar HTML remoto em WebView.

==================================================
9. MAPEAMENTO DE EXERCÍCIOS
==================================================

Mapear:

- ID ou UUID Wger para externalId estável;
- tradução escolhida para name, description e instructions;
- músculos para primaryMuscleGroup e secondaryMuscleGroups;
- equipamentos para equipment;
- imagens;
- vídeos;
- licença;
- autoria;
- objeto original;
- sourceUrl.

Categoria local:

- CARDIO quando explicitamente cardio;
- MOBILITY quando explicitamente mobilidade;
- STRETCHING quando explicitamente alongamento;
- RECOVERY quando explicitamente recuperação;
- TECHNIQUE quando explicitamente técnica;
- STRENGTH como fallback para exercícios resistidos.

Não usar região corporal do Wger como categoria local.

Difficulty:

- usar valor remoto somente quando existir e for compreensível;
- caso contrário usar “Não informado”.

Unilateral e timed devem ser inferidos apenas quando o contrato remoto fornecer
informação confiável.

Não inferir com base apenas no nome.

==================================================
10. MÍDIAS
==================================================

Importar apenas metadados e URLs.

Não baixar arquivos nesta sprint.

Rejeitar mídia quando:

- não possui ID externo;
- URL não é HTTPS;
- URL está vazia;
- tipo é desconhecido;
- largura é negativa;
- altura é negativa;
- duração é negativa.

Preservar:

- licença específica da mídia;
- autor específico;
- sourceUrl;
- thumbnail;
- ordem;
- mídia principal.

Não usar URL direta do arquivo como sourceUrl quando existir página ou objeto
original.

Não carregar vídeos:

- durante busca;
- durante lista;
- durante bootstrap.

Vídeo só pode carregar após ação explícita na tela de detalhe.

==================================================
11. REPOSITORY DE IMPORTAÇÃO
==================================================

Criar interface:

ExternalExerciseImportRepository

Métodos:

previewExisting(candidates):
  Promise<ExternalExerciseImportPreview[]>

importSelected(candidates):
  Promise<ExternalExerciseImportResult>

refreshImported(provider):
  Promise<ExternalExerciseImportResult>

Tipos de resultado:

- created;
- updated;
- unchanged;
- skipped;
- failed;
- warnings;
- affectedIds.

Adicionar ao LocalRepositories:

externalExerciseImport

Não misturar essa operação com create(), que deve continuar criando exercício
CUSTOM.

==================================================
12. UPSERT LOCAL
==================================================

Importar Wger com:

source = 'WGER'

Chave lógica:

(source, external_id)

Regras:

- exercício existente mantém o mesmo ID SQLite;
- referências em fichas continuam válidas;
- importar novamente não cria duplicata;
- campos remotos podem ser atualizados;
- archived local deve ser preservado;
- exercícios CUSTOM nunca são alterados;
- exercícios SYSTEM nunca são alterados;
- notas pessoais locais não devem ser apagadas sem decisão explícita;
- mídias são atualizadas por source + externalId;
- IDs de mídia existentes devem ser preservados.

Executar o lote inteiro em transação.

Falha de banco durante o lote:

- rollback completo;
- nenhum exercício parcial;
- nenhuma mídia órfã.

==================================================
13. MIGRATION SQLITE
==================================================

Não editar migrations 1, 2 ou 3.

Criar migration 4.

Adicionar índice único parcial de mídia:

CREATE UNIQUE INDEX ... ON exercise_media(source, external_id)
WHERE external_id IS NOT NULL;

Antes de criar o índice:

- verificar fixtures e testes;
- garantir que não existam duplicatas introduzidas pelo seed.

Criar também índice de consulta:

exercise_definitions(source, external_id, archived)

Não usar IF NOT EXISTS para esconder histórico inconsistente.

Testar upgrade:

- banco na migration 3;
- aplicar migration 4;
- preservar exercícios, fichas, sessões e backups;
- segunda inicialização;
- checksum imutável.

==================================================
14. ATUALIZAÇÃO DE IMPORTADOS
==================================================

Criar ação:

“Atualizar exercícios importados”

Fluxo:

1. carregar IDs Wger locais;
2. consultar detalhes atuais;
3. mostrar quantos serão atualizados;
4. usuário confirma;
5. aplicar upsert;
6. preservar IDs SQLite;
7. informar criados, atualizados, inalterados e falhas.

Não executar automaticamente.

Não apagar exercícios locais caso o Wger esteja indisponível.

Caso um item remoto não seja encontrado:

- manter item local;
- registrar aviso;
- não arquivar silenciosamente.

==================================================
15. TELA DE INTEGRAÇÕES
==================================================

Criar rota:

Integrations

Na tela Mais, adicionar:

INTEGRAÇÕES
- Catálogo Wger

Detalhes:

“Busca exercícios públicos e salva uma cópia no aparelho.”

Não colocar a ação de rede diretamente no bootstrap ou na Home.

==================================================
16. TELA WGER
==================================================

Criar:

WgerIntegrationScreen

Estados:

- explicação;
- pronto;
- carregando;
- resultados;
- importando;
- sucesso;
- parcial;
- erro;
- offline.

No primeiro uso, mostrar:

- o app fará requisições GET ao Wger;
- nenhum treino será enviado;
- exercícios escolhidos serão salvos no aparelho;
- imagens e vídeos podem depender de internet;
- cada item mantém licença e atribuição;
- o usuário controla quando consultar e importar.

Botão principal:

“Buscar exercícios”

Filtros iniciais:

- texto;
- somente com imagem;
- somente com vídeo;
- idioma;
- quantidade por página.

Não mostrar filtros remotos que o OpenAPI não suporte.

Busca textual pode ser local sobre os resultados carregados caso o endpoint não
ofereça busca textual oficial.

==================================================
17. RESULTADOS E SELEÇÃO
==================================================

Cada resultado deve mostrar:

- checkbox;
- nome;
- músculo principal;
- equipamento;
- categoria mapeada;
- idioma;
- indicador de imagem;
- indicador de vídeo;
- origem Wger;
- aviso de item já importado.

Ações:

- selecionar;
- selecionar página;
- limpar seleção;
- abrir detalhes;
- importar selecionados;
- próxima página;
- página anterior.

Não importar automaticamente ao marcar.

Não selecionar todos os resultados globais sem o usuário saber quantos serão
importados.

==================================================
18. PRÉ-VISUALIZAÇÃO
==================================================

Tela ou modal deve mostrar:

- nome;
- descrição;
- instruções;
- músculos;
- equipamentos;
- categoria local;
- mídia principal;
- autor;
- licença;
- fonte original;
- avisos do mapper.

Não reproduzir vídeo automaticamente.

Permitir editar antes da importação apenas:

- categoria local;
- dificuldade;
- músculo principal;
- equipamento.

Não permitir alterar:

- externalId;
- origem;
- licença;
- autoria;
- URLs da fonte.

==================================================
19. EXPERIÊNCIA OFFLINE
==================================================

Em modo avião:

- botão Wger permanece visível;
- tocar mostra mensagem clara;
- banco local não é modificado;
- biblioteca local continua funcionando;
- fichas e sessões continuam funcionando;
- exercícios anteriormente importados continuam visíveis;
- vídeos remotos mostram indisponibilidade sem bloquear treino.

Não usar a falha externa como erro global do aplicativo.

==================================================
20. CORRIGIR INPUTS VISUAIS RESTANTES
==================================================

Criar componente:

ThemedTextInput

Responsabilidades:

- cursorColor;
- selectionColor;
- placeholder;
- foco;
- erro;
- disabled;
- tamanho mínimo;
- acessibilidade.

Migrar todos os TextInput avulsos, incluindo:

- busca da biblioteca;
- busca do ExercisePicker;
- busca Wger;
- campos da sessão;
- campos de série;
- campos dos modais.

Nenhum TextInput escuro deve depender das cores padrão do Android.

==================================================
21. CORRIGIR TOAST
==================================================

O Toast atual não pode cobrir o ScreenHeader.

Escolher uma abordagem:

- snackbar inferior acima da tab bar;
- ou container de layout que reserve espaço.

Preferir snackbar inferior.

Considerar:

- safe area inferior;
- altura da tab bar;
- teclado;
- tela Session sem tab bar;
- modal.

Suportar tipos:

- info;
- success;
- warning;
- error.

A origem da mensagem deve informar o tipo correto.

Não tratar erro como info.

==================================================
22. MODAIS E SAFE AREA
==================================================

Corrigir o modal de exercício e novos modais Wger.

Todos devem possuir:

- SafeAreaView ou insets explícitos;
- KeyboardAvoidingView;
- conteúdo rolável;
- padding inferior real;
- botão fechar acessível;
- suporte a tela pequena;
- suporte a teclado aberto.

Nenhum botão pode ficar escondido atrás da barra gestual.

==================================================
23. CONTRASTE RESIDUAL
==================================================

Corrigir:

- setas de reordenação sem cor de tema;
- chip pressionado com texto incompatível;
- textos pequenos usando gray400 no tema claro;
- nomes de ficha com apenas 12 px;
- nomes de exercício com apenas 13 px.

Mínimos:

- nomes de exercícios: 16 px;
- nomes de fichas: 15 px;
- metadados principais: 14 px.

Adicionar testes de contraste para:

- chip pressionado;
- gray400 ou seu substituto;
- botões de reordenação;
- Snackbar;
- estados offline, erro e sucesso.

==================================================
24. CONTROLLER DA INTEGRAÇÃO
==================================================

Criar hook:

useWgerIntegrationController

Responsabilidades:

- query;
- página;
- resultados;
- seleção;
- preview;
- carregamento;
- cancelamento;
- importação;
- atualização;
- mensagens;
- erros.

Cancelar requisição quando:

- usuário sai da tela;
- inicia nova busca;
- altera página antes da resposta;
- fecha o app.

Evitar resposta antiga substituindo uma busca nova.

Usar request ID ou AbortController.

==================================================
25. PRIVACIDADE
==================================================

Nenhum dado local deve ser enviado.

Adicionar teste garantindo que a URL e o body das requisições não contêm:

- nomes de fichas;
- sessões;
- séries;
- histórico;
- notas;
- IDs SQLite;
- backups;
- configurações;
- identificador do dispositivo.

As consultas devem conter apenas filtros do catálogo.

==================================================
26. LICENÇAS E ATRIBUIÇÃO
==================================================

Preservar licença individual do exercício e das mídias.

Na biblioteca e detalhe:

- mostrar origem Wger;
- mostrar autor quando fornecido;
- mostrar licença quando fornecida;
- permitir abrir fonte original;
- permitir abrir licença;
- mostrar “Informação não fornecida pela fonte” quando ausente.

Não aplicar uma única licença global a todos os itens.

Não remover atribuição durante atualização.

==================================================
27. DOCUMENTAÇÃO DO USUÁRIO
==================================================

Criar:

docs/WGER_INTEGRATION.md

Documentar:

- o que é Wger;
- por que internet é necessária somente durante consulta;
- o que o app envia;
- o que o app não envia;
- como abrir a integração;
- como buscar;
- como selecionar;
- como importar;
- como atualizar;
- como usar offline;
- comportamento de imagens e vídeos;
- licenças e atribuição;
- erros comuns;
- timeout;
- limite de requisições;
- indisponibilidade;
- remoção de exercícios;
- diferenças entre CUSTOM, SYSTEM e WGER.

Não afirmar que vídeos ficam offline.

==================================================
28. DOCUMENTAÇÃO TÉCNICA
==================================================

Criar:

docs/WGER_API_CONTRACT.md

Registrar:

- data da verificação;
- base URL;
- endpoint;
- paginação;
- campos utilizados;
- seleção de idioma;
- mapeamento de categoria;
- validação de URLs;
- tratamento de licença;
- política de timeout;
- política de 429;
- política de retries;
- fixtures;
- limitações conhecidas.

Adicionar exemplo sanitizado de resposta.

Não copiar uma resposta enorme da API.

==================================================
29. README
==================================================

Atualizar o README:

- app continua local-only;
- Wger é integração opcional;
- nenhuma VPS é necessária;
- nenhuma chave Wger é necessária para catálogo público;
- consulta só ocorre por ação do usuário;
- dados importados ficam no SQLite;
- mídia remota pode exigir internet.

Adicionar fluxo resumido:

Mais
→ Integrações
→ Catálogo Wger
→ Buscar
→ Selecionar
→ Importar

==================================================
30. TESTES DO CLIENTE WGER
==================================================

Não chamar Wger real no CI.

Usar fixtures.

Cobrir:

- resposta paginada;
- próxima página;
- página anterior;
- host inválido em next;
- timeout;
- abort;
- offline;
- 429 com Retry-After;
- 500;
- JSON inválido;
- schema incompleto;
- resposta vazia;
- limite de página;
- URL não HTTPS.

==================================================
31. TESTES DO MAPPER
==================================================

Cobrir:

- pt-br;
- pt;
- inglês;
- fallback;
- HTML;
- listas;
- entidades;
- músculos;
- equipamentos;
- categoria;
- licença;
- autor;
- imagem;
- vídeo;
- mídia inválida;
- exercício sem nome;
- exercício sem músculo;
- URLs HTTP;
- campos desconhecidos.

Um item incompleto deve retornar aviso ou ser rejeitado de maneira explícita.

Não inventar dados silenciosamente.

==================================================
32. TESTES SQLITE
==================================================

Cobrir:

- importar um exercício;
- importar mídia;
- reimportar sem duplicar;
- manter ID local;
- atualizar conteúdo;
- preservar archived;
- preservar CUSTOM;
- preservar SYSTEM;
- rollback de lote;
- mídia inválida ignorada;
- migration 3 para 4;
- índice único;
- segunda inicialização;
- ficha usando exercício importado;
- sessão usando snapshot;
- exercício remoto atualizado sem alterar sessão histórica.

==================================================
33. TESTES MOBILE
==================================================

Cobrir:

- abrir Integrações;
- consentimento;
- busca;
- cancelar busca;
- erro offline;
- resultado;
- seleção;
- selecionar página;
- limpar seleção;
- preview;
- importar;
- reimportar;
- atualizar importados;
- mensagem parcial;
- voltar durante requisição;
- resposta antiga ignorada;
- Snackbar não cobrindo header;
- modal com teclado;
- ThemedTextInput no tema escuro.

==================================================
34. TESTE REAL DA API
==================================================

Após os testes automatizados, executar manualmente:

1. abrir OpenAPI atual;
2. confirmar endpoint e campos;
3. fazer uma consulta com pageSize 5;
4. verificar português;
5. verificar fallback inglês;
6. verificar exercício com imagem;
7. verificar exercício com vídeo;
8. selecionar três exercícios;
9. importar;
10. fechar o app;
11. ativar modo avião;
12. abrir biblioteca;
13. adicionar exercício importado à ficha;
14. iniciar treino;
15. concluir série;
16. concluir sessão;
17. reativar internet;
18. atualizar os importados;
19. confirmar IDs locais preservados;
20. reimportar e confirmar ausência de duplicatas.

Registrar em:

docs/WGER_REAL_SMOKE_TEST.md

Não colocar dados pessoais.

==================================================
35. SMOKE VISUAL
==================================================

No mesmo aparelho, validar:

- topo;
- status bar;
- tab bar;
- tema claro;
- tema escuro;
- cursor;
- seleção de texto;
- Snackbar;
- modal de exercício;
- modal Wger;
- busca;
- chips;
- setas;
- teclado;
- fonte aumentada;
- nomes de exercícios;
- nomes de fichas.

Atualizar:

docs/ui-smoke/

==================================================
36. VERSÃO
==================================================

Atualizar somente o app padrão:

mobile/app.json:
- version 0.3.0
- android.versionCode 5

mobile/package.json:
- version 0.3.0

Não alterar:

- package;
- slug;
- scheme;
- projectId;
- Umamusume.

==================================================
37. VALIDAÇÃO
==================================================

Executar:

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
38. APK
==================================================

Após validações e smoke real:

cd mobile

npx eas-cli@latest build:inspect \
  --platform android \
  --stage pre-build \
  --profile preview \
  --output .eas-inspect \
  --force

Confirmar:

- package com.konazin.trainingapp;
- versionName 0.3.0;
- versionCode 5;
- sem URL de backend próprio;
- sem token;
- Wger somente HTTPS;
- SQLite presente;
- buildType APK.

Gerar:

npx eas-cli@latest build \
  --platform android \
  --profile preview \
  --non-interactive \
  --json

Baixar como:

artifacts/training-app-local-0.3.0.apk

Calcular SHA-256.

Não adicionar APK ao Git.

==================================================
39. CRITÉRIOS DE CONCLUSÃO
==================================================

APROVADO:

- app funciona offline;
- Wger só é chamado por ação explícita;
- consulta real funciona;
- importação persiste no SQLite;
- duplicatas não são criadas;
- atribuição é preservada;
- exercício importado funciona em ficha e sessão;
- problemas visuais residuais foram corrigidos;
- testes passam;
- export passa;
- APK foi gerado.

CÓDIGO APROVADO, BUILD BLOQUEADO:

- código, testes e consulta real passam;
- EAS está bloqueado somente por autenticação ou credencial.

REPROVADO:

- importação altera dados em erro;
- importação cria duplicatas;
- app depende da API para abrir;
- item importado desaparece offline;
- licença ou autoria é perdida;
- qualquer teste obrigatório falha.

==================================================
40. ENTREGA
==================================================

Informar:

1. commit final;
2. endpoint Wger validado;
3. data da validação do OpenAPI;
4. contratos criados;
5. estratégia de idioma;
6. estratégia de mapeamento;
7. estratégia de upsert;
8. migration criada;
9. fluxo visual;
10. dados enviados ao Wger;
11. dados nunca enviados;
12. testes automatizados;
13. resultado da consulta real;
14. quantidade importada;
15. teste offline;
16. resultado visual;
17. versão e versionCode;
18. build ID;
19. URL do build;
20. caminho do APK;
21. tamanho;
22. SHA-256;
23. limitações restantes.

Não implementar IA, Health Connect, nuvem ou download de vídeo nesta sprint.