# Modo Nutrição

O registro manual, metas, resumos e sugestões salvas são locais e funcionam sem
rede. Uma refeição contém um ou mais alimentos; os totais são calculados a
partir dos itens. Calorias, proteína, carboidratos, gordura e fibras são
editáveis.

## Histórico e retenção

As tabelas `nutrition_meals`, `nutrition_meal_items` e
`nutrition_daily_summaries` usam datas locais `YYYY-MM-DD`, timestamps ISO 8601
e JSON versionável para micronutrientes. Metas ficam em `app_settings` na chave
`nutrition.goals` e são definidas pelo usuário.

Detalhes individuais ficam disponíveis por sete dias locais. A manutenção
fecha dias anteriores em transação, grava resumos permanentes e remove somente
detalhes que já possuem resumo. A tela permite consultar dias anteriores e
exibe o resumo mesmo depois que os detalhes expirarem.

Backups schema 3 incluem refeições, itens, resumos e configurações locais; as
coleções nutricionais ausentes em backups antigos são interpretadas como
vazias. Chaves de API não fazem parte do banco nem dos backups.

## IA opcional

Câmera e galeria podem iniciar uma estimativa por imagem com Gemini. Gerar uma
sugestão diária de refeições também usa IA. Essas ações requerem internet, uma
chave Gemini pessoal no SecureStore e confirmação antes de cada envio. O texto
da solicitação pode incluir as metas e preferências digitadas pelo usuário.

A imagem é usada apenas na solicitação e não é salva pelo app. Estimativas e
menus são rascunhos editáveis; nada é inserido no diário sem revisão e ação
explícita. O app não diagnostica nem prescreve. Na cota gratuita, o provedor
pode usar solicitações e respostas para melhoria dos serviços e revisão humana;
consulte os [termos atuais da Gemini API](https://ai.google.dev/gemini-api/terms)
e [limites/preços](https://ai.google.dev/gemini-api/docs/pricing). A chave é
enviada ao provedor durante as chamadas e deve ser dedicada e revogável.

A chamada direta do celular é uma escolha BYOK: o app não inclui uma chave
compartilhada nem exige backend. Uma chave digitada pode ser exposta se o
aparelho estiver comprometido; usuários devem restringi-la e revogá-la quando
necessário. Sem chave, internet ou cota, o registro manual segue disponível.
