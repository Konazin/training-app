# Temas, movimento e acessibilidade

O aplicativo mantém as preferências visuais somente no aparelho, sem servidor
ou migration SQLite. A tela **Mais → Aparência e acessibilidade** permite
visualizar alterações antes de salvá-las.

## Temas e aparência

Os quatro presets são:

- **Azul-noturno (`DARK_BLUE`)**: superfícies azul-marinho e destaque azul;
- **Monocromático (`MONOCHROME`)**: escala neutra de cinza;
- **Violeta (`DRACULA`)**: superfícies roxas com destaques violeta e ciano;
- **Branco e azul (`WHITE_BLUE`)**: superfícies claras e destaque azul.

Cada preset possui variantes clara e escura e fornece cores semânticas para
fundo, superfícies, texto, bordas, foco, estados e treino. A aparência pode
seguir o sistema ou permanecer explicitamente clara ou escura. Barra de status,
barra de navegação do Android e React Navigation acompanham a variante efetiva.

As preferências são armazenadas em um único payload JSON versionado no
AsyncStorage, atrás de um repository tipado. Valores ausentes ou inválidos usam
padrões seguros. A preferência simples usada por versões anteriores é lida uma
vez como compatibilidade. Enquanto o payload é restaurado, o conteúdo principal
não é montado sobre um fundo branco intermediário.

Alterações na tela são prévias. **Salvar preferências** confirma o conjunto
inteiro; sair restaura o último conjunto salvo. **Restaurar padrões** também
precisa ser confirmado.

## Movimento

- **Usar configuração do sistema** acompanha “Reduzir movimento” do aparelho;
- **Completo** usa transição normal e entrada curta com opacidade/deslocamento;
- **Reduzido** usa somente opacidade curta;
- **Desativado** remove animação decorativa e transições da pilha.

O listener do sistema é removido ao desmontar o provider e operações
assíncronas não atualizam estado depois da desmontagem.

## Feedback tátil

O `expo-haptics` é acessado por um único helper que respeita **Feedback tátil**.
Há retorno discreto ao selecionar tema, concluir série, iniciar, pausar ou
retomar treino, concluir sessão e confirmar ação destrutiva. Falhas do recurso
nativo não interrompem a ação principal. O bootstrap, renderização e refresh
automático não disparam feedback.

## Alto contraste no treino

**Alto contraste durante o treino** troca apenas a paleta específica da sessão,
sem criar um quinto tema. Cabeçalho, cartões, séries, cronômetro, controles e
ações ganham bordas mais fortes e pares de texto/fundo dedicados. Estados
continuam escritos como “Pendente”, “Concluída”, “Sessão pausada” ou “Sessão em
andamento”; cor nunca é a única indicação.

## Acessibilidade verificada

- alvos interativos principais com no mínimo 48 dp;
- chips, switches e controles com papel e estado acessíveis;
- progresso semanal e da sessão com `accessibilityValue`;
- erros importantes com anúncio ao leitor de tela;
- modais marcados como conteúdo modal;
- campos personalizados dentro de área segura para teclado;
- títulos e cartões sem altura fixa que corte fontes ampliadas;
- badges, dias da semana, estados de ficha e treino com rótulos textuais.

O smoke físico com TalkBack, fonte ampliada, redução de movimento e motor tátil
permanece necessário antes de concluir o marco.
