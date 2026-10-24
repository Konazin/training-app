# Roadmap do produto

## Visão do produto

Construir um app de treino pessoal completo, confiável e marcante, feito para
ser usado no celular Android e continuar útil sem internet. Os dados pessoais
ficam no aparelho; exportação e restauração são explícitas. Catálogos externos
e recursos de IA são opcionais e só acessam a rede após uma ação informada pela
pessoa.

“Majestoso” significa uma experiência coesa e simples de usar, com treinos
confiáveis, informação pessoal fácil de entender, acessibilidade e acabamento
visual consistente. Não depende de conta, backend, sincronização obrigatória,
publicidade ou expansão para web.

## Estado atual

O app principal está em `mobile/`, com destino Android para celular. O candidato
em desenvolvimento é a versão **0.11.0**, `versionCode` **17**. Esta versão
está implementada no código do repositório, mas ainda não é uma release
validada: faltam o APK candidato e a verificação em aparelho físico.

### Feito no código

- Base local para treinos, planos, exercícios, histórico e preferências, sem
  conta ou servidor obrigatório; migrations preservadas e backups portáveis
  compatíveis.
- Home orientada ao treino de hoje, com semana local, estados textuais,
  descanso planejado e sessões ativas/pausadas. Histórico concluído permanece
  visível quando a programação futura muda.
- Planos com editor, modelos locais, criação/duplicação transacional, ciclo de
  vida, lixeira com retenção, desfazer e proteção contra ações concorrentes.
  Consulte [ciclo de vida](TRAINING_PLAN_LIFECYCLE.md) e
  [modelos](TRAINING_PLAN_TEMPLATES.md).
- Histórico, métricas de progresso, snapshots de desempenho e progressão
  explicada e dispensável; anotações locais em séries, exercícios e sessões.
- Biblioteca local com busca normalizada, filtros, favoritos, recentes e
  packs; importações preservam origem, identificador e atribuição. O catálogo
  externo Wger continua manual e opcional.
- Backup e restauração locais, com validação e fluxo transacional. Consulte
  [backup e restauração](BACKUP_AND_RESTORE.md).
- Nutrição permite registrar e editar refeições e itens, configurar metas e
  consultar resumos diários e de sete dias. Totais sobrevivem à retenção dos
  detalhes antigos.
- Análise nutricional por foto e sugestão de cardápio são opcionais. A
  estimativa pode ser revisada; a sugestão não entra no diário sem ação da
  pessoa. A imagem é transitória e o envio solicita confirmação.
- A chave pessoal do Gemini fica no SecureStore, fora do SQLite, logs e
  backups. Cada solicitação remota informa o que será enviado e pede
  confirmação.
- Aparência oferece quatro temas, modos claro/escuro/sistema, opções de
  movimento, feedback tátil e alto contraste durante o treino. Há semântica
  acessível e alvos principais de pelo menos 48 dp.
- `shell-quote` foi fixado em 1.11.0 para resolver a falha crítica registrada
  no grafo transitivo de ferramentas React Native.

### Verificações e pendências conhecidas

- Na rodada de desenvolvimento registrada, passaram 294 testes, os
  typechecks dos workspaces e a exportação Android do Expo. Isso cobre gates
  automatizados; não substitui instalação e uso em um aparelho.
- APK, checksum e smoke test físico ainda estão pendentes. Validar instalação
  limpa e atualização sobre a versão 0.9.3, incluindo dados e backups.
- A validação manual do Gemini em Android com chave de teste ainda está
  pendente.
- O levantamento de dependências registrado para `training-mobile` apontou 45
  avisos do `npm audit` (31 altos, 14 moderados, nenhum crítico). As correções
  automáticas sugeridas incluem downgrades incompatíveis de Expo e React
  Native; planejar atualização coordenada, não aplicar downgrades às cegas.
- Há testes antigos usando `react-test-renderer` a migrar. A documentação de
  acessibilidade existe, mas TalkBack, fonte ampliada, redução de movimento e
  feedback tátil precisam de validação física.
- A direção visual foi definida pelo MIV completo, acompanhada no marco
  **M*** abaixo, dedicado exclusivamente à UI/UX.

## Marcos

| Marco | Objetivo | Estado |
| --- | --- | --- |
| M0 — Fechamento do candidato Android | Gerar e validar o APK local-first | Concluído em 2026-10-24: APK 0.12.2 com smoke físico sem bugs |
| M* — UI/UX majestosa | Criar e aplicar uma experiência visual e de interação coesa | Em andamento; fundações e primeira passada nas telas centrais; revisão em aparelho pendente |
| M1 — Profundidade de treino | Tornar histórico e progresso por exercício mais úteis | Entregue no código (progresso por exercício, 1RM, recordes); refinamentos na 1.1 |
| M2 — Confiabilidade técnica | Modernizar dependências e testes com compatibilidade Android | Adiado para a 1.1 |
| M3 — Pronto para distribuição | Fechar critérios de qualidade e publicar o artefato Android | Release 1.0 com o APK 0.12.2; ver `RELEASE_1_0.md` |

Os marcos podem se sobrepor quando não houver dependência. O M* segue em
paralelo ao M0. A direção oficial está no
[`MIV-Training-App-D-Grafite.pdf`](../MIV-Training-App-D-Grafite.pdf), fora de
`prompt.md`.

### M0 — Fechamento do candidato Android 0.11.0

**Execução iniciada em 2026-10-16.** Após autenticar no EAS, um APK interno foi
gerado em 2026-10-17, conferido como pacote Android e passou na verificação de
integridade ZIP. Ele antecede as alterações atuais de Nutrição e precisa ser
substituído por um novo build. O ambiente continua sem `adb`, emulador ou Android SDK; veja
o checksum e os detalhes em [`LOCAL_ANDROID_APK.md`](LOCAL_ANDROID_APK.md).

- [ ] Gerar novo APK interno do código atual e registrar nome, tamanho,
  checksum SHA-256 e integridade do arquivo.
- [ ] Instalar em aparelho limpo e atualizar sobre 0.9.3; conferir migração,
  dados, referências locais e abertura após reinício.
- [ ] Executar o [roteiro de smoke test Android](LOCAL_ONLY_SMOKE_TEST.md) em
  modo avião e com rede, incluindo treino, nutrição, permissões, backups e
  fluxos opcionais do Gemini.
- [ ] Validar TalkBack, fonte ampliada, teclado, alvos de toque, movimento
  reduzido e feedback tátil em aparelho real.
- [ ] Corrigir regressões de severidade bloqueadora ou alta e repetir o roteiro
  afetado.

Critério de saída: APK instalável, upgrade preserva dados, fluxos essenciais
funcionam offline e nenhum bloqueador conhecido permanece. O procedimento está
em [`LOCAL_ANDROID_APK.md`](LOCAL_ANDROID_APK.md).

### M* — UI/UX majestosa

Marco reservado **somente à experiência de uso**: pesquisa de fluxos, sistema
de design, composição de telas, estados, navegação, interação, movimento e
acessibilidade. A direção MIV já foi aplicada às fundações e às telas centrais;
faltam telas secundárias e revisão física. Não inclui novas regras de negócio,
sincronização, backend, contas ou expansão de plataforma.

As etapas e critérios estão detalhados em
[`MARCO_M_UI_UX.md`](MARCO_M_UI_UX.md). As decisões confirmadas incluem tema
monocromático padrão para novas instalações, Geist + Geist Mono, ícones Lucide,
incremento de 1 kg por toque e preservação dos registros ao abandonar uma
sessão.

### M1 — Profundidade de treino

- [ ] Criar uma leitura direta do histórico de desempenho por exercício,
  reutilizando os dados locais já registrados.
- [ ] Melhorar descoberta, busca e filtro dos exercícios importados e
  disponíveis, sem consultas externas automáticas.
- [ ] Revisar os pontos em que a pessoa precisa sair do fluxo para compreender
  seu progresso ou retomar um plano.

Critério de saída: progresso útil sem rede, origem e período dos dados claros,
sem alterar sessões antigas nem criar dependência de serviço remoto.

### M2 — Confiabilidade técnica

- [x] **Prioridade 1.1:** migrar para o Expo SDK 57 (`expo@57.0.31`, React
  Native 0.86.3) para sair do Hermes V1 com regressão de memória e deixar o
  check `validate` da CI verde. Feito na branch `development-1.1`; veja
  [`RELEASE_1_1.md`](RELEASE_1_1.md).
- [ ] Gerar novo APK com o SDK 57 e repetir o smoke físico.
- [ ] Reavaliar os avisos atuais de dependências e atualizar Expo, React Native
  e grupos compatíveis de forma coordenada, conferindo plugins e exportação
  Android a cada etapa.
- [ ] Migrar gradualmente testes de componente de `react-test-renderer` para
  React Native Testing Library.
- [ ] Manter testes de domínio, banco, telas críticas e typechecks como gates
  de desenvolvimento; executar exportação e smoke físico em cada candidato de
  release.
- [ ] Registrar decisões de compatibilidade, versões suportadas e avisos que
  precisem de atualização futura.

Critério de saída: dependências suportadas pelo SDK adotado, sem correções
automáticas que rebaixem o app para uma combinação incompatível, e gates
reprodutíveis no ambiente Android.

### M3 — Pronto para distribuição

- [ ] Concluir M0 e os bloqueadores de M*, publicar notas da versão e preparar
  artefato verificável para distribuição Android.
- [ ] Fazer uma última instalação limpa e atualização sobre dados locais
  existentes.
- [ ] Conferir privacidade, retenção, exportação e restauração no material de
  release.
- [ ] Guardar APK e credenciais fora do Git; documentar versão, checksum e
  roteiro executado.

A avaliação de prontidão, o procedimento e o checklist da 1.0 estão em
[`RELEASE_1_0.md`](RELEASE_1_0.md).

Critério de saída: uma pessoa consegue instalar, usar offline, recuperar seus
dados por backup e entender claramente quando uma ação acessa um serviço
externo.

### Pós-1.0 — Exportar e importar fichas

Hoje só existe backup completo. Não há como exportar ou importar uma ficha de
treino isoladamente.

- [ ] Botão para exportar uma ficha (ou várias) em arquivo local, com versão de
  esquema, dias, exercícios, séries alvo e notas; sem histórico, sessões,
  nutrição nem segredos.
- [ ] Botão para importar uma ficha de arquivo, com validação e prévia antes de
  confirmar; sempre cria uma ficha nova, nunca sobrescreve as existentes.
- [ ] Resolver exercícios importados contra a biblioteca local, preservando
  origem, identificador e atribuição; tratar exercícios ausentes de forma
  explícita.
- [ ] Compartilhar o arquivo pelo seletor nativo do Android, sem rede nem
  serviço remoto.

Critério de saída: levar uma ficha de um aparelho para outro sem conta, sem
alterar dados existentes e com falha segura em arquivo inválido.

## Restrições permanentes

- Android em celular; não criar uma versão web nem suporte a tablet como parte
  deste roadmap.
- Dados de treino, biblioteca, nutrição, histórico e preferências permanecem
  no aparelho; sem conta ou sincronização obrigatória.
- Catálogos externos e IA só rodam após ação explícita. Antes de cada envio de
  IA, informar os dados enviados e pedir confirmação.
- Backups portáveis não incluem segredos do provedor nem imagens transitórias
  de análise.
- Funcionalidade essencial precisa continuar utilizável offline; rede é um
  complemento opcional.
