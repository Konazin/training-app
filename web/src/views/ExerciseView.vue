<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import type { CustomStats, ExerciseInput, TrainingPlan, Workout } from '../models/training'

const props = defineProps<{
  workouts: Workout[]
  trainingPlans: TrainingPlan[]
  selectedWorkoutId: number | null
  selectedPlanId: number | null
  destination: 'workout' | 'plan'
  loading: boolean
}>()

const emit = defineEmits<{
  selectWorkout: [id: number]
  selectPlan: [id: number]
  updateDestination: [value: 'workout' | 'plan']
  createWorkoutExercise: [payload: ExerciseInput]
  createPlanExercise: [payload: ExerciseInput]
  removeWorkoutExercise: [workoutId: number, exerciseId: number]
  removePlanExercise: [planId: number, exerciseId: number]
}>()

const formError = ref('')
const showAdvanced = ref(false)
const muscles = ['Peitoral', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core']
const selectedWorkout = computed(() =>
  props.workouts.find((item) => item.id === props.selectedWorkoutId),
)
const selectedPlan = computed(() =>
  props.trainingPlans.find((item) => item.id === props.selectedPlanId),
)
const selectedTarget = computed(() =>
  props.destination === 'workout' ? selectedWorkout.value : selectedPlan.value,
)
const hasDestinations = computed(() =>
  props.destination === 'workout' ? props.workouts.length > 0 : props.trainingPlans.length > 0,
)

const form = reactive({
  name: '',
  muscleGroup: '',
  sets: 3,
  reps: 10,
  weightKg: 0,
  restSeconds: 60,
  customStats: '{\n  "rir": 2\n}',
})

function submit() {
  if (props.destination === 'workout' ? !props.selectedWorkoutId : !props.selectedPlanId) {
    formError.value = `Selecione uma ${props.destination === 'workout' ? 'sessão' : 'ficha'} para continuar.`
    return
  }
  try {
    const customStats = JSON.parse(form.customStats || '{}') as CustomStats
    if (!customStats || Array.isArray(customStats) || typeof customStats !== 'object') throw new Error()
    formError.value = ''
    const payload: ExerciseInput = {
      name: form.name,
      muscleGroup: form.muscleGroup,
      sets: Number(form.sets),
      reps: Number(form.reps),
      weightKg: Number(form.weightKg),
      restSeconds: Number(form.restSeconds),
      customStats,
    }
    if (props.destination === 'workout') emit('createWorkoutExercise', payload)
    else emit('createPlanExercise', payload)
    form.name = ''
    form.muscleGroup = ''
  } catch {
    formError.value = 'Use um objeto JSON válido nas estatísticas.'
  }
}

function removeExercise(parentId: number, exerciseId: number, exerciseName: string) {
  const targetName = props.destination === 'workout' ? 'sessão' : 'ficha'
  if (window.confirm(`Remover “${exerciseName}” desta ${targetName}?`)) {
    if (props.destination === 'workout') emit('removeWorkoutExercise', parentId, exerciseId)
    else emit('removePlanExercise', parentId, exerciseId)
  }
}
</script>

<template>
  <div>
    <AppHeader
      eyebrow="Montagem de treino"
      title="Adicionar exercício"
      description="Registre agora em uma sessão ou guarde em uma ficha reutilizável."
    />

    <div class="mb-6 grid grid-cols-2 rounded-[20px] bg-neutral-200/70 p-1">
      <button
        class="tap rounded-2xl text-xs font-bold transition"
        :class="destination === 'workout' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'"
        @click="emit('updateDestination', 'workout')"
      >
        Sessão atual
      </button>
      <button
        class="tap rounded-2xl text-xs font-bold transition"
        :class="destination === 'plan' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'"
        @click="emit('updateDestination', 'plan')"
      >
        Ficha de treino
      </button>
    </div>

    <div v-if="!hasDestinations" class="card flex min-h-[340px] flex-col items-center justify-center p-8 text-center">
      <span class="grid h-16 w-16 place-items-center rounded-[22px] bg-neutral-100 text-neutral-500">
        <AppIcon :name="destination === 'workout' ? 'dumbbell' : 'plans'" :size="27" />
      </span>
      <h2 class="mt-5 text-lg font-semibold">
        Primeiro, crie {{ destination === 'workout' ? 'um treino' : 'uma ficha' }}
      </h2>
      <p class="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
        O exercício precisa de um destino para que sua rotina continue organizada.
      </p>
    </div>

    <template v-else>
      <section class="mb-5">
        <div class="mb-3 flex items-center gap-3">
          <span class="grid h-7 w-7 place-items-center rounded-full bg-neutral-950 text-[10px] font-bold text-white">1</span>
          <div>
            <h2 class="text-sm font-semibold">Escolha {{ destination === 'workout' ? 'a sessão' : 'a ficha' }}</h2>
            <p class="text-[10px] text-neutral-400">Onde este exercício será registrado?</p>
          </div>
        </div>
        <div class="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <button
            v-if="destination === 'workout'"
            v-for="workout in workouts"
            :key="workout.id"
            class="tap min-w-[210px] shrink-0 rounded-[20px] border p-3.5 text-left transition active:scale-[.98]"
            :class="selectedWorkoutId === workout.id
              ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg'
              : 'border-black/[0.07] bg-white text-neutral-950'"
            @click="emit('selectWorkout', workout.id)"
          >
            <div class="flex items-center justify-between">
              <span
                class="grid h-9 w-9 place-items-center rounded-xl"
                :class="selectedWorkoutId === workout.id ? 'bg-white/10' : 'bg-neutral-100'"
              >
                <AppIcon :name="selectedWorkoutId === workout.id ? 'check' : 'calendar'" :size="16" />
              </span>
              <span class="text-[9px]" :class="selectedWorkoutId === workout.id ? 'text-neutral-500' : 'text-neutral-400'">
                {{ workout.exercises.length }} exercícios
              </span>
            </div>
            <strong class="mt-3 block truncate text-sm">{{ workout.name }}</strong>
            <span class="mt-1 block text-[10px]" :class="selectedWorkoutId === workout.id ? 'text-neutral-500' : 'text-neutral-400'">
              {{ workout.scheduledDate.split('-').reverse().join('/') }}
            </span>
          </button>
          <button
            v-else
            v-for="plan in trainingPlans"
            :key="plan.id"
            class="tap min-w-[210px] shrink-0 rounded-[20px] border p-3.5 text-left transition active:scale-[.98]"
            :class="selectedPlanId === plan.id
              ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg'
              : 'border-black/[0.07] bg-white text-neutral-950'"
            @click="emit('selectPlan', plan.id)"
          >
            <div class="flex items-center justify-between">
              <span class="grid h-9 w-9 place-items-center rounded-xl" :class="selectedPlanId === plan.id ? 'bg-white/10' : 'bg-neutral-100'">
                <AppIcon :name="selectedPlanId === plan.id ? 'check' : 'plans'" :size="16" />
              </span>
              <span class="text-[9px]" :class="selectedPlanId === plan.id ? 'text-neutral-500' : 'text-neutral-400'">
                {{ plan.exercises.length }} exercícios
              </span>
            </div>
            <strong class="mt-3 block truncate text-sm">{{ plan.name }}</strong>
            <span class="mt-1 block text-[10px]" :class="selectedPlanId === plan.id ? 'text-neutral-500' : 'text-neutral-400'">
              {{ plan.category }} · {{ plan.difficulty }}
            </span>
          </button>
        </div>
      </section>

      <section class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="grid h-7 w-7 place-items-center rounded-full bg-neutral-950 text-[10px] font-bold text-white">2</span>
            <div>
              <h2 class="text-sm font-semibold">{{ destination === 'workout' ? 'Registre a execução' : 'Defina o exercício' }}</h2>
              <p class="text-[10px] text-neutral-400">Os campos mais usados vêm primeiro.</p>
            </div>
          </div>

          <form class="card p-4 sm:p-6" @submit.prevent="submit">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="exercise-name">Nome do exercício</label>
                <input id="exercise-name" v-model="form.name" required class="field" placeholder="Ex.: Remada baixa" />
              </div>
              <div>
                <label class="label" for="muscle">Grupo muscular</label>
                <input id="muscle" v-model="form.muscleGroup" required class="field" placeholder="Ex.: Costas" />
              </div>
            </div>

            <div class="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              <button
                v-for="muscle in muscles"
                :key="muscle"
                type="button"
                class="tap shrink-0 rounded-2xl border px-3 text-[10px] font-bold transition"
                :class="form.muscleGroup === muscle ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 text-neutral-500'"
                @click="form.muscleGroup = muscle"
              >
                {{ muscle }}
              </button>
            </div>

            <div class="mt-4 grid grid-cols-3 gap-2.5">
              <div>
                <label class="label" for="sets">Séries</label>
                <input id="sets" v-model="form.sets" required min="1" inputmode="numeric" type="number" class="field px-3 text-center text-lg font-bold" />
              </div>
              <div>
                <label class="label" for="reps">Repetições</label>
                <input id="reps" v-model="form.reps" required min="1" inputmode="numeric" type="number" class="field px-3 text-center text-lg font-bold" />
              </div>
              <div>
                <label class="label" for="weight">Carga kg</label>
                <input id="weight" v-model="form.weightKg" required min="0" step="0.25" inputmode="decimal" type="number" class="field px-3 text-center text-lg font-bold" />
              </div>
            </div>

            <button
              type="button"
              class="tap mt-4 flex w-full items-center justify-between rounded-2xl bg-[#f5f4f1] px-4 text-left"
              @click="showAdvanced = !showAdvanced"
            >
              <span>
                <strong class="block text-xs">Ajustes avançados</strong>
                <span class="mt-1 block text-[10px] text-neutral-400">Descanso e estatísticas personalizadas</span>
              </span>
              <span class="text-xl font-light">{{ showAdvanced ? '−' : '+' }}</span>
            </button>

            <div v-if="showAdvanced" class="mt-4 grid gap-4 rounded-2xl border border-neutral-100 p-4">
              <div>
                <label class="label" for="rest">Descanso entre séries</label>
                <div class="relative">
                  <input id="rest" v-model="form.restSeconds" required min="0" type="number" class="field pr-12" />
                  <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">seg</span>
                </div>
              </div>
              <div>
                <label class="label" for="exercise-json">Estatísticas personalizadas (JSON)</label>
                <textarea id="exercise-json" v-model="form.customStats" rows="4" class="field font-mono text-xs" />
              </div>
            </div>

            <p v-if="formError" class="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{{ formError }}</p>
            <button
              :disabled="loading"
              class="tap mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 text-sm font-bold text-white transition active:scale-[.99] disabled:opacity-40"
            >
              <AppIcon name="plus" :size="17" />
              {{ loading ? 'Adicionando...' : `Adicionar à ${destination === 'workout' ? 'sessão' : 'ficha'}` }}
            </button>
          </form>
        </div>

        <aside>
          <div class="mb-3 flex items-center gap-3">
            <span class="grid h-7 w-7 place-items-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-500">3</span>
            <div>
              <h2 class="text-sm font-semibold">Revise {{ destination === 'workout' ? 'a sessão' : 'a ficha' }}</h2>
              <p class="text-[10px] text-neutral-400">Confira a ordem e os números.</p>
            </div>
          </div>

          <div class="card overflow-hidden">
            <div class="flex items-center justify-between border-b border-neutral-100 p-4">
              <div class="min-w-0">
                <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">{{ destination === 'workout' ? 'Sessão atual' : 'Ficha selecionada' }}</p>
                <h3 class="mt-1 truncate text-sm font-semibold">{{ selectedTarget?.name ?? 'Selecione um destino' }}</h3>
              </div>
              <span class="rounded-full bg-neutral-100 px-2.5 py-1 text-[9px] font-bold text-neutral-500">
                {{ selectedTarget?.exercises.length ?? 0 }}
              </span>
            </div>

            <div v-if="!selectedTarget?.exercises.length" class="flex min-h-[170px] flex-col items-center justify-center p-6 text-center">
              <span class="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
                <AppIcon name="plus" :size="19" />
              </span>
              <p class="mt-3 text-xs font-semibold">{{ destination === 'workout' ? 'A sessão' : 'A ficha' }} está vazia</p>
              <p class="mt-1 text-[10px] text-neutral-400">O próximo exercício aparecerá aqui.</p>
            </div>

            <ol v-else class="divide-y divide-neutral-100">
              <li
                v-for="(exercise, index) in selectedTarget?.exercises"
                :key="exercise.id"
                class="group flex items-center gap-3 p-3.5"
              >
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-[10px] font-extrabold text-neutral-500">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold">{{ exercise.name }}</p>
                  <p class="mt-1 text-[10px] text-neutral-400">
                    {{ exercise.sets }} séries · {{ exercise.reps }} reps · {{ exercise.weightKg }} kg
                  </p>
                </div>
                <button
                  class="tap grid place-items-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-700"
                  :aria-label="`Remover ${exercise.name}`"
                  @click="removeExercise(selectedTarget!.id, exercise.id, exercise.name)"
                >
                  <AppIcon name="trash" :size="15" />
                </button>
              </li>
            </ol>

            <div v-if="selectedTarget?.exercises.length" class="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-[#fafaf8] py-3 text-center">
              <div>
                <strong class="text-xs">{{ selectedTarget.exercises.reduce((sum, item) => sum + item.sets, 0) }}</strong>
                <span class="mt-0.5 block text-[8px] text-neutral-400">séries</span>
              </div>
              <div>
                <strong class="text-xs">{{ selectedTarget.exercises.reduce((sum, item) => sum + item.sets * item.reps, 0) }}</strong>
                <span class="mt-0.5 block text-[8px] text-neutral-400">repetições</span>
              </div>
              <div>
                <strong class="text-xs">{{ selectedTarget.exercises.reduce((sum, item) => sum + item.restSeconds, 0) }}</strong>
                <span class="mt-0.5 block text-[8px] text-neutral-400">seg descanso</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </template>
  </div>
</template>
