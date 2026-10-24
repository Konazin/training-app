# Prompt para IA de design — Training App / M*

Use todo o conteúdo abaixo como briefing do projeto. Ele descreve o produto e os requisitos funcionais da interface; a identidade visual final permanece aberta para ser construída em conjunto com a pessoa usuária.

---

## PROMPT

Você é uma equipe sênior de product design, UX research, design visual, acessibilidade e design systems. Seu trabalho é criar a experiência de UI/UX completa do Training App no marco **M***.

Não trate isto como um dashboard web adaptado para celular. Projete um app Android nativo, de uso diário, para celular, com interfaces claras, próprias e acabadas. A experiência precisa parecer marcante e premium, mas continuar rápida de entender durante um treino e confortável de usar com uma mão.

O marco M* trata exclusivamente de UX e UI: arquitetura da informação, fluxos, hierarquia, direção visual, design system, componentes, estados, microcopy, movimento e acessibilidade. Não crie novas regras de negócio, funcionalidades, contas, pagamentos, backend, sincronização ou suporte a outras plataformas.

## 1. Contexto do produto

O Training App é um app pessoal de treino para **Android em celular**. O produto é **local-first**: treinos, fichas, exercícios, histórico, nutrição e preferências ficam no aparelho. Os fluxos principais funcionam sem internet e sem conta. A pessoa pode exportar e restaurar seus próprios backups.

O app acompanha fichas semanais, exercícios de força, hipertrofia, cardio, mobilidade e alongamento, sessões de treino, descanso, histórico e nutrição manual. A interface atual já oferece progressão local explicada e dispensável; ela nunca deve ser aplicada automaticamente.

Catálogos externos e Gemini são opcionais. A rede só pode ser acessada após ação explícita da pessoa. Antes de cada envio de IA, a interface deve explicar os dados enviados e pedir confirmação. A chave Gemini é pessoal, fica no armazenamento seguro Android e não deve aparecer em backups nem ser exibida depois de salva. Uma imagem de refeição é transitória e não é armazenada pelo app.

O app não diagnostica, não prescreve treino ou nutrição e não transforma metas definidas pela pessoa em recomendações médicas. Sugestões de cardápio são genéricas, aproximadas, revisáveis e nunca inseridas automaticamente no diário.

Instalações novas começam sem exercício ou ficha de demonstração. A pessoa escolhe criar conteúdo, importar o pacote recomendado ou consultar um catálogo externo manualmente.

## 2. Decisões fechadas e decisões abertas

### Decisões fechadas — respeite em toda proposta

- Plataforma: Android, celular, orientação retrato.
- Idioma da interface: português do Brasil (pt-BR).
- Navegação principal com cinco destinos: **Hoje**, **Ficha**, **Progresso**, **Nutrição** e **Mais**.
- Dados principais no aparelho; sem login, nuvem ou sincronização obrigatória.
- Fluxos essenciais utilizáveis offline.
- Consultas externas e envios de IA somente após ação e confirmação explícitas.
- Controle da pessoa sobre criação, alteração, exclusão, importação e aplicação de sugestões.
- Preservar as funcionalidades existentes listadas neste briefing. Não invente telas de negócio como chat, feed social, ranking, loja, perfil público, assinatura, coach automático ou sincronização.
- Usar exemplos fictícios identificáveis como exemplos; não apresentar conteúdo inventado como dado real do usuário.

### Decisões abertas — apresente propostas, não presuma respostas

- Identidade de marca, logotipo e símbolo.
- Paleta visual final e cor de destaque.
- Família tipográfica e caráter editorial.
- Estilo de iconografia, ilustração, fotografia, mapas musculares e mídia.
- Uso e intensidade de cores, superfícies, contornos, elevação e animação.
- Personalidade visual: atlética, editorial, tecnológica, acolhedora ou outra.

O produto já possui quatro opções de tema. Não elimine essa capacidade nem assuma que os temas existentes definem a identidade final. Proponha como a nova direção pode manter quatro presets distintos e seus modos claro/escuro sem parecer quatro aplicativos diferentes.

## 3. Como conduzir o trabalho visual

Comece apresentando **três direções visuais realmente distintas**, aplicadas às mesmas telas de referência: **Hoje**, **Treino ativo** e **Progresso**. Para cada direção, mostre:

- nome curto e personalidade;
- referências ou palavras-chave visuais;
- abordagem de cor, tipografia, ícones, formas, superfícies e imagens;
- composição das três telas de referência;
- como a direção funciona em tema claro e escuro;
- como pode ser adaptada aos quatro presets atuais;
- pontos fortes, riscos de legibilidade e concessões da proposta.

Recomende uma direção e explique o motivo. Não fixe logo, paleta, tipografia ou identidade definitiva antes de apresentar as alternativas. Após a pessoa escolher ou combinar elementos, aplique a decisão ao design system e às telas restantes. Quando houver uma decisão de produto realmente necessária, apresente opções concretas e uma recomendação; não esconda a decisão em um mockup.

Não use clichês esportivos como única personalidade visual. Evite excesso de neon, estética agressiva, gráficos decorativos sem significado, gamificação intrusiva, cartões redundantes, gradientes em toda superfície e números grandes sem contexto. A personalidade deve vir da composição, tipografia, detalhes e consistência, mantendo leitura imediata.

## 4. Pessoas, contexto e objetivos de uso

Projete para alguém que quer organizar e acompanhar os próprios treinos, desde quem está começando até quem já tem uma rotina estruturada. A pessoa pode estar na academia, em casa ou em movimento. Durante o treino, pode usar o aparelho com uma mão, ter pressa, estar com as mãos suadas, olhar a tela rapidamente ou ter brilho e ruído ao redor.

As tarefas principais são:

1. entender o treino de hoje e iniciar ou retomar uma sessão;
2. registrar séries e descanso com poucos toques;
3. criar ou ajustar uma ficha semanal;
4. encontrar um exercício e entender sua execução;
5. consultar sessões anteriores e progresso disponível;
6. registrar refeições e consultar totais nutricionais definidos pela pessoa;
7. proteger dados por backup e restaurá-los quando necessário;
8. entender claramente quando uma consulta precisa de internet ou compartilha dados com um provedor.

Priorize estas tarefas sobre conteúdo secundário. Ações frequentes precisam estar visíveis; ações destrutivas, importações e envios remotos precisam deixar claro o efeito antes da confirmação.

## 5. Plataforma, idioma e layout

- Projete apenas para celular Android em retrato; não crie telas de web, tablet, iOS ou desktop.
- Use como referências de densidade um aparelho pequeno de **360 × 800 dp** e um aparelho comum de **393 × 852 dp**. Confira também um tamanho maior quando disponível.
- Respeite barras de sistema, recortes, área segura, navegação por gestos e teclado Android.
- O teclado numérico precisa combinar com o campo em edição. O botão de ação não pode ficar atrás do teclado; o formulário precisa rolar até o campo ativo.
- Use formatos pt-BR: datas e horários locais, kg, km, minutos/segundos, kcal e gramas. Não altere unidades ou dados do produto por decisão visual.
- Textos podem crescer: não dependa de uma largura exata, de títulos curtos ou de altura fixa nos componentes.
- A barra de abas aparece nas cinco telas principais. Nas rotas empilhadas, editores e sessão, use navegação de retorno coerente com Android; não replique a barra principal como se essas telas fossem abas.
- A barra inferior deve manter ícone **e rótulo** em cada destino e respeitar a área segura. Conteúdo rolável não pode ficar encoberto por ela.

## 6. Mapa de navegação existente

### Abas principais

- **Hoje** — resumo do dia, treino, semana e atalhos.
- **Ficha** — seletor e resumo das fichas e respectivos dias.
- **Progresso** — métricas e lista de sessões salvas.
- **Nutrição** — diário, metas, resumos e recursos opcionais de IA.
- **Mais** — biblioteca, integrações, aparência, backups e manutenção.

### Rotas e folhas associadas

- **Biblioteca de exercícios** e **Detalhe do exercício**.
- **Integrações** e **Catálogo externo** (fluxo manual).
- **Aparência e acessibilidade**.
- **Editor de ficha**, **Dia da ficha**, **Selecionar exercício**, **Configurar exercício do dia**, **Configurar atividade de descanso**.
- **Fichas arquivadas** e **Lixeira de fichas**.
- **Sessão de treino**.
- Modais de modelos de ficha, duplicação, confirmação, seleção, salvamento e feedback temporário.

Proponha fluxos simples entre essas rotas. Mantenha a navegação e os destinos reconhecíveis; não invente novas áreas ou hierarquias de produto.

## 7. Telas e conteúdo mínimo

Desenhe todas as telas abaixo, incluindo suas variações de estado indicadas. Cada tela deve ter hierarquia clara, conteúdo realista em português e ação principal visível. Quando o produto não possui um dado ou recurso, não fabrique um indicador para preencher espaço.

### 7.1 Onboarding — três passos dispensáveis

1. Explicar que os treinos ficam no aparelho, funcionam offline e não exigem conta.
2. Explicar que a pessoa cria ou escolhe a própria ficha e que o app não altera o plano sem ação dela.
3. Apresentar biblioteca, backup e integrações manuais.

Na etapa final, mostrar as escolhas existentes: **Importar pacote recomendado**, **Explorar catálogo externo**, **Criar exercício personalizado** e **Continuar sem exercícios**. Incluir progresso do passo, **Pular** e **Próximo/Continuar**. A importação e a consulta externa só começam depois da escolha explícita.

### 7.2 Hoje

Mínimo necessário:

- saudação e data local legível;
- aviso importante, quando houver, sem substituir o conteúdo principal;
- cartão destacado para sessão **em andamento** ou **pausada**, com ação **Continuar treino/Retomar treino**;
- resumo do treino de hoje: ficha, nome do dia, exercícios e duração estimada;
- ação contextual: **Iniciar**, **Continuar**, **Configurar** ou indicação textual de descanso/conclusão, conforme o estado real;
- referências do último desempenho, quando existirem, claramente informativas;
- resumo semanal de segunda a domingo, com estado de cada dia descrito também por texto;
- atalhos para ficha ativa, fichas arquivadas, lixeira com quantidade, biblioteca e integrações.

Estados que precisam de layout próprio: primeira instalação sem ficha; fichas salvas sem ficha ativa; descanso; treino configurado; treino já concluído; sessão em andamento/pausada; carregamento; atualização com aviso ou erro. Instalações novas não devem mostrar exercícios nem fichas de demonstração.

### 7.3 Ficha — lista e resumo semanal

- título e ação para criar ficha;
- seletor de fichas disponíveis, estado selecionado e indicação textual da ficha ativa;
- acesso às fichas arquivadas;
- resumo da ficha selecionada com categoria, dificuldade, nome, descrição e ação **Editar**;
- cartões de segunda a domingo, indicando treino ou descanso, título do dia, quantidade de exercícios, duração/atividades e acesso ao detalhe;
- ação **Iniciar** quando houver exercícios configurados;
- estado sem ficha com ação **Criar ficha**.

### 7.4 Criar/editar ficha

- modelo ou início em branco na criação, com prévia antes de aplicar;
- nome, descrição, categoria e dificuldade;
- visão resumida da semana configurada;
- ação **Salvar ficha** e estado de salvamento/erro;
- na edição, ações de ativar/desativar, duplicar e arquivar;
- ação destrutiva **Mover para a lixeira**, separada visualmente e confirmada;
- alerta ao sair com alterações não salvas.

Modais associados: escolher modelo; pré-visualizar modelo; duplicar ficha e selecionar escopo da duplicação; confirmar arquivo, restauração ou exclusão.

### 7.5 Dia da ficha

- contexto da ficha e dia da semana;
- campos de título, descrição, duração estimada, observações e opção de marcar como dia de descanso;
- lista ordenável de exercícios com nome, séries, intervalo de repetições e ações para editar/remover/reordenar;
- em dia de treino: **Adicionar exercício** e **Iniciar treino** quando houver conteúdo;
- em dia de descanso: atividades opcionais com ação para adicionar, editar, remover e reordenar;
- erros de salvamento/validação e estado de alterações pendentes.

### 7.6 Selecionar exercício para uma ficha

- busca local por exercício;
- nomes, grupo muscular, categoria e equipamento disponíveis;
- favoritos/recentes e filtros existentes, se a tela os apresentar;
- estado sem resultado, biblioteca vazia e carregamento;
- seleção conduz à configuração antes de adicionar ao dia.

Não iniciar busca de catálogo externo nessa tela sem ação explícita separada.

### 7.7 Configurar exercício do dia

Mostrar nome, grupo muscular e categoria e adaptar campos à categoria do exercício. O mínimo é:

- séries;
- para força/hipertrofia: repetições mínima e máxima e carga planejada em kg;
- para exercício cronometrado, cardio, mobilidade ou alongamento: duração planejada quando aplicável;
- para cardio: distância planejada em km;
- descanso em segundos e RPE planejado de 1 a 10;
- tipo de série: normal, aquecimento, drop set, bi-set, circuito, até a falha ou tempo controlado;
- observações;
- exercício alternativo opcional;
- ação **Adicionar ao dia** ou **Salvar configuração**.

Exibir validação junto ao campo, unidades e teclado adequado. Não mostre campos incompatíveis com o tipo de exercício.

### 7.8 Configurar atividade de descanso

- nome, descrição, categoria e duração estimada em minutos;
- categorias existentes: caminhada, mobilidade, alongamento, recuperação ativa, descanso completo e personalizada;
- indicação de atividade opcional;
- ação **Salvar atividade** e validação.

### 7.9 Sessão de treino ativa

Esta é a tela de uso mais rápido e merece prioridade visual e de protótipo. Organize-a para consulta rápida e operação com uma mão.

- nome da ficha e do dia, estado **Em andamento** ou **Pausada**;
- progresso da sessão em número e texto (ex.: séries concluídas/total), sem depender só de anel ou cor;
- volume registrado em kg, quando disponível;
- timer de descanso legível, com ações **−15 s**, **+15 s** e **Pular**;
- exercício em foco com estado textual, prescrição, desempenho anterior e mídia disponível sem reprodução automática;
- séries enumeradas com campos relevantes para o exercício (repetições, carga, duração ou distância), estado pendente/concluído e observação;
- ação para concluir série, editar anotação, adicionar/remover série;
- RPE geral e anotações da sessão;
- **Pausar** ou **Retomar**, **Concluir e salvar** e **Abandonar sessão**;
- conclusão e abandono devem confirmar o efeito antes de executar;
- substituição de exercício com motivo visível e opção de desfazer;
- sugestão local explicável e dispensável, nunca aplicada automaticamente;
- vídeo ou mídia só carrega após toque explícito; mostrar fonte/licença quando houver conteúdo externo.

Estados obrigatórios: treino em andamento; pausado; descanso contando; timer finalizado; salvamento; sessão concluída; erro de gravação; abandono confirmado; recuperação de sessão ao reabrir o app. Projetar também estado sem sessão com ação para abrir a ficha.

### 7.10 Biblioteca de exercícios

- busca por nome, músculo ou equipamento;
- controles para lista ou agrupamento por músculo;
- filtros por pacotes, grupo muscular, equipamento, categoria e fonte;
- lista com nome, músculo, equipamento, origem e disponibilidade de mídia;
- favorito e acesso ao detalhe;
- ação para criar exercício personalizado;
- importação explícita do pacote recomendado, com quantidade, progresso, cancelamento e resultado;
- biblioteca inicialmente vazia com orientação para criar, importar ou seguir sem exercícios;
- estado sem resultados, carregando, falha de importação e ação para atualizar a tela quando necessário.

Não misture placeholders com mídia real: identifique visualmente ilustração genérica, mídia indisponível e conteúdo externo. Não inicie download ou vídeo automaticamente.

### 7.11 Detalhe do exercício

- nome, grupo muscular, categoria, equipamento e origem;
- ação de favoritar;
- mídia ou placeholder com estado claro; vídeo começa somente após ação;
- descrição e instruções;
- notas pessoais editáveis;
- fonte original e licença para conteúdo externo;
- estado de exercício ausente e falha/ausência de mídia.

### 7.12 Progresso e histórico

O produto atualmente apresenta estas métricas: sessões concluídas, concluídas na semana, taxa de conclusão, exercícios concluídos, minutos e volume em kg. Cada valor deve ter rótulo, período/contexto e formatação legível.

Além das métricas, mostrar sessões salvas com data, ficha/dia, estado (concluída, não concluída, em andamento ou pausada), séries concluídas, duração, volume quando houver e exercícios. Para substituições, distinguir planejado e realizado. Incluir aviso de atualização se houver falha parcial e estado sem sessões com orientação para começar.

Não invente gráfico por exercício, recordes, previsão, série temporal ou análise que os dados atuais não suportam. Se quiser sugerir uma ideia futura, separe-a como proposta futura, fora do design de escopo atual.

### 7.13 Nutrição — diário

- data selecionada com anterior/próximo e rótulo **Hoje** quando aplicável;
- resumo diário de calorias, proteína, carboidratos, gordura e fibras;
- metas pessoais e contexto de quanto falta/foi atingido, sem linguagem prescritiva;
- resumo dos últimos sete dias com data, quantidade de refeições, calorias e proteína; selecionar um dia abre seu resumo local;
- ações para **Adicionar manualmente**, **Câmera · estimar com IA** e **Galeria · estimar com IA**;
- cartões de refeição com tipo, horário, título, itens, calorias, proteína, notas e ações para abrir/editar e excluir;
- editor de metas com validação e salvamento local;
- estado sem refeição e estado em que detalhes antigos expiraram após sete dias, mantendo visível o resumo diário.

### 7.14 Adicionar/editar/revisar refeição

- tipo da refeição, horário/data quando editável, título e notas;
- lista de alimentos/itens com nome e campos editáveis de calorias, proteína, carboidratos, gordura e fibras;
- ações para adicionar/remover item;
- totais atualizados e ação de salvar;
- se veio de estimativa: selo **Estimativa de IA**, confiança quando informada e texto que deixa claro que a pessoa precisa revisar os valores;
- distinguir manual, estimado e salvo sem usar apenas cor.

### 7.15 Foto, estimativa e consentimento de IA

Projete o fluxo câmera e galeria em telas/folhas apropriadas:

1. explicar que a imagem será usada para estimar a refeição e não será armazenada pelo app;
2. pedir permissão de câmera ou fotos no momento da ação, explicar a necessidade e oferecer saída se a pessoa negar;
3. permitir escolher/capturar, revisar e cancelar a imagem;
4. **antes do envio**, mostrar confirmação com o destinatário Google Gemini, tipo de dado enviado (imagem e contexto textual eventualmente incluído), finalidade e aviso de que depende de internet e da chave pessoal;
5. somente após confirmar, mostrar envio/processamento com cancelamento;
6. mostrar estimativa como rascunho revisável; nenhuma refeição é salva sem ação explícita.

Criar estados distintos para chave ausente, chave inválida, sem internet, permissão negada, cancelamento antes/depois de iniciar, cota/erro do provedor, falha de interpretação e sucesso. Cancelar nunca deve parecer que o envio foi concluído.

### 7.16 Sugestões de cardápio com IA

- explicação de que é opcional, genérica, aproximada e não prescritiva;
- configuração da chave Gemini pessoal sem revelar o valor depois de salva;
- ações trocar/remover chave e explicar que ela é enviada ao provedor para autenticação, fica no SecureStore e não entra em backup;
- campo opcional de preferências até 500 caracteres;
- antes de cada pedido, confirmar explicitamente metas/preferências que serão enviadas ao Gemini;
- estado gerando com ação **Cancelar solicitação**;
- rascunho editável com refeições e valores, ações **Salvar sugestão** e **Descartar**;
- sugestões salvas neste aparelho com data, ação editar e excluir;
- estados sem chave, sem internet, cota/erro, cancelar, resposta inválida e lista vazia.

Não criar botão que envie imediatamente, não incluir dados pessoais ocultos no pedido e não inserir os itens sugeridos no diário sem decisão da pessoa.

### 7.17 Mais — ferramentas e dados locais

Organize claramente os grupos existentes:

- avisos locais, quando houver;
- aparência e acessibilidade;
- reabrir onboarding;
- conteúdo: biblioteca e lixeira de fichas;
- integrações;
- backup: exportar e importar;
- backups automáticos existentes, com motivo/data e ações restaurar, compartilhar e excluir;
- manutenção: apagar todos os dados.

Deixar explícito que os backups ficam sob controle da pessoa. Mostrar carregamento, ausência de backups, operação em andamento, sucesso e falha. Importação deve explicar validação/possível substituição de dados. Restaurar, excluir backups ou apagar todos os dados exige confirmação com efeito claro.

### 7.18 Aparência e acessibilidade

- quatro temas selecionáveis: **Azul-noturno**, **Monocromático**, **Violeta** e **Branco e azul**;
- aparência: **Usar configuração do sistema**, **Claro**, **Escuro**;
- movimento: **Usar configuração do sistema**, **Completo**, **Reduzido** e **Desativado**;
- opção **Alto contraste durante o treino**;
- opção **Feedback tátil**;
- prévia ao vivo usando uma amostra de tela real;
- alterações são prévias e só ficam salvas após **Salvar preferências**;
- sair sem salvar restaura o conjunto anterior; restaurar padrões pede confirmação.

A nova direção visual deve mapear cores semânticas para os quatro presets e seus modos claro/escuro. Estados de treino têm paleta própria de alto contraste, sem virar um quinto tema. Todos os estados permanecem distinguíveis por rótulo/texto, não apenas cor.

### 7.19 Integrações e catálogo externo

Na tela de integrações, comunicar que catálogos são conexões opcionais, requerem internet, só consultam após uma ação manual e salvam uma cópia local; não há sincronização automática.

No fluxo de catálogo:

- busca e filtros, resultados com origem e estado de mídia;
- estado carregando, sem resultado, offline, timeout/erro e cancelamento;
- prévia do exercício antes de importar;
- editar categoria local, conferir descrição/instruções;
- mostrar autor, fonte, licença e avisos fornecidos pela origem;
- ações **Aplicar ajustes**, importar e voltar/cancelar.

Não desenhe login, sincronização de conta, conexão em background ou importação automática.

### 7.20 Fichas arquivadas

- lista de fichas arquivadas com nome, categoria/dificuldade e resumo semanal;
- ação para restaurar;
- estado vazio, em restauração e erro.

### 7.21 Lixeira de fichas

- lista com nome, contexto e tempo/dia de expiração da retenção de sete dias;
- ação **Restaurar** e ação **Excluir permanentemente**;
- ação **Esvaziar lixeira** com zona de perigo e confirmação reforçada;
- explicação de que operações destrutivas criam backup automático quando aplicável;
- estado vazia, carregando, restaurando, excluindo e falha.

### 7.22 Componentes e superfícies globais

Desenhe também os elementos reutilizáveis, não apenas as páginas completas:

- cabeçalho de tela e hierarquia de títulos;
- botão primário, secundário, textual, ícone, perigo e desativado;
- campo de texto curto/multilinha, numérico, senha e busca;
- seletor, chips e controle segmentado;
- cartões de treino, refeição, exercício e métrica;
- progresso, timer, badge, status pill e indicadores de rede/local;
- bottom sheet, modal, diálogo de confirmação, seletor e teclado aberto;
- skeleton, vazio, erro, aviso inline, toast, sucesso e ação **Desfazer**;
- estados normal, pressionado, selecionado, foco, desativado, ocupado e erro.

## 8. Estados e interações transversais

Para cada tela e componente, prever quando aplicável:

- carregamento inicial e atualização manual;
- conteúdo vazio e ausência de dados;
- busca sem resultados e filtros sem correspondência;
- erro de validação próximo ao campo;
- operação em andamento com controles realmente desativados;
- salvamento concluído e falha com próxima ação clara;
- retorno de rede indisponível sem bloquear recursos locais;
- permissão negada com alternativa e acesso a configurações quando cabível;
- confirmação/desfazer para ações destrutivas;
- saída com alterações não salvas;
- limites para títulos, nomes, notas e textos longos;
- conteúdo restaurado após fechar/reabrir o app.

Feedback de toque ou animação deve confirmar uma ação real. Não animar carregamento, tela inicial ou refresh automático como se fossem decisões da pessoa.

## 9. Design system e especificação visual

Depois da direção ser escolhida, entregue um sistema semântico reutilizável, com valores documentados e exemplos de aplicação:

- cores semânticas: fundo, superfícies, superfície secundária, texto primário e secundário, borda, primária, texto sobre primária, foco, sucesso, aviso, perigo, estado desativado, sobreposição e cores próprias do treino;
- pares foreground/background com contraste comprovado;
- escalas de tipografia para display, título, seção, corpo, legenda, rótulo e dado numérico, incluindo line-height e peso;
- espaçamento, grid, margens da tela, dimensões de controles, raios, contornos, elevação e densidade;
- iconografia e regra para combinar ícone com rótulo;
- componentes, variantes, comportamento, estados e tokens;
- duração/easing de movimento e alternativa com movimento reduzido;
- feedback tátil discreto e coerente com a preferência configurável.

O código atual usa como referência mínima alvos de toque de 48 dp, controle primário de 54 dp, controle compacto de 48 dp, margens próximas de 20 dp e escala de espaçamento baseada em 4/8 dp. Trate isso como referência de compatibilidade e valide no aparelho; não reduza a área de toque por estética.

Mapeie a direção escolhida para os quatro presets e para claro/escuro: oito combinações semânticas. Não é necessário redesenhar todas as telas oito vezes, mas componentes e tokens precisam funcionar em todas. Mostre ao menos Hoje, Treino ativo, Nutrição e Aparência em combinações representativas, além da paleta de alto contraste durante o treino.

## 10. Acessibilidade obrigatória

- Alvos principais com pelo menos 48 × 48 dp.
- Contraste mínimo WCAG AA: 4,5:1 para texto comum e 3:1 para texto grande e elementos gráficos essenciais.
- Não comunique sucesso, erro, seleção, conclusão ou pendência apenas por cor.
- Todos os ícones acionáveis têm nome acessível e estado anunciado.
- Títulos, campos, listas, métricas, progresso e timer possuem semântica coerente para TalkBack.
- Ordem de foco acompanha a leitura visual; diálogos modais prendem o contexto até serem fechados.
- Fonte ampliada e escala de fonte do Android não cortam texto, valor, botão ou controle essencial. Prefira altura flexível e rolagem a texto truncado.
- Campos permanecem visíveis com teclado e navegação do sistema.
- Estados em treino têm texto explícito: pendente, concluída, pausada, em andamento, descanso, não concluída.
- Movimento reduzido e desativado continuam oferecendo todas as informações e ações.
- Feedback tátil sempre respeita a configuração local e nunca é necessário para entender o resultado.

## 11. Fluxos clicáveis que o protótipo precisa cobrir

Crie protótipos dos fluxos completos, incluindo retorno e estados de erro:

1. primeira abertura offline → escolher seguir sem exercícios ou criar/importar → criar ficha → adicionar e configurar exercício → iniciar treino;
2. treino iniciado → registrar série → descansar → pausar → sair/reabrir → retomar → concluir e salvar;
3. editar a ficha e um dia → sair com alteração pendente → escolher salvar ou descartar;
4. registrar refeição manual → conferir totais/metas → editar ou excluir;
5. escolher foto → revisar → ver consentimento de envio → cancelar ou confirmar → revisar estimativa → editar → salvar somente após decisão;
6. configurar chave Gemini → pedir sugestão → consentir → cancelar ou revisar resposta → salvar sugestão local, sem inserir no diário;
7. exportar backup → apagar dados com confirmação → restaurar backup;
8. buscar catálogo manualmente → conferir atribuição/licença → editar e importar exercício;
9. trocar tema e acessibilidade → testar prévia → salvar ou sair descartando.

## 12. Entregáveis da IA de design

Produza em etapas. O primeiro retorno deve incluir:

1. confirmação resumida das restrições e do que está fora de escopo;
2. mapa das telas e fluxos conforme este briefing;
3. riscos de UX que merecem atenção, sem inventar que foram observados no aparelho caso não tenha sido possível inspecioná-lo;
4. três direções visuais aplicadas às telas **Hoje**, **Treino ativo** e **Progresso**, com recomendação e concessões;
5. decisões ainda pendentes da pessoa usuária.

Depois que a pessoa escolher a direção, produza:

- fundações, tokens e regras do design system;
- biblioteca de componentes com variantes e estados;
- telas completas de todos os itens da seção 7;
- estados importantes de cada fluxo;
- protótipos clicáveis dos fluxos da seção 11;
- mapeamento para todos os temas e modos existentes;
- revisão de acessibilidade e densidade nos dois tamanhos de referência;
- especificação para implementação: dimensões, espaçamentos, tokens, tipografia, interações, conteúdo, comportamento de teclado e motion;
- inventário de assets e origem/licença dos assets externos.

Se a ferramenta permitir organização de páginas e componentes, agrupe o trabalho em: **Direções**, **Fundamentos**, **Componentes**, **Abas principais**, **Fluxos de treino**, **Biblioteca e planos**, **Nutrição**, **Configurações e backups**, **Estados e acessibilidade** e **Protótipos**. Nomeie frames e variantes de forma legível e consistente.

Se tiver acesso ao repositório, leia docs/PRODUCT_ROADMAP.md, docs/MARCO_M_UI_UX.md, docs/THEMES_ACCESSIBILITY.md, docs/LOCAL_DATA_ARCHITECTURE.md e os componentes/telas em mobile/src para confirmar o comportamento atual. Se não tiver acesso, use este briefing e não afirme que inspecionou o código.

## 13. Critérios de aceite

Considere o design pronto somente quando:

- todas as telas existentes da seção 7 estiverem representadas;
- as cinco abas tiverem hierarquia e navegação coerentes;
- as tarefas centrais puderem ser concluídas sem becos sem saída;
- a sessão ativa permitir leitura e registro rápidos, com timer e estados explícitos;
- telas vazias não pareçam quebradas nem criem conteúdo fictício;
- catálogo, IA, permissões e backups expliquem efeitos e erros antes/depois da ação relevante;
- a direção visual tiver personalidade e ainda sustentar leitura rápida;
- quatro presets, claro/escuro, alto contraste do treino e movimento reduzido estiverem contemplados;
- a interface continuar funcional em 360 × 800 dp, com uma mão, teclado e fonte ampliada;
- TalkBack e estados semânticos estiverem especificados;
- nenhum recurso novo, fluxo online obrigatório ou dado não suportado tiver entrado silenciosamente no design;
- a implementação conseguir usar tokens e componentes em vez de valores isolados por tela.

Comece pelo primeiro retorno da seção 12. Não pule direto para telas finais sem mostrar as direções visuais e deixar explícitas as decisões em aberto.

---

## FIM DO PROMPT
