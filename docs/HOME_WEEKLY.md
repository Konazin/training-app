# Home semanal

A tela **Hoje** responde diretamente o que deve ser treinado no dia. Ela usa a
ficha ativa, o histórico de sessões e a sessão atual já salvos no SQLite. Não
há chamada de rede, login, backend ou seleção automática de ficha.

## Semana e estados

A semana segue o calendário local, de segunda-feira a domingo. Cada um dos
sete dias recebe um estado textual:

- **Em andamento** ou **Pausado** quando existe sessão atual da ficha e do dia;
- **Concluído** quando existe sessão concluída na data programada;
- **Não concluído** quando existe somente sessão abandonada;
- **Descanso** quando o dia foi planejado como descanso, inclusive no passado;
- **Hoje** quando o treino do dia está pronto para iniciar;
- **Não registrado** para treino passado sem conclusão;
- **Programado** para treino futuro;
- **Não configurado** quando falta o dia esperado na ficha.

Sessão concluída prevalece sobre sessão abandonada da mesma ficha, dia e data.
O progresso semanal usa somente os dias atualmente configurados como treino:
o dia precisa existir na ficha e não pode estar marcado como descanso.
Sessões históricas são preservadas e ainda podem deixar o estado visual como
**Concluído** ou **Não concluído** após uma mudança para descanso, mas não
aumentam o progresso atual. A porcentagem permanece entre zero e cem.

## Operação

Uma sessão ativa ou pausada aparece logo após o cabeçalho, mesmo sem ficha
ativa, com ficha arquivada ou quando a ficha original não pode ser resolvida.
Ela impede oferecer um novo início. Um treino pronto só pode começar se tiver
exercícios e não for descanso. A criação continua no fluxo existente do
repository SQLite, com lock imediato contra toque duplo.

Treinos vazios abrem a configuração do dia. Descanso planejado mostra até três
atividades locais, informa quantas ficaram ocultas e não oferece início. Cargas
de sessões concluídas anteriores podem aparecer como **Referência anterior**;
a busca fica isolada pela ficha e pelo dia. Elas são apenas histórico, nunca
carga recomendada ou conselho de progressão.

O resumo semanal começa expandido e pode ser recolhido apenas durante a sessão
visual atual. A data e a semana são recalculadas ao focar a tela, voltar o
aplicativo ao primeiro plano e terminar o pull-to-refresh. O próprio refresh
mantém o indicador ativo até todas as leituras terminarem, deduplica gestos
concorrentes e preserva os dados visíveis em falhas parciais.

Não houve migration nova nem alteração do backup `schemaVersion: 2`.
