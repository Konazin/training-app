<script setup lang="ts">
import type { WorkoutStatus } from '../models/training'

defineProps<{ status: WorkoutStatus }>()

const labels: Record<WorkoutStatus, string> = {
  PLANNED: 'Planejado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em]"
    :class="status === 'COMPLETED'
      ? 'bg-neutral-900 text-white'
      : status === 'IN_PROGRESS'
        ? 'bg-neutral-300 text-neutral-900'
        : 'bg-neutral-100 text-neutral-500'"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {{ labels[status] }}
  </span>
</template>
