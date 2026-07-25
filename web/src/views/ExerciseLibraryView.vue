<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import type { ExerciseCategory, ExerciseDefinition, ExerciseDefinitionInput } from '../models/training'

const props = defineProps<{ exercises: ExerciseDefinition[]; loading: boolean }>()
const emit = defineEmits<{ create: [payload: ExerciseDefinitionInput]; archive: [id: number] }>()
const query = ref('')
const muscle = ref('')
const equipment = ref('')
const category = ref('')
const showForm = ref(false)
const categories: { value: ExerciseCategory; label: string }[] = [
  { value: 'STRENGTH', label: 'Força' }, { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'ENDURANCE', label: 'Resistência' }, { value: 'CARDIO', label: 'Cardio' },
  { value: 'MOBILITY', label: 'Mobilidade' }, { value: 'STRETCHING', label: 'Alongamento' },
  { value: 'TECHNIQUE', label: 'Técnica' }, { value: 'RECOVERY', label: 'Recuperação' },
]
const filtered = computed(() => props.exercises.filter((item) => {
  const text = `${item.name} ${item.primaryMuscleGroup}`.toLocaleLowerCase()
  return !item.archived
    && text.includes(query.value.toLocaleLowerCase().trim())
    && (!muscle.value || item.primaryMuscleGroup === muscle.value)
    && (!equipment.value || item.equipment === equipment.value)
    && (!category.value || item.category === category.value)
}))
const muscles = computed(() => [...new Set(props.exercises.map((item) => item.primaryMuscleGroup))].sort())
const equipments = computed(() => [...new Set(props.exercises.map((item) => item.equipment))].sort())
const form = reactive<ExerciseDefinitionInput>({
  name: '', description: '', primaryMuscleGroup: '', secondaryMuscleGroups: [], equipment: '',
  category: 'STRENGTH', difficulty: 'Iniciante', instructions: '', notes: '', mediaUrl: '',
  unilateral: false, timed: false,
})
function submit() {
  emit('create', { ...form, secondaryMuscleGroups: [...form.secondaryMuscleGroups] })
  showForm.value = false
  form.name = ''; form.description = ''; form.primaryMuscleGroup = ''; form.equipment = ''; form.instructions = ''
}
</script>

<template>
  <div>
    <AppHeader eyebrow="Catálogo reutilizável" title="Biblioteca de exercícios" description="Cadastre uma vez, pesquise e reutilize em qualquer ficha.">
      <button class="primary-action tap hidden rounded-2xl px-4 text-xs font-bold sm:block" @click="showForm = true">＋ Novo exercício</button>
    </AppHeader>
    <section class="card mb-4 grid gap-2 p-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <input v-model="query" class="field" placeholder="Buscar por nome..." />
      <select v-model="muscle" class="field"><option value="">Todos os músculos</option><option v-for="item in muscles" :key="item">{{ item }}</option></select>
      <select v-model="equipment" class="field"><option value="">Equipamentos</option><option v-for="item in equipments" :key="item">{{ item }}</option></select>
      <select v-model="category" class="field"><option value="">Categorias</option><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select>
    </section>
    <div v-if="!filtered.length" class="card grid min-h-64 place-items-center text-center"><div><p class="font-semibold">Nenhum exercício encontrado</p><p class="mt-2 text-xs text-neutral-500">Ajuste os filtros ou crie um exercício personalizado.</p></div></div>
    <section v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="exercise in filtered" :key="exercise.id" class="card group p-4 transition hover:-translate-y-0.5">
        <div class="flex items-start justify-between">
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-950 text-white"><AppIcon name="dumbbell" :size="19" /></span>
          <span class="rounded-full bg-neutral-100 px-2 py-1 text-[8px] font-bold text-neutral-500">{{ categories.find(item => item.value === exercise.category)?.label }}</span>
        </div>
        <h2 class="mt-4 text-sm font-semibold">{{ exercise.name }}</h2>
        <p class="mt-1 text-[10px] text-neutral-500">{{ exercise.primaryMuscleGroup }} · {{ exercise.equipment }}</p>
        <p class="mt-3 line-clamp-2 min-h-8 text-[10px] leading-relaxed text-neutral-400">{{ exercise.description || 'Sem descrição cadastrada.' }}</p>
        <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
          <span class="text-[9px] text-neutral-500">{{ exercise.timed ? 'Por duração' : 'Por repetições' }} · {{ exercise.difficulty }}</span>
          <button v-if="exercise.custom" class="tap rounded-xl text-[9px] font-bold text-red-500" @click="emit('archive', exercise.id)">Arquivar</button>
        </div>
      </article>
    </section>
    <button class="primary-action tap fixed bottom-[104px] right-4 z-30 grid h-14 w-14 place-items-center rounded-[20px] sm:hidden" @click="showForm = true">＋</button>
    <Transition name="sheet"><div v-if="showForm" class="fixed inset-0 z-50 flex items-end bg-black/55 md:items-stretch md:justify-end" @click.self="showForm = false"><section class="max-h-[94dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 md:max-w-xl md:rounded-none md:p-7"><h2 class="text-2xl font-semibold">Exercício personalizado</h2><p class="mt-1 text-xs text-neutral-500">Nomes equivalentes são detectados para evitar duplicatas.</p><form class="mt-6" @submit.prevent="submit"><div class="grid gap-3 sm:grid-cols-2"><div><label class="label">Nome</label><input v-model="form.name" required class="field" /></div><div><label class="label">Grupo principal</label><input v-model="form.primaryMuscleGroup" required class="field" /></div><div><label class="label">Equipamento</label><input v-model="form.equipment" required class="field" placeholder="Peso corporal, barra..." /></div><div><label class="label">Categoria</label><select v-model="form.category" class="field"><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select></div><div><label class="label">Dificuldade</label><select v-model="form.difficulty" class="field"><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select></div><div class="flex items-center gap-4 pt-6 text-xs"><label><input v-model="form.unilateral" type="checkbox" /> Unilateral</label><label><input v-model="form.timed" type="checkbox" /> Por duração</label></div><div class="sm:col-span-2"><label class="label">Descrição</label><textarea v-model="form.description" class="field" rows="2" /></div><div class="sm:col-span-2"><label class="label">Instruções</label><textarea v-model="form.instructions" class="field" rows="4" /></div></div><button :disabled="loading" class="primary-action tap mt-5 w-full rounded-2xl text-sm font-bold disabled:opacity-40">Salvar na biblioteca</button></form></section></div></Transition>
  </div>
</template>
