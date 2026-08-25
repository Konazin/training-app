# Modo Nutrição

O Modo Nutrição é local, offline-first e manual. Uma refeição é um evento com um ou mais alimentos; os totais são calculados exclusivamente a partir dos itens.

As tabelas `nutrition_meals`, `nutrition_meal_items` e `nutrition_daily_summaries` usam datas locais `YYYY-MM-DD`, timestamps ISO 8601 e JSON versionável para micronutrientes. As metas ficam em `app_settings` na chave `nutrition.goals` e são definidas pelo usuário; não há recomendação médica ou cálculo automático.

Detalhes individuais ficam disponíveis por sete dias locais (limite exclusivo: dias anteriores a `hoje - 7` podem ser removidos). Dias anteriores recebem um resumo finalizado com a fotografia das metas daquele dia; enquanto os detalhes existem, eles continuam editáveis e o resumo é recalculado sem trocar essas metas históricas. Quando `details_purged_at` é registrado, o dia passa a ser somente leitura e os totais permanentes continuam visíveis. A manutenção fecha dias anteriores, grava o resumo e só então remove detalhes dentro de uma transação; falhas são best-effort, observáveis na tela e não bloqueiam o bootstrap. Ela roda ao abrir o app, ao voltar ao app e ao abrir a tela; é idempotente e não depende de uma execução à meia-noite.

Backups schema 3 incluem refeições, itens, resumos e metas; os estados de retenção também são validados. Leitores continuam aceitando schemas 1 e 2; coleções nutricionais ausentes são vazias. A migration 11 adiciona o estado de retenção sem alterar a migration 10. Reset remove todos os dados nutricionais, preservando metadados técnicos.

Câmera e galeria são entradas preparadas, mas ainda informam que a análise por imagem será adicionada na próxima etapa. Não há servidor, upload, imagens, notificações, sincronização ou prescrição nutricional.
