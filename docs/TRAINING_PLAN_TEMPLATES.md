# Templates e duplicação de fichas

## Templates locais

Os seis templates são definições TypeScript imutáveis:

- PPL 3x;
- Full Body 3x;
- Upper/Lower 4x;
- Corrida iniciante;
- Mobilidade 3x;
- Ficha vazia.

Eles criam exatamente sete dias em uma transação SQLite. A falha de qualquer
inserção reverte ficha e dias. O template preenche nome quando vazio, categoria,
dificuldade e divisão semanal, mas não salva automaticamente.

Templates não contêm IDs SQLite ou IDs de exercícios, não consultam Wger e não
criam exercícios. O usuário adiciona exercícios depois nas telas da ficha.

## Duplicação

- **Completa:** copia programação, cargas, duração, distância, RPE, notas,
  alternativas e atividades;
- **Apenas estrutura:** preserva exercício, ordem, séries, repetições, descanso,
  duração, distância, tipo de série e atividades; limpa carga planejada, RPE,
  nota do exercício e alternativa;
- **Sem cargas planejadas:** equivale à completa, mas define `plannedLoad` como
  nulo. Duração e distância não são tratadas como carga.

Cada cópia recebe IDs novos e nome `— Cópia`, `— Cópia 2` e seguintes sem
colisão por maiúsculas ou espaços. A operação não altera a ficha original e
não copia sessões, histórico ou snapshots. A cópia nasce inativa, não
arquivada e fora da lixeira.

Todo o processo é offline e transacional. O backup permanece no
`schemaVersion: 2`.
