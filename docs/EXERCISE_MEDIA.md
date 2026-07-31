# Mídia de exercícios

A biblioteca resolve imagem local, URL remota armazenada, vídeo ou ausência de
mídia. Placeholders legados são apenas estados visuais: nunca são apresentados
como demonstração técnica ou conteúdo canônico.

Mídia real importada preserva URL de origem, autor, licença e URL da licença.
Nenhuma mídia é solicitada no bootstrap. Vídeos nunca iniciam automaticamente.

O pacote recomendado tem 40 itens: 38 com imagem obrigatória e 2 com mídia
opcional. A consulta ocorre somente após confirmação e a imagem recebida é
validada antes do commit SQLite; não há placeholder apresentado como demonstração.

Na busca manual atual, metadados ficam no SQLite, mas a mídia ainda pode
depender da URL remota. Falhas de mídia não removem os dados do exercício.
