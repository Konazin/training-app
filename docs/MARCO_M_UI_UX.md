# M* — UI/UX majestosa

## Propósito e limites

O M* é um marco dedicado exclusivamente à UI/UX do app Android para celular.
Ele melhora coerência entre telas, reduz atrito nos fluxos cotidianos e dá ao
app acabamento visual. Não introduz conta, backend, sincronização obrigatória,
dependência de rede para os fluxos locais, nem suporte a outra plataforma.

A direção visual oficial está no MIV completo
[`MIV-Training-App-D-Grafite.pdf`](../MIV-Training-App-D-Grafite.pdf). O MIV é a
referência visual; continua separado de `prompt.md`.

Decisões confirmadas para esta implementação:

- Monocromático como tema padrão para novas instalações. Os outros temas
  existentes continuam disponíveis.
- Geist e Geist Mono embutidas no app.
- Ícones Lucide.
- Incremento do controle de carga no treino ativo: 1 kg por toque.
- Abandonar um treino preserva a sessão e as séries registradas no histórico
  local. Essa decisão mantém o comportamento atual, embora a proposta do MIV
  descreva descartar esses registros.

## Estado atual

**Em andamento.** Tokens, tipografia, fontes, ícones e componentes comuns já
foram migrados. A primeira passada cobriu as telas centrais de treino ativo,
Hoje, planos, histórico, nutrição, aparência, Mais e edição de treino. Ainda
faltam telas secundárias, revisão de acessibilidade e validação em aparelho.
A inspeção até aqui foi feita no código e não substitui o uso real no celular.

## Etapas

### M*0 — Auditoria da experiência atual

- [x] Inventariar no código os fluxos e áreas principais: Hoje; criar e editar
  planos; selecionar exercícios; iniciar, pausar, retomar e concluir treino;
  consultar histórico; registrar nutrição; aparência; integrações; backup e
  restauração.
- [x] Identificar componentes e tokens compartilhados antes de migrar as
  telas centrais.
- [ ] Completar a auditoria caminhando pelos fluxos em aparelho Android.
- [ ] Registrar capturas de referência e priorizar problemas encontrados no
  uso real por impacto, frequência e tela afetada.

**Entrega parcial:** inventário do código e das superfícies compartilhadas.
Capturas e auditoria física continuam pendentes.

### M*1 — Direção visual e fundações

- [x] Adotar a direção do MIV completo como fonte de identidade visual.
- [x] Confirmar tema inicial monocromático, Geist + Geist Mono e Lucide.
- [x] Definir tokens de tipografia, escala, espaçamento, cores semânticas,
  superfícies, bordas, elevação, ícones, raios, movimento e feedback tátil.
- [x] Embutir as fontes e remover elevação/sombras da base visual comum.
- [ ] Validar os quatro temas nos modos claro e escuro, incluindo alto
  contraste no treino, em aparelho.

**Entrega parcial:** MIV adotado e fundações visuais aplicadas no código; falta
revisar os temas em aparelho Android.

### M*2 — Navegação e componentes compartilhados

- [x] Preservar a navegação de celular, aplicar ícones Lucide e simplificar o
  indicador da aba selecionada.
- [x] Atualizar cabeçalhos, botões, campos, chips, controles segmentados,
  avisos, estados vazios, listas de configuração, indicadores, folhas modais e
  barras de ação.
- [x] Padronizar controles principais com alvos de toque de pelo menos 48 dp.
- [ ] Revisar hierarquia e caminhos de ida e volta das tarefas frequentes.
- [x] Migrar os seletores comuns, diálogos de template/duplicação e a
  interface do catálogo externo.
- [ ] Revisar os diálogos secundários restantes.
- [ ] Conferir estados de foco, erro, carregamento e desativado com leitor de
  tela e teclado Android.

**Entrega parcial:** base de componentes migrada; navegação e estados precisam
de revisão no aparelho.

### M*3 — Aplicação às telas prioritárias

Aplicar componentes e tokens nesta ordem:

1. **Treino ativo:** exercício e série em foco, descanso, ações principais,
   progresso e saída segura da sessão.
2. **Hoje e planos:** próxima ação, estado do plano, edição e seleção de
   exercícios.
3. **Biblioteca e detalhes:** filtros e informação dos exercícios.
4. **Histórico e progresso:** períodos, valores e estados sem dados.
5. **Nutrição:** diário, metas, totais e estados.
6. **Mais, aparência, integrações e backup:** organização e explicação das
   configurações.

- [x] Fazer uma primeira passada visual em treino ativo, Hoje, ficha,
  histórico, nutrição, aparência, Mais, integrações e edição de ficha/dia.
- [x] Migrar biblioteca e detalhes de exercícios, catálogo Wger, templates,
  fichas arquivadas e lixeira.
- [x] Atualizar a área de backup local e a lista de backups automáticos em
  Mais.
- [ ] Revisar confirmações nativas de importação/restauração e demais estados
  secundários.
- [ ] Revisar conteúdo curto, longo e nomes extensos em cada tela.
- [ ] Corrigir hierarquia, densidade, alinhamento, rolagem e ações duplicadas
  sem alterar o comportamento funcional existente.

**Entrega parcial:** telas prioritárias centrais usam as fundações do MIV;
catálogos, backup e fluxos secundários ainda precisam da migração.

### M*4 — Estados, interação e acessibilidade

- [x] Aplicar padrões de estado vazio, erro e carregamento nas áreas migradas.
- [x] Manter aviso explícito de preservação ao abandonar sessão de treino.
- [ ] Conferir mensagens de sucesso, indisponibilidade de rede e falta de
  permissão; indicar o próximo passo possível em cada estado.
- [ ] Revisar confirmações, cancelamento, desfazer, salvamento e proteção
  contra saída acidental.
- [ ] Validar alvos de toque, contraste, foco, rótulos e semântica acessível.
- [ ] Verificar TalkBack, escala de fonte, teclado, orientação e áreas seguras
  em telas pequenas.
- [ ] Respeitar movimento reduzido e conferir mudanças de tema e modo sem
  estados intermediários com contraste incorreto.

**Entrega:** estados e interações acessíveis conferidos em todas as telas
prioritárias.

### M*5 — Revisão em aparelho e acabamento

- [ ] Revisar capturas de todas as telas prioritárias nos quatro temas e nos
  modos claro e escuro.
- [ ] Repetir as tarefas do M*0 no celular, incluindo uso com uma mão e fonte
  ampliada.
- [ ] Corrigir cortes, sobreposições, contraste, rolagem, teclado, retorno de
  navegação e feedback.
- [ ] Fazer revisão de regressão dos fluxos existentes após cada grupo de
  telas migrado.
- [ ] Atualizar `THEMES_ACCESSIBILITY.md` e o guia visual com decisões e
  comportamentos finais.

**Entrega:** revisão visual e de interação concluída no Android, com problemas
bloqueadores resolvidos e decisões documentadas.

## Critérios de aceite

- [ ] Telas prioritárias compartilham hierarquia, tipografia, espaçamento,
  superfícies e linguagem de interação coerentes.
- [ ] Os quatro temas e modos claro/escuro preservam legibilidade, contraste e
  estados distinguíveis.
- [ ] Treino, planos, histórico, nutrição e backup podem ser concluídos sem
  becos sem saída ou controles sem resposta visual.
- [ ] Ações frequentes têm feedback imediato; ações destrutivas e saídas de
  sessão deixam claros seus efeitos.
- [ ] Telas funcionam em celular pequeno e com escala de fonte ampliada, sem
  conteúdo ou ações cortadas.
- [ ] TalkBack, alvos, movimento reduzido, teclado e alto contraste foram
  verificados em aparelho Android.
- [x] O fluxo continua local-first e não introduz conta, backend ou
  sincronização obrigatória.
- [ ] Capturas, decisões visuais e pendências conhecidas ficam documentadas.

## Próximo passo

Continuar M*3 nas telas secundárias e então fazer a revisão conjunta no
aparelho Android. Consulte também o
[`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md) para os demais marcos do produto.
