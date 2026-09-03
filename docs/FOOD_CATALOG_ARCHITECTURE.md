# Arquitetura do catálogo alimentar

## Objetivo

Esta camada prepara a resolução determinística de alimentos para uma futura entrada em linguagem natural. Ela não contém SDK, chave, rede obrigatória ou decisão de IA.

```
FoodCatalogProvider -> CanonicalFood -> FoodResolver -> ResolvedFoodPortion
  -> MealDraft (revisável) -> validação existente -> NutritionMealItem snapshot
```

O tracking nutricional continua local-first: uma refeição persistida guarda seus próprios macros, fibra e micronutrientes. Um catálogo atualizado não pode reescrever consumo histórico.

## Modelo canônico e identidade

`CanonicalFood` tem ID local estável, `source`, `externalId`, base de porção, nutrientes, barcode opcional, qualidade e attribution estruturada. A identidade de fonte externa é `source:externalId`; portanto `TBCA:123` e `USDA:123` não colidem.

Valores nutricionais são por `servingBasis`. `calculateFoodPortion` multiplica todos os nutrientes pelo fator `amount / servingBasis.amount`, sem arredondar internamente. O arredondamento cabe apenas à UI. O MVP aceita somente `g`, `ml` e `unit`; não infere colher, xícara, prato ou fatia sem fator confiável.

## Providers e resolução

`FoodCatalogProvider` expõe `search`, `getById` e, opcionalmente, `getByBarcode`. `LocalFoodCatalogProvider` é a fonte offline de desenvolvimento/teste e contém apenas um fixture explícito, não uma cópia de fonte externa.

`FoodResolver` busca os providers selecionados e retorna `exact`, `probable`, `ambiguous` ou `notFound`. Resultado ambíguo nunca é escolhido silenciosamente. Cache persistido e providers remotos são futuros; quando necessários, devem usar uma migration nova, sem alterar as migrations 1–11.

## Snapshots, persistência e backup

O catálogo não é a fonte da verdade de uma refeição já consumida. Hoje `nutrition_meal_items` já persiste nome, descrição de porção, peso, macros e micronutrientes; `nutrition_daily_summaries` mantém snapshots históricos e metas congeladas. O schema 3 de backup já transporta meals, items e summaries; schemas 1 e 2 continuam sendo lidos com coleções nutricionais vazias.

Esta etapa não cria tabela de catálogo nem migration: a fonte local é um fixture de domínio e nenhuma entrada externa é importada. Um futuro cache de `CanonicalFood` precisará persistir attribution/identidade em tabela própria e manter o snapshot de refeição independente.

## Posição futura da IA

```
texto -> parser de IA -> FoodQueryDraft -> FoodResolver -> MealDraft -> confirmação -> persistência
```

A IA somente produz um draft de consulta/quantidade. Ela não calcula macros, não seleciona resposta ambígua, não grava SQLite e não ignora as regras de datas, retenção ou metas.

## Fontes candidatas e licenciamento

| Fonte | Confirmado | Pendente | Uso nesta etapa |
| --- | --- | --- | --- |
| TBCA | Base brasileira oficial da USP, com micronutrientes e IDs alfanuméricos estáveis | A página informa CC BY-NC-ND 4.0, proíbe reprodução parcial/total e requer contato para uso comercial; confirmar por escrito antes de redistribuir no APK | Não utilizada nem importada |
| Open Food Facts | API, barcode e dados sob ODbL; endpoints têm rate limit | Verificar obrigações de attribution/share-alike, política de cache e qualidade/completude por produto | Não utilizada nem chamada |
| USDA FoodData Central | Dados em domínio público; busca/detalhe e chave data.gov | Chave não pode ir ao APK; rate limit e cobertura brasileira tornam gateway/cache necessários | Não utilizada nem chamada |

Fontes: [TBCA/USP](https://fcf.usp.br/tbca/), [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/), [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/).
