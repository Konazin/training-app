Continue o desenvolvimento do repositório `training-app` a partir do commit:

63ac4463495e266d85dc8c28ca4299ed68967f64

Esta etapa é uma sprint de usabilidade e interface do aplicativo padrão
local-only.

Trabalhe apenas em:

mobile/

Não alterar:

- regras de domínio;
- schema SQLite;
- migrations;
- repositories;
- backup;
- backend;
- web;
- umamusume-mobile.

O objetivo é corrigir problemas observados em aparelho Android real:

- interface pequena demais;
- textos difíceis de ler;
- conteúdo encostando ou entrando sob a barra superior;
- elementos desaparecendo ao rolar para o topo;
- contraste ruim;
- seleção preta sobre fundo preto;
- estados selecionados pouco distinguíveis;
- áreas de toque pequenas.

Ao final, gerar uma nova versão preview:

- version: 0.2.1
- android.versionCode: 4

==================================================
1. SAFE AREA GLOBAL
==================================================

Mover `SafeAreaProvider` para o topo absoluto do aplicativo, envolvendo:

- ErrorBoundary;
- ThemeProvider;
- bootstrap;
- runtime;
- navegação.

Não criar SafeAreaProvider apenas depois do bootstrap.

Criar componente reutilizável:

mobile/src/components/Screen.tsx

Responsabilidades:

- respeitar safe area superior;
- respeitar safe area inferior quando não houver tab bar;
- fundo do tema;
- flex: 1;
- comportamento consistente Android/iOS;
- suporte a ScrollView e conteúdo fixo;
- suporte a teclado.

Usar `useSafeAreaInsets`.

Não depender somente de um SafeAreaView externo envolvendo toda a navegação.

Cada tela principal deve usar `Screen` ou `ScreenScrollView`.

==================================================
2. EDGE-TO-EDGE E STATUS BAR
==================================================

Configurar corretamente Android edge-to-edge.

Regras:

- conteúdo nunca fica atrás da barra de status;
- conteúdo nunca fica atrás da barra de navegação;
- status bar deve combinar com o tema;
- barra de navegação Android deve combinar com o fundo ou tab bar;
- mudar tema deve atualizar ambas.

Usar APIs Expo compatíveis com SDK atual.

Não aplicar padding superior duplicado.

Testar em aparelhos com:

- notch;
- câmera central;
- barra de status alta;
- navegação por gestos;
- navegação por três botões.

==================================================
3. REMOVER ELEMENTOS ABSOLUTOS DO TOPO
==================================================

Remover o botão de tema absoluto com:

top: 7

Remover mensagens absolutas com:

top: 8

O botão de tema deve ficar em:

- tela “Mais”;
- ou ação explícita de um header que tenha espaço reservado.

Não manter botão flutuante sobre títulos ou conteúdo.

Mensagens globais devem usar um componente Toast/Snackbar:

- posicionado usando safe area;
- abaixo da barra superior;
- sem cobrir títulos;
- desaparecimento automático;
- botão fechar;
- suporte a sucesso, erro e informação;
- contraste adequado;
- texto mínimo de 14 px.

==================================================
4. ESCALA TIPOGRÁFICA
==================================================

Criar tokens centralizados:

mobile/src/theme/typography.ts

Escala mínima:

- caption: 12
- labelSmall: 13
- label: 14
- bodySmall: 14
- body: 16
- bodyLarge: 18
- titleSmall: 20
- title: 26
- display: 34

Nenhum texto informativo deve usar menos de 12 px.

Exceções:

- nenhuma para labels da tab bar;
- nenhuma para metadados importantes;
- nenhuma para botões.

Remover fontSize espalhado de:

- 7;
- 8;
- 9;
- 10;
- 11;

salvo casos extremamente justificados e documentados.

Usar lineHeight coerente:

- body 16 → lineHeight mínimo 22;
- body 14 → lineHeight mínimo 20;
- títulos sem corte vertical.

==================================================
5. FONT SCALING
==================================================

Permitir escala de fonte do sistema.

Não usar:

allowFontScaling={false}

Garantir funcionamento com:

- escala 1.0;
- escala 1.15;
- escala 1.30.

Textos não podem:

- cortar;
- sair dos cards;
- sobrepor botões;
- desaparecer.

Usar:

- flexShrink;
- numberOfLines somente quando realmente necessário;
- minHeight em vez de height fixa para conteúdo textual.

==================================================
6. TOKENS DE ESPAÇAMENTO
==================================================

Expandir `shared` com tokens:

spacing:
- xs: 4
- sm: 8
- md: 12
- lg: 16
- xl: 20
- xxl: 24
- xxxl: 32

touchTarget:
- minimum: 48

screen:
- horizontalPadding: 20
- topSpacing: 16
- bottomSpacing: 120

Evitar números arbitrários espalhados.

Cards principais devem ter:

- padding mínimo 16;
- gap mínimo 12;
- borda ou contraste visível;
- raio entre 16 e 22.

==================================================
7. ÁREAS DE TOQUE
==================================================

Todos os elementos interativos devem possuir:

- largura ou altura mínima de 48 dp;
- `hitSlop` quando visualmente menores;
- estado pressed;
- estado disabled;
- accessibilityRole;
- accessibilityLabel quando necessário.

Corrigir especialmente:

- botão de tema;
- links;
- chips;
- botões de editar;
- setas;
- controles da sessão;
- abas;
- ações de backup.

Não usar apenas texto pequeno como área clicável.

==================================================
8. PALETA
==================================================

Reformular a paleta mantendo estilo sóbrio.

Tema claro sugerido:

- background: #F5F6F8
- surface: #FFFFFF
- surfaceSecondary: #ECEFF3
- textPrimary: #16181D
- textSecondary: #5F6673
- border: #D9DEE7
- primary: #2563EB
- primaryPressed: #1D4ED8
- onPrimary: #FFFFFF
- success: #15803D
- warning: #B45309
- danger: #B91C1C
- focus: #60A5FA

Tema escuro sugerido:

- background: #101216
- surface: #181B21
- surfaceSecondary: #232730
- textPrimary: #F4F6F8
- textSecondary: #AEB6C3
- border: #343A46
- primary: #60A5FA
- primaryPressed: #3B82F6
- onPrimary: #08111F
- success: #4ADE80
- warning: #FBBF24
- danger: #F87171
- focus: #93C5FD

Não usar o mesmo `nearBlack` como solução universal para:

- tab bar;
- chips;
- cards;
- seleções;
- badges;
- mensagens.

Criar tokens semânticos em vez de tons numerados genéricos.

==================================================
9. CONTRASTE
==================================================

Garantir contraste mínimo aproximado WCAG AA:

- texto normal: 4.5:1;
- texto grande: 3:1;
- controles e bordas relevantes: 3:1.

Criar testes unitários para calcular contraste dos pares principais:

- texto/fundo;
- texto secundário/fundo;
- botão primário/texto;
- chip selecionado/texto;
- erro/fundo;
- tab ativa/fundo.

Não aceitar preto sobre preto, branco sobre branco ou cinza quase invisível.

==================================================
10. INPUTS
==================================================

Atualizar `FormField`.

Adicionar:

- `selectionColor={colors.focus}`;
- `cursorColor={colors.primary}` no Android;
- fundo claramente diferente da tela;
- texto mínimo 16 px;
- label mínimo 14 px;
- placeholder com contraste legível;
- borderWidth 1;
- borda de foco destacada;
- borda de erro;
- mensagem de erro associada;
- padding vertical suficiente;
- minHeight 56.

Criar estados:

- default;
- focused;
- error;
- disabled.

Não usar seleção ou cursor preto no tema escuro.

Para multiline:

- minHeight 120;
- padding superior 15;
- textAlignVertical top.

==================================================
11. SELEÇÕES, CHIPS E FILTROS
==================================================

Criar componente reutilizável:

SelectableChip

Estados:

default:
- fundo surface;
- texto textPrimary;
- borda border.

selected:
- fundo primary;
- texto onPrimary;
- borda primary.

pressed:
- fundo primaryPressed.

disabled:
- opacidade reduzida;
- ainda legível.

Adicionar ícone ou check visual no estado selecionado.

Não depender apenas da mudança de cor.

Corrigir:

- seleção de ficha;
- filtros da biblioteca;
- seleção de categoria;
- seleção de dificuldade;
- status de exercício;
- qualquer chip horizontal.

No chip de ficha selecionado:

- nome;
- categoria;
- indicação “ativa”;

todos devem mudar para cores compatíveis com o fundo selecionado.

Hoje somente o nome recebe estilo inverso. Corrigir também os metadados.

==================================================
12. TAB BAR
==================================================

Redesenhar a tab bar.

Requisitos:

- altura deve considerar safe area inferior;
- altura visual mínima 64, além do inset inferior;
- label mínimo 12 px;
- ícone mínimo 22 px;
- item ativo claramente visível;
- não usar texto em símbolo Unicode como ícone definitivo.

Usar uma biblioteca já disponível ou ícones Expo compatíveis, preferencialmente:

@expo/vector-icons

Abas:

- Hoje;
- Ficha;
- Histórico;
- Mais.

Estado ativo:

- ícone e texto em primary;
- fundo opcional discreto;
- não usar texto branco sobre fundo quase preto sem distinção entre itens.

Estado inativo:

- textSecondary.

==================================================
13. HEADERS
==================================================

Atualizar `ScreenHeader`.

Requisitos:

- padding superior fornecido pelo Screen;
- eyebrow mínimo 12 px;
- título entre 28 e 34 px;
- descrição mínima 15 px;
- action com touch target 48;
- action não pode apertar ou cortar título;
- título deve suportar duas linhas;
- espaço inferior mínimo 24.

Não colocar controles flutuando sobre o header.

==================================================
14. SCROLL
==================================================

Corrigir todas as telas roláveis.

Usar:

- `contentInsetAdjustmentBehavior="automatic"` em iOS;
- paddingBottom suficiente para tab bar;
- `keyboardShouldPersistTaps="handled"` em formulários;
- `keyboardDismissMode` apropriado;
- `showsVerticalScrollIndicator={false}` somente quando não prejudicar uso.

O primeiro conteúdo nunca pode começar atrás da status bar.

Ao rolar para o topo:

- header deve permanecer totalmente visível;
- overscroll não deve revelar fundo de cor errada;
- nenhum botão deve sumir atrás da câmera ou barra.

==================================================
15. COMPONENTE SCREENSCROLLVIEW
==================================================

Criar:

ScreenScrollView

Deve encapsular:

- safe area;
- ScrollView;
- background;
- padding horizontal;
- padding superior;
- padding inferior;
- teclado;
- refresh control opcional;
- conteúdo acessível.

Migrar telas principais:

- HomeScreen;
- TrainingPlanView;
- HistoryScreen;
- MoreScreen;
- LibraryScreen;
- TrainingPlanEditorScreen;
- TrainingPlanDayScreen;
- DayExerciseEditorScreen;
- RestActivityEditorScreen;
- WorkoutSessionScreen;
- ExerciseDetailScreen;
- ArchivedTrainingPlansScreen.

Não deixar cada tela reinventar seu padding.

==================================================
16. TELA DE SESSÃO
==================================================

A sessão é a tela mais importante.

Aumentar:

- nome do exercício;
- números das séries;
- campos de carga e repetição;
- botões;
- cronômetro;
- status.

Requisitos:

- campos numéricos mínimo 56 de altura;
- texto mínimo 16;
- botões concluir/salvar claros;
- séries separadas visualmente;
- sessão pausada claramente identificada;
- cronômetro visível a distância;
- área inferior não coberta pela barra de navegação;
- modal de vídeo respeitando safe area.

Não reduzir informação importante para caber em uma única tela.

Rolagem é preferível a texto microscópico.

==================================================
17. HOME
==================================================

A Home atual possui diversas métricas pequenas.

Redesenhar sem alterar dados:

- saudação;
- ficha ativa;
- sessão ativa;
- treino do dia;
- métricas;
- histórico recente.

Métricas devem usar:

- título mínimo 12;
- valor mínimo 22;
- card com padding 16.

Evitar três cards apertados quando a largura for insuficiente.

Em telas estreitas:

- usar duas colunas;
- ou lista horizontal acessível.

==================================================
18. RESPONSIVIDADE
==================================================

Testar layouts em larguras:

- 320;
- 360;
- 375;
- 390;
- 412;
- 430;
- 480.

Não assumir largura fixa.

Usar:

- flexWrap;
- minWidth;
- maxWidth;
- useWindowDimensions quando necessário.

Nenhum texto ou botão deve sair da tela em 320–360 px.

==================================================
19. TEMA
==================================================

Mover alternância de tema para a tela Mais.

Opções:

- Sistema;
- Claro;
- Escuro.

Persistir escolha em SettingsRepository ou AsyncStorage de preferência.

Não manter somente um toggle binário que esquece o valor ao fechar.

O padrão deve ser:

Sistema.

A StatusBar e a navigation bar devem acompanhar a seleção.

==================================================
20. ACESSIBILIDADE
==================================================

Adicionar:

- accessibilityRole;
- accessibilityState selected/disabled;
- accessibilityLabel;
- accessibilityHint quando necessário.

Chips selecionados devem expor:

accessibilityState={{ selected: true }}

Inputs devem possuir labels acessíveis.

Botões com apenas ícone devem possuir nome legível.

==================================================
21. TESTES VISUAIS E DE ESTILO
==================================================

Adicionar testes para funções e componentes críticos:

- paleta possui contraste mínimo;
- SelectableChip muda fundo e texto;
- FormField usa cursor/selection compatível;
- tab ativa e inativa possuem cores diferentes;
- textos não usam fontSize abaixo de 12;
- touch targets importantes têm mínimo 48;
- Screen aplica inset superior;
- Screen aplica inset inferior;
- tema sistema/claro/escuro;
- estado selecionado possui indicador além da cor.

Criar script que procure fontSize numérico abaixo de 12 em `mobile/src`.

Permitir uma allowlist pequena e documentada somente quando estritamente
necessário.

==================================================
22. SMOKE TEST EM APARELHO
==================================================

Executar no aparelho onde os problemas foram observados.

Validar:

- status bar;
- câmera/notch;
- topo de todas as telas;
- tab bar;
- teclado aberto;
- modo claro;
- modo escuro;
- seleção de texto;
- cursor;
- chips selecionados;
- formulários;
- sessão;
- rolagem;
- navegação por gestos;
- fonte padrão;
- fonte aumentada.

Registrar screenshots em:

docs/ui-smoke/

Não incluir informações pessoais.

==================================================
23. VERSÃO
==================================================

Atualizar:

mobile/app.json:
- version 0.2.1
- android.versionCode 4

mobile/package.json:
- version 0.2.1

Não alterar package, slug, scheme ou projectId.

==================================================
24. VALIDAÇÃO
==================================================

Executar:

npm ci

npm run typecheck --workspace=training-mobile
npm run test --workspace=training-mobile

npm run typecheck --workspace=@training/training-domain
npm run test --workspace=@training/training-domain

npm run typecheck --workspace=@training/training-local-db
npm run test --workspace=@training/training-local-db

npm run typecheck --workspace=umamusume-mobile

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo install --check

EXPO_NO_TELEMETRY=1 npm exec --workspace=training-mobile -- expo export \
  --platform android \
  --output-dir dist

git diff --check

Não alterar regras ou dados para fazer testes visuais passarem.

==================================================
25. BUILD
==================================================

Somente após validação:

cd mobile

npx eas-cli@latest build \
  --platform android \
  --profile preview \
  --non-interactive \
  --json

Gerar APK:

artifacts/training-app-local-0.2.1.apk

Registrar:

- build ID;
- URL;
- tamanho;
- SHA-256.

==================================================
26. ENTREGA
==================================================

Informar:

1. causa dos problemas de safe area;
2. estrutura Screen criada;
3. escala tipográfica;
4. paleta nova;
5. contraste validado;
6. inputs corrigidos;
7. seleções corrigidas;
8. tab bar corrigida;
9. telas migradas;
10. responsividade testada;
11. aparelhos/larguras testados;
12. versão;
13. resultados dos testes;
14. build ID;
15. APK;
16. SHA-256;
17. limitações restantes.

Não implementar novas features.