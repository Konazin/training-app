Analise e melhore o repositório atual `training-app`.

O produto real é o APK React Native/Expo. A versão web serve apenas para debugging. O backend é Spring Boot e deve continuar sendo compartilhado.

Esta etapa NÃO deve implementar o Modo Umamusume, novos dashboards, gráficos ou uma grande reformulação visual.

O objetivo é fortalecer a arquitetura mobile e tornar a execução de treino realmente utilizável.

==================================================
1. PRINCÍPIOS OBRIGATÓRIOS
==================================================

- Mobile-first e Android-first.
- Manter React Native, Expo, TypeScript e Spring Boot.
- Preservar o design atual.
- Organizar o mobile em MVC por feature.
- Não reescrever todo o projeto.
- Não alterar a web, exceto quando um contrato compartilhado exigir.
- Não criar funcionalidades apenas visuais ou mockadas.
- Executar typecheck, testes e build disponíveis ao final.

==================================================
2. PROBLEMAS ATUAIS
==================================================

Corrigir de forma incremental os seguintes problemas:

1. `useTrainingController` concentra dashboard, fichas, biblioteca, treinos e sessões.
2. `models/training.ts` concentra todo o domínio.
3. O mobile está separado por camadas técnicas, mas não por feature.
4. Toda mutação recarrega treinos, dashboard, fichas, biblioteca, histórico e sessão ativa.
5. A navegação usa um estado manual no `App.tsx`, sem stack real ou suporte adequado ao botão voltar do Android.
6. A tela de sessão exibe carga e repetições, mas não permite editá-las.
7. O backend suporta adicionar série, pausar e continuar sessão, mas o mobile não expõe completamente essas ações.
8. O cronômetro de descanso existe apenas em memória e desaparece ao reconstruir a tela.
9. O aplicativo depende totalmente da API e não possui uma abstração preparada para persistência local.
10. É possível iniciar sessões ativas em dias diferentes e `/sessions/active` retorna apenas uma.
11. A barra inferior continua visível durante uma sessão.
12. O domínio antigo de `Workout` convive com o novo domínio de `TrainingPlan` e `WorkoutSession`, causando fluxos e métricas duplicadas.

==================================================
3. ARQUITETURA POR FEATURE
==================================================

Refatore apenas as partes tocadas nesta etapa para uma estrutura semelhante a:

src/
├── core/
│   ├── api/
│   ├── navigation/
│   ├── storage/
│   └── ui/
│
└── features/
    ├── workout-session/
    │   ├── model/
    │   ├── service/
    │   ├── repository/
    │   ├── controller/
    │   └── views/
    │
    ├── training-plan/
    ├── exercise-library/
    ├── history/
    └── dashboard/

Regras:

- `model`: tipos, entidades e regras puras.
- `service`: comunicação HTTP e operações externas.
- `repository`: interface de acesso aos dados.
- `controller`: estado, ações e coordenação da feature.
- `views`: componentes e telas sem regras de negócio.
- `core`: apenas elementos realmente compartilhados.

Não mova todos os arquivos apenas por estética. Refatore primeiro a feature `workout-session` e extraia somente o compartilhamento necessário.

Crie uma interface de repository para sessões, por exemplo:

WorkoutSessionRepository
- getActive()
- start()
- updateSet()
- addSet()
- pause()
- resume()
- complete()
- abandon()

A primeira implementação pode continuar usando HTTP.

A arquitetura deve permitir futuramente uma implementação SQLite/local-first sem alterar controllers e views.

==================================================
4. EXECUÇÃO REAL DA SESSÃO
==================================================

Melhore a tela de sessão para permitir, em cada série:

- editar repetições;
- editar carga;
- editar duração;
- editar distância;
- editar RPE;
- editar observação;
- marcar ou desmarcar como concluída;
- adicionar uma nova série;
- remover uma série adicionada manualmente, caso o backend ainda não suporte isso, implementar o endpoint necessário.

Regras:

- apresentar apenas campos relevantes para o tipo de exercício;
- musculação usa principalmente repetições e carga;
- exercícios temporizados usam duração;
- cardio pode usar duração e distância;
- não obrigar o usuário a preencher todos os campos;
- salvar alterações sem recarregar todo o aplicativo;
- manter o valor digitado caso a requisição falhe;
- bloquear ações duplicadas enquanto uma série está sendo salva;
- fornecer feedback de erro por série sem substituir toda a tela.

Ao concluir uma série:

- persistir os valores editados;
- iniciar o descanso configurado;
- atualizar progresso e volume localmente;
- não buscar novamente dashboard, fichas, biblioteca e histórico.

==================================================
5. PAUSA, RETOMADA E RECUPERAÇÃO
==================================================

Adicionar controles claros para:

- pausar sessão;
- continuar sessão;
- abandonar sessão;
- concluir sessão.

Durante uma sessão:

- esconder a navegação inferior;
- impedir saída acidental;
- integrar corretamente o botão voltar do Android;
- ao tentar sair, oferecer continuar, pausar ou abandonar;
- recuperar a sessão ativa ao reabrir o aplicativo.

A API deve impedir mais de uma sessão globalmente ativa para o usuário atual.

Como ainda não há autenticação, trate a instalação como um único usuário.

==================================================
6. CRONÔMETRO DE DESCANSO
==================================================

O cronômetro deve:

- usar `endsAt`, não apenas contagem acumulada;
- permitir +15 segundos, -15 segundos e pular;
- sobreviver à troca de tela;
- sobreviver à reconstrução do componente;
- restaurar o tempo correto ao reabrir o app;
- vibrar ao terminar;
- não vibrar repetidamente.

Crie uma abstração simples de storage em `core/storage`.

Pode usar AsyncStorage nesta etapa.

Persistir apenas:

- sessionId;
- exerciseId;
- setId;
- endsAt;
- estado pausado, quando necessário.

Não implemente SQLite completo agora.

==================================================
7. NAVEGAÇÃO
==================================================

Substitua a navegação manual por uma solução apropriada para React Native/Expo, preferencialmente React Navigation.

Estrutura sugerida:

Bottom tabs:
- Hoje
- Ficha
- Histórico
- Mais

Stack:
- Biblioteca
- Configurar exercício
- Executar sessão
- Resumo da sessão

Regras:

- a sessão deve abrir em stack;
- a barra inferior não deve aparecer durante a execução;
- o botão voltar do Android deve respeitar a stack;
- uma sessão ativa deve poder ser retomada facilmente;
- não manter seis itens apertados na barra inferior.

Não redesenhar todas as telas nesta etapa.

==================================================
8. REDUÇÃO DO CONTROLLER GLOBAL
==================================================

Não remover `useTrainingController` de uma vez.

Faça uma migração incremental:

1. extrair `workout-session` para seu próprio controller;
2. remover dele o estado e as ações de sessão;
3. manter outras features temporariamente no controller antigo;
4. documentar o próximo ponto de extração.

Evitar duplicar lógica entre controllers.

==================================================
9. DOMÍNIO LEGADO
==================================================

Não excluir `Workout` e `Exercise` nesta etapa.

Porém:

- marcar internamente o fluxo como legado;
- não adicionar novas funcionalidades nele;
- não usá-lo como fonte principal da sessão;
- usar `TrainingPlan`, `TrainingPlanDay` e `WorkoutSession` no novo fluxo;
- documentar quais telas ainda dependem do domínio antigo.

Não criar novas métricas combinando os dois domínios.

==================================================
10. BACKEND
==================================================

No backend:

- garantir apenas uma sessão global ativa;
- manter snapshots da sessão;
- adicionar endpoint para remover série manual, caso necessário;
- validar que séries só podem ser alteradas em sessões ativas ou pausadas;
- preservar registros ao abandonar;
- não mover regras para controllers;
- manter controller fino e regras no service.

Adicionar testes para:

- impedir duas sessões ativas;
- editar série;
- adicionar série;
- remover série manual;
- pausar;
- continuar;
- concluir;
- abandonar;
- recuperar sessão ativa.

==================================================
11. FORA DO ESCOPO
==================================================

Não implementar:

- Modo Umamusume;
- eventos narrativos;
- atributos;
- gamificação;
- SQLite completo;
- sincronização offline;
- autenticação;
- gráficos;
- dieta;
- redesign da web;
- grande refatoração do backend;
- remoção completa do domínio legado.

==================================================
12. CRITÉRIOS DE ACEITAÇÃO
==================================================

A etapa estará concluída quando:

- a feature de sessão estiver organizada em MVC por feature;
- carga e repetições puderem ser editadas;
- RPE, duração e distância puderem ser registrados;
- séries puderem ser adicionadas;
- séries manuais puderem ser removidas;
- cada alteração salvar sem recarregar todos os recursos;
- pausa e retomada funcionarem;
- o cronômetro sobreviver à troca de tela e reinício do app;
- a sessão ativa for recuperada;
- apenas uma sessão puder ficar ativa;
- a barra inferior desaparecer durante a sessão;
- o botão voltar do Android funcionar corretamente;
- erros não apagarem valores digitados;
- testes backend passarem;
- typecheck mobile passar;
- bundle Android/Expo passar.

==================================================
13. ENTREGA
==================================================

Ao finalizar, informar:

1. problemas encontrados;
2. estrutura anterior e nova da feature de sessão;
3. arquivos criados, movidos e alterados;
4. endpoints alterados ou adicionados;
5. testes adicionados;
6. comandos executados;
7. resultados de testes, typecheck e build;
8. limitações restantes;
9. próximos pontos recomendados, sem implementá-los.

Não declarar a etapa concluída se os comandos de validação falharem.