# Roadmap: correções, redesign monocromático e completude

Consolida a auditoria feita em 2026-10-22 (Nutrição, importação de exercícios,
testes) e o pedido de um redesign **minimalista, monocromático preto, com
animações cuidadosas e usabilidade em primeiro lugar**. Complementa
[`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md) e o marco M\*
([`MARCO_M_UI_UX.md`](MARCO_M_UI_UX.md)); não o substitui.

Legenda: ✅ feito e commitado · 🔧 em andamento · ⬜ pendente · ❓ precisa de decisão.

> **Status (2026-10-23):** Fases 1 a 3 implementadas, exceto os itens ainda marcados ⬜ abaixo.
> Decisões tomadas por padrão: erro/destrutivo em vermelho dessaturado; `Animated` (sem Reanimated);
> tema "Preto" como padrão, demais temas mantidos por compatibilidade; contratos de UI: o código novo prevalece.
> Verificado: `tsc`, `check-font-sizes`, vitest (174 + pacotes) e jest (33) verdes; `expo export` Android gera o bundle.
> Não verificado: execução em aparelho/emulador (visual, desempenho, TalkBack).

## Princípios do redesign

1. **Usabilidade antes de estilo.** Uma tela de treino é usada com a mão suada,
   em pé, olhando de relance. Alvos ≥ 48 dp, uma ação primária por tela,
   números grandes, nenhum gesto escondido sem alternativa.
2. **Preto, não "escuro".** Fundo `#000` (OLED), degraus de cinza para
   superfícies, branco para texto e ação primária. Sem cor de destaque.
3. **Significado nunca só por cor.** Em monocromático o estado vem de forma,
   ícone, peso e texto (concluído = check preenchido; pendente = anel vazio;
   erro = ícone + texto). ❓ Decidir se destrutivo/erro mantém um único
   vermelho dessaturado (recomendado, por segurança) ou fica só em cinza.
4. **Movimento com função.** Animar para explicar (entrada, conclusão de série,
   troca de contexto), nunca para enfeitar. Respeita as preferências de
   movimento já existentes (`theme/motion.ts`) e o "reduzir animações" do
   sistema.
5. **Local-first preservado.** Nada do redesign exige conta, servidor ou rede.

## Fase 0: fechar o que existe

| Item | Estado |
| --- | --- |
| Hotfix da Nutrição (decimais, avisos, metas, datas) + feature Gemini local | ✅ `ffac5ec` |
| Tela dedicada da chave Gemini (Nutrição e Integrações) | ✅ `947868f` |
| ExerciseDB: contrato real da API v1 (`name`, cursor `after`, `meta`), paginação, cancelamento | ✅ `1ee7b08` |
| Fontes < 12 sp elevadas para 12 (script `check-font-sizes` passa) | 🔧 alterado, não commitado (misturado ao WIP) |
| Commitar/separar o WIP restante (docs, temas, Treino, Histórico, Biblioteca) | ⬜ |
| M0: APK do código atual, smoke test em aparelho, upgrade sobre 0.9.3 | ⬜ (depende de aparelho físico) |

## Fase 1: bugs conhecidos (antes de mexer no visual)

Cada item com teste que falha primeiro. Itens da auditoria ainda abertos:

**Importação de exercícios**
- ✅ Seletor de fonte explícito (ExerciseDB | Wger | Ambos); hoje o Wger só
  entra como fallback silencioso e a paginação pode trocar de fonte no meio.
- ✅ Filtros "somente com imagem/vídeo" só aparecem quando a fonte inclui o Wger (resta: filtro do Wger ainda roda depois da paginação): esconder ou
  aplicar por fonte; no Wger o filtro roda depois da paginação (páginas vazias).
- ✅ Reimportar exercício **arquivado** o restaura (atualização em lote preserva) (fica invisível).
- ⬜ (adiado: o upsert já roda em transação) Índice único `(source, external_id)` em `exercise_definitions`
  (migração + limpeza de duplicatas).
- ⬜ "Atualizar importados": uma requisição por item, em série, sem progresso.
- ✅ Mídia do ExerciseDB: uma principal, todos os músculos alvo, limite de resposta e 429 com `main: true`/`sortOrder 0`; só o
  primeiro `targetMuscle` é mantido; sem limite de tamanho/429 no cliente.
- ✅ Tela de importação: busca dentro da lista rolável, consentimento lembrado, alvo de 48 dp deixa pouco espaço para
  resultados em tela pequena/teclado aberto; consentimento reaparece a cada
  abertura; checkbox de 24 dp; enum bruto (`STRENGTH · en`) no card.

**Picker de exercícios (escolher exercício para o dia)**
- ✅ Músculos/equipamentos misturam inglês e português e geram um chip por
  combinação ("barbell, bench"): normalizar (dicionário EN→PT, equipamento
  dividido em itens).
- ✅ Filtro "Peso corporal" só reconhece termos em português.
- ✅ Filtro e selo por fonte; ⬜ aviso de possível duplicata entre fontes.
- ✅ Atalho "buscar no catálogo online"; ⬜ `navigation.replace` ainda perde busca/filtros e não há seleção múltipla.

**Nutrição**
- ✅ Zero em meta vira (agora avisa) "sem meta" sem aviso (`normalizeGoals`).
- ✅ `key` estável no formulário de refeição (⬜ ainda índice no editor de cardápio IA) (remover item do meio embaralha estado).
- ✅ Horário da refeição editável
- ⬜ Validar o ID do modelo Gemini (`gemini-3.8-flash`) contra a API real.

**Saúde dos testes**
- ✅ Jest carrega `lucide-react-native` (mapeado para CJS). Restam 8
  testes jest falhando em 6 suítes (Aparência, Milestone6, Wger,
  WorkoutIntelligence, Biblioteca, ExerciseFlows): triar causa.
- ✅ Testes de **contrato de UI** alinhados ao novo design (espaçamentos 0.11,
  inset inferior, borda de avisos, strings que sumiram) + 3 arquivos que não
  carregam (`Toast.test.ts`, `HomeScreen.test.tsx`,
  `TrainingPlanEditorScreen.test.tsx`). ❓ Decidir por item: o código novo ou o
  teste está certo. **Resolver junto com a Fase 2**, pois os contratos
  descrevem exatamente os tokens que o redesign vai redefinir.
- ⬜ Migrar `react-test-renderer` antigo; auditoria de dependências (45 avisos).

## Fase 2: fundação do redesign

Pré-requisito do fluxo de design: `PRODUCT.md` (`/impeccable init`), depois
direção visual e `DESIGN.md`.

- ✅ **PRODUCT.md**: usuário (treina sozinho, Android, offline), tom, o que o
  app nunca faz (sem contas, sem anúncios, sem prescrição médica).
- ✅ **Direção visual** em preto monocromático (escala de cinzas a definir com
  teste de contraste), tipografia Geist + Geist Mono (já decididas no M\*),
  ícones Lucide (já em uso), raios e espaçamentos como tokens únicos.
- ✅ **Tokens**: reescrever `theme/palette.ts` e `uiContracts.ts` a partir da
  nova escala; remover aliases redundantes (`gray*`, `surfaceTertiary`, etc.);
  os 4 temas atuais: ❓ manter só "Preto" + variante clara, ou manter os quatro.
- ✅ **Sistema de movimento**: hoje só `Animated` e `MotionView`. ❓ Adotar
  `react-native-reanimated` (springs, layout animations, gestos fluidos,
  recomendado) ou ficar no `Animated` (zero dependência nova). Definir durações,
  curvas e o catálogo de animações (abaixo).
- ✅ **Componentes base** redesenhados: botão, campo, chip, card/linha de lista,
  aviso, folha inferior, cabeçalho, estado vazio, esqueleto de carregamento,
  barra de abas.
- ✅ Unificar o que hoje é duplicado: `Field`/`Action` da Nutrição e botões da
  tela de integração passam a usar os componentes compartilhados.

### Catálogo de animações (propostas)

| Momento | Animação | Função |
| --- | --- | --- |
| Entrada de tela | Fade + deslocamento de 8 dp, escalonado por linha (≤ 40 ms) | Orientar sem atrasar |
| Concluir série | Anel → check preenchido (traço SVG), pulso único, háptico leve | Recompensa e confirmação |
| Contador/peso | Número rola (tick) ao incrementar | Mostrar o efeito do toque |
| Timer de descanso | Anel de progresso contínuo; último 5 s pulsa | Leitura de relance |
| Recorde pessoal | Marca discreta + háptico forte, uma vez | Celebrar sem confete |
| Abas / navegação | Troca com fade curto; indicador desliza | Continuidade |
| Folhas e modais | Sobem com mola; arrastar para fechar | Gesto natural |
| Listas | Itens entram/saem com layout animation; reordenar com "levantar" | Ordem compreensível |
| Carregando | Esqueleto monocromático pulsante, nunca spinner solto | Estabilidade visual |
| Anéis de macro (Nutrição) | Preenchem ao abrir o dia | Leitura rápida das metas |

Todas desligam com "reduzir movimento" (substituídas por troca instantânea ou
fade de 100 ms).

## Fase 3: redesign por tela (ordem por uso)

1. ✅ **Sessão de treino**: a tela mais usada. Série atual em destaque, entrada
   de carga/reps com teclado numérico dedicado e passos de 1 kg, timer de
   descanso persistente, concluir com um toque, desfazer.
2. ✅ **Hoje**: treino do dia como ação única; semana em faixa; retomar sessão.
3. 🔧 **Ficha / editor de dia** (lista de dias redesenhada; editores herdam os componentes novos, sem redesenho próprio): reordenar com gesto, adicionar exercício sem
   perder contexto (ver picker multi-seleção).
4. ✅ **Escolher exercício + Biblioteca + Importação**: um único fluxo de
   busca com filtro por fonte, selos, normalização e "buscar online".
5. ✅ **Nutrição**: separar em abas internas (Dia · Metas · IA), anéis de macros,
   registro rápido (repetir refeição de ontem, favoritas), formulário em folha
   inferior que preserva scroll.
6. ✅ **Progresso/Histórico**: gráficos monocromáticos legíveis (ver M1).
7. ✅ **Mais / Aparência / Integrações / Backup**: lista de configurações
   consistente; status claros (chave Gemini, última cópia).
8. ✅ **Onboarding e estados vazios**: curtos, com uma ação clara.

Critério por tela: contraste ≥ 4.5:1 (7:1 no treino), alvos ≥ 48 dp, fonte
ampliada sem corte, TalkBack com ordem e rótulos, estados (carregando, vazio,
erro, offline) desenhados.

## Fase 4: implementações para um app mais completo

Priorizadas por valor para quem treina e por caber no princípio local-first.

**Treino**
- ✅ Progresso por exercício (histórico, 1RM estimado, volume) já planejado no M1.
- ✅ Detecção e histórico de **recordes pessoais**.
- ⬜ **Séries de aquecimento**, tipos de série (drop, falha), **supersets**.
- ✅ **Calculadora de anilhas** e arredondamento por equipamento.
- ⬜ Timer de descanso em **notificação** (app em segundo plano) com háptico.
- ⬜ Sugestão de carga/progressão explicada (base já existe; refinar).
- ⬜ Duplicar sessão anterior; "repetir último treino".
- ⬜ Medidas corporais e peso, com gráfico simples.
- ✅ Exportar histórico em CSV (além do backup completo).

**Nutrição**
- ⬜ Alimentos e refeições **favoritos**; copiar o dia anterior.
- ⬜ Código de barras (Open Food Facts, consulta manual e opcional).
- ⬜ Hidratação (contador simples).
- ⬜ Cálculo opcional de metas pelo usuário, sempre editável e sem prescrição.

**Plataforma e confiança**
- ⬜ Lembretes locais de treino (notificação agendada, opt-in).
- ⬜ Cópias automáticas com restauração guiada (base existe) e verificação.
- ⬜ Idiomas além do português (extração de strings já viabiliza).
- ⬜ Widget de "treino de hoje" (Android).
- ❓ Integração Health Connect (leitura de passos/peso): avaliar contra o
  princípio de dados só no aparelho.

## Fase 5: gates de qualidade e release

- ⬜ Suíte verde: `npm test` do mobile completo (fontes, vitest, jest).
- ⬜ Roteiro de smoke ([`LOCAL_ONLY_SMOKE_TEST.md`](LOCAL_ONLY_SMOKE_TEST.md)) em
  aparelho real, com rede e em modo avião.
- ⬜ TalkBack, fonte ampliada, movimento reduzido, háptico, contraste no sol.
- ⬜ Desempenho: listas longas (biblioteca com 1.500+ exercícios), tempo de
  abertura, memória durante a sessão de treino.
- ⬜ Atualização coordenada de dependências (Expo/RN) sem downgrades cegos.
- ⬜ APK candidato com checksum e upgrade sobre 0.9.3.

## Ordem sugerida

`Fase 0 → Fase 1 (itens críticos) → Fase 2 → Fase 3 (sessão de treino primeiro,
em paralelo com Fase 1 restante) → Fase 4 (por valor) → Fase 5`.
A Sessão de treino é o melhor piloto: valida tokens, componentes e movimento
no fluxo mais importante antes de replicar nas outras telas.

## Decisões em aberto (❓)

1. Erro/destrutivo: um vermelho dessaturado ou 100% cinza?
2. Quantos temas manter: só preto (+ claro) ou os quatro atuais?
3. `react-native-reanimated`: adotar ou permanecer no `Animated`?
4. Testes de contrato: código novo ou teste antigo prevalece, caso a caso?
5. Health Connect: dentro ou fora do escopo local-first?
