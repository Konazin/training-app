<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import type {
  DayExerciseInput,
  ExerciseDefinition,
  SetType,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanInput,
} from '../models/training'

const props = defineProps<{
  plans: TrainingPlan[]
  library: ExerciseDefinition[]
  selectedPlanId: number | null
  loading: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  create: [payload: TrainingPlanInput]
  activate: [id: number]
  duplicate: [id: number]
  archive: [id: number]
  updateDay: [planId: number, day: TrainingPlanDay, restDay?: boolean]
  addExercise: [planId: number, dayId: number, payload: DayExerciseInput]
  removeExercise: [planId: number, dayId: number, exerciseId: number]
  addRestActivity: [planId: number, dayId: number, payload: { name: string; description: string; estimatedDurationMinutes: number; category: string; optional: boolean }]
  removeRestActivity: [planId: number, dayId: number, activityId: number]
  startSession: [planId: number, dayId: number]
}>()

const weekdays: Record<string, string> = {
  MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta', THURSDAY: 'Quinta',
  FRIDAY: 'Sexta', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
}
const showCreate = ref(false)
const selectedDayId = ref<number | null>(null)
const selectedPlan = computed(() => props.plans.find((plan) => plan.id === props.selectedPlanId) ?? props.plans[0])
const selectedDay = computed(() =>
  selectedPlan.value?.days.find((day) => day.id === selectedDayId.value) ?? selectedPlan.value?.days[0],
)
watch(selectedPlan, (plan) => {
  if (plan && !plan.days.some((day) => day.id === selectedDayId.value)) selectedDayId.value = plan.days[0]?.id ?? null
}, { immediate: true })

const planForm = reactive({ name: '', description: '', category: 'Força', difficulty: 'Iniciante' })
const exerciseForm = reactive({
  exerciseDefinitionId: 0,
  sets: 3,
  minReps: 8,
  maxReps: 12,
  plannedLoad: 0,
  plannedDurationSeconds: null as number | null,
  plannedDistance: null as number | null,
  restSeconds: 60,
  plannedRpe: null as number | null,
  setType: 'NORMAL' as SetType,
  notes: '',
  alternativeExerciseId: null,
})
const restForm = reactive({ name: '', description: '', estimatedDurationMinutes: 15, category: 'Recuperação ativa', optional: true })
const editingDay = reactive({ title: '', description: '', estimatedDurationMinutes: 0, notes: '' })
watch(selectedDay, (day) => {
  if (!day) return
  editingDay.title = day.title
  editingDay.description = day.description
  editingDay.estimatedDurationMinutes = day.estimatedDurationMinutes
  editingDay.notes = day.notes
}, { immediate: true })

function createPlan() {
  emit('create', { ...planForm })
  showCreate.value = false
  planForm.name = ''
  planForm.description = ''
}

function saveDay(restDay = selectedDay.value?.restDay ?? false) {
  if (!selectedPlan.value || !selectedDay.value) return
  emit('updateDay', selectedPlan.value.id, { ...selectedDay.value, ...editingDay }, restDay)
}

function addExercise() {
  if (!selectedPlan.value || !selectedDay.value || !exerciseForm.exerciseDefinitionId) return
  emit('addExercise', selectedPlan.value.id, selectedDay.value.id, { ...exerciseForm })
}

function addRestActivity() {
  if (!selectedPlan.value || !selectedDay.value || !restForm.name.trim()) return
  emit('addRestActivity', selectedPlan.value.id, selectedDay.value.id, { ...restForm })
  restForm.name = ''
  restForm.description = ''
}
</script>

<template>
  <div>
    <AppHeader eyebrow="Planejamento semanal" title="Fichas completas" description="Planeje os sete dias, preserve descansos e inicie sessões com registros reais.">
      <button class="primary-action tap hidden rounded-2xl px-4 text-xs font-bold sm:block" @click="showCreate = true">＋ Nova ficha</button>
    </AppHeader>

    <div v-if="!plans.length" class="card grid min-h-[340px] place-items-center p-8 text-center">
      <div><p class="text-lg font-semibold">Você ainda não possui uma ficha ativa.</p><p class="mt-2 text-sm text-neutral-500">Crie uma semana para definir treinos e descansos.</p><button class="primary-action tap mt-5 rounded-2xl px-5 text-xs font-bold" @click="showCreate = true">Criar ficha</button></div>
    </div>

    <template v-else>
      <div class="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <button v-for="plan in plans.filter(item => !item.archived)" :key="plan.id" class="tap shrink-0 rounded-2xl border px-4 text-left" :class="selectedPlan?.id === plan.id ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white'" @click="emit('select', plan.id)">
          <span class="block text-xs font-bold">{{ plan.name }}</span>
          <span class="mt-1 block text-[9px] text-neutral-400">{{ plan.active ? '● Ficha ativa' : plan.category }}</span>
        </button>
      </div>

      <section v-if="selectedPlan" class="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="card overflow-hidden p-3">
          <div class="p-2">
            <span v-if="selectedPlan.active" class="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-800">ATIVA</span>
            <h2 class="mt-3 text-lg font-semibold">{{ selectedPlan.name }}</h2>
            <p class="mt-1 text-[10px] leading-relaxed text-neutral-500">{{ selectedPlan.description }}</p>
          </div>
          <div class="mt-3 space-y-1">
            <button v-for="day in selectedPlan.days" :key="day.id" class="tap flex w-full items-center gap-3 rounded-2xl px-3 text-left" :class="selectedDay?.id === day.id ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100'" @click="selectedDayId = day.id">
              <span class="grid h-8 w-8 place-items-center rounded-xl text-[10px] font-bold" :class="day.restDay ? 'bg-sky-100 text-sky-800' : 'bg-neutral-100 text-neutral-600'">{{ day.sortOrder }}</span>
              <span class="min-w-0 flex-1"><strong class="block text-xs">{{ weekdays[day.weekday] }}</strong><small class="block truncate text-[9px] opacity-60">{{ day.restDay ? 'Descanso' : day.title || 'Treino a definir' }}</small></span>
            </button>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
            <button v-if="!selectedPlan.active" class="tap rounded-xl bg-neutral-100 text-[9px] font-bold" @click="emit('activate', selectedPlan.id)">Ativar</button>
            <button class="tap rounded-xl bg-neutral-100 text-[9px] font-bold" @click="emit('duplicate', selectedPlan.id)">Duplicar</button>
            <button class="tap rounded-xl text-[9px] font-bold text-red-600" @click="emit('archive', selectedPlan.id)">Arquivar</button>
          </div>
        </aside>

        <main v-if="selectedDay" class="min-w-0">
          <div class="card p-4 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><p class="text-[9px] font-bold uppercase tracking-[.15em] text-neutral-400">{{ weekdays[selectedDay.weekday] }}</p><h2 class="mt-1 text-xl font-semibold">{{ selectedDay.restDay ? 'Dia de descanso' : 'Dia de treino' }}</h2></div>
              <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl bg-neutral-100 px-3 text-[10px] font-bold"><input type="checkbox" :checked="selectedDay.restDay" @change="saveDay(($event.target as HTMLInputElement).checked)" /> Marcar como descanso</label>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div><label class="label">Título do dia</label><input v-model="editingDay.title" class="field" placeholder="Ex.: Membros superiores" /></div>
              <div><label class="label">Duração estimada</label><input v-model.number="editingDay.estimatedDurationMinutes" class="field" min="0" type="number" /></div>
              <div class="sm:col-span-2"><label class="label">Descrição</label><textarea v-model="editingDay.description" class="field" rows="2" /></div>
            </div>
            <button class="tap mt-3 rounded-xl border border-neutral-200 px-4 text-[10px] font-bold" @click="saveDay()">Salvar informações</button>
          </div>

          <div v-if="selectedDay.restDay" class="mt-4 card p-4 sm:p-6">
            <p class="text-[9px] font-bold uppercase tracking-[.15em] text-sky-600">Atividades opcionais</p>
            <p class="mt-2 text-xs text-neutral-500">Nada é obrigatório neste dia. Use apenas se ajudar na recuperação.</p>
            <div class="mt-4 space-y-2">
              <div v-for="activity in selectedDay.restActivities" :key="activity.id" class="flex items-center gap-3 rounded-2xl bg-neutral-100 p-3">
                <span class="grid h-9 w-9 place-items-center rounded-xl bg-white">○</span><div class="flex-1"><strong class="text-xs">{{ activity.name }}</strong><p class="text-[9px] text-neutral-500">{{ activity.estimatedDurationMinutes }} min · opcional</p></div>
                <button class="tap text-red-500" @click="emit('removeRestActivity', selectedPlan.id, selectedDay.id, activity.id)">×</button>
              </div>
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
              <input v-model="restForm.name" class="field" placeholder="Ex.: Mobilidade leve" />
              <input v-model.number="restForm.estimatedDurationMinutes" class="field" min="0" type="number" />
              <button class="primary-action tap rounded-2xl px-4 text-xs font-bold" @click="addRestActivity">Adicionar</button>
            </div>
          </div>

          <div v-else class="mt-4 card overflow-hidden">
            <div class="flex items-center justify-between border-b border-neutral-100 p-4 sm:p-5"><div><p class="text-[9px] font-bold uppercase tracking-[.15em] text-neutral-400">Ordem da sessão</p><h3 class="mt-1 text-base font-semibold">{{ selectedDay.exercises.length }} exercícios</h3></div><button v-if="selectedDay.exercises.length" class="primary-action tap rounded-2xl px-4 text-xs font-bold" @click="emit('startSession', selectedPlan.id, selectedDay.id)">▶ Iniciar treino</button></div>
            <div v-if="!selectedDay.exercises.length" class="grid min-h-36 place-items-center p-6 text-center text-xs text-neutral-500">Escolha um exercício da biblioteca abaixo.</div>
            <ol v-else class="divide-y divide-neutral-100">
              <li v-for="(item, index) in selectedDay.exercises" :key="item.id" class="flex items-center gap-3 p-4">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-[10px] font-bold">{{ index + 1 }}</span>
                <div class="min-w-0 flex-1"><strong class="block truncate text-xs">{{ item.exercise.name }}</strong><span class="text-[9px] text-neutral-500">{{ item.sets }} × {{ item.minReps }}–{{ item.maxReps }} · {{ item.restSeconds }}s descanso</span></div>
                <button class="tap text-red-500" @click="emit('removeExercise', selectedPlan.id, selectedDay.id, item.id)"><AppIcon name="trash" :size="15" /></button>
              </li>
            </ol>
            <div class="border-t border-neutral-100 bg-[#fafaf8] p-4">
              <div class="grid gap-2 sm:grid-cols-3">
                <select v-model.number="exerciseForm.exerciseDefinitionId" class="field sm:col-span-2"><option :value="0">Selecione da biblioteca</option><option v-for="exercise in library.filter(item => !item.archived)" :key="exercise.id" :value="exercise.id">{{ exercise.name }} · {{ exercise.primaryMuscleGroup }}</option></select>
                <select v-model="exerciseForm.setType" class="field"><option value="NORMAL">Normal</option><option value="WARM_UP">Aquecimento</option><option value="DROP_SET">Drop set</option><option value="BI_SET">Bi-set</option><option value="CIRCUIT">Circuito</option><option value="TO_FAILURE">Até a falha</option></select>
              </div>
              <div class="mt-2 grid grid-cols-4 gap-2"><input v-model.number="exerciseForm.sets" class="field px-2 text-center" min="1" type="number" title="Séries" /><input v-model.number="exerciseForm.minReps" class="field px-2 text-center" min="0" type="number" title="Repetições mínimas" /><input v-model.number="exerciseForm.maxReps" class="field px-2 text-center" min="0" type="number" title="Repetições máximas" /><input v-model.number="exerciseForm.restSeconds" class="field px-2 text-center" min="0" type="number" title="Descanso" /></div>
              <button :disabled="!exerciseForm.exerciseDefinitionId || loading" class="primary-action tap mt-3 w-full rounded-2xl text-xs font-bold disabled:opacity-40" @click="addExercise">Adicionar ao dia</button>
            </div>
          </div>
        </main>
      </section>
    </template>

    <button class="primary-action tap fixed bottom-[104px] right-4 z-30 grid h-14 w-14 place-items-center rounded-[20px] sm:hidden" @click="showCreate = true">＋</button>
    <Transition name="sheet"><div v-if="showCreate" class="fixed inset-0 z-50 flex items-end bg-black/55 md:items-stretch md:justify-end" @click.self="showCreate = false"><section class="w-full rounded-t-[28px] bg-white p-5 md:max-w-lg md:rounded-none md:p-7"><h2 class="text-2xl font-semibold">Nova ficha semanal</h2><p class="mt-1 text-xs text-neutral-500">Os sete dias serão criados automaticamente.</p><form class="mt-6" @submit.prevent="createPlan"><label class="label">Nome</label><input v-model="planForm.name" required class="field" placeholder="Base de força e condicionamento" /><label class="label mt-4">Descrição</label><textarea v-model="planForm.description" class="field" rows="3" /><div class="mt-4 grid grid-cols-2 gap-3"><input v-model="planForm.category" required class="field" placeholder="Categoria" /><select v-model="planForm.difficulty" class="field"><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select></div><button class="primary-action tap mt-5 w-full rounded-2xl text-sm font-bold">Criar semana</button></form></section></div></Transition>
  </div>
</template>
