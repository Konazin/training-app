<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/StatusPill.vue'
import type { CustomStats, Workout, WorkoutInput, WorkoutStatus } from '../models/training'

const props = defineProps<{
  workouts: Workout[]
  loading: boolean
}>()

const emit = defineEmits<{
  create: [payload: WorkoutInput]
  remove: [id: number]
  selectExercise: [id: number]
}>()

type Filter = 'ALL' | WorkoutStatus

const showForm = ref(false)
const showAdvanced = ref(false)
const formError = ref('')
const filter = ref<Filter>('ALL')
const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PLANNED', label: 'Planejados' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluídos' },
]

const filteredWorkouts = computed(() =>
  filter.value === 'ALL'
    ? props.workouts
    : props.workouts.filter((item) => item.status === filter.value),
)

const form = reactive({
  name: '',
  description: '',
  scheduledDate: new Date().toISOString().slice(0, 10),
  status: 'PLANNED' as WorkoutStatus,
  durationMinutes: 45,
  calories: 0,
  customStats: '{\n  "intensidade": "moderada"\n}',
})

function submit() {
  try {
    const customStats = JSON.parse(form.customStats || '{}') as CustomStats
    if (!customStats || Array.isArray(customStats) || typeof customStats !== 'object') throw new Error()
    formError.value = ''
    emit('create', {
      name: form.name,
      description: form.description,
      scheduledDate: form.scheduledDate,
      status: form.status,
      durationMinutes: Number(form.durationMinutes),
      calories: Number(form.calories),
      customStats,
    })
    showForm.value = false
    showAdvanced.value = false
    form.name = ''
    form.description = ''
  } catch {
    formError.value = 'Use um objeto JSON válido nas estatísticas.'
  }
}

function requestRemoval(workout: Workout) {
  if (window.confirm(`Remover o treino “${workout.name}”? Esta ação não poderá ser desfeita.`)) {
    emit('remove', workout.id)
  }
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replace(/\./g, '')
}
</script>

<template>
  <div>
    <AppHeader
      eyebrow="Planejamento"
      title="Seus treinos"
      description="Organize a semana e mantenha cada sessão pronta para começar."
    >
      <button
        class="tap hidden items-center gap-2 rounded-2xl bg-neutral-950 px-4 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:flex"
        @click="showForm = true"
      >
        <AppIcon name="plus" :size="17" />
        Novo treino
      </button>
    </AppHeader>

    <div class="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <button
        v-for="item in filters"
        :key="item.value"
        class="tap shrink-0 rounded-2xl border px-4 text-xs font-bold transition active:scale-95"
        :class="filter === item.value
          ? 'border-neutral-950 bg-neutral-950 text-white'
          : 'border-black/[0.07] bg-white text-neutral-500 hover:border-neutral-300'"
        @click="filter = item.value"
      >
        {{ item.label }}
        <span
          v-if="item.value !== 'ALL'"
          class="ml-1 rounded-full px-1.5 py-0.5 text-[9px]"
          :class="filter === item.value ? 'bg-white/15' : 'bg-neutral-100'"
        >
          {{ workouts.filter((workout) => workout.status === item.value).length }}
        </span>
      </button>
    </div>

    <div v-if="loading && !workouts.length" class="space-y-3">
      <div v-for="index in 3" :key="index" class="skeleton h-40 rounded-[22px]" />
    </div>

    <div v-else-if="!filteredWorkouts.length" class="card flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
      <span class="grid h-16 w-16 place-items-center rounded-[22px] bg-neutral-100 text-neutral-500">
        <AppIcon name="workouts" :size="26" />
      </span>
      <h2 class="mt-5 text-lg font-semibold">Nada por aqui ainda</h2>
      <p class="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
        {{ filter === 'ALL' ? 'Crie seu primeiro treino e comece a construir sua rotina.' : 'Nenhum treino corresponde a este filtro.' }}
      </p>
      <button v-if="filter === 'ALL'" class="tap mt-5 rounded-2xl bg-neutral-950 px-5 text-xs font-bold text-white" @click="showForm = true">
        Criar primeiro treino
      </button>
    </div>

    <div v-else class="grid gap-3 lg:grid-cols-2">
      <article
        v-for="workout in filteredWorkouts"
        :key="workout.id"
        class="card group overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(0,0,0,.07)]"
      >
        <div class="p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-white">
              <AppIcon name="dumbbell" :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[10px] font-semibold capitalize text-neutral-400">{{ formatDate(workout.scheduledDate) }}</p>
                  <h2 class="mt-1 truncate text-base font-semibold tracking-[-0.02em]">{{ workout.name }}</h2>
                </div>
                <StatusPill :status="workout.status" />
              </div>
              <p class="mt-2 line-clamp-2 min-h-9 text-xs leading-relaxed text-neutral-500">
                {{ workout.description || 'Sem observações para esta sessão.' }}
              </p>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-3 divide-x divide-neutral-100 rounded-2xl bg-[#f5f4f1] py-3">
            <div class="px-3">
              <strong class="block text-sm">{{ workout.durationMinutes }}</strong>
              <span class="mt-0.5 block text-[9px] text-neutral-400">minutos</span>
            </div>
            <div class="px-3">
              <strong class="block text-sm">{{ workout.exercises.length }}</strong>
              <span class="mt-0.5 block text-[9px] text-neutral-400">exercícios</span>
            </div>
            <div class="px-3">
              <strong class="block text-sm">{{ workout.calories }}</strong>
              <span class="mt-0.5 block text-[9px] text-neutral-400">kcal</span>
            </div>
          </div>

          <details v-if="workout.exercises.length || Object.keys(workout.customStats).length" class="mt-3">
            <summary class="tap flex list-none cursor-pointer items-center justify-between rounded-xl px-1 text-[11px] font-bold text-neutral-500">
              Detalhes da sessão
              <span class="text-lg font-light">+</span>
            </summary>
            <div class="space-y-2 border-t border-neutral-100 pt-3">
              <div v-for="exercise in workout.exercises.slice(0, 3)" :key="exercise.id" class="flex items-center justify-between text-xs">
                <span class="text-neutral-600">{{ exercise.name }}</span>
                <span class="text-[10px] text-neutral-400">{{ exercise.sets }} × {{ exercise.reps }} · {{ exercise.weightKg }} kg</span>
              </div>
              <code v-if="Object.keys(workout.customStats).length" class="block overflow-hidden text-ellipsis text-[9px] text-neutral-400">
                {{ JSON.stringify(workout.customStats) }}
              </code>
            </div>
          </details>
        </div>

        <div class="flex items-center gap-2 border-t border-neutral-100 bg-[#fcfcfa] p-2.5">
          <button
            class="tap flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-3 text-xs font-bold text-white transition active:scale-[.98]"
            @click="emit('selectExercise', workout.id)"
          >
            <AppIcon name="plus" :size="15" />
            Adicionar exercício
          </button>
          <button
            class="tap grid place-items-center rounded-2xl text-neutral-400 transition hover:bg-red-50 hover:text-red-700"
            :aria-label="`Remover ${workout.name}`"
            @click="requestRemoval(workout)"
          >
            <AppIcon name="trash" :size="17" />
          </button>
        </div>
      </article>
    </div>

    <button
      class="tap fixed bottom-[104px] right-4 z-30 grid h-14 w-14 place-items-center rounded-[20px] bg-neutral-950 text-white shadow-[0_14px_35px_rgba(0,0,0,.28)] active:scale-95 sm:hidden"
      aria-label="Criar novo treino"
      @click="showForm = true"
    >
      <AppIcon name="plus" :size="22" />
    </button>

    <Transition name="sheet">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[2px] md:items-stretch md:justify-end"
        role="presentation"
        @click.self="showForm = false"
      >
        <section
          class="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 pb-[max(24px,env(safe-area-inset-bottom))] md:max-h-none md:max-w-lg md:rounded-none md:p-7"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-workout-title"
        >
          <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200 md:hidden" />
          <div class="mb-6 flex items-start justify-between">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-400">Novo planejamento</p>
              <h2 id="new-workout-title" class="mt-2 text-2xl font-semibold tracking-[-0.04em]">Criar treino</h2>
              <p class="mt-1.5 text-xs text-neutral-500">Comece pelo essencial. Você pode enriquecer depois.</p>
            </div>
            <button class="tap grid place-items-center rounded-2xl bg-neutral-100 text-neutral-500" aria-label="Fechar" @click="showForm = false">
              <AppIcon name="close" :size="18" />
            </button>
          </div>

          <form @submit.prevent="submit">
            <div>
              <label class="label" for="workout-name">Nome do treino</label>
              <input id="workout-name" v-model="form.name" autofocus required maxlength="120" class="field" placeholder="Ex.: Força — pernas" />
            </div>
            <div class="mt-4">
              <label class="label" for="description">Objetivo ou observações</label>
              <textarea id="description" v-model="form.description" maxlength="500" rows="2" class="field resize-none" placeholder="Como você quer conduzir esta sessão?" />
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="date">Data</label>
                <input id="date" v-model="form.scheduledDate" required type="date" class="field" />
              </div>
              <div>
                <label class="label" for="duration">Duração</label>
                <div class="relative">
                  <input id="duration" v-model="form.durationMinutes" min="0" required type="number" class="field pr-12" />
                  <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">min</span>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <span class="label">Status inicial</span>
              <div class="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1">
                <button
                  v-for="item in filters.slice(1)"
                  :key="item.value"
                  type="button"
                  class="tap rounded-xl px-2 text-[10px] font-bold transition"
                  :class="form.status === item.value ? 'bg-white text-black shadow-sm' : 'text-neutral-400'"
                  @click="form.status = item.value as WorkoutStatus"
                >
                  {{ item.value === 'IN_PROGRESS' ? 'Em curso' : item.label.replace('s', '') }}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="tap mt-4 flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 text-left"
              @click="showAdvanced = !showAdvanced"
            >
              <span>
                <strong class="block text-xs">Métricas avançadas</strong>
                <span class="mt-1 block text-[10px] text-neutral-400">Calorias e dados personalizados em JSON</span>
              </span>
              <span class="text-xl font-light">{{ showAdvanced ? '−' : '+' }}</span>
            </button>

            <div v-if="showAdvanced" class="mt-4 rounded-2xl bg-[#f7f6f3] p-4">
              <label class="label" for="calories">Calorias estimadas</label>
              <input id="calories" v-model="form.calories" min="0" required type="number" class="field bg-white" />
              <label class="label mt-4" for="workout-json">Estatísticas personalizadas (JSON)</label>
              <textarea id="workout-json" v-model="form.customStats" rows="4" class="field bg-white font-mono text-xs" />
            </div>

            <p v-if="formError" class="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{{ formError }}</p>
            <button
              :disabled="loading"
              class="tap mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 text-sm font-bold text-white transition active:scale-[.99] disabled:opacity-40"
            >
              <AppIcon name="check" :size="17" />
              {{ loading ? 'Salvando...' : 'Salvar treino' }}
            </button>
          </form>
        </section>
      </div>
    </Transition>
  </div>
</template>
