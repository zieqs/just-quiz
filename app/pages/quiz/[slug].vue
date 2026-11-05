<!-- app/pages/quiz/[slug].vue -->
<script setup lang="ts">
import type { Quiz } from '~/types/quiz';

const route = useRoute();
const { getQuizByShortId } = useQuizDb();

const quiz = ref<Quiz | null>(null);
const isLoading = ref(true);
const loadError = ref<string | null>(null);

onMounted(async () => {
  const slugParam = route.params.slug as string;
  const shortId = extractShortId(slugParam);
  const { clearSessionBySlug } = useQuizSession();

  try {
    const foundQuiz = await getQuizByShortId(shortId);
    if (foundQuiz) {
      quiz.value = foundQuiz;
    } else {
      // The quiz no longer exists — drop any stale session pointing at this URL.
      clearSessionBySlug(slugParam);
    }
  } catch (err: any) {
    loadError.value =
      err?.message || "Could not load this quiz. Is the local server running?";
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <div v-if="isLoading" class="flex flex-col items-center py-24 text-center">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
      <p class="mt-4 text-sm text-muted-foreground">Loading quiz...</p>
    </div>

    <div v-else-if="!quiz" class="py-16 text-center">
      <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
        <AppIcon name="lucide:info" class="h-8 w-8 text-red-500 dark:text-red-400" />
      </div>
      <h2 class="font-display text-3xl text-foreground">Quiz Not Found</h2>
      <p class="mt-2 text-muted-foreground">
        {{ loadError || 'This quiz might have been deleted from the local database.' }}
      </p>
      <NuxtLink to="/" class="btn-primary mt-8">Back to Dashboard</NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <header class="flex items-center justify-between">
        <NuxtLink to="/" class="btn-ghost -ml-2">
          <AppIcon name="lucide:arrow-left" class="h-4 w-4" :stroke-width="2.5" />
          Dashboard
        </NuxtLink>
      </header>

      <div class="space-y-2">
        <h1 class="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {{ quiz.title }}
        </h1>
        <p v-if="quiz.description" class="text-muted-foreground">{{ quiz.description }}</p>
      </div>

      <!-- Quiz Player -->
      <QuizPlayer :quiz="quiz" />
    </div>
  </main>
</template>