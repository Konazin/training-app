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
Trocas de seletor, template ou estrutura participam do alerta de alterações
não salvas.

## Estrutura semanal

A prévia ordena segunda a domingo e identifica treino, descanso, dia vazio,
quantidade de exercícios, atividades e avisos. Treino sem exercícios e ausência
de descanso são avisos, não recomendações médicas. Weekday duplicado ou ausente
é rejeitado na criação.

Após salvar, os detalhes continuam sendo editados nas telas de cada dia. Todo o
fluxo é local-only e não depende de internet, login ou backend.
