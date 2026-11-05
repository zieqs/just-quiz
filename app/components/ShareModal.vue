<!-- app/components/ShareModal.vue -->
<script setup lang="ts">
import type { Quiz } from '~/types/quiz';

const props = defineProps<{ quiz: Quiz }>();
const emit = defineEmits(['close']);

const copied = ref(false);

const quizJson = computed(() => JSON.stringify(props.quiz, null, 2));

const fileName = computed(() => {
  const base = props.quiz.title.replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').toLowerCase();
  return `${base || 'quiz'}.json`;
});

const downloadJson = () => {
  const blob = new Blob([quizJson.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.value;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const copyJson = async () => {
  await navigator.clipboard.writeText(quizJson.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div class="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent shadow-accent">
            <AppIcon name="lucide:share-2" class="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 class="font-display text-xl text-foreground">Share Quiz</h2>
            <p class="text-sm text-muted-foreground line-clamp-1">{{ quiz.title }}</p>
          </div>
        </div>

        <button @click="$emit('close')" class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
          <AppIcon name="lucide:x" class="h-5 w-5" />
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <button @click="downloadJson" class="btn-primary group">
          <AppIcon name="lucide:download" class="h-4 w-4" :stroke-width="2.5" />
          Download .json
        </button>
        <button @click="copyJson" class="btn-outline group">
          <AppIcon name="lucide:copy" class="h-4 w-4" :stroke-width="2.5" />
          {{ copied ? 'Copied!' : 'Copy JSON' }}
        </button>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
        <pre class="max-h-48 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground">{{ quizJson }}</pre>
      </div>
    </div>
  </div>
</template>