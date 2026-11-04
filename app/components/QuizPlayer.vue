<!-- app/components/QuizPlayer.vue -->
<script setup lang="ts">
import type { Quiz, Question } from '~/types/quiz';
import { useQuizSession, type QuizSession } from '~/composables/useQuizSession';

const props = defineProps<{
    quiz: Quiz;
}>();

const { saveSession, clearSession, getSession } = useQuizSession();

const currentIndex = ref(0);
const isFinished = ref(false);
const isChecked = ref(false);

// Map of user answers keyed by question index
// single/true_false: number (choice index)
// multiple: number[] (array of choice indices)
// short_answer: string
const userAnswers = ref<Record<number, any>>({});

const quizId = computed(() => props.quiz.id);
const quizUrl = computed(() => getQuizUrl(props.quiz));

// Build the current session snapshot.
const buildSession = (): QuizSession => ({
    quizId: quizId.value,
    quizUrl: quizUrl.value,
    quizTitle: props.quiz.title,
    currentIndex: currentIndex.value,
    totalQuestions: totalQuestions.value,
    userAnswers: { ...userAnswers.value },
    isChecked: isChecked.value,
    isFinished: isFinished.value,
    updatedAt: Date.now(),
});

// Persist the current state to the session store (module state + sessionStorage).
const persistSession = () => {
    saveSession(buildSession());
};

// Restore a previously saved session (navigation back or page refresh).
const restoreSession = () => {
    const session = getSession(quizId.value);
    // Guard against restoring a stale session for a different quiz at the same URL.
    if (session && session.quizUrl === quizUrl.value) {
        currentIndex.value = Math.min(session.currentIndex, props.quiz.questions.length - 1);
        userAnswers.value = session.userAnswers ?? {};
        isChecked.value = session.isChecked ?? false;
        isFinished.value = session.isFinished ?? false;
    }
};

onMounted(() => {
    restoreSession();
});

// Auto-save whenever an answer changes.
watch(userAnswers, persistSession, { deep: true });

const currentQuestion = computed(() => props.quiz.questions[currentIndex.value]);
const totalQuestions = computed(() => props.quiz.questions.length);

// Robust fallback for question choices (especially true_false questions)
const getQuestionChoices = (q?: Question): string[] => {
    if (!q) return [];
    if (q.type === 'true_false' && (!q.choices || q.choices.length < 2)) {
        return ['True', 'False'];
    }
    return q.choices || [];
};

// Whether the current question has been answered (empty input counts as unanswered)
const isCurrentQuestionAnswered = computed(() => {
    const ans = userAnswers.value[currentIndex.value];
    if (Array.isArray(ans)) return ans.length > 0;
    return ans !== undefined && ans !== null && ans !== '';
});

// Progress = completed questions + current question if answered
const progressPercent = computed(() => {
    const answered = isCurrentQuestionAnswered.value ? 1 : 0;
    return Math.round(((currentIndex.value + answered) / totalQuestions.value) * 100);
});

// Question type display metadata (badge label, hint, icon, colors)
const TYPE_META = {
    single: {
        label: 'Single Answer',
        hint: 'Select one answer.',
        icon: 'lucide:circle-check',
        badgeClass: 'bg-accent/10 text-accent',
    },
    multiple: {
        label: 'Multiple Answers',
        hint: 'Select all that apply.',
        icon: 'lucide:list-checks',
        badgeClass: 'bg-accent/10 text-accent',
    },
    true_false: {
        label: 'True or False',
        hint: 'Select true or false.',
        icon: 'lucide:check-check',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    short_answer: {
        label: 'Short Answer',
        hint: 'Type your answer.',
        icon: 'lucide:type',
        badgeClass: 'bg-muted text-muted-foreground',
    },
};

const DEFAULT_TYPE_META = {
    label: 'Question',
    hint: '',
    icon: 'lucide:help-circle',
    badgeClass: 'bg-muted text-muted-foreground',
};

// Returns display metadata for any given question (falls back gracefully)
const getTypeMeta = (q?: Question) => {
    if (!q) return DEFAULT_TYPE_META;
    return TYPE_META[q.type] ?? DEFAULT_TYPE_META;
};

const currentTypeMeta = computed(() => getTypeMeta(currentQuestion.value));

// Answer helpers
const handleSingleSelect = (choiceIdx: number) => {
    userAnswers.value[currentIndex.value] = choiceIdx;
};

const handleMultipleToggle = (choiceIdx: number) => {
    const current = (userAnswers.value[currentIndex.value] as number[]) || [];
    if (current.includes(choiceIdx)) {
        userAnswers.value[currentIndex.value] = current.filter(i => i !== choiceIdx);
    } else {
        userAnswers.value[currentIndex.value] = [...current, choiceIdx];
    }
};

// Whether the user has checked their answer on the current question
const isAnswerCorrect = computed(() => {
    if (!isChecked.value || !currentQuestion.value) return false;
    return isQuestionCorrect(currentQuestion.value, currentIndex.value);
});

// Build a readable string of correct answers for the feedback banner
const getCorrectAnswerText = (q: Question): string => {
    if (q.type === 'short_answer') return (q.acceptedAnswers || []).join(', ');
    const choices = getQuestionChoices(q);
    const correctIndices = (q.type === 'true_false' && (!q.correctIndices || q.correctIndices.length === 0))
        ? [0]
        : (q.correctIndices || []);
    return choices.filter((_, i) => correctIndices.includes(i)).join(', ');
};

const checkAnswer = () => {
    if (!isCurrentQuestionAnswered.value) return;
    isChecked.value = true;
    persistSession();
};

// Check if a specific question was answered correctly
const isQuestionCorrect = (q: Question, qIdx: number): boolean => {
    const ans = userAnswers.value[qIdx];
    if (ans === undefined || ans === null || ans === '') return false;

    if (q.type === 'single' || q.type === 'true_false') {
        const correctIndices = (q.type === 'true_false' && (!q.correctIndices || q.correctIndices.length === 0))
            ? [0]
            : (q.correctIndices || []);
        return correctIndices.includes(ans);
    }

    if (q.type === 'multiple') {
        const correctIndices = q.correctIndices;
        if (!Array.isArray(ans) || !correctIndices) return false;
        if (ans.length !== correctIndices.length) return false;
        return ans.every(idx => correctIndices.includes(idx));
    }

    if (q.type === 'short_answer') {
        const userInput = String(ans).trim().toLowerCase();
        return q.acceptedAnswers?.some(a => a.trim().toLowerCase() === userInput) ?? false;
    }

    return false;
};

// Calculate total score
const score = computed(() => {
    return props.quiz.questions.reduce((acc, q, idx) => {
        return isQuestionCorrect(q, idx) ? acc + 1 : acc;
    }, 0);
});

const handleNext = () => {
    if (currentIndex.value < totalQuestions.value - 1) {
        currentIndex.value++;
        isChecked.value = false;
        persistSession();
    } else {
        isFinished.value = true;
        isChecked.value = false;
        clearSession(quizId.value);
    }
};

const handlePrev = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
    isChecked.value = false;
    persistSession();
};

const restartQuiz = () => {
    userAnswers.value = {};
    currentIndex.value = 0;
    isFinished.value = false;
    isChecked.value = false;
    persistSession();
};

// --- Exit quiz ---
const showExitConfirm = ref(false);

const confirmExit = () => {
    clearSession(quizId.value);
    showExitConfirm.value = false;
    navigateTo('/');
};

const cancelExit = () => {
    showExitConfirm.value = false;
};
</script>

<template>
    <div class="space-y-6">
        <!-- Quiz Results Screen -->
        <div v-if="isFinished" class="card-surface !shadow-lg p-8 text-center sm:p-10">
            <div class="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-accent-diagonal shadow-accent-lg">
                <span class="font-display text-4xl text-white">
                    {{ Math.round((score / totalQuestions) * 100) }}%
                </span>
            </div>
            <div class="mt-6">
                <h2 class="font-display text-3xl text-foreground">Quiz Completed!</h2>
                <p class="mt-2 text-muted-foreground">
                    You scored <span class="font-semibold text-foreground">{{ score }}</span> out of
                    <span class="font-semibold text-foreground">{{ totalQuestions }}</span> correctly.
                </p>
            </div>

            <!-- Question Review Breakdown -->
            <div class="mt-8 max-h-96 space-y-4 overflow-y-auto border-t border-border pt-8 text-left">
                <h3 class="font-display text-xl text-foreground">Question Review</h3>
                <div v-for="(q, idx) in quiz.questions" :key="idx"
                    class="rounded-xl border p-4 text-sm transition-colors duration-200"
                    :class="isQuestionCorrect(q, idx)
                        ? 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
                        : 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'">
                    <div class="flex items-start justify-between gap-2">
                        <span class="font-medium text-foreground">{{ idx + 1 }}. {{ q.text }}</span>
                        <span class="shrink-0 font-semibold"
                            :class="isQuestionCorrect(q, idx)
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-red-700 dark:text-red-400'">
                            {{ isQuestionCorrect(q, idx) ? '✓ Correct' : '✗ Incorrect' }}
                        </span>
                    </div>
                    <div class="mt-1.5">
                        <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <AppIcon :name="getTypeMeta(q).icon" class="h-3 w-3" :stroke-width="2.5" />
                            {{ getTypeMeta(q).label }}
                        </span>
                    </div>
                    <p v-if="q.explanation" class="mt-2 text-xs text-muted-foreground">
                        💡 <span class="italic">{{ q.explanation }}</span>
                    </p>
                </div>
            </div>

            <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button @click="restartQuiz" class="btn-primary">
                    <AppIcon name="lucide:rotate-cw" class="h-4 w-4" :stroke-width="2.5" />
                    Try Again
                </button>
                <NuxtLink to="/" class="btn-outline">
                    Back to Dashboard
                </NuxtLink>
            </div>
        </div>

        <!-- Active Question Player -->
        <div v-else class="card-surface p-6 sm:p-8">
            <!-- Progress Bar & Question Counter -->
            <div class="space-y-2">
                <div class="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                    <span>Question {{ currentIndex + 1 }} of {{ totalQuestions }}</span>
                    <div class="flex items-center gap-3">
                        <span>{{ progressPercent }}% Completed</span>
                        <button @click="showExitConfirm = true" title="Exit quiz"
                            class="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.97]">
                            <AppIcon name="lucide:x" class="h-3.5 w-3.5" :stroke-width="2.5" />
                            Exit
                        </button>
                    </div>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full bg-gradient-accent transition-all duration-500 ease-out"
                        :style="{ width: `${progressPercent}%` }"></div>
                </div>
            </div>

            <!-- Question Type Badge -->
            <div class="mt-6 flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    :class="currentTypeMeta.badgeClass">
                    <AppIcon :name="currentTypeMeta.icon" class="h-3.5 w-3.5" :stroke-width="2.5" />
                    {{ currentTypeMeta.label }}
                </span>
            </div>

            <!-- Question Text -->
            <h2 class="mt-4 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                {{ currentQuestion?.text }}
            </h2>

            <!-- Helper Hint -->
            <p v-if="currentTypeMeta.hint" class="mt-2 text-sm text-muted-foreground">
                {{ currentTypeMeta.hint }}
            </p>

            <!-- Answer Input Types -->
            <div class="mt-6 space-y-3">
                <!-- Single Choice & True/False -->
                <template v-if="currentQuestion?.type === 'single' || currentQuestion?.type === 'true_false'">
                    <button v-for="(choice, cIdx) in getQuestionChoices(currentQuestion)" :key="cIdx"
                        @click="handleSingleSelect(cIdx)"
                        :disabled="isChecked"
                        class="group flex w-full items-center justify-between rounded-xl border p-4 text-left font-medium transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                        :class="userAnswers[currentIndex] === cIdx
                            ? 'border-accent bg-accent/5 text-foreground shadow-accent'
                            : 'border-border bg-card text-foreground hover:border-accent/30 hover:bg-muted/50'">
                        <span>{{ choice }}</span>
                        <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                            :class="userAnswers[currentIndex] === cIdx
                                ? 'border-accent bg-gradient-accent text-white'
                                : 'border-border group-hover:border-accent/40'">
                            <span v-if="userAnswers[currentIndex] === cIdx" class="text-xs">✓</span>
                        </div>
                    </button>
                </template>

                <!-- Multiple Choice -->
                <template v-else-if="currentQuestion?.type === 'multiple'">
                    <button v-for="(choice, cIdx) in currentQuestion.choices" :key="cIdx"
                        @click="handleMultipleToggle(cIdx)"
                        :disabled="isChecked"
                        class="group flex w-full items-center justify-between rounded-xl border p-4 text-left font-medium transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                        :class="(userAnswers[currentIndex] || []).includes(cIdx)
                            ? 'border-accent bg-accent/5 text-foreground shadow-accent'
                            : 'border-border bg-card text-foreground hover:border-accent/30 hover:bg-muted/50'">
                        <span>{{ choice }}</span>
                        <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-200"
                            :class="(userAnswers[currentIndex] || []).includes(cIdx)
                                ? 'border-accent bg-gradient-accent text-white'
                                : 'border-border group-hover:border-accent/40'">
                            <span v-if="(userAnswers[currentIndex] || []).includes(cIdx)" class="text-xs">✓</span>
                        </div>
                    </button>
                </template>

                <!-- Short Answer Input -->
                <template v-else-if="currentQuestion?.type === 'short_answer'">
                    <input v-model="userAnswers[currentIndex]" type="text" placeholder="Type your answer here..."
                        :disabled="isChecked"
                        class="h-14 w-full rounded-xl border border-border bg-card px-4 font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60" />
                </template>
            </div>

            <!-- Feedback Banner -->
            <div v-if="isChecked" class="mt-4 border p-4 text-sm"
                :class="isAnswerCorrect
                    ? 'alert-success'
                    : 'alert-error'">
                <p class="font-semibold">{{ isAnswerCorrect ? '✓ Correct!' : '✗ Incorrect' }}</p>
                <p v-if="!isAnswerCorrect && currentQuestion" class="mt-1">
                    Correct answer: <span class="font-semibold">{{ getCorrectAnswerText(currentQuestion) }}</span>
                </p>
                <p v-if="currentQuestion?.explanation" class="mt-1 text-xs italic opacity-80">
                    💡 <span>{{ currentQuestion.explanation }}</span>
                </p>
            </div>

            <!-- Navigation Buttons -->
            <div class="mt-8 flex items-center justify-between border-t border-border pt-6">
                <button @click="handlePrev" :disabled="currentIndex === 0 || isChecked" class="btn-outline !py-2.5">
                    <AppIcon name="lucide:arrow-left" class="h-4 w-4" :stroke-width="2.5" />
                    Previous
                </button>

                <button v-if="!isChecked" @click="checkAnswer" :disabled="!isCurrentQuestionAnswered"
                    class="btn-primary group disabled:cursor-not-allowed disabled:opacity-40">
                    Check Answer
                    <AppIcon name="lucide:check" class="h-4 w-4" :stroke-width="2.5" />
                </button>
                <button v-else @click="handleNext" class="btn-primary group">
                    {{ currentIndex === totalQuestions - 1 ? 'Finish Quiz' : 'Next' }}
                    <AppIcon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" :stroke-width="2.5" />
                </button>
            </div>
        </div>

        <!-- Exit Quiz Confirmation -->
        <ConfirmDialog v-if="showExitConfirm"
            title="Exit quiz?"
            message="Your progress will be saved so you can continue later. Do you want to exit this quiz?"
            confirm-label="Exit Quiz"
            cancel-label="Stay"
            @confirm="confirmExit"
            @cancel="cancelExit" />
    </div>
</template>
