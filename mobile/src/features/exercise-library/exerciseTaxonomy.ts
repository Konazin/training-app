/**
 * Catálogo embutido, ExerciseDB e Wger descrevem músculos e equipamentos em
 * vocabulários e idiomas diferentes. Estas funções reduzem tudo ao vocabulário
 * em português do catálogo embutido, para filtros e rótulos coerentes.
 */

const MUSCLES: Record<string, string> = {
  peito: 'Peito', chest: 'Peito', pectorals: 'Peito', 'pectoralis major': 'Peito',
  costas: 'Costas', back: 'Costas', 'upper back': 'Costas', lats: 'Costas', 'latissimus dorsi': 'Costas',
  rhomboids: 'Costas', trapezius: 'Costas', 'erector spinae': 'Costas', 'levator scapulae': 'Costas',
  ombros: 'Ombros', shoulders: 'Ombros', deltoids: 'Ombros', 'rear deltoids': 'Ombros',
  'anterior deltoid': 'Ombros', 'rotator cuff': 'Ombros',
  'bíceps': 'Bíceps', biceps: 'Bíceps', 'biceps brachii': 'Bíceps', brachialis: 'Bíceps',
  'tríceps': 'Tríceps', triceps: 'Tríceps', 'triceps brachii': 'Tríceps',
  'quadríceps': 'Quadríceps', quadriceps: 'Quadríceps', quads: 'Quadríceps', 'quadriceps femoris': 'Quadríceps',
  posteriores: 'Posteriores', hamstrings: 'Posteriores', 'biceps femoris': 'Posteriores',
  'glúteos': 'Glúteos', glutes: 'Glúteos', 'gluteus maximus': 'Glúteos',
  panturrilhas: 'Panturrilhas', calves: 'Panturrilhas', soleus: 'Panturrilhas', gastrocnemius: 'Panturrilhas',
  'tibialis anterior': 'Panturrilhas',
  core: 'Core', abdominals: 'Core', abs: 'Core', obliques: 'Core', 'rectus abdominis': 'Core',
  'obliquus externus abdominis': 'Core', 'serratus anterior': 'Core', waist: 'Core',
  antebraços: 'Antebraços', forearms: 'Antebraços', 'wrist flexors': 'Antebraços', 'wrist extensors': 'Antebraços',
  wrists: 'Antebraços', hands: 'Antebraços', 'grip muscles': 'Antebraços',
  adductors: 'Quadris', abductors: 'Quadris', 'hip flexors': 'Quadris',
  mobilidade: 'Mobilidade', condicionamento: 'Condicionamento', 'cardiovascular system': 'Condicionamento',
  cardio: 'Condicionamento',
}

const EQUIPMENT: Record<string, string> = {
  'peso corporal': 'Peso corporal', 'sem equipamento': 'Peso corporal', bodyweight: 'Peso corporal',
  'none (bodyweight exercise)': 'Peso corporal', none: 'Peso corporal',
  halter: 'Halteres', halteres: 'Halteres', dumbbell: 'Halteres',
  barra: 'Barra', barbell: 'Barra', 'olympic barbell': 'Barra', 'ez bar': 'Barra', 'sz-bar': 'Barra', 'trap bar': 'Barra',
  banco: 'Banco', bench: 'Banco', 'incline bench': 'Banco',
  'máquina': 'Máquina', machine: 'Máquina', 'leverage machine': 'Máquina', 'smith machine': 'Máquina',
  'sled machine': 'Máquina', 'stepmill machine': 'Máquina', 'elliptical machine': 'Máquina',
  'máquina de cabos': 'Cabos', cable: 'Cabos', 'cable machine': 'Cabos',
  'barra fixa': 'Barra fixa', 'pull-up bar': 'Barra fixa',
  'elástico': 'Elástico', 'resistance band': 'Elástico',
  kettlebell: 'Kettlebell',
  'swiss ball': 'Bola', 'stability ball': 'Bola', 'medicine ball': 'Bola', 'bosu ball': 'Bola',
  weighted: 'Peso adicional', assisted: 'Assistido', 'gym mat': 'Colchonete',
  'stationary bike': 'Bicicleta', rope: 'Corda', roller: 'Rolo', 'suspension trainer': 'Suspensão',
}

const UNKNOWN = new Set(['', 'não informado', 'nao informado', 'unknown'])

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

export function canonicalMuscle(value: string) {
  const key = value.trim().toLowerCase()
  if (UNKNOWN.has(key)) return 'Outros'
  return MUSCLES[key] ?? capitalize(value.trim())
}

/** Equipamentos compostos ("barbell, bench" ou "Halteres e banco") viram itens individuais. */
export function equipmentTokens(equipment: string) {
  const parts = equipment.split(/,| e |\+|\//i).map((part) => part.trim()).filter(Boolean)
  if (!parts.length || parts.every((part) => UNKNOWN.has(part.toLowerCase()))) return ['Outros']
  const tokens = parts.filter((part) => !UNKNOWN.has(part.toLowerCase())).map((part) => {
    const key = part.toLowerCase()
    return EQUIPMENT[key] ?? capitalize(part)
  })
  return [...new Set(tokens)]
}

export function equipmentLabel(equipment: string) {
  return equipmentTokens(equipment).join(' · ')
}

export const EXERCISE_SOURCE_LABELS: Record<string, string> = {
  BUNDLED: 'Embutido',
  CUSTOM: 'Meus',
  EXERCISEDB: 'ExerciseDB',
  WGER: 'Wger',
}
