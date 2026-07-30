import type {
  ExerciseCategory,
  ExerciseDefinitionInput,
} from '../model'
import { normalizeName } from '../rules'

export type ExercisePlaceholderKind = 'STRENGTH' | 'MOBILITY' | 'CARDIO' | 'BODYWEIGHT' | 'EQUIPMENT'

export interface BundledExercise extends ExerciseDefinitionInput {
  slug: string
  externalId: string
  normalizedName: string
  aliases: readonly string[]
  media: Readonly<{
    kind: 'PLACEHOLDER'
    placeholder: ExercisePlaceholderKind
    attribution: 'Ilustração genérica do aplicativo'
  }>
}

type ExerciseArgs = readonly [
  slug: string,
  name: string,
  aliases: readonly string[],
  primaryMuscleGroup: string,
  secondaryMuscleGroups: readonly string[],
  equipment: string,
  category: ExerciseCategory,
  difficulty: string,
  description: string,
  instructions: string,
  unilateral: boolean,
  timed: boolean,
  placeholder: ExercisePlaceholderKind,
]

function bundled(args: ExerciseArgs): BundledExercise {
  const [
    slug, name, aliases, primaryMuscleGroup, secondaryMuscleGroups, equipment,
    category, difficulty, description, instructions, unilateral, timed, placeholder,
  ] = args
  return Object.freeze({
    slug,
    externalId: slug,
    name,
    normalizedName: normalizeName(name),
    aliases: Object.freeze([...aliases]),
    description,
    primaryMuscleGroup,
    secondaryMuscleGroups: Object.freeze([...secondaryMuscleGroups]) as string[],
    equipment,
    category,
    difficulty,
    instructions,
    notes: '',
    unilateral,
    timed,
    media: Object.freeze({
      kind: 'PLACEHOLDER' as const,
      placeholder,
      attribution: 'Ilustração genérica do aplicativo' as const,
    }),
  })
}

export const BUNDLED_EXERCISES: readonly BundledExercise[] = Object.freeze([
  bundled(['flexao_bracos', 'Flexão de braços', ['flexao', 'apoio de frente'], 'Peito', ['Tríceps', 'Ombros', 'Core'], 'Peso corporal', 'STRENGTH', 'Iniciante', 'Empurrada horizontal no solo com o peso do corpo.', 'Apoie mãos e pés, mantenha o tronco alinhado, desça com controle e empurre o chão.', false, false, 'BODYWEIGHT']),
  bundled(['supino_reto_halteres', 'Supino reto com halteres', ['supino com halter', 'dumbbell press'], 'Peito', ['Tríceps', 'Ombros'], 'Halteres', 'HYPERTROPHY', 'Iniciante', 'Empurrada deitada com liberdade para cada braço.', 'Deite no banco, estabilize os pés, desça os halteres ao lado do peito e pressione para cima.', false, false, 'EQUIPMENT']),
  bundled(['supino_reto_barra', 'Supino reto com barra', ['supino', 'bench press'], 'Peito', ['Tríceps', 'Ombros'], 'Barra e banco', 'STRENGTH', 'Intermediário', 'Empurrada horizontal com barra sobre banco reto.', 'Fixe os pés, retire a barra com controle, toque a região média do peito e estenda os braços.', false, false, 'EQUIPMENT']),
  bundled(['crucifixo_maquina', 'Crucifixo na máquina', ['peck deck', 'voador'], 'Peito', ['Ombros'], 'Máquina', 'HYPERTROPHY', 'Iniciante', 'Adução dos braços com trajetória guiada.', 'Ajuste o banco, apoie o tronco e aproxime os braços sem tirar os ombros do encosto.', false, false, 'EQUIPMENT']),
  bundled(['remada_curvada_barra', 'Remada curvada com barra', ['remada barra', 'bent over row'], 'Costas', ['Bíceps', 'Posteriores', 'Core'], 'Barra', 'STRENGTH', 'Intermediário', 'Puxada horizontal com o tronco inclinado.', 'Incline o tronco com coluna neutra, puxe a barra ao abdômen e retorne sem perder a postura.', false, false, 'EQUIPMENT']),
  bundled(['remada_unilateral_halter', 'Remada unilateral com halter', ['serrote', 'remada com halter'], 'Costas', ['Bíceps'], 'Halter', 'HYPERTROPHY', 'Iniciante', 'Puxada horizontal realizada por um lado de cada vez.', 'Apoie mão e joelho, estabilize o tronco e leve o halter em direção ao quadril.', true, false, 'EQUIPMENT']),
  bundled(['puxada_frente_maquina', 'Puxada à frente na máquina', ['puxador frente', 'pulldown'], 'Costas', ['Bíceps'], 'Máquina de cabos', 'HYPERTROPHY', 'Iniciante', 'Puxada vertical guiada em direção ao tronco.', 'Prenda as coxas, mantenha o peito aberto e puxe a barra até a parte alta do peito.', false, false, 'EQUIPMENT']),
  bundled(['barra_fixa', 'Barra fixa pronada', ['pull up', 'barra pronada'], 'Costas', ['Bíceps', 'Core'], 'Barra fixa', 'STRENGTH', 'Intermediário', 'Puxada vertical usando o peso corporal.', 'Segure a barra com palmas à frente, estabilize o tronco e eleve o peito em direção à barra.', false, false, 'BODYWEIGHT']),
  bundled(['desenvolvimento_halteres', 'Desenvolvimento com halteres', ['shoulder press', 'desenvolvimento ombro'], 'Ombros', ['Tríceps'], 'Halteres', 'STRENGTH', 'Iniciante', 'Empurrada vertical com um halter em cada mão.', 'Mantenha o tronco estável, comece com halteres ao lado dos ombros e pressione acima da cabeça.', false, false, 'EQUIPMENT']),
  bundled(['elevacao_lateral', 'Elevação lateral com halteres', ['lateral raise', 'elevacao de ombro'], 'Ombros', [], 'Halteres', 'HYPERTROPHY', 'Iniciante', 'Elevação dos braços para os lados com carga leve.', 'Com cotovelos levemente flexionados, eleve os halteres até a linha dos ombros e desça devagar.', false, false, 'EQUIPMENT']),
  bundled(['face_pull_elastico', 'Face pull com elástico', ['puxada para o rosto', 'facepull'], 'Ombros', ['Costas'], 'Elástico', 'RECOVERY', 'Iniciante', 'Puxada alta com rotação externa dos ombros.', 'Fixe o elástico à frente, puxe em direção ao rosto e termine com as mãos afastadas.', false, false, 'MOBILITY']),
  bundled(['rosca_direta_barra', 'Rosca direta com barra', ['rosca barra', 'barbell curl'], 'Bíceps', ['Antebraços'], 'Barra', 'HYPERTROPHY', 'Iniciante', 'Flexão dos cotovelos em pé com barra.', 'Mantenha os cotovelos próximos ao tronco, eleve a barra e desça sem embalo.', false, false, 'EQUIPMENT']),
  bundled(['rosca_martelo', 'Rosca martelo com halteres', ['hammer curl', 'rosca neutra'], 'Bíceps', ['Antebraços'], 'Halteres', 'HYPERTROPHY', 'Iniciante', 'Flexão dos cotovelos com pegada neutra.', 'Segure os halteres com palmas voltadas entre si, flexione os cotovelos e retorne com controle.', false, false, 'EQUIPMENT']),
  bundled(['rosca_biceps_elastico', 'Rosca de bíceps com elástico', ['rosca elastico', 'curl com faixa'], 'Bíceps', ['Antebraços'], 'Elástico', 'ENDURANCE', 'Iniciante', 'Flexão dos cotovelos contra resistência elástica.', 'Pise no centro do elástico, mantenha os cotovelos junto ao corpo e eleve as mãos.', false, false, 'EQUIPMENT']),
  bundled(['triceps_testa_halteres', 'Tríceps testa com halteres', ['triceps frances deitado', 'skull crusher'], 'Tríceps', [], 'Halteres e banco', 'HYPERTROPHY', 'Intermediário', 'Extensão dos cotovelos em posição deitada.', 'Mantenha os braços apontados para cima, flexione apenas os cotovelos e estenda com controle.', false, false, 'EQUIPMENT']),
  bundled(['triceps_polia', 'Extensão de tríceps na polia', ['triceps pulley', 'pushdown'], 'Tríceps', [], 'Máquina de cabos', 'HYPERTROPHY', 'Iniciante', 'Extensão dos cotovelos com resistência por cabo.', 'Fixe os cotovelos ao lado do corpo, empurre o acessório para baixo e retorne devagar.', false, false, 'EQUIPMENT']),
  bundled(['mergulho_banco', 'Mergulho no banco', ['triceps banco', 'bench dip'], 'Tríceps', ['Peito', 'Ombros'], 'Banco', 'STRENGTH', 'Iniciante', 'Empurrada com as mãos apoiadas atrás do corpo.', 'Apoie as mãos no banco, mantenha o quadril próximo e flexione os cotovelos antes de empurrar.', false, false, 'BODYWEIGHT']),
  bundled(['agachamento_livre', 'Agachamento livre', ['agachamento', 'squat'], 'Quadríceps', ['Glúteos', 'Posteriores', 'Core'], 'Peso corporal', 'STRENGTH', 'Iniciante', 'Agachamento sem carga externa para pernas e quadris.', 'Afaste os pés, leve o quadril para baixo e mantenha os joelhos alinhados aos pés.', false, false, 'BODYWEIGHT']),
  bundled(['leg_press', 'Leg press inclinado', ['legpress', 'prensa de pernas'], 'Quadríceps', ['Glúteos', 'Posteriores'], 'Máquina', 'STRENGTH', 'Iniciante', 'Extensão de joelhos e quadris em máquina inclinada.', 'Apoie toda a coluna, posicione os pés na plataforma e empurre sem travar os joelhos.', false, false, 'EQUIPMENT']),
  bundled(['cadeira_extensora', 'Cadeira extensora', ['extensora', 'leg extension'], 'Quadríceps', [], 'Máquina', 'HYPERTROPHY', 'Iniciante', 'Extensão de joelhos em trajetória guiada.', 'Ajuste o eixo da máquina aos joelhos, estenda as pernas e retorne sem soltar o peso.', false, false, 'EQUIPMENT']),
  bundled(['avanco_alternado', 'Avanço alternado', ['passada', 'lunge'], 'Quadríceps', ['Glúteos', 'Posteriores'], 'Peso corporal', 'STRENGTH', 'Iniciante', 'Passada alternada para força unilateral das pernas.', 'Dê um passo à frente, desça os dois joelhos e retorne com controle.', true, false, 'BODYWEIGHT']),
  bundled(['levantamento_romeno_barra', 'Levantamento romeno com barra', ['stiff', 'romanian deadlift'], 'Posteriores', ['Glúteos', 'Costas'], 'Barra', 'STRENGTH', 'Intermediário', 'Movimento de dobradiça de quadril com barra.', 'Desloque o quadril para trás, mantenha a barra próxima às pernas e suba estendendo o quadril.', false, false, 'EQUIPMENT']),
  bundled(['mesa_flexora', 'Mesa flexora', ['flexora deitada', 'leg curl'], 'Posteriores', ['Panturrilhas'], 'Máquina', 'HYPERTROPHY', 'Iniciante', 'Flexão dos joelhos em posição deitada.', 'Ajuste o apoio acima dos calcanhares, flexione os joelhos e retorne sem levantar o quadril.', false, false, 'EQUIPMENT']),
  bundled(['bom_dia_elastico', 'Bom-dia com elástico', ['good morning', 'dobradica com elastico'], 'Posteriores', ['Glúteos', 'Costas'], 'Elástico', 'TECHNIQUE', 'Iniciante', 'Prática de dobradiça do quadril com resistência leve.', 'Pise no elástico, apoie-o nos ombros, leve o quadril para trás e retorne ereto.', false, false, 'EQUIPMENT']),
  bundled(['ponte_gluteos', 'Ponte de glúteos', ['ponte quadril', 'glute bridge'], 'Glúteos', ['Posteriores', 'Core'], 'Peso corporal', 'STRENGTH', 'Iniciante', 'Extensão de quadril realizada no chão.', 'Deite com joelhos flexionados, eleve o quadril e contraia os glúteos.', false, false, 'BODYWEIGHT']),
  bundled(['elevacao_pelvica_barra', 'Elevação pélvica com barra', ['hip thrust', 'elevacao de quadril'], 'Glúteos', ['Posteriores'], 'Barra e banco', 'HYPERTROPHY', 'Intermediário', 'Extensão de quadril com as costas apoiadas no banco.', 'Apoie as escápulas, estabilize a barra sobre o quadril e eleve até alinhar o tronco.', false, false, 'EQUIPMENT']),
  bundled(['abducao_quadril_elastico', 'Abdução de quadril com elástico', ['abducao lateral', 'caminhada lateral faixa'], 'Glúteos', ['Quadríceps'], 'Elástico', 'ENDURANCE', 'Iniciante', 'Afastamento lateral da perna contra faixa elástica.', 'Mantenha o tronco estável, afaste uma perna sem girar o quadril e retorne devagar.', true, false, 'EQUIPMENT']),
  bundled(['elevacao_panturrilhas', 'Elevação de panturrilhas em pé', ['elevação de panturrilhas', 'panturrilha em pe', 'calf raise'], 'Panturrilhas', [], 'Peso corporal', 'STRENGTH', 'Iniciante', 'Elevação dos calcanhares em posição ereta.', 'Eleve os calcanhares, pause no alto e desça devagar mantendo o equilíbrio.', false, false, 'BODYWEIGHT']),
  bundled(['panturrilha_sentado', 'Panturrilha sentada com halter', ['calf sentado', 'seated calf raise'], 'Panturrilhas', [], 'Halter e banco', 'HYPERTROPHY', 'Iniciante', 'Elevação dos calcanhares sentado com carga sobre as coxas.', 'Sente-se com os pés apoiados, estabilize o halter e eleve os calcanhares com controle.', false, false, 'EQUIPMENT']),
  bundled(['prancha_frontal', 'Prancha frontal', ['prancha', 'plank'], 'Core', ['Ombros', 'Glúteos'], 'Peso corporal', 'ENDURANCE', 'Iniciante', 'Sustentação isométrica para estabilidade do tronco.', 'Apoie antebraços e pés, alinhe o corpo e mantenha o abdômen firme.', false, true, 'BODYWEIGHT']),
  bundled(['dead_bug', 'Dead bug alternado', ['inseto morto', 'deadbug'], 'Core', ['Quadril'], 'Sem equipamento', 'TECHNIQUE', 'Iniciante', 'Coordenação alternada de braços e pernas com a lombar apoiada.', 'Deite de costas, estabilize o abdômen e estenda braço e perna opostos sem arquear a lombar.', true, false, 'BODYWEIGHT']),
  bundled(['bird_dog', 'Bird dog', ['cao passaro', 'extensao quatro apoios'], 'Core', ['Lombar', 'Glúteos'], 'Sem equipamento', 'MOBILITY', 'Iniciante', 'Extensão alternada para estabilidade do tronco.', 'Em quatro apoios, estenda braço e perna opostos sem girar o tronco.', true, false, 'BODYWEIGHT']),
  bundled(['abdominal_bicicleta', 'Abdominal bicicleta', ['bicicleta no solo', 'bicycle crunch'], 'Core', ['Quadril'], 'Sem equipamento', 'ENDURANCE', 'Intermediário', 'Rotação alternada do tronco com movimento das pernas.', 'Deite de costas, alterne cotovelo e joelho opostos e mantenha o movimento controlado.', true, false, 'BODYWEIGHT']),
  bundled(['mobilidade_quadril_90_90', 'Mobilidade de quadril 90/90', ['90 90', 'rotacao de quadril sentada'], 'Mobilidade', ['Glúteos'], 'Sem equipamento', 'MOBILITY', 'Iniciante', 'Transição sentada entre rotações internas e externas do quadril.', 'Sente com joelhos flexionados, leve ambos para um lado e alterne sem forçar a amplitude.', true, false, 'MOBILITY']),
  bundled(['rotacao_toracica', 'Rotação torácica em quatro apoios', ['rotacao coluna', 'thread the needle'], 'Mobilidade', ['Costas', 'Ombros'], 'Sem equipamento', 'MOBILITY', 'Iniciante', 'Rotação controlada da parte alta das costas.', 'Em quatro apoios, leve uma mão por baixo do tronco e depois abra o braço para o teto.', true, false, 'MOBILITY']),
  bundled(['alongamento_flexores_quadril', 'Alongamento de flexores do quadril', ['alongamento psoas', 'afundo ajoelhado'], 'Mobilidade', ['Quadríceps', 'Glúteos'], 'Sem equipamento', 'STRETCHING', 'Iniciante', 'Posição sustentada para a frente do quadril.', 'Ajoelhe uma perna, avance o quadril suavemente e mantenha o tronco ereto.', true, true, 'MOBILITY']),
  bundled(['escalador', 'Escalador', ['mountain climber', 'corrida na prancha'], 'Condicionamento', ['Core', 'Ombros', 'Quadríceps'], 'Peso corporal', 'CARDIO', 'Intermediário', 'Alternância dinâmica dos joelhos em posição de prancha.', 'Na prancha alta, leve um joelho de cada vez ao peito mantendo as mãos firmes.', false, true, 'CARDIO']),
  bundled(['polichinelo', 'Polichinelo', ['jumping jack', 'saltos abrindo pernas'], 'Condicionamento', ['Ombros', 'Panturrilhas'], 'Sem equipamento', 'CARDIO', 'Iniciante', 'Saltos coordenados com abertura de pernas e braços.', 'Salte abrindo pernas e elevando os braços, depois retorne à posição inicial.', false, true, 'CARDIO']),
  bundled(['corrida_estacionaria', 'Corrida estacionária', ['corrida parada', 'jogging no lugar'], 'Condicionamento', ['Quadríceps', 'Panturrilhas'], 'Sem equipamento', 'CARDIO', 'Iniciante', 'Corrida leve sem deslocamento para elevar o ritmo.', 'Alterne os pés no lugar, mantenha postura confortável e use os braços naturalmente.', false, true, 'CARDIO']),
  bundled(['farmer_walk_halteres', 'Caminhada do fazendeiro com halteres', ['farmer walk', 'caminhada com pesos'], 'Condicionamento', ['Antebraços', 'Core', 'Ombros'], 'Halteres', 'ENDURANCE', 'Iniciante', 'Caminhada carregada para pegada e estabilidade global.', 'Segure um halter em cada mão, mantenha o tronco alto e caminhe com passos controlados.', false, true, 'EQUIPMENT']),
])

export const EXERCISE_PACKS = Object.freeze([
  Object.freeze({ id: 'GYM_START', name: 'Começar na academia', slugs: Object.freeze(['supino_reto_halteres', 'puxada_frente_maquina', 'leg_press', 'desenvolvimento_halteres', 'rosca_direta_barra', 'triceps_polia']) }),
  Object.freeze({ id: 'HOME', name: 'Treino em casa', slugs: Object.freeze(['flexao_bracos', 'agachamento_livre', 'avanco_alternado', 'ponte_gluteos', 'prancha_frontal', 'polichinelo']) }),
  Object.freeze({ id: 'MOBILITY', name: 'Mobilidade e recuperação', slugs: Object.freeze(['face_pull_elastico', 'bird_dog', 'mobilidade_quadril_90_90', 'rotacao_toracica', 'alongamento_flexores_quadril']) }),
  Object.freeze({ id: 'CONDITIONING', name: 'Condicionamento', slugs: Object.freeze(['escalador', 'polichinelo', 'corrida_estacionaria', 'farmer_walk_halteres']) }),
] as const)

interface SearchableExercise {
  name: string
  normalizedName: string
  aliases: readonly string[]
  primaryMuscleGroup: string
  secondaryMuscleGroups: readonly string[]
  equipment: string
}

export function exerciseSearchScore(
  exercise: SearchableExercise,
  query: string,
) {
  const normalized = normalizeName(query)
  if (!normalized) return 1
  if (exercise.normalizedName === normalized) return 500
  if (exercise.normalizedName.startsWith(normalized)) return 400
  const aliases = exercise.aliases.map(normalizeName)
  if (aliases.some((alias) => alias === normalized)) return 350
  if (aliases.some((alias) => alias.startsWith(normalized))) return 300
  if (exercise.normalizedName.includes(normalized) || aliases.some((alias) => alias.includes(normalized))) return 200
  const metadata = [
    exercise.primaryMuscleGroup,
    ...exercise.secondaryMuscleGroups,
    exercise.equipment,
  ].map(normalizeName)
  return metadata.some((value) => value.includes(normalized)) ? 100 : 0
}

export function rankExerciseSearch<T extends SearchableExercise>(
  exercises: readonly T[],
  query: string,
) {
  return exercises
    .map((exercise) => ({ exercise, score: exerciseSearchScore(exercise, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'pt-BR'))
    .map((item) => item.exercise)
}
