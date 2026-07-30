# Editor de ficha

O editor mobile da versão 0.5.0 separa **Dados da ficha**, **Estrutura
semanal**, **Gestão** e **Zona de perigo**.

## Dados da ficha

- nome obrigatório, normalizado e limitado a 80 caracteres;
- descrição opcional, limitada a 500 caracteres;
- categoria com presets Força, Hipertrofia, Resistência muscular,
  Condicionamento, Mobilidade, Recuperação, Técnica e Mista;
- dificuldade com presets Iniciante, Intermediário, Avançado e Adaptável.

A opção **Outra** abre um campo personalizado de até 50 caracteres. “Outra”
nunca é persistida: somente o texto informado é salvo. Valores antigos fora
dos presets são reabertos como personalizados e não são descartados.

Categoria e dificuldade continuam colunas `TEXT`; não existe migration nova.
Na criação, trocas de seletor ou template participam do alerta de alterações
não salvas.

## Estrutura semanal

A prévia ordena segunda a domingo e identifica treino, descanso, dia vazio,
quantidade de exercícios, atividades e avisos. Treino sem exercícios e ausência
de descanso são avisos, não recomendações médicas. Weekday duplicado ou ausente
é rejeitado na criação.

Templates estão disponíveis somente ao criar uma ficha. Uma ficha existente
mostra a prévia dos dias, exercícios, atividades e descansos persistidos, mas o
editor geral salva somente nome, descrição, categoria, dificuldade e datas.
Seus dias são editados nas telas próprias; não existe substituição automática
da estrutura por template.

Criação e duplicação permanecem bloqueadas até a atualização das telas
terminar. Falha nessa atualização gera aviso, mas não desfaz uma mutation já
confirmada. Todo o fluxo é local-only e não depende de internet, login ou
backend.
