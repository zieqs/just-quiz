<!-- app/pages/quiz/new.vue -->
<script setup lang="ts">
const { createQuiz } = useQuizDb();
const router = useRouter();

const errorMessage = ref('');

async function handleSave(quizData: any) {
    errorMessage.value = '';
    try {
        await createQuiz(quizData);
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

        <div class="mb-8 space-y-2">
            <h1 class="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                Create <span class="gradient-text">Quiz</span>
            </h1>
            <p class="text-muted-foreground">Build a quiz from scratch. All saved locally.</p>
        </div>

        <p v-if="errorMessage" class="alert-error mb-6 flex items-center gap-2 whitespace-pre-line px-4 py-3 text-sm">
            <AppIcon name="lucide:info" class="h-4 w-4 shrink-0" />
            {{ errorMessage }}
        </p>

        <QuizEditor @save="handleSave" @cancel="handleCancel" />
    </main>
</template>