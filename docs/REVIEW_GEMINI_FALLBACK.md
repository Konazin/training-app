# Review: fallback de modelos Gemini (commits 6c1193e e 0acf1f6)

Revisão por leitura do código, feita em 2026-10-23. Os itens 1, 2, 3, 4 e 8
foram corrigidos no commit seguinte; 5, 6, 7 e 9 seguem abertos.
"Confirmado" significa que o comportamento foi lido no código; nenhum item foi
reproduzido em aparelho.

## Achados

### 1. Análise por foto não tem botão de cancelar (UX, médio)
`NutritionScreen.tsx`: `cancelAi` só é exibido na aba de cardápio
(`aiBusy && <Action label="Cancelar solicitação" …>`). Na estimativa por foto,
os botões ficam apenas desabilitados. Antes o pior caso era 90 s; com a cadeia
de fallback passa a ser até 180 s sem como interromper (só saindo da tela).
Confirmado.

### 2. Cancelar durante a leitura do corpo vira "resposta incompatível" (baixo)
`readResponse` captura qualquer erro de `response.json()` e lança
`invalidResponse()`. Se o usuário cancelar (ou o timeout disparar) depois dos
headers, o erro de abort é engolido. O timeout é reconvertido em
`generateWithModel`, mas o cancelamento do usuário sai com a mensagem errada
em vez de "Análise cancelada.". Confirmado por leitura.

### 3. Resposta inválida não aciona fallback (médio)
`invalidResponse()` (JSON malformado, sem texto, valor fora da faixa) é
definitivo. Com o `flash-lite` como primeiro modelo, uma saída ruim isolada
mostra erro ao usuário mesmo que o próximo modelo respondesse bem. Decisão de
projeto a rever.

### 4. `maxOutputTokens: 4096` pode truncar o cardápio (corrigido: 8192)
Medido: cardápio no `3.5-flash-lite` usa até ~1800 tokens de saída, sem raciocínio. `3.6-flash` deu 503 nas 3 tentativas e não foi medido.
O limite inclui tokens de raciocínio (o `3.6-flash` gastou ~1000 só na foto).
Um cardápio de 3 a 6 refeições com vários itens pode ser cortado
(`finishReason: MAX_TOKENS`), resultando em JSON incompleto e erro do item 3.
O benchmark só cobre a foto; o cardápio não foi medido.

### 5. Fallback reenvia a imagem e consome mais cota (baixo)
Cada tentativa reenvia o corpo inteiro. Em 429 por cota diária, as demais
tentativas também falham e custam tempo. O texto de confirmação de envio não
menciona que o mesmo conteúdo pode ser enviado a mais de um modelo.

### 6. Erros finais pouco informativos (baixo)
A mensagem mostrada é a da última falha. Se o 1º modelo deu 503 e o último deu
timeout, aparece só "demorou demais". Não há registro de qual modelo respondeu
nem do que falhou antes, o que dificulta diagnóstico em campo.

### 7. Sem teste de tela para o fluxo (baixo)
O timeout global foi removido de `NutritionScreen.tsx` sem teste RNTL que cubra
cancelamento ou erro de IA. A cobertura está só no provider.

### 8. `bench.mjs`: flags booleanas engolem a imagem (baixo)
`--show` e `--list-models` não recebem valor, mas a detecção da imagem ignora o
argumento seguinte a qualquer flag. `bench.mjs --show foto.jpg` não encontra a
imagem; funciona com a imagem antes da flag.

### 9. Documentação desatualizada (baixo)
`docs/ROADMAP_FIX_REDESIGN.md:76` ainda lista "Validar o ID do modelo Gemini
(`gemini-3.8-flash`)" como pendente. O modelo padrão agora é
`gemini-3.5-flash-lite`; os três IDs da cadeia foram confirmados contra a API
real em 2026-10-23.

## Sugestão de ordem
1 (UX), 4 e 3 (podem causar erro visível), depois 2, 6, 8, 9, 7 e 5.
