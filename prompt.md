Quero transformar o aplicativo atual em um aplicativo de treino realmente completo e funcional.

O projeto já possui uma interface com:

- Sidebar com Início, Treinos, Fichas e Adicionar.
- Tema escuro e opção de modo claro.
- Tela “Seus treinos”.
- Filtros Todos, Planejados, Em andamento e Concluídos.
- Cards de treino com nome, descrição, duração, exercícios, calorias e status.
- Possibilidade básica de adicionar exercícios.
- Indicação de sincronização entre web e mobile.

Neste momento, NÃO implemente o Modo Umamusume completo, personagens, eventos narrativos, sistema de status ou gamificação. Porém, prepare corretamente o domínio e a arquitetura para que esse modo possa usar os mesmos treinos, fichas, sessões e registros posteriormente.

O objetivo desta fase é deixar o modo normal do aplicativo completo.

==================================================
1. PRIMEIRO: ANALISE O PROJETO
==================================================

Antes de alterar código:

1. Inspecione a estrutura completa do repositório.
2. Identifique:
   - framework e versão;
   - linguagem;
   - sistema de rotas;
   - gerenciamento de estado;
   - banco de dados;
   - backend ou camada de persistência;
   - sistema de autenticação;
   - componentes reutilizáveis;
   - biblioteca de ícones;
   - biblioteca de UI;
   - forma atual de estilização;
   - testes existentes;
   - modelos relacionados a treinos e exercícios.
3. Execute os comandos disponíveis de lint, typecheck, testes e build.
4. Não troque a stack existente sem necessidade.
5. Não reescreva o projeto inteiro.
6. Preserve o design atual, refinando-o em vez de substituí-lo por uma interface genérica.
7. Identifique dados mockados, campos hardcoded e funcionalidades apenas visuais.

Depois da análise, implemente a solução. Não pare apenas em um relatório.

==================================================
2. OBJETIVO FUNCIONAL
==================================================

O usuário deve conseguir realizar o seguinte fluxo completo:

1. Criar uma ficha semanal.
2. Planejar treinos de segunda-feira a domingo.
3. Marcar dias como treino ou descanso.
4. Adicionar exercícios aos dias de treino.
5. Adicionar atividades opcionais aos dias de descanso.
6. Iniciar uma sessão de treino.
7. Registrar séries, repetições, carga, duração e observações.
8. Usar cronômetro de descanso.
9. Concluir ou abandonar uma sessão.
10. Consultar o histórico.
11. Visualizar evolução de carga, volume e frequência.
12. Editar ou duplicar fichas.
13. Reutilizar exercícios cadastrados.
14. Ver claramente qual é o próximo treino planejado.

O aplicativo não deve continuar sendo apenas um CRUD de cards.

==================================================
3. MODELO SEMANAL DE FICHA
==================================================

Implemente fichas compostas pelos sete dias da semana:

- Segunda-feira
- Terça-feira
- Quarta-feira
- Quinta-feira
- Sexta-feira
- Sábado
- Domingo

Cada dia deve possuir:

- id;
- dia da semana;
- título opcional;
- descrição opcional;
- ordem;
- indicador de descanso;
- lista de exercícios;
- lista de atividades opcionais de descanso;
- duração estimada;
- observações.

Na interface de edição da ficha, cada dia deve ter um checkbox:

[ ] Marcar como dia de descanso

Quando o checkbox estiver marcado:

- esconder ou desabilitar a montagem do treino convencional;
- não apagar exercícios existentes sem confirmação;
- permitir cadastrar atividades opcionais;
- mostrar claramente que nenhuma atividade é obrigatória;
- permitir voltar a transformar o dia em dia de treino.

Atividades opcionais para descanso podem incluir:

- caminhada;
- alongamento;
- mobilidade;
- recuperação ativa;
- descanso completo;
- atividade personalizada.

Não limite isso a um enum rígido. Deve ser possível criar uma atividade personalizada.

Estrutura conceitual sugerida:

WorkoutPlan
WorkoutPlanDay
RestDayActivity
Exercise
WorkoutDayExercise
WorkoutSession
WorkoutSessionExercise
WorkoutSetLog

Adapte os nomes ao padrão já usado no projeto.

==================================================
4. BIBLIOTECA DE EXERCÍCIOS
==================================================

Implemente uma biblioteca de exercícios reutilizável.

Cada exercício deve suportar:

- nome;
- descrição;
- grupo muscular principal;
- grupos musculares secundários;
- equipamento;
- categoria;
- dificuldade;
- instruções;
- observações;
- imagem ou vídeo opcional;
- exercício unilateral ou bilateral;
- duração em vez de repetições, quando aplicável;
- exercício criado pelo sistema ou pelo usuário;
- status ativo ou arquivado.

Categorias mínimas:

- força;
- hipertrofia;
- resistência;
- cardio;
- mobilidade;
- alongamento;
- técnica;
- recuperação.

Equipamentos devem ser extensíveis e não ficar presos em valores hardcoded espalhados pela interface.

A biblioteca deve possuir:

- busca por nome;
- filtro por grupo muscular;
- filtro por equipamento;
- filtro por categoria;
- criação de exercício personalizado;
- edição de exercícios criados pelo usuário;
- arquivamento;
- seleção de exercício para uma ficha.

Não permita duplicatas acidentais apenas por diferença de letras maiúsculas ou espaços.

==================================================
5. CONFIGURAÇÃO DO EXERCÍCIO NA FICHA
==================================================

Ao adicionar um exercício a um dia, permita configurar:

- ordem;
- número de séries;
- faixa ou valor de repetições;
- carga planejada opcional;
- duração opcional;
- distância opcional;
- tempo de descanso;
- RPE ou esforço planejado opcional;
- observações;
- tipo de série;
- exercício alternativo opcional.

Tipos de série:

- normal;
- aquecimento;
- drop set;
- bi-set;
- circuito;
- até a falha;
- tempo controlado.

Não é necessário implementar lógica avançada para todos os tipos agora, mas o modelo não deve impedir essa evolução.

Permita reordenar exercícios.

==================================================
6. TELA DE TREINOS
==================================================

Corrija a hierarquia atual dos cards.

O botão principal de um treino planejado deve ser:

“Iniciar treino”

Ações secundárias:

- ver detalhes;
- editar;
- duplicar;
- excluir;
- adicionar exercício.

“Adicionar exercício” não deve continuar sendo a ação visual mais importante do card.

O card deve mostrar:

- data;
- nome;
- descrição;
- status;
- duração estimada;
- número de exercícios;
- volume anterior, quando existir;
- lista resumida dos primeiros exercícios;
- indicador de progresso, quando a sessão estiver em andamento.

Status:

- planejado;
- em andamento;
- concluído;
- ignorado;
- cancelado.

Filtros devem funcionar com dados reais e apresentar suas contagens corretamente.

Aproveite melhor o espaço horizontal em desktop. A tela atual deixa uma área muito grande vazia.

Use uma disposição responsiva:

Desktop:
- coluna principal com os treinos;
- coluna lateral com próximo treino, progresso semanal, sequência e resumo.

Mobile:
- uma única coluna;
- ações importantes acessíveis;
- cards sem overflow horizontal;
- botões com área de toque adequada.

==================================================
7. TELA DE EXECUÇÃO DO TREINO
==================================================

Crie uma tela dedicada para executar uma sessão.

Ela deve mostrar:

- nome do treino;
- tempo total;
- exercício atual;
- progresso da sessão;
- exercício anterior;
- próximo exercício;
- séries planejadas;
- séries já realizadas;
- cronômetro de descanso;
- observações;
- opção de pausar;
- opção de encerrar;
- opção de substituir exercício;
- opção de adicionar série;
- opção de pular exercício.

Para cada série, permita registrar:

- concluída ou não;
- repetições;
- carga;
- duração;
- distância;
- RPE;
- observação opcional.

Ao marcar uma série como concluída:

- salvar imediatamente;
- iniciar descanso automaticamente, caso configurado;
- permitir desfazer;
- atualizar o progresso da sessão.

A sessão deve sobreviver a:

- atualização da página;
- navegação acidental;
- fechamento e reabertura do aplicativo, quando a persistência disponível permitir.

Não descarte uma sessão em andamento silenciosamente.

Antes de abandonar uma sessão, exiba confirmação.

==================================================
8. CRONÔMETRO DE DESCANSO
==================================================

Implemente um cronômetro reutilizável com:

- iniciar;
- pausar;
- continuar;
- reiniciar;
- adicionar 15 segundos;
- remover 15 segundos;
- pular;
- indicação visual quando terminar;
- alerta sonoro ou vibração quando suportado;
- funcionamento correto com a aba em segundo plano.

Evite depender exclusivamente de setInterval acumulando segundos. Salve o horário final e calcule o tempo restante a partir do relógio atual.

==================================================
9. CONCLUSÃO DA SESSÃO
==================================================

Ao concluir o treino, exiba um resumo com:

- duração total;
- exercícios concluídos;
- exercícios pulados;
- séries realizadas;
- volume total;
- recordes pessoais;
- RPE geral;
- observações;
- comparação com a sessão anterior equivalente.

Permita:

- confirmar conclusão;
- editar registros antes de salvar;
- voltar ao histórico;
- repetir o treino em outra data.

Calorias não devem ser tratadas como valor exato inventado.

Caso o projeto já possua estimativa calórica, deixe explícito que é uma estimativa e documente a fórmula. Caso não exista base confiável, não gere um número aleatório apenas para preencher o card.

==================================================
10. HISTÓRICO E PROGRESSÃO
==================================================

Crie uma área de histórico com:

- sessões por data;
- filtro por ficha;
- filtro por exercício;
- filtro por status;
- detalhes completos de uma sessão;
- comparação com sessão anterior;
- calendário ou agrupamento mensal.

Métricas mínimas:

- frequência semanal;
- treinos planejados;
- treinos concluídos;
- aderência;
- duração total;
- volume total;
- evolução de carga;
- recordes pessoais;
- sequência de dias ou semanas;
- grupos musculares trabalhados.

Definição inicial de volume para exercícios com carga:

volume = soma de carga × repetições realizadas

Não misture volume de exercícios temporizados ou cardio com volume de musculação. Use métricas próprias para cada tipo.

==================================================
11. TELA INICIAL
==================================================

A página inicial deve mostrar dados úteis, não apenas atalhos.

Adicionar:

- próximo treino;
- botão “Iniciar treino”;
- progresso da semana;
- sessões concluídas;
- dias de descanso;
- sequência atual;
- últimos recordes;
- últimos treinos;
- resumo de volume;
- calendário resumido;
- estado vazio para novos usuários.

Estados vazios devem explicar qual é a próxima ação possível.

Exemplo:

“Você ainda não possui uma ficha ativa.”

Ações:

- criar ficha;
- usar modelo;
- importar ficha, caso a estrutura já permita.

==================================================
12. GERENCIAMENTO DE FICHAS
==================================================

Na área de fichas, implemente:

- criar ficha;
- editar ficha;
- visualizar ficha;
- duplicar ficha;
- arquivar ficha;
- excluir ficha;
- definir como ativa;
- configurar período de uso;
- ordenar dias e exercícios;
- salvar como modelo.

Apenas uma ficha precisa ser considerada principal por vez, mas fichas antigas não devem ser apagadas ao trocar a ficha ativa.

Uma alteração futura na ficha não deve modificar retroativamente sessões já concluídas.

Ao iniciar uma sessão, salve uma cópia estrutural dos dados necessários para manter o histórico consistente.

==================================================
13. MODELO DE DADOS E CONSISTÊNCIA
==================================================

Use IDs reais e relacionamentos consistentes.

Não use o texto do nome do exercício como chave.

Considere os seguintes campos conceituais:

WorkoutPlan:
- id
- name
- description
- isActive
- startDate
- endDate
- createdAt
- updatedAt
- archivedAt

WorkoutPlanDay:
- id
- workoutPlanId
- weekday
- title
- description
- isRestDay
- sortOrder

RestDayActivity:
- id
- workoutPlanDayId
- name
- description
- estimatedDuration
- category
- isOptional
- sortOrder

Exercise:
- id
- name
- slug ou normalizedName
- description
- primaryMuscleGroup
- secondaryMuscleGroups
- equipment
- category
- instructions
- mediaUrl
- createdByUserId
- isCustom
- isArchived

WorkoutDayExercise:
- id
- workoutPlanDayId
- exerciseId
- sortOrder
- sets
- minReps
- maxReps
- plannedLoad
- plannedDuration
- plannedDistance
- restSeconds
- plannedRpe
- setType
- notes

WorkoutSession:
- id
- workoutPlanId
- workoutPlanDayId
- scheduledDate
- startedAt
- completedAt
- status
- totalDuration
- overallRpe
- notes

WorkoutSessionExercise:
- id
- workoutSessionId
- exerciseId
- exerciseNameSnapshot
- sortOrder
- status
- notes

WorkoutSetLog:
- id
- workoutSessionExerciseId
- setNumber
- reps
- load
- duration
- distance
- rpe
- isCompleted
- completedAt

Adapte ao banco e aos padrões existentes.

Crie migrations quando necessário.

Não altere migrations antigas já aplicadas. Crie novas migrations incrementais.

==================================================
14. PREPARAÇÃO PARA O MODO UMAMUSUME
==================================================

Ainda não implemente a interface ou a lógica completa do Modo Umamusume.

Entretanto:

- mantenha ficha, treino, sessão e registros independentes da interface;
- não coloque regras de gamificação dentro dos componentes visuais;
- exponha eventos de domínio ou serviços que permitam detectar:
  - sessão iniciada;
  - sessão concluída;
  - exercício concluído;
  - série concluída;
  - dia de descanso realizado;
  - meta alcançada;
  - recorde pessoal;
  - treino ignorado;
- permita que uma camada futura consuma esses acontecimentos para conceder status;
- não acople os modelos normais a personagens;
- não crie campos como characterId diretamente em WorkoutSession.

O Modo Umamusume será uma camada adicional sobre o sistema normal.

==================================================
15. REGRAS DE UI E UX
==================================================

- Preserve a identidade visual escura atual.
- Preserve a opção de modo claro.
- Reutilize componentes.
- Evite modais gigantes para edição complexa.
- Use páginas ou drawers para fluxos longos.
- Não esconda ações essenciais em menus pouco visíveis.
- Garanta feedback de carregamento, sucesso e erro.
- Use confirmações apenas em ações destrutivas.
- Adicione estados disabled corretos.
- Não use apenas cor para representar status.
- Garanta navegação por teclado.
- Adicione aria-label em botões apenas com ícone.
- Evite textos minúsculos e contraste insuficiente.
- Não permita overflow horizontal em telas pequenas.
- Não substitua o layout por um template genérico de dashboard.

==================================================
16. VALIDAÇÕES
==================================================

Valide, no frontend e na camada de domínio ou backend:

- nome obrigatório;
- séries maiores que zero;
- repetições não negativas;
- carga não negativa;
- duração não negativa;
- distância não negativa;
- descanso não negativo;
- RPE dentro da faixa definida;
- datas coerentes;
- apenas dias válidos da semana;
- impedir criação acidental de múltiplas sessões ativas para o mesmo treino;
- impedir conclusão sem salvar corretamente os registros.

Não dependa apenas de validação HTML.

==================================================
17. TRATAMENTO DE ERROS
==================================================

- Não engula exceções.
- Não deixe console.log como tratamento final.
- Mostre mensagens compreensíveis.
- Preserve dados preenchidos quando uma operação falhar.
- Implemente retry onde fizer sentido.
- Não marque como salvo antes da confirmação real da persistência.
- Evite optimistic update em ações destrutivas.
- Registre erros conforme a infraestrutura existente.

==================================================
18. TESTES
==================================================

Adicione testes compatíveis com a stack existente.

Cobrir no mínimo:

- criação de ficha;
- semana com sete dias;
- marcação de dia como descanso;
- atividade opcional em dia de descanso;
- adição de exercício;
- criação de sessão;
- registro de série;
- cálculo de volume;
- conclusão de sessão;
- persistência de sessão em andamento;
- filtros de treino;
- histórico;
- responsividade básica dos componentes principais, quando a stack permitir.

Não remova testes existentes para fazer o build passar.

==================================================
19. DADOS DEMONSTRATIVOS
==================================================

Caso o projeto use seed ou dados de demonstração, adicione uma ficha coerente:

Nome:
“Base de força e condicionamento”

Segunda:
- membros superiores

Terça:
- caminhada leve ou cardio

Quarta:
- membros inferiores

Quinta:
- descanso
- caminhada opcional
- mobilidade opcional

Sexta:
- corpo inteiro

Sábado:
- cardio ou atividade livre

Domingo:
- descanso completo
- alongamento opcional

Não dependa desses dados para o funcionamento real da aplicação.

==================================================
20. FORA DO ESCOPO DESTA FASE
==================================================

Não implementar agora:

- personagens;
- diálogos;
- sistema de energia fictícia;
- status de força, resistência, velocidade ou inteligência;
- eventos narrativos;
- corrida animada;
- gacha;
- cartas de suporte;
- ranking online;
- feed social;
- dieta;
- diagnóstico médico;
- recomendações médicas automáticas;
- integração com smartwatch, salvo se ela já existir no projeto.

==================================================
21. ORDEM DE IMPLEMENTAÇÃO
==================================================

Implemente nesta ordem:

1. Auditoria e correção dos modelos atuais.
2. Fichas semanais e dias de descanso.
3. Biblioteca de exercícios.
4. Configuração de exercícios por dia.
5. Criação e persistência de sessões.
6. Tela de execução.
7. Registro de séries.
8. Cronômetro.
9. Conclusão e resumo.
10. Histórico.
11. Métricas.
12. Dashboard.
13. Responsividade.
14. Testes e limpeza.

Não comece pelas telas de métricas antes de existir histórico real.

==================================================
22. CRITÉRIOS DE ACEITAÇÃO
==================================================

A implementação será considerada concluída quando:

- for possível criar uma ficha de segunda a domingo;
- cada dia puder ser treino ou descanso;
- dias de descanso aceitarem atividades opcionais;
- exercícios puderem ser buscados e adicionados;
- um treino puder ser iniciado;
- séries puderem ser registradas;
- o descanso puder ser cronometrado;
- a sessão sobreviver a uma atualização da página;
- o treino puder ser concluído;
- o histórico mostrar os dados registrados;
- o dashboard usar dados reais;
- os filtros funcionarem;
- desktop e mobile não apresentarem overflow;
- lint, typecheck, testes e build passarem;
- nenhuma funcionalidade atual válida seja quebrada.

==================================================
23. ENTREGA FINAL
==================================================

Ao terminar:

1. Liste os principais problemas encontrados.
2. Liste os arquivos criados e alterados.
3. Explique as alterações no banco.
4. Informe migrations criadas.
5. Informe rotas ou endpoints adicionados.
6. Informe componentes reutilizáveis criados.
7. Mostre como executar:
   - aplicação;
   - migrations;
   - seed;
   - testes;
   - lint;
   - typecheck;
   - build.
8. Liste limitações restantes.
9. Não declare algo como concluído sem executar as validações disponíveis.
10. Não deixe TODOs genéricos substituindo funcionalidades essenciais.