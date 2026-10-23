# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users
Pessoa que treina musculação sozinha, no celular Android, muitas vezes na academia: em pé, entre séries, com a mão ocupada ou suada, olhando a tela de relance e às vezes sem internet. Também registra refeições durante o dia. Quer controle e confiança sobre os próprios dados, sem criar conta.

## Product Purpose
Planejar fichas, executar a sessão de treino com poucos toques, acompanhar o progresso e registrar a alimentação, tudo no aparelho. Sucesso é a pessoa terminar o treino do dia sem se perder na interface e confiar que nada foi perdido.

## Positioning
Local-first de verdade: dados no SQLite do aparelho, backup e restauração explícitos, catálogos externos (ExerciseDB, Wger) e IA (Gemini com chave pessoal) opcionais e acionados só por ação informada. Um app de treino que funciona offline e não pede cadastro.

## Operating Context
Android (celular, retrato). Sessão de treino com timer de descanso e alto contraste opcional. Importação de exercícios sob demanda. Nutrição com resumo diário e estimativas por foto opcionais (sem prescrição médica).

## Capabilities and Constraints
- Sem conta, backend ou sincronização obrigatória; sem anúncios.
- Rede só após ação do usuário; cada envio de IA exige confirmação e explica os dados enviados.
- Chave Gemini no SecureStore, fora do banco e dos backups.
- Português do Brasil.
- Nutrição é registro e estimativa aproximada, nunca diagnóstico ou prescrição.
- Estado: `undecided` Health Connect; `undecided` lembretes e widget.

## Brand Commitments
Nome "Training App". Direção MIV (Geist + Geist Mono, ícones Lucide, incremento de 1 kg por toque, preservar registros ao abandonar sessão). Redesign pedido: minimalista, monocromático preto, animações bonitas, usabilidade em primeiro lugar.

## Evidence on Hand
Documentação em `docs/` e `MIV-Training-App-D-Grafite.pdf`. Não há depoimentos, métricas de usuários nem imagens de marca; nada disso deve ser inventado.

## Product Principles
1. A sessão de treino é a tela mais importante: cada toque a menos vale mais que qualquer ornamento.
2. Confiança antes de recurso: nunca perder um registro; sempre dizer o que será enviado para fora.
3. O app funciona sem internet e sem cadastro.
4. Informação por forma e texto, não só por cor.
5. Nenhuma prescrição: o app registra e sugere, a pessoa decide.

## Accessibility & Inclusion
Alvos de toque de 48 dp, contraste mínimo 4.5:1 (7:1 no modo de treino de alto contraste), fonte ampliada sem corte, TalkBack com rótulos e ordem coerentes, movimento reduzido respeitado (preferência do app e do sistema).

> Registro: este arquivo foi escrito a partir de PRODUCT_ROADMAP.md, README e do pedido do usuário, sem a entrevista do `init`, por instrução expressa de seguir em frente. Itens inferidos devem ser confirmados.
