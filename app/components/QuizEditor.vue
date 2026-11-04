<!-- app/components/QuizEditor.vue -->
<script setup lang="ts">
import { generateId } from '~/utils/id';
import type { Quiz, Question, QuestionType } from '~/types/quiz';

const props = defineProps<{
    quiz?: Quiz | null;  // null = creating new
}>();

const emit = defineEmits(['save', 'cancel']);

const quizTitle = ref(props.quiz?.title || '');
const quizDescription = ref(props.quiz?.description || '');

const sanitizeQuestion = (q: Question): Question => {
    if (q.type === 'true_false') {
        const first = q.correctIndices?.[0];
        return {
            ...q,
            choices: ['True', 'False'],
            correctIndices: typeof first === 'number' ? [first] : [0],
        };
    }
    return q;
};

const questions = ref<Question[]>(
    props.quiz?.questions ? JSON.parse(JSON.stringify(props.quiz.questions)).map(sanitizeQuestion) : []
);

// === Helpers ===

// Insert a blank question of the given type
function addQuestion(type: QuestionType = 'single') {
    questions.value.push({
        id: generateId(),
        type,
        text: '',
        explanation: '',
        choices: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
        correctIndices: type === 'true_false' ? [0] : [],
        acceptedAnswers: type === 'short_answer' ? [''] : [],
    });
}

function handleTypeChange(q: Question) {
    if (q.type === 'true_false') {
        q.choices = ['True', 'False'];
        const first = q.correctIndices?.[0];
        if (typeof first === 'number' && first <= 1) {
            q.correctIndices = [first];
        } else {
            q.correctIndices = [0];
        }
    } else if (q.type === 'short_answer') {
        if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
            q.acceptedAnswers = [''];
        }
    } else {
        // 'single' or 'multiple'
        const isDefaultTf = q.choices?.length === 2 && q.choices[0] === 'True' && q.choices[1] === 'False';
        if (!q.choices || q.choices.length < 2 || isDefaultTf) {
            q.choices = ['', '', '', ''];
            q.correctIndices = q.type === 'single' ? [0] : [];
        } else if (q.type === 'single' && (q.correctIndices?.length ?? 0) > 1) {
            const first = q.correctIndices?.[0];
            q.correctIndices = typeof first === 'number' ? [first] : [0];
        }
    }
}

function removeQuestion(idx: number) {
    questions.value.splice(idx, 1);
}

function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.value.length) return;
    const q = questions.value[idx];
    if (!q) return;
    questions.value.splice(idx, 1);
    questions.value.splice(target, 0, q);
}

// Ensure choices array exists (used in template to avoid undefined access)
function getChoices(q: Question): string[] {
    return q.choices || (q.choices = []);
}

// Ensure acceptedAnswers array exists (used in template to avoid undefined access)
function getAcceptedAnswers(q: Question): string[] {
    return q.acceptedAnswers || (q.acceptedAnswers = []);
}

// Sync user's correct-answer choice into correctIndices array
function syncCorrectIndices(q: Question) {
    if (q.type === 'single' || q.type === 'true_false') {
        const selected = q.correctIndices?.[0] ?? -1;
        q.correctIndices = selected >= 0 ? [selected] : [];
    }
}

// Toggle a choice in the correct answer set for multiple-choice
function toggleCorrectChoice(q: Question, cIdx: number) {
    const curr = q.correctIndices || [];
    if (curr.includes(cIdx)) {
        q.correctIndices = curr.filter(i => i !== cIdx);
    } else {
        q.correctIndices = [...curr, cIdx];
    }
}

// === Save ===

function handleSave() {
    // Basic client-side validation
    if (!quizTitle.value.trim()) {
        alert('Please enter a quiz title.');
        return;
    }
    if (questions.value.length === 0) {
        alert('Add at least one question.');
        return;
    }

    for (const [i, q] of questions.value.entries()) {
        if (!q.text.trim()) {
            alert(`Question ${i + 1} is missing question text.`);
            return;
        }
        if (q.type === 'single' || q.type === 'multiple') {
            const validChoices = (q.choices || []).filter(c => c.trim());
            if (validChoices.length < 2) {
                alert(`Question ${i + 1} needs at least 2 choices.`);
                return;
            }
            if (!q.correctIndices || q.correctIndices.length === 0) {
                alert(`Question ${i + 1} needs a correct answer selected.`);
                return;
            }
        } else if (q.type === 'short_answer') {
            const validAnswers = (q.acceptedAnswers || []).filter(a => a.trim());
            if (validAnswers.length === 0) {
                alert(`Question ${i + 1} needs at least one accepted answer.`);
                return;
            }
        } else if (q.type === 'true_false') {
            if (!q.correctIndices || q.correctIndices.length === 0) {
                q.correctIndices = [0];
            }
            q.choices = ['True', 'False'];
        }
    }

    const quizData = {
        title: quizTitle.value.trim(),
        description: quizDescription.value.trim(),
        questions: questions.value.map(q => {
            // Build a clean object per question type
            const base = {
                id: q.id,
                type: q.type,
                text: q.text,
                explanation: q.explanation || '',
            };

            if (q.type === 'short_answer') {
                return {
                    ...base,
                    acceptedAnswers: (q.acceptedAnswers || []).filter(a => a.trim()),
                };
            }

            if (q.type === 'true_false') {
                const first = q.correctIndices?.[0];
                const correctIdx = typeof first === 'number' ? first : 0;
                return {
                    ...base,
                    choices: ['True', 'False'],
                    correctIndices: [correctIdx],
                };
            }

            return {
                ...base,
                choices: (q.choices || []).filter(c => c.trim()),
                correctIndices: [...(q.correctIndices || [])],
            };
        }),
    };

    emit('save', quizData);
}
</script>

<template>
    <div class="space-y-6">
        <!-- Title & Description -->
        <div class="card-surface space-y-4 p-6">
            <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Quiz Title</label>
                <input v-model="quizTitle" type="text" placeholder="e.g. World Capitals Quiz"
                    class="h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background" />
            </div>
            <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Description (optional)</label>
                <textarea v-model="quizDescription" rows="2" placeholder="What is this quiz about?"
                    class="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"></textarea>
            </div>
        </div>

        <!-- Questions -->
        <div class="space-y-4">
            <div v-for="(q, qIdx) in questions" :key="q.id"
                class="card-surface p-6">
                <!-- Question header -->
                <div class="mb-4 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-accent text-sm font-semibold text-white">
                            {{ qIdx + 1 }}
                        </span>
                        <!-- Question type selector -->
                        <select v-model="q.type" @change="handleTypeChange(q)"
                            class="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent">
                            <option value="single">Single Choice</option>
                            <option value="multiple">Multiple Choice</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-1">
                        <!-- Reorder: move up -->
                        <button type="button" @click="moveQuestion(qIdx, -1)" :disabled="qIdx === 0"
                            class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move up">
                            <AppIcon name="lucide:chevron-up" class="h-4 w-4" />
                        </button>
                        <!-- Reorder: move down -->
                        <button type="button" @click="moveQuestion(qIdx, 1)" :disabled="qIdx === questions.length - 1"
                            class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move down">
                            <AppIcon name="lucide:chevron-down" class="h-4 w-4" />
                        </button>
                        <!-- Remove question -->
                        <button type="button" @click="removeQuestion(qIdx)"
                            class="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            aria-label="Remove question">
                            <AppIcon name="lucide:trash-2" class="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <!-- Question text -->
                <input v-model="q.text" type="text" placeholder="Enter question text..."
                    class="mb-4 h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background" />

                <!-- Choices (single / multiple) -->
                <div v-if="q.type === 'single' || q.type === 'multiple'" class="space-y-2">
                    <div v-for="(choice, cIdx) in getChoices(q)" :key="cIdx"
                        class="flex items-center gap-2">
                        <!-- Radio (single) / Checkbox (multiple) selector -->
                        <button type="button"
                            @click="q.type === 'single' ? (q.correctIndices = [cIdx]) : toggleCorrectChoice(q, cIdx)"
                            class="flex h-6 w-6 shrink-0 items-center justify-center transition-colors"
                            :class="[
                                q.type === 'single' ? 'rounded-full border' : 'rounded border',
                                (q.correctIndices || []).includes(cIdx)
                                    ? 'border-accent bg-gradient-accent text-white'
                                    : 'border-border hover:border-accent/40'
                            ]"
                            :title="(q.correctIndices || []).includes(cIdx) ? 'Marked as correct answer' : 'Mark as correct answer'">
                            <AppIcon v-if="(q.correctIndices || []).includes(cIdx)" name="lucide:check" class="h-3.5 w-3.5" :stroke-width="3" />
                        </button>

                        <input v-model="getChoices(q)[cIdx]" type="text"
                            :placeholder="`Choice ${cIdx + 1}`"
                            class="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />

                        <!-- Remove choice -->
                        <button type="button" v-if="getChoices(q).length > 2"
                            @click="getChoices(q).splice(cIdx, 1); q.correctIndices = (q.correctIndices || []).filter(i => i !== cIdx).map(i => i > cIdx ? i - 1 : i)"
                            class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label="Remove choice">
                            <AppIcon name="lucide:x" class="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <!-- Add choice button -->
                    <button type="button" @click="getChoices(q).push('')"
                        class="btn-ghost text-sm text-accent">
                        <AppIcon name="lucide:plus" class="h-4 w-4" />
                        Add choice
                    </button>
                </div>

                <!-- Choices (true_false) -->
                <div v-else-if="q.type === 'true_false'" class="space-y-2">
                    <label class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Correct Answer
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <button type="button"
                            v-for="(option, oIdx) in ['True', 'False']"
                            :key="option"
                            @click="q.correctIndices = [oIdx]; q.choices = ['True', 'False']"
                            class="group flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99]"
                            :class="(q.correctIndices || []).includes(oIdx)
                                ? 'border-accent bg-accent/10 text-foreground ring-1 ring-accent'
                                : 'border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/40'">
                            <div class="flex items-center gap-3">
                                <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                                    :class="(q.correctIndices || []).includes(oIdx)
                                        ? 'border-accent bg-gradient-accent text-white'
                                        : 'border-border group-hover:border-accent/40'">
                                    <AppIcon v-if="(q.correctIndices || []).includes(oIdx)" name="lucide:check" class="h-3 w-3" :stroke-width="3" />
                                </div>
                                <span class="text-sm font-semibold sm:text-base">{{ option }}</span>
                            </div>
                            <span v-if="(q.correctIndices || []).includes(oIdx)" class="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                                Correct
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Accepted answers (short_answer) -->
                <div v-else-if="q.type === 'short_answer'" class="space-y-2">
                    <div v-for="(ans, aIdx) in getAcceptedAnswers(q)" :key="aIdx"
                        class="flex items-center gap-2">
                        <input v-model="getAcceptedAnswers(q)[aIdx]" type="text" placeholder="Accepted answer (case-insensitive)"
                            class="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
                        <button type="button" @click="getAcceptedAnswers(q).splice(aIdx, 1)"
                            class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label="Remove accepted answer">
                            <AppIcon name="lucide:x" class="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <button type="button" @click="getAcceptedAnswers(q).push('')" class="btn-ghost text-sm text-accent">
                        <AppIcon name="lucide:plus" class="h-4 w-4" />
                        Add accepted answer
                    </button>
                </div>

                <!-- Explanation -->
                <input v-model="q.explanation" type="text" placeholder="Explanation (shown after answering, optional)"
                    class="mt-4 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>

            <!-- Add Question Button -->
            <button type="button" @click="addQuestion('single')"
                class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-6 py-5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground">
                <AppIcon name="lucide:plus" class="h-4 w-4" />
                Add Question
            </button>
        </div>

        <!-- Footer actions -->
        <div class="flex justify-end gap-3 border-t border-border pt-6">
            <button type="button" @click="$emit('cancel')" class="btn-outline">Cancel</button>
            <button type="button" @click="handleSave" class="btn-primary group">
                Save Quiz
                <AppIcon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" :stroke-width="2.5" />
            </button>
        </div>
    </div>
</template>
