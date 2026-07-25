<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppIcon from './components/AppIcon.vue'
import { useTrainingController } from './controllers/useTrainingController'
import ExerciseView from './views/ExerciseView.vue'
import ExerciseLibraryView from './views/ExerciseLibraryView.vue'
import HistoryView from './views/HistoryView.vue'
import HomeView from './views/HomeView.vue'
import SessionExecutionView from './views/SessionExecutionView.vue'
import TrainingPlansView from './views/TrainingPlansView.vue'
import WeeklyPlansView from './views/WeeklyPlansView.vue'
import WorkoutsView from './views/WorkoutsView.vue'

type ViewName = 'home' | 'workouts' | 'plans' | 'library' | 'session' | 'history' | 'exercise'

const currentView = ref<ViewName>('home')
const exerciseDestination = ref<'workout' | 'plan'>('workout')
const isDark = ref(
  localStorage.getItem('training-theme') === 'dark'
  || (!localStorage.getItem('training-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
)
const {
  workouts,
  trainingPlans,
  exerciseLibrary,
  sessions,
  activeSession,
  dashboard,
  selectedWorkoutId,
  selectedTrainingPlanId,
  loading,
  error,
  notice,
  refresh,
  createWorkout,
  removeWorkout,
  addExercise,
  removeExercise,
  createTrainingPlan,
  removeTrainingPlan,
  addPlanExercise,
  removePlanExercise,
  activateTrainingPlan,
  duplicateTrainingPlan,
  archiveTrainingPlan,
  updatePlanDay,
  addDayExercise,
  removeDayExercise,
  addRestActivity,
  removeRestActivity,
  createExerciseDefinition,
  archiveExerciseDefinition,
  startSession,
  updateSessionSet,
  addSessionSet,
  setSessionExerciseStatus,
  pauseOrResumeSession,
  completeActiveSession,
  abandonActiveSession,
} = useTrainingController()

const navigation: {
  id: ViewName
  label: string
  icon: 'home' | 'workouts' | 'plans' | 'library' | 'play' | 'history' | 'plus'
}[] = [
  { id: 'home', label: 'Início', icon: 'home' },
  { id: 'workouts', label: 'Treinos', icon: 'workouts' },
  { id: 'plans', label: 'Fichas', icon: 'plans' },
  { id: 'library', label: 'Biblioteca', icon: 'library' },
  { id: 'session', label: 'Sessão', icon: 'play' },
  { id: 'history', label: 'Histórico', icon: 'history' },
  { id: 'exercise', label: 'Adicionar', icon: 'plus' },
]
const mobileNavigation = navigation.filter((item) => ['home', 'workouts', 'plans', 'session', 'history'].includes(item.id))

function openExercise(workoutId: number) {
  selectedWorkoutId.value = workoutId
  exerciseDestination.value = 'workout'
  currentView.value = 'exercise'
}

function openPlanExercise(planId: number) {
  selectedTrainingPlanId.value = planId
  exerciseDestination.value = 'plan'
  currentView.value = 'exercise'
}

async function beginSession(planId: number, dayId: number) {
  if (await startSession(planId, dayId)) currentView.value = 'session'
}

async function finishSession(rpe: number | null, notes: string) {
  if (await completeActiveSession(rpe, notes)) currentView.value = 'history'
}

async function abandonSession(notes: string) {
  if (await abandonActiveSession(notes)) currentView.value = 'history'
}

function toggleTheme() {
  isDark.value = !isDark.value
}

function dismissFeedback() {
  error.value = ''
  notice.value = ''
}

watch(isDark, (value) => {
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem('training-theme', value ? 'dark' : 'light')
}, { immediate: true })

onMounted(refresh)
</script>

<template>
  <div class="min-h-screen bg-[#f2f1ed]">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-black/[0.06] bg-[#111] p-5 text-white md:flex">
      <div class="flex h-12 items-center gap-3 px-1">
        <div class="grid h-10 w-10 place-items-center rounded-2xl bg-white text-neutral-950">
          <AppIcon name="dumbbell" :size="21" />
        </div>
        <div>
          <p class="text-sm font-extrabold tracking-[-0.02em]">TRAINING</p>
          <p class="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-neutral-500">workout studio</p>
        </div>
      </div>

      <div class="mt-10 px-3">
        <p class="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">Menu</p>
      </div>
      <nav class="mt-3 space-y-1.5">
        <button
          v-for="item in navigation"
          :key="item.id"
          class="tap group flex w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-semibold transition duration-200"
          :class="currentView === item.id
            ? 'bg-white text-neutral-950 shadow-lg'
            : 'text-neutral-500 hover:bg-white/5 hover:text-white'"
          @click="currentView = item.id"
        >
          <span
            class="grid h-8 w-8 place-items-center rounded-xl transition"
            :class="currentView === item.id ? 'bg-neutral-100' : 'bg-white/[0.04] group-hover:bg-white/10'"
          >
            <AppIcon :name="item.icon" :size="18" />
          </span>
          {{ item.label }}
        </button>
      </nav>

      <button
        class="tap mt-auto mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-left text-xs font-semibold text-neutral-300 transition hover:bg-white/10"
        :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
        @click="toggleTheme"
      >
        <span class="grid h-8 w-8 place-items-center rounded-xl bg-white/10">
          <AppIcon :name="isDark ? 'sun' : 'moon'" :size="17" />
        </span>
        {{ isDark ? 'Modo claro' : 'Modo escuro' }}
      </button>

      <div class="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
        <div class="mb-4 flex items-center justify-between">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-white text-neutral-950">
            <AppIcon name="check" :size="16" />
          </span>
          <span class="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500">Sincronizado</span>
        </div>
        <p class="text-sm font-semibold">Uma rotina, duas telas.</p>
        <p class="mt-1.5 text-[11px] leading-relaxed text-neutral-500">Web e mobile compartilham seus dados em tempo real.</p>
      </div>
    </aside>

    <main class="mx-auto min-h-screen max-w-[1180px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:ml-[248px] md:px-9 md:pb-12 lg:px-12">
      <div class="mb-7 flex h-11 items-center justify-between md:hidden">
        <div class="flex items-center gap-2.5">
          <div class="grid h-9 w-9 place-items-center rounded-xl bg-neutral-950 text-white">
            <AppIcon name="dumbbell" :size="18" />
          </div>
          <p class="text-sm font-extrabold tracking-[-0.02em]">TRAINING</p>
        </div>
        <div class="flex gap-2">
          <button class="tap grid place-items-center rounded-full border border-black/[0.07] bg-white" :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'" @click="toggleTheme">
            <AppIcon :name="isDark ? 'sun' : 'moon'" :size="17" />
          </button>
          <button class="tap grid place-items-center rounded-full border border-black/[0.07] bg-white text-[11px] font-extrabold" aria-label="Atualizar dados" @click="refresh">
            TR
          </button>
        </div>
      </div>

      <Transition name="toast">
        <div
          v-if="error || notice"
          class="fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-3 shadow-[0_18px_50px_rgba(0,0,0,.15)] md:left-auto md:right-6"
          :class="error ? 'border-red-100 bg-red-50 text-red-900' : 'border-neutral-800 bg-neutral-950 text-white'"
          role="status"
        >
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl" :class="error ? 'bg-red-100' : 'bg-white/10'">
            <AppIcon :name="error ? 'close' : 'check'" :size="16" />
          </span>
          <span class="flex-1 text-xs font-semibold">{{ error || notice }}</span>
          <button class="tap grid shrink-0 place-items-center rounded-xl opacity-60 hover:opacity-100" aria-label="Fechar aviso" @click="dismissFeedback">
            <AppIcon name="close" :size="16" />
          </button>
        </div>
      </Transition>

      <Transition name="page" mode="out-in">
        <div :key="currentView">
          <HomeView
            v-if="currentView === 'home'"
            :dashboard="dashboard"
            :loading="loading"
            @navigate="currentView = $event"
          />
          <WorkoutsView
            v-else-if="currentView === 'workouts'"
            :workouts="workouts"
            :loading="loading"
            @create="createWorkout"
            @remove="removeWorkout"
            @select-exercise="openExercise"
          />
          <WeeklyPlansView
            v-else-if="currentView === 'plans'"
            :plans="trainingPlans"
            :library="exerciseLibrary"
            :selected-plan-id="selectedTrainingPlanId"
            :loading="loading"
            @select="selectedTrainingPlanId = $event"
            @create="createTrainingPlan"
            @activate="activateTrainingPlan"
            @duplicate="duplicateTrainingPlan"
            @archive="archiveTrainingPlan"
            @update-day="updatePlanDay"
            @add-exercise="addDayExercise"
            @remove-exercise="removeDayExercise"
            @add-rest-activity="addRestActivity"
            @remove-rest-activity="removeRestActivity"
            @start-session="beginSession"
          />
          <ExerciseLibraryView
            v-else-if="currentView === 'library'"
            :exercises="exerciseLibrary"
            :loading="loading"
            @create="createExerciseDefinition"
            @archive="archiveExerciseDefinition"
          />
          <SessionExecutionView
            v-else-if="currentView === 'session'"
            :session="activeSession"
            :loading="loading"
            @navigate-plans="currentView = 'plans'"
            @update-set="updateSessionSet"
            @add-set="addSessionSet"
            @set-exercise-status="setSessionExerciseStatus"
            @pause-resume="pauseOrResumeSession"
            @complete="finishSession"
            @abandon="abandonSession"
          />
          <HistoryView
            v-else-if="currentView === 'history'"
            :sessions="sessions"
            :plans="trainingPlans"
          />
          <ExerciseView
            v-else
            :workouts="workouts"
            :training-plans="trainingPlans"
            :selected-workout-id="selectedWorkoutId"
            :selected-plan-id="selectedTrainingPlanId"
            :destination="exerciseDestination"
            :loading="loading"
            @select-workout="selectedWorkoutId = $event"
            @select-plan="selectedTrainingPlanId = $event"
            @update-destination="exerciseDestination = $event"
            @create-workout-exercise="addExercise"
            @create-plan-exercise="addPlanExercise"
            @remove-workout-exercise="removeExercise"
            @remove-plan-exercise="removePlanExercise"
          />
        </div>
      </Transition>
    </main>

    <nav
      class="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto flex max-w-[430px] rounded-[22px] border border-white/10 bg-neutral-950/95 p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.25)] backdrop-blur-xl md:hidden"
      aria-label="Navegação principal"
    >
      <button
        v-for="item in mobileNavigation"
        :key="item.id"
        class="tap relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[17px] py-2 text-[9px] font-bold transition duration-200"
        :class="currentView === item.id ? 'bg-white text-neutral-950' : 'text-neutral-500 active:scale-95'"
        @click="currentView = item.id"
      >
        <AppIcon :name="item.icon" :size="19" />
        {{ item.label }}
      </button>
    </nav>
  </div>
</template>
