# Design: Ink (preto monocromático)

## Direção
Um app de treino que some para o exercício aparecer. Preto verdadeiro como superfície, branco como única "cor", hierarquia por tamanho, peso e espaço. Nada decorativo: cada animação explica um estado. Cena de uso: academia, luz variável, mão ocupada, olhar de relance. Por isso o padrão é escuro (OLED, menos brilho), com variante clara completa.

## Cor
| Papel | Escuro | Claro |
|---|---|---|
| `bg` fundo | `#000000` | `#FFFFFF` |
| `s1` superfície | `#0C0C0C` | `#F5F5F5` |
| `s2` superfície elevada / pressionado | `#171717` | `#EBEBEB` |
| `bd` linha fina | `#242424` | `#E3E3E3` |
| `tx` texto e ação primária | `#FAFAFA` | `#0A0A0A` |
| `t2` texto secundário | `#A3A3A3` | `#525252` |
| `mu` controles inativos, contorno de campos | `#7A7A7A` | `#6B6B6B` |
| `dg` erro / destrutivo (único tom) | `#FF7A6B` | `#B3261E` |

Regras: sem cor de destaque; botão primário é a inversão (branco sobre preto). `dg` só aparece em erro e ação destrutiva e sempre com ícone ou texto. Estado nunca depende só de cor: concluído = disco com check, pendente = anel vazio, selecionado = preenchido + check. Contraste de `t2` e `mu` sobre `bg` ≥ 4.5:1.

## Tipografia
Geist (texto) e Geist Mono (números e dados). Escala: display 40, título grande 34, título 25, título pequeno 17, corpo 15, auxiliar 14/13/12. Mínimo 12 sp. Números de carga, repetições, tempo e macros em Geist Mono, peso leve nos grandes. Sem sobretítulo (eyebrow) acima de títulos.

## Forma e profundidade
Raios: 10 (campos pequenos), 14 (controles), 20 (cartões e blocos), 28 (folhas). Chips em pílula. Profundidade por preenchimento (`bg → s1 → s2`) e linhas finas `bd`; sem sombras. Cartões só quando agrupam algo que se move junto; listas preferem linhas com separador fino.

## Espaço
Grade de 4: 4, 8, 12, 16, 24, 32, 48. Margem lateral 24. Mais espaço acima de um título de seção do que abaixo. Alvos ≥ 48 dp com ≥ 8 dp entre eles.

## Movimento
Curva principal: saída exponencial suave `cubic-bezier(0.16, 1, 0.3, 1)`. Durações: toque 90–120 ms, mudança de estado 160–220 ms, entrada de tela e folhas 320 ms, momentos autorais 400–700 ms.
- Entrada: fade + subida de 12 dp, escalonada (45 ms por item, máximo 8) — `Reveal`.
- Toque: encolhe a 0.97 — `PressableScale`.
- Conclusão de série: anel → disco com traço do check desenhado, pulso curto e háptico — `CheckDraw`.
- Números que mudam rolam até o valor final — `AnimatedNumber`.
- Progresso (descanso, macros): anel que preenche — `ProgressRing`.
- Seletor segmentado: indicador desliza com mola; abas: barra indicadora cresce e o ícone engrossa.
- Folhas: sobem com mola curta sobre fundo que escurece.
Movimento reduzido: só fade de 100 ms; "desligado": troca instantânea. Preferência do app e do sistema respeitadas (`theme/motion.ts`).

## Componentes base
`PrimaryButton` (primário branco / secundário contornado / destrutivo contornado vermelho), `SelectableChip`, `ThemedTextInput` e `FormField`, `ScreenHeader` (voltar visível em telas empilhadas), `SectionHeader`, `EmptyState` centrado, `InlineNotice` (preenchimento + linha fina + ícone), `BottomSheet`, `SegmentedControl`, `TabIcon`, `StatusPill`.

## Não fazer
Sobretítulos, gradientes, brilho/glass decorativo, sombras, cor de destaque, cartões idênticos em grade como estrutura, ícones fora da família Lucide, estado só por cor.
