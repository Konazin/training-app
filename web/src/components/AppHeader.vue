<script setup lang="ts">
defineProps<{
  title: string
  eyebrow: string
  description?: string
}>()
</script>

<template>
  <header class="mb-6 flex items-end justify-between gap-4 sm:mb-8">
    <div>
      <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        {{ eyebrow }}
      </p>
      <h1 class="max-w-xl text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-neutral-950 sm:text-4xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2.5 max-w-xl text-sm leading-relaxed text-neutral-500">
        {{ description }}
      </p>
    </div>
    <slot />
  </header>
</template>
