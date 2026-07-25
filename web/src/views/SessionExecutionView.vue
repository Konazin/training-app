<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import type { SessionExerciseStatus, SetLog, WorkoutSession } from '../models/training'

const props = defineProps<{ session: WorkoutSession | null; loading: boolean }>()
const emit = defineEmits<{
  navigatePlans: []
  updateSet: [exerciseId: number, setId: number, payload: { reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; completed: boolean; notes: string }]
  addSet: [exerciseId: number]
  setExerciseStatus: [exerciseId: number, status: SessionExerciseStatus]
  pauseResume: []
  complete: [overallRpe: number | null, notes: string]
  abandon: [notes: string]
}>()

const now = ref(Date.now())
const restEnd = ref<number>(Number(localStorage.getItem('training-rest-end') ?? 0))
const restPaused = ref(false)
const pausedRemaining = ref(0)
const showSummary = ref(false)
const notes = ref('')
const overallRpe = ref<number | null>(null)
const values = reactive<Record<number, { reps: number; load: number; durationSeconds: number; distance: number; rpe: number | null; notes: string }>>({})
let interval = 0

watch(() => props.session, (session) => {
  if (!session) return
  for (const exercise of session.exercises) for (const set of exercise.sets) {
    if (!values[set.id]) values[set.id] = { reps: set.reps, load: set.load, durationSeconds: set.durationSeconds, distance: set.distance, rpe: set.rpe, notes: set.notes }
  }
}, { immediate: true, deep: true })

const elapsed = computed(() => {
  if (!props.session) return 0
  if (props.session.status === 'PAUSED') return props.session.totalDurationSeconds
  return Math.max(props.session.totalDurationSeconds, Math.floor((now.value - new Date(props.session.startedAt).getTime()) / 1000))
})
const restRemaining = computed(() => restPaused.value ? pausedRemaining.value : Math.max(0, Math.ceil((restEnd.value - now.value) / 1000)))
const restActive = computed(() => restRemaining.value > 0)
const progress = computed(() => props.session?.totalPlannedSets ? Math.round((props.session.completedSets / props.session.totalPlannedSets) * 100) : 0)
const currentExercise = computed(() => props.session?.exercises.find(item => !['COMPLETED', 'SKIPPED'].includes(item.status)) ?? props.session?.exercises.at(-1))

function formatSeconds(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
function startRest(seconds: number) {
  restEnd.value = Date.now() + seconds * 1000
  restPaused.value = false
  localStorage.setItem('training-rest-end', String(restEnd.value))
}
function adjustRest(seconds: number) {
  const base = restActive.value ? restEnd.value : Date.now()
  restEnd.value = Math.max(Date.now(), base + seconds * 1000)
  localStorage.setItem('training-rest-end', String(restEnd.value))
}
function pauseRest() {
  if (restPaused.value) {
    restEnd.value = Date.now() + pausedRemaining.value * 1000
    restPaused.value = false
    localStorage.setItem('training-rest-end', String(restEnd.value))
  } else {
    pausedRemaining.value = restRemaining.value
    restPaused.value = true
  }
}
function skipRest() {
  restEnd.value = 0; pausedRemaining.value = 0; restPaused.value = false
  localStorage.removeItem('training-rest-end')
}
function saveSet(exerciseId: number, set: SetLog, completed = !set.completed, rest = 0) {
  const value = values[set.id]
  emit('updateSet', exerciseId, set.id, { ...value, completed })
  if (completed && rest > 0) startRest(rest)
}
function requestAbandon() {
  if (window.confirm('Abandonar esta sessão? Os registros já feitos serão preservados no histórico.')) emit('abandon', notes.value)
}
watch(restRemaining, (remaining, previous) => {
  if (previous > 0 && remaining === 0) {
    localStorage.removeItem('training-rest-end')
    if ('vibrate' in navigator) navigator.vibrate([180, 80, 180])
  }
})
onMounted(() => { interval = window.setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => window.clearInterval(interval))
</script>

<template>
  <div>
    <div v-if="!session" class="card grid min-h-[520px] place-items-center p-8 text-center">
      <div><span class="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-neutral-100"><AppIcon name="dumbbell" :size="27" /></span><h1 class="mt-5 text-2xl font-semibold">Nenhuma sessão em andamento</h1><p class="mt-2 text-sm text-neutral-500">Escolha um dia de uma ficha e use “Iniciar treino”.</p><button class="primary-action tap mt-5 rounded-2xl px-5 text-xs font-bold" @click="emit('navigatePlans')">Ver ficha ativa</button></div>
    </div>
    <template v-else>
      <AppHeader eyebrow="Sessão em andamento" :title="session.workoutName" :description="`${session.completedSets} de ${session.totalPlannedSets} séries concluídas`">
        <button class="tap rounded-2xl border border-neutral-200 bg-white px-4 text-xs font-bold" @click="emit('pauseResume')">{{ session.status === 'PAUSED' ? '▶ Continuar' : 'Ⅱ Pausar' }}</button>
      </AppHeader>
      <section class="mb-4 grid gap-3 sm:grid-cols-3">
        <article class="card p-4"><p class="text-[9px] uppercase tracking-wider text-neutral-400">Tempo total</p><strong class="mt-2 block text-2xl">{{ formatSeconds(elapsed) }}</strong></article>
        <article class="card p-4"><p class="text-[9px] uppercase tracking-wider text-neutral-400">Progresso</p><strong class="mt-2 block text-2xl">{{ progress }}%</strong><div class="mt-2 h-1.5 rounded-full bg-neutral-100"><div class="h-full rounded-full bg-neutral-950 transition-all" :style="{ width: `${progress}%` }" /></div></article>
        <article class="card p-4"><p class="text-[9px] uppercase tracking-wider text-neutral-400">Volume atual</p><strong class="mt-2 block text-2xl">{{ session.totalVolume.toLocaleString('pt-BR') }} <small class="text-xs text-neutral-400">kg</small></strong></article>
      </section>

      <section v-if="restActive || restPaused" class="mb-4 overflow-hidden rounded-[24px] bg-neutral-950 p-5 text-white">
        <div class="flex items-center justify-between"><div><p class="text-[9px] font-bold uppercase tracking-[.16em] text-neutral-500">Descanso</p><strong class="mt-1 block text-4xl tracking-tight">{{ formatSeconds(restRemaining) }}</strong></div><div class="grid grid-cols-2 gap-2"><button class="tap rounded-xl bg-white/10 px-3 text-xs font-bold" @click="adjustRest(-15)">−15s</button><button class="tap rounded-xl bg-white/10 px-3 text-xs font-bold" @click="adjustRest(15)">+15s</button><button class="tap rounded-xl bg-white/10 px-3 text-xs font-bold" @click="pauseRest">{{ restPaused ? 'Continuar' : 'Pausar' }}</button><button class="tap rounded-xl bg-white text-xs font-bold text-neutral-950" @click="skipRest">Pular</button></div></div>
      </section>

      <section class="space-y-3">
        <article v-for="(exercise, exerciseIndex) in session.exercises" :key="exercise.id" class="card overflow-hidden" :class="currentExercise?.id === exercise.id ? 'ring-2 ring-neutral-950/20' : ''">
          <div class="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 sm:p-5">
            <span class="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-950 text-xs font-bold text-white">{{ exerciseIndex + 1 }}</span>
            <div class="min-w-0 flex-1"><h2 class="truncate text-sm font-semibold">{{ exercise.name }}</h2><p class="mt-1 text-[9px] text-neutral-500">{{ exercise.muscleGroup }} · {{ exercise.plannedMinReps }}–{{ exercise.plannedMaxReps }} reps · {{ exercise.restSeconds }}s</p></div>
            <button class="tap rounded-xl bg-neutral-100 px-3 text-[9px] font-bold" @click="emit('setExerciseStatus', exercise.id, exercise.status === 'SKIPPED' ? 'PENDING' : 'SKIPPED')">{{ exercise.status === 'SKIPPED' ? 'Desfazer pulo' : 'Pular exercício' }}</button>
          </div>
          <div class="overflow-x-auto">
            <div class="min-w-[620px]">
              <div class="grid grid-cols-[44px_1fr_1fr_1fr_1fr_54px] gap-2 px-4 py-2 text-center text-[8px] font-bold uppercase tracking-wider text-neutral-400"><span>Série</span><span>Reps</span><span>Carga</span><span>RPE</span><span>Duração</span><span>Feita</span></div>
              <div v-for="set in exercise.sets" :key="set.id" class="grid grid-cols-[44px_1fr_1fr_1fr_1fr_54px] items-center gap-2 border-t border-neutral-100 px-4 py-2">
                <strong class="text-center text-xs">{{ set.setNumber }}</strong>
                <input v-model.number="values[set.id].reps" min="0" type="number" class="field min-h-10 py-2 text-center" />
                <input v-model.number="values[set.id].load" min="0" step=".25" type="number" class="field min-h-10 py-2 text-center" />
                <input v-model.number="values[set.id].rpe" min="1" max="10" step=".5" type="number" class="field min-h-10 py-2 text-center" />
                <input v-model.number="values[set.id].durationSeconds" min="0" type="number" class="field min-h-10 py-2 text-center" />
                <button class="tap grid place-items-center rounded-xl border text-lg" :class="set.completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-200'" :aria-label="set.completed ? 'Desmarcar série' : 'Concluir série'" @click="saveSet(exercise.id, set, !set.completed, exercise.restSeconds)">{{ set.completed ? '✓' : '○' }}</button>
              </div>
            </div>
          </div>
          <button class="tap m-3 rounded-xl border border-neutral-200 px-4 text-[9px] font-bold" @click="emit('addSet', exercise.id)">＋ Adicionar série</button>
        </article>
      </section>
      <div class="sticky bottom-24 mt-5 flex gap-2 rounded-[22px] border border-neutral-200 bg-white/90 p-2 shadow-xl backdrop-blur md:bottom-3"><button class="tap flex-1 rounded-2xl text-xs font-bold text-red-600" @click="requestAbandon">Abandonar</button><button class="primary-action tap flex-[2] rounded-2xl text-xs font-bold" @click="showSummary = true">Revisar e concluir</button></div>
    </template>
    <Transition name="sheet"><div v-if="showSummary && session" class="fixed inset-0 z-50 flex items-end bg-black/60 md:items-center md:justify-center" @click.self="showSummary = false"><section class="w-full rounded-t-[28px] bg-white p-5 md:max-w-lg md:rounded-[28px] md:p-7"><p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Resumo da sessão</p><h2 class="mt-2 text-2xl font-semibold">{{ session.workoutName }}</h2><div class="mt-5 grid grid-cols-3 gap-2"><div class="rounded-2xl bg-neutral-100 p-3"><strong>{{ formatSeconds(elapsed) }}</strong><small class="block text-[8px] text-neutral-500">duração</small></div><div class="rounded-2xl bg-neutral-100 p-3"><strong>{{ session.completedSets }}</strong><small class="block text-[8px] text-neutral-500">séries</small></div><div class="rounded-2xl bg-neutral-100 p-3"><strong>{{ session.totalVolume }}</strong><small class="block text-[8px] text-neutral-500">volume kg</small></div></div><label class="label mt-5">RPE geral</label><input v-model.number="overallRpe" class="field" min="1" max="10" step=".5" type="number" /><label class="label mt-4">Observações</label><textarea v-model="notes" class="field" rows="3" /><div class="mt-5 grid grid-cols-2 gap-2"><button class="tap rounded-2xl border border-neutral-200 text-xs font-bold" @click="showSummary = false">Voltar e editar</button><button class="primary-action tap rounded-2xl text-xs font-bold" @click="emit('complete', overallRpe, notes); showSummary = false">Confirmar conclusão</button></div></section></div></Transition>
  </div>
</template>
