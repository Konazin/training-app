<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import StatusPill from '../components/StatusPill.vue'
import type { Dashboard } from '../models/training'

const props = defineProps<{
  dashboard: Dashboard | null
  loading: boolean
}>()

const emit = defineEmits<{
  navigate: [view: 'workouts' | 'exercise' | 'plans' | 'history']
}>()

const highlightedWorkout = computed(() =>
  props.dashboard?.recentWorkouts.find((item) => item.status !== 'COMPLETED')
  ?? props.dashboard?.recentWorkouts[0],
)

const completion = computed(() => {
  if (props.dashboard?.completedSessions || props.dashboard?.adherence) return props.dashboard.adherence
  if (!props.dashboard?.totalWorkouts) return 0
  return Math.round((props.dashboard.completedWorkouts / props.dashboard.totalWorkouts) * 100)
})

const weekDays = computed(() => {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - mondayOffset + index)
    return {
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').slice(0, 3),
      day: date.getDate(),
      today: date.toDateString() === today.toDateString(),
    }
  })
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
})

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(year, month - 1, day))
    .replace('.', '')
}
</script>

<template>
  <div>
    <AppHeader
      eyebrow="Visão geral"
      :title="`${greeting}, atleta.`"
      description="Tudo que importa para manter sua rotina em movimento."
    >
      <button
        class="tap hidden items-center gap-2 rounded-2xl bg-neutral-950 px-4 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg sm:flex"
        @click="emit('navigate', 'exercise')"
      >
        <AppIcon name="plus" :size="17" />
        Registrar exercício
      </button>
    </AppHeader>

    <section v-if="loading && !dashboard" class="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
      <div class="skeleton h-[290px] rounded-[28px]" />
      <div class="skeleton h-[290px] rounded-[28px]" />
    </section>

    <section v-else class="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <article class="relative min-h-[286px] overflow-hidden rounded-[28px] bg-neutral-950 p-5 text-white sm:p-7">
        <div class="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border border-white/10" />
        <div class="pointer-events-none absolute -right-5 top-3 h-36 w-36 rounded-full border border-white/[0.06]" />
        <div class="relative flex h-full flex-col">
          <div class="flex items-center justify-between">
            <span class="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Sessão em destaque
            </span>
            <StatusPill v-if="highlightedWorkout" :status="highlightedWorkout.status" />
          </div>

          <div class="mt-8 max-w-md">
            <p class="text-xs text-neutral-500">
              {{ highlightedWorkout ? formatDate(highlightedWorkout.scheduledDate) : 'Sua próxima sessão' }}
            </p>
            <h2 class="mt-2 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-4xl">
              {{ dashboard?.nextWorkoutName ?? highlightedWorkout?.name ?? 'Crie sua primeira ficha' }}
            </h2>
            <p class="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-400">
              {{ highlightedWorkout?.description || 'Organize a rotina e deixe o próximo passo pronto para quando a motivação chegar.' }}
            </p>
          </div>

          <div class="mt-auto flex flex-wrap items-center gap-2 pt-7">
            <button
              class="tap inline-flex items-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-neutral-950 transition hover:bg-neutral-200 active:scale-[.98]"
              @click="emit('navigate', dashboard?.nextPlanDayId ? 'plans' : highlightedWorkout ? 'exercise' : 'plans')"
            >
              {{ dashboard?.nextPlanDayId ? 'Ver próximo treino' : highlightedWorkout ? 'Adicionar exercício' : 'Montar ficha' }}
              <AppIcon name="arrow" :size="16" />
            </button>
            <div v-if="highlightedWorkout" class="flex items-center gap-3 px-2 text-[11px] text-neutral-500">
              <span class="inline-flex items-center gap-1.5"><AppIcon name="clock" :size="14" /> {{ highlightedWorkout.durationMinutes }} min</span>
              <span>{{ highlightedWorkout.exercises.length }} exercícios</span>
            </div>
          </div>
        </div>
      </article>

      <article class="card flex min-h-[250px] flex-col p-5 sm:p-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Progresso geral</p>
            <h2 class="mt-2 text-lg font-semibold tracking-tight">Sua consistência</h2>
          </div>
          <div
            class="grid h-[76px] w-[76px] place-items-center rounded-full"
            :style="{ background: `conic-gradient(#111 ${completion * 3.6}deg, #ecece9 0deg)` }"
          >
            <div class="grid h-[60px] w-[60px] place-items-center rounded-full bg-white">
              <span class="text-sm font-extrabold">{{ completion }}%</span>
            </div>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-[#f4f3ef] p-3.5">
            <p class="text-[10px] text-neutral-500">Concluídos</p>
            <p class="mt-1 text-2xl font-bold tracking-[-0.04em]">{{ dashboard?.completedSessions ?? dashboard?.completedWorkouts ?? 0 }}</p>
          </div>
          <div class="rounded-2xl bg-[#f4f3ef] p-3.5">
            <p class="text-[10px] text-neutral-500">Total</p>
            <p class="mt-1 text-2xl font-bold tracking-[-0.04em]">{{ dashboard?.weeklySessions ?? dashboard?.totalWorkouts ?? 0 }}</p>
          </div>
        </div>
        <p class="mt-auto pt-5 text-xs leading-relaxed text-neutral-500">
          Cada sessão registrada constrói uma visão mais clara da sua evolução.
        </p>
      </article>
    </section>

    <section class="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
      <article class="card p-3.5 sm:flex sm:items-center sm:gap-4 sm:p-5">
        <span class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 sm:mb-0">
          <AppIcon name="clock" :size="17" />
        </span>
        <div>
          <strong class="block text-xl tracking-[-0.04em] sm:text-2xl">{{ dashboard?.totalMinutes ?? 0 }}</strong>
          <p class="mt-1 text-[10px] text-neutral-500 sm:text-xs">minutos</p>
        </div>
      </article>
      <article class="card p-3.5 sm:flex sm:items-center sm:gap-4 sm:p-5">
        <span class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 sm:mb-0">
          <AppIcon name="dumbbell" :size="17" />
        </span>
        <div>
          <strong class="block text-xl tracking-[-0.04em] sm:text-2xl">{{ dashboard?.totalExercises ?? 0 }}</strong>
          <p class="mt-1 text-[10px] text-neutral-500 sm:text-xs">exercícios</p>
        </div>
      </article>
      <article class="card p-3.5 sm:flex sm:items-center sm:gap-4 sm:p-5">
        <span class="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 sm:mb-0">
          <AppIcon name="fire" :size="17" />
        </span>
        <div>
          <strong class="block text-xl tracking-[-0.04em] sm:text-2xl">{{ dashboard?.totalCalories ?? 0 }}</strong>
          <p class="mt-1 text-[10px] text-neutral-500 sm:text-xs">kcal</p>
        </div>
      </article>
    </section>

    <section class="mt-8 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div>
        <div class="mb-3 flex items-center justify-between">
          <div>
            <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">Esta semana</p>
            <h2 class="mt-1 text-lg font-semibold tracking-tight">Ritmo da rotina</h2>
          </div>
          <AppIcon name="calendar" :size="20" />
        </div>
        <div class="card grid grid-cols-7 gap-1 p-2.5">
          <div
            v-for="day in weekDays"
            :key="`${day.label}-${day.day}`"
            class="flex min-h-[66px] flex-col items-center justify-center rounded-2xl text-center transition"
            :class="day.today ? 'bg-neutral-950 text-white shadow-lg' : 'text-neutral-400'"
          >
            <span class="text-[8px] font-bold uppercase">{{ day.label }}</span>
            <strong class="mt-1.5 text-sm">{{ day.day }}</strong>
            <span v-if="day.today" class="mt-1 h-1 w-1 rounded-full bg-white" />
          </div>
        </div>
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between">
          <div>
            <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">Histórico</p>
            <h2 class="mt-1 text-lg font-semibold tracking-tight">Treinos recentes</h2>
          </div>
          <button class="tap rounded-xl px-2 text-[11px] font-bold text-neutral-500 hover:bg-white hover:text-black" @click="emit('navigate', 'workouts')">
            Ver todos
          </button>
        </div>
        <div v-if="!dashboard?.recentWorkouts.length" class="card grid min-h-[94px] place-items-center p-5 text-sm text-neutral-500">
          Nenhum treino cadastrado ainda.
        </div>
        <div v-else class="space-y-2.5">
          <button
            v-for="(workout, index) in dashboard.recentWorkouts"
            :key="workout.id"
            class="card tap group flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(0,0,0,.07)]"
            @click="emit('navigate', 'workouts')"
          >
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-[10px] font-extrabold text-neutral-500">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <span class="min-w-0 flex-1">
              <strong class="block truncate text-sm">{{ workout.name }}</strong>
              <span class="mt-1 block text-[10px] text-neutral-400">
                {{ formatDate(workout.scheduledDate) }} · {{ workout.exercises.length }} exercícios
              </span>
            </span>
            <StatusPill :status="workout.status" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
