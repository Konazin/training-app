<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import type { TrainingPlan, TrainingPlanInput } from '../models/training'

const props = defineProps<{
  plans: TrainingPlan[]
  selectedPlanId: number | null
  loading: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  create: [payload: TrainingPlanInput]
  remove: [id: number]
  removeExercise: [planId: number, exerciseId: number]
  addExercise: [planId: number]
}>()

const showForm = ref(false)
const form = reactive({
  name: '',
  description: '',
  category: '',
  difficulty: 'Iniciante',
})

const selectedPlan = computed(() =>
  props.plans.find((item) => item.id === props.selectedPlanId) ?? props.plans[0],
)

function submit() {
  emit('create', { ...form })
  showForm.value = false
  form.name = ''
  form.description = ''
  form.category = ''
  form.difficulty = 'Iniciante'
}

function requestPlanRemoval(plan: TrainingPlan) {
  if (window.confirm(`Remover a ficha “${plan.name}” e todos os exercícios dela?`)) {
    emit('remove', plan.id)
  }
}

function requestExerciseRemoval(planId: number, exerciseId: number, name: string) {
  if (window.confirm(`Remover “${name}” desta ficha?`)) {
    emit('removeExercise', planId, exerciseId)
  }
}
</script>

<template>
  <div>
    <AppHeader
      eyebrow="Biblioteca de rotinas"
      title="Fichas de treino"
      description="Monte sequências reutilizáveis e deixe cada sessão pronta antes de começar."
    >
      <button
        class="primary-action tap hidden items-center gap-2 rounded-2xl px-4 text-xs font-bold shadow-lg transition hover:-translate-y-0.5 sm:flex"
        @click="showForm = true"
      >
        <AppIcon name="plus" :size="17" />
        Nova ficha
      </button>
    </AppHeader>

    <div v-if="loading && !plans.length" class="space-y-3">
      <div v-for="index in 2" :key="index" class="skeleton h-36 rounded-[22px]" />
    </div>

    <div v-else-if="!plans.length" class="card flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
      <span class="grid h-16 w-16 place-items-center rounded-[22px] bg-neutral-100 text-neutral-500">
        <AppIcon name="plans" :size="27" />
      </span>
      <h2 class="mt-5 text-lg font-semibold">Sua primeira ficha começa aqui</h2>
      <p class="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
        Crie uma rotina, como “Treino de calistenia”, e organize os exercícios na ordem em que serão feitos.
      </p>
      <button class="primary-action tap mt-5 rounded-2xl px-5 text-xs font-bold" @click="showForm = true">
        Criar ficha
      </button>
    </div>

    <template v-else>
      <section class="-mx-4 mb-5 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <button
          v-for="plan in plans"
          :key="plan.id"
          class="tap min-w-[220px] shrink-0 rounded-[22px] border p-4 text-left transition active:scale-[.98]"
          :class="selectedPlan?.id === plan.id
            ? 'border-neutral-950 bg-neutral-950 text-white shadow-xl'
            : 'border-black/[0.07] bg-white text-neutral-950'"
          @click="emit('select', plan.id)"
        >
          <div class="flex items-center justify-between">
            <span
              class="grid h-10 w-10 place-items-center rounded-2xl"
              :class="selectedPlan?.id === plan.id ? 'bg-white/10' : 'bg-neutral-100'"
            >
              <AppIcon :name="selectedPlan?.id === plan.id ? 'check' : 'plans'" :size="18" />
            </span>
            <span class="rounded-full px-2 py-1 text-[9px] font-bold" :class="selectedPlan?.id === plan.id ? 'bg-white/10 text-neutral-300' : 'bg-neutral-100 text-neutral-500'">
              {{ plan.exercises.length }} exercícios
            </span>
          </div>
          <strong class="mt-4 block truncate text-sm">{{ plan.name }}</strong>
          <span class="mt-1.5 block text-[10px]" :class="selectedPlan?.id === plan.id ? 'text-neutral-400' : 'text-neutral-500'">
            {{ plan.category }} · {{ plan.difficulty }}
          </span>
        </button>
      </section>

      <section v-if="selectedPlan" class="grid items-start gap-5 lg:grid-cols-[.72fr_1.28fr]">
        <article class="relative overflow-hidden rounded-[26px] bg-neutral-950 p-5 text-white sm:p-6">
          <div class="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/10" />
          <div class="relative">
            <span class="inline-flex rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-neutral-400">
              {{ selectedPlan.category }}
            </span>
            <h2 class="mt-6 text-2xl font-semibold leading-tight tracking-[-.04em]">{{ selectedPlan.name }}</h2>
            <p class="mt-3 min-h-12 text-xs leading-relaxed text-neutral-400">
              {{ selectedPlan.description || 'Uma sequência pronta para repetir e evoluir.' }}
            </p>
            <div class="mt-6 grid grid-cols-2 gap-2">
              <div class="rounded-2xl bg-white/[.07] p-3">
                <strong class="text-lg">{{ selectedPlan.exercises.length }}</strong>
                <span class="mt-1 block text-[9px] text-neutral-400">exercícios</span>
              </div>
              <div class="rounded-2xl bg-white/[.07] p-3">
                <strong class="text-sm">{{ selectedPlan.difficulty }}</strong>
                <span class="mt-1 block text-[9px] text-neutral-400">nível</span>
              </div>
            </div>
            <button
              class="tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-neutral-950 transition active:scale-[.98]"
              @click="emit('addExercise', selectedPlan.id)"
            >
              <AppIcon name="plus" :size="16" />
              Adicionar exercício
            </button>
            <button
              class="tap mt-2 flex w-full items-center justify-center gap-2 rounded-2xl text-[10px] font-bold text-neutral-500 transition hover:bg-white/5 hover:text-red-300"
              @click="requestPlanRemoval(selectedPlan)"
            >
              <AppIcon name="trash" :size="14" />
              Excluir ficha
            </button>
          </div>
        </article>

        <article class="card overflow-hidden">
          <div class="flex items-center justify-between border-b border-neutral-100 p-4 sm:p-5">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[.15em] text-neutral-400">Sequência da ficha</p>
              <h3 class="mt-1 text-base font-semibold">Exercícios</h3>
            </div>
            <button class="tap grid place-items-center rounded-2xl bg-neutral-100 text-neutral-600" aria-label="Adicionar exercício" @click="emit('addExercise', selectedPlan.id)">
              <AppIcon name="plus" :size="18" />
            </button>
          </div>

          <div v-if="!selectedPlan.exercises.length" class="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <span class="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400">
              <AppIcon name="dumbbell" :size="20" />
            </span>
            <p class="mt-4 text-sm font-semibold">Ficha ainda vazia</p>
            <p class="mt-1.5 max-w-xs text-xs leading-relaxed text-neutral-400">Adicione o primeiro movimento para começar a sequência.</p>
          </div>

          <ol v-else class="divide-y divide-neutral-100">
            <li v-for="(exercise, index) in selectedPlan.exercises" :key="exercise.id" class="group flex items-center gap-3 p-4 sm:px-5">
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-[10px] font-extrabold text-neutral-500">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-sm font-semibold">{{ exercise.name }}</p>
                  <span class="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[8px] font-bold text-neutral-500 sm:inline">{{ exercise.muscleGroup }}</span>
                </div>
                <p class="mt-1 text-[10px] text-neutral-400">
                  {{ exercise.sets }} séries · {{ exercise.reps }} reps · {{ exercise.weightKg }} kg · {{ exercise.restSeconds }}s
                </p>
              </div>
              <button
                class="tap grid place-items-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-700"
                :aria-label="`Remover ${exercise.name}`"
                @click="requestExerciseRemoval(selectedPlan.id, exercise.id, exercise.name)"
              >
                <AppIcon name="trash" :size="15" />
              </button>
            </li>
          </ol>
        </article>
      </section>
    </template>

    <button
      class="primary-action tap fixed bottom-[104px] right-4 z-30 grid h-14 w-14 place-items-center rounded-[20px] shadow-[0_14px_35px_rgba(0,0,0,.28)] active:scale-95 sm:hidden"
      aria-label="Criar nova ficha"
      @click="showForm = true"
    >
      <AppIcon name="plus" :size="22" />
    </button>

    <Transition name="sheet">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-[2px] md:items-stretch md:justify-end" @click.self="showForm = false">
        <section class="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 pb-[max(24px,env(safe-area-inset-bottom))] md:max-h-none md:max-w-lg md:rounded-none md:p-7" role="dialog" aria-modal="true">
          <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200 md:hidden" />
          <div class="mb-6 flex items-start justify-between">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[.18em] text-neutral-400">Nova rotina</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-.04em]">Criar ficha</h2>
              <p class="mt-1.5 text-xs text-neutral-500">Dê um nome claro para encontrar e repetir depois.</p>
            </div>
            <button class="tap grid place-items-center rounded-2xl bg-neutral-100 text-neutral-500" aria-label="Fechar" @click="showForm = false">
              <AppIcon name="close" :size="18" />
            </button>
          </div>
          <form @submit.prevent="submit">
            <label class="label" for="plan-name">Nome da ficha</label>
            <input id="plan-name" v-model="form.name" autofocus required maxlength="120" class="field" placeholder="Ex.: Treino de calistenia" />
            <label class="label mt-4" for="plan-description">Objetivo</label>
            <textarea id="plan-description" v-model="form.description" maxlength="500" rows="3" class="field resize-none" placeholder="O que esta rotina desenvolve?" />
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="plan-category">Categoria</label>
                <input id="plan-category" v-model="form.category" required maxlength="80" class="field" placeholder="Calistenia" />
              </div>
              <div>
                <label class="label" for="plan-difficulty">Nível</label>
                <select id="plan-difficulty" v-model="form.difficulty" class="field">
                  <option>Iniciante</option>
                  <option>Intermediário</option>
                  <option>Avançado</option>
                </select>
              </div>
            </div>
            <button :disabled="loading" class="primary-action tap mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold disabled:opacity-40">
              <AppIcon name="check" :size="17" />
              {{ loading ? 'Salvando...' : 'Salvar ficha' }}
            </button>
          </form>
        </section>
      </div>
    </Transition>
  </div>
</template>
