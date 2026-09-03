# Integração opcional Gemini

O Training App continua utilizável sem rede e sem IA. Quando o gateway opcional é configurado, ele usa somente `gemini-3.8-flash` por padrão para interpretar texto de refeição, analisar uma fotografia, propor dieta e propor treino. Não há chatbot genérico, escolha dinâmica de modelo ou persistência automática.

## Limites de autoridade

O fluxo é sempre `Gemini → JSON estruturado → validação do gateway → validação do domínio → cálculo/preview → confirmação → repositório`. A IA não recebe acesso ao SQLite e não é fonte de kcal, macros ou micronutrientes. Fotografias retornam quantidades marcadas como estimativas, que devem poder ser corrigidas antes da confirmação.

O plano alimentar usa metas calculadas/configuradas localmente como autoridade; cada alimento do draft passa pelo `FoodResolver` e pelo `NutritionCalculator`. O plano de treino recebe uma lista reduzida de candidatos e qualquer ID fora dela é rejeitado. Limitações relatadas não recebem diagnóstico; uma restrição profissional registrada é uma constraint obrigatória.

## Configuração do gateway

Defina somente na infraestrutura do backend:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

Opcionalmente, o build mobile pode apontar para o gateway com `EXPO_PUBLIC_AI_GATEWAY_URL`; isso é apenas uma URL pública e nunca uma chave. Não use `EXPO_PUBLIC_GEMINI_API_KEY`, AsyncStorage, SQLite, fixtures ou código cliente para armazenar a chave. Sem URL ou sem chave no servidor, o app devolve um erro explícito e o registro manual continua funcionando.

O gateway limita imagens a 5 MiB por padrão e aceita JPEG, PNG e WebP. Ele trata indisponibilidade, timeout, limites de uso, autenticação recusada, falhas upstream, resposta vazia/JSON inválido e imagem inválida. Não faça retry ilimitado: no máximo um ciclo explícito de ajuste de dieta deve ocorrer fora do provider.

## Privacidade e Free Tier

Antes de qualquer envio, a UX deve mostrar: “Segundo a documentação atual do Google, conteúdo enviado através do Free Tier da Gemini API pode ser utilizado pelo Google para melhorar seus produtos. Consulte os termos atuais antes de habilitar o recurso.”

Envie somente o contexto minimizado da tarefa: não envie nome, email, UUID, backup, SQLite completo ou histórico integral. O Free Tier e seus limites/termos devem ser revisados antes de disponibilizar o recurso.
