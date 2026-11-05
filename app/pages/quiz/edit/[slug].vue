<!-- app/pages/quiz/edit/[slug].vue -->
<script setup lang="ts">
import type { Quiz } from '~/types/quiz';

const route = useRoute();
const router = useRouter();
const { getQuizByShortId, updateQuiz } = useQuizDb();

const quiz = ref<Quiz | null>(null);
const isLoading = ref(true);
const errorMessage = ref('');
const loadError = ref<string | null>(null);

onMounted(async () => {
    const slugParam = route.params.slug as string;
    const shortId = extractShortId(slugParam);

    try {
        const foundQuiz = await getQuizByShortId(shortId);
        if (foundQuiz) quiz.value = foundQuiz;
    } catch (err: any) {
        loadError.value =
            err?.message || "Could not load this quiz. Is the local server running?";
    } finally {
        isLoading.value = false;
    }
});

async function handleSave(quizData: any) {
    if (!quiz.value) return;
    errorMessage.value = '';
    try {
        await updateQuiz(quiz.value.id, quizData);
        router.push('/');
    } catch (err: any) {
        errorMessage.value = err?.message || 'Failed to save the quiz. Please try again.';
    }
}

function handleCancel() {
    router.push('/');
}
</script>

<template>
    <main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header class="mb-8 flex items-center justify-between">
            <NuxtLink to="/" class="btn-ghost -ml-2">
                <AppIcon name="lucide:arrow-left" class="h-4 w-4" :stroke-width="2.5" />
                Dashboard
            </NuxtLink>
        </header>

        <div v-if="isLoading" class="flex flex-col items-center py-24 text-center">
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
            <p class="mt-4 text-sm text-muted-foreground">Loading quiz...</p>
        </div>

        <div v-else-if="!quiz" class="py-16 text-center">
            <h2 class="font-display text-3xl text-foreground">Quiz Not Found</h2>
            <p class="mt-2 text-muted-foreground">
                {{ loadError || 'This quiz might have been deleted from the local database.' }}
            </p>
            <NuxtLink to="/" class="btn-primary mt-8">Back to Dashboard</NuxtLink>
        </div>

        <template v-else>
            <div class="mb-8 space-y-2">
                <h1 class="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                    Edit <span class="gradient-text">Quiz</span>
                </h1>
                <p class="text-muted-foreground">Make changes and save. All data stays on your device.</p>
            </div>

            <p v-if="errorMessage" class="alert-error mb-6 flex items-center gap-2 whitespace-pre-line px-4 py-3 text-sm">
                <AppIcon name="lucide:info" class="h-4 w-4 shrink-0" />
                {{ errorMessage }}
            </p>

            <QuizEditor :quiz="quiz" @save="handleSave" @cancel="handleCancel" />
        </template>
    </main>
</template>