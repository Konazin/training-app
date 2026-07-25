<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import type { TrainingPlan, WorkoutSession } from '../models/training'

const props = defineProps<{ sessions: WorkoutSession[]; plans: TrainingPlan[] }>()
const planFilter = ref(0)
const statusFilter = ref('')
const selectedId = ref<number | null>(null)
const filtered = computed(() => props.sessions.filter(item =>
  (!planFilter.value || item.trainingPlanId === planFilter.value)
  && (!statusFilter.value || item.status === statusFilter.value),
))
const selected = computed(() => props.sessions.find(item => item.id === selectedId.value))
const completed = computed(() => props.sessions.filter(item => item.status === 'COMPLETED'))
const totalVolume = computed(() => completed.value.reduce((sum, item) => sum + item.totalVolume, 0))
const totalDuration = computed(() => completed.value.reduce((sum, item) => sum + item.totalDurationSeconds, 0))
const adherence = computed(() => props.sessions.length ? Math.round((completed.value.length / props.sessions.length) * 100) : 0)
function date(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)).replace(/\./g, '') }
</script>

<template>
  <div>
    <AppHeader eyebrow="Evolução real" title="Histórico e progresso" description="Sessões, volume e frequência calculados apenas sobre registros persistidos." />
    <section class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <article class="card p-4"><p class="text-[9px] text-neutral-500">Sessões concluídas</p><strong class="mt-2 block text-2xl">{{ completed.length }}</strong></article>
      <article class="card p-4"><p class="text-[9px] text-neutral-500">Aderência</p><strong class="mt-2 block text-2xl">{{ adherence }}%</strong></article>
      <article class="card p-4"><p class="text-[9px] text-neutral-500">Volume total</p><strong class="mt-2 block text-2xl">{{ totalVolume.toLocaleString('pt-BR') }}</strong><small class="text-neutral-400">kg</small></article>
      <article class="card p-4"><p class="text-[9px] text-neutral-500">Duração total</p><strong class="mt-2 block text-2xl">{{ Math.round(totalDuration / 60) }}</strong><small class="text-neutral-400">min</small></article>
    </section>
    <section class="card mb-4 grid gap-2 p-3 sm:grid-cols-2">
      <select v-model.number="planFilter" class="field"><option :value="0">Todas as fichas</option><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option></select>
      <select v-model="statusFilter" class="field"><option value="">Todos os status</option><option value="COMPLETED">Concluídos</option><option value="ABANDONED">Abandonados</option><option value="IN_PROGRESS">Em andamento</option></select>
    </section>
    <div v-if="!filtered.length" class="card grid min-h-72 place-items-center text-center"><div><p class="font-semibold">Nenhuma sessão registrada</p><p class="mt-2 text-xs text-neutral-500">Inicie um treino pela ficha ativa para construir seu histórico.</p></div></div>
    <section v-else class="grid items-start gap-4 lg:grid-cols-[.85fr_1.15fr]">
      <div class="space-y-2">
        <button v-for="session in filtered" :key="session.id" class="card tap flex w-full items-center gap-3 p-3 text-left" :class="selected?.id === session.id ? 'ring-2 ring-neutral-950/20' : ''" @click="selectedId = session.id">
          <span class="grid h-11 w-11 place-items-center rounded-2xl" :class="session.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100'">{{ session.status === 'COMPLETED' ? '✓' : '×' }}</span>
          <span class="min-w-0 flex-1"><strong class="block truncate text-xs">{{ session.workoutName }}</strong><small class="mt-1 block text-[9px] text-neutral-500">{{ date(session.scheduledDate) }} · {{ session.completedSets }} séries</small></span>
          <strong class="text-xs">{{ session.totalVolume }} kg</strong>
        </button>
      </div>
      <article v-if="selected" class="card overflow-hidden lg:sticky lg:top-6">
        <div class="bg-neutral-950 p-5 text-white"><p class="text-[9px] uppercase tracking-wider text-neutral-500">{{ date(selected.scheduledDate) }}</p><h2 class="mt-2 text-xl font-semibold">{{ selected.workoutName }}</h2><div class="mt-4 flex gap-4 text-[10px] text-neutral-400"><span>{{ Math.round(selected.totalDurationSeconds / 60) }} min</span><span>{{ selected.totalVolume }} kg</span><span>RPE {{ selected.overallRpe ?? '—' }}</span></div></div>
        <div class="divide-y divide-neutral-100">
          <div v-for="exercise in selected.exercises" :key="exercise.id" class="p-4"><div class="flex justify-between"><strong class="text-xs">{{ exercise.name }}</strong><span class="text-[9px] text-neutral-500">{{ exercise.status }}</span></div><div class="mt-2 flex flex-wrap gap-1.5"><span v-for="set in exercise.sets.filter(item => item.completed)" :key="set.id" class="rounded-xl bg-neutral-100 px-2 py-1 text-[9px]">{{ set.load }}kg × {{ set.reps }}</span></div></div>
        </div>
        <p v-if="selected.notes" class="border-t border-neutral-100 p-4 text-xs text-neutral-500">{{ selected.notes }}</p>
      </article>
      <div v-else class="card grid min-h-64 place-items-center text-xs text-neutral-500">Selecione uma sessão para ver os detalhes.</div>
    </section>
  </div>
</template>
