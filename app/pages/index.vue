<!-- app/pages/index.vue -->
<script setup lang="ts">
import type { Quiz } from '~/types/quiz';

const { getAllQuizzes, deleteQuiz } = useQuizDb();
const { isFirstVisit, checkFirstVisit } = useFirstVisit();

const quizzes = ref<Quiz[]>([]);
const isImportOpen = ref(false);
const isCreateMenuOpen = ref(false);

// --- Delete confirmation ---
const quizToDelete = ref<Quiz | null>(null);

// --- Share modal ---
const quizToShare = ref<Quiz | null>(null);

// --- Search & sort ---

type SortOption =
  | 'updated_desc'
  | 'created_asc'
  | 'title_asc'
  | 'title_desc'
  | 'questions_desc'
  | 'questions_asc';

const searchQuery = ref('');
const sortBy = ref<SortOption>('updated_desc');

const isFiltering = computed(() => searchQuery.value.trim() !== '');

const filteredQuizzes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const list = query
    ? quizzes.value.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        (q.description ?? '').toLowerCase().includes(query)
    )
    : [...quizzes.value];

  switch (sortBy.value) {
    case 'created_asc':
      return list.sort((a, b) => a.createdAt - b.createdAt);
    case 'title_asc':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'title_desc':
      return list.sort((a, b) => b.title.localeCompare(a.title));
    case 'questions_desc':
      return list.sort((a, b) => b.questions.length - a.questions.length);
    case 'questions_asc':
      return list.sort((a, b) => a.questions.length - b.questions.length);
    case 'updated_desc':
    default:
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

const loadQuizzes = async () => {
  quizzes.value = await getAllQuizzes();
};

const confirmDelete = (quiz: Quiz) => {
  quizToDelete.value = quiz;
};

const handleConfirmDelete = async () => {
  if (!quizToDelete.value) return;
  await deleteQuiz(quizToDelete.value.id);
  await loadQuizzes();
  quizToDelete.value = null;
};

const cancelDelete = () => {
  quizToDelete.value = null;
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (isCreateMenuOpen.value && target && !target.closest('[data-create-menu]')) {
    isCreateMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  // Guide first-time users to the About/onboarding page before showing the dashboard.
  checkFirstVisit();
  if (isFirstVisit.value) {
    navigateTo('/about');
    return;
  }

  loadQuizzes();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <!-- Header -->
    <div class="mb-10 space-y-4">
      <div class="section-label">
        <span class="section-label-dot" />
        <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">Dashboard</span>
      </div>

      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 class="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            My <span class="gradient-text">Quizzes</span>
          </h1>
          <p class="mt-2 text-muted-foreground">
            <span v-if="isFiltering">{{ filteredQuizzes.length }} of {{ quizzes.length }} shown</span>
            <span v-else>{{ quizzes.length }} {{ quizzes.length === 1 ? 'quiz' : 'quizzes' }} saved on this
              device.</span>
          </p>
        </div>

        <div class="flex flex-col items-end gap-2">
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <!-- Create New dropdown -->
            <div class="relative w-full sm:w-auto" data-create-menu>
              <button @click="isCreateMenuOpen = !isCreateMenuOpen" :aria-expanded="isCreateMenuOpen"
                class="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-accent px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-accent active:translate-y-0 active:scale-[0.98] sm:w-auto sm:justify-start sm:pl-4 sm:pr-2.5">
                <AppIcon name="lucide:plus" class="h-4 w-4 transition-transform duration-200 group-hover:rotate-90"
                  :class="{ 'rotate-90': isCreateMenuOpen }" :stroke-width="2.5" />
                <span>Create New</span>
                <AppIcon name="lucide:chevron-down" class="ml-1 h-3.5 w-3.5 transition-transform duration-200"
                  :class="{ 'rotate-180': isCreateMenuOpen }" :stroke-width="2.5" />
              </button>

              <!-- Dropdown -->
              <div v-if="isCreateMenuOpen"
                class="absolute left-0 right-0 z-50 mx-auto mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl sm:left-auto sm:mx-0">
                <button @click="isImportOpen = true; isCreateMenuOpen = false"
                  class="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted">
                  <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <AppIcon name="lucide:download" class="h-4 w-4" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-foreground">From AI</span>
                    <span class="block text-xs text-muted-foreground">Paste AI-generated JSON</span>
                  </span>
                </button>

                <div class="mx-4 my-1.5 h-px bg-border" aria-hidden="true" />

                <button @click="navigateTo('/quiz/new')"
                  class="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted">
                  <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <AppIcon name="lucide:edit-3" class="h-4 w-4" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-foreground">With Editor</span>
                    <span class="block text-xs text-muted-foreground">Build quiz step-by-step</span>
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Search & Sort Toolbar -->
    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <AppIcon name="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input v-model="searchQuery" type="search" placeholder="Search quizzes by title or description..."
          class="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/20" />
        <button v-if="searchQuery" @click="searchQuery = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear search">
          <AppIcon name="lucide:x" class="h-3.5 w-3.5" :stroke-width="2.5" />
        </button>
      </div>

      <div class="relative shrink-0 sm:w-56">
        <AppIcon name="lucide:arrow-up-down" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select v-model="sortBy" aria-label="Sort quizzes"
          class="w-full appearance-none rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/20">
          <option value="updated_desc">Newest first</option>
          <option value="created_asc">Oldest first</option>
          <option value="title_asc">Title A-Z</option>
          <option value="title_desc">Title Z-A</option>
          <option value="questions_desc">Most questions</option>
          <option value="questions_asc">Least questions</option>
        </select>
        <AppIcon name="lucide:chevron-down" class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="quizzes.length === 0"
      class="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-20 text-center">
      <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <AppIcon name="lucide:check-check" class="h-8 w-8 text-accent" />
      </div>
      <h3 class="font-display text-2xl text-foreground">No quizzes yet</h3>
      <p class="mt-2 max-w-sm text-muted-foreground">
        Paste an AI-generated JSON quiz to start practicing offline. Takes less than a minute.
      </p>
      <button @click="isImportOpen = true" class="btn-primary mt-8">
        Import your first quiz
      </button>
    </div>

    <!-- Quiz Grid -->
    <div v-else-if="filteredQuizzes.length > 0" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="quiz in filteredQuizzes" :key="quiz.id" class="card-surface group flex flex-col p-6">
        <h2 class="text-lg font-semibold tracking-tight text-foreground line-clamp-2">
          {{ quiz.title }}
        </h2>

        <span class="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <AppIcon name="lucide:inbox" class="h-4 w-4" />
          {{ quiz.questions.length }} {{ quiz.questions.length === 1 ? 'question' : 'questions' }}
        </span>

        <p v-if="quiz.description" class="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {{ quiz.description }}
        </p>

        <div class="mt-auto flex items-center gap-2 pt-4">
          <NuxtLink :to="getQuizUrl(quiz)"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:brightness-110 hover:shadow-accent active:scale-[0.98]">
            Play
            <AppIcon name="lucide:play" class="h-3.5 w-3.5" :stroke-width="2.5" />
          </NuxtLink>
          <button @click="quizToShare = quiz" title="Share quiz"
            class="inline-flex items-center rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.98]"
            aria-label="Share quiz">
            <AppIcon name="lucide:share-2" class="h-4 w-4" />
          </button>
          <NuxtLink :to="`/quiz/edit/${quiz.id.slice(0, 8)}`"
            class="inline-flex items-center rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-[0.98]"
            aria-label="Edit quiz">
            <AppIcon name="lucide:edit-3" class="h-4 w-4" />
          </NuxtLink>
          <button @click="confirmDelete(quiz)" title="Delete quiz"
            class="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-600 transition-all duration-200 hover:bg-red-100 active:scale-[0.98] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            aria-label="Delete quiz">
            <AppIcon name="lucide:trash-2" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- No Results -->
    <div v-else
      class="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <AppIcon name="lucide:search-x" class="h-7 w-7 text-accent" />
      </div>
      <h3 class="font-display text-xl text-foreground">No quizzes found</h3>
      <p class="mt-1 max-w-sm text-sm text-muted-foreground">
        No quizzes match your search. Try a different keyword.
      </p>
      <button @click="searchQuery = ''" class="btn-outline mt-6">Clear search</button>
    </div>

    <!-- Delete confirmation -->
    <ConfirmDialog v-if="quizToDelete" title="Delete quiz?"
      :message='`"${quizToDelete.title}" will be permanently deleted from this device.`' confirm-label="Delete"
      cancel-label="Cancel" danger @confirm="handleConfirmDelete" @cancel="cancelDelete" />

    <!-- Share modal -->
    <ShareModal v-if="quizToShare" :quiz="quizToShare" @close="quizToShare = null" />

    <!-- Import Modal -->
    <ImportModal v-if="isImportOpen" @close="isImportOpen = false" @quiz-added="loadQuizzes" />
  </main>
</template>
