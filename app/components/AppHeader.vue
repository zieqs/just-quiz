<!-- app/components/AppHeader.vue -->
<script setup lang="ts">
import type { QuizSession } from '~/composables/useQuizSession';

const isMenuOpen = ref(false);
const route = useRoute();
const { mode, toggleMode } = useColorMode();
const { sessions } = useQuizSession();

const navLinks = [
    { label: 'About', to: '/about' },
    { label: 'Format', to: '/format' },
    { label: 'Dashboard', to: '/' },
];

const closeMenu = () => {
    isMenuOpen.value = false;
};

watch(() => route.fullPath, closeMenu);

// Most recently active quiz session, used for the "Resume quiz" pill.
// Hidden on quiz pages themselves — the player is already visible there.
const activeSession = computed<QuizSession | null>(() => {
    if (route.path.startsWith('/quiz/')) return null;
    const all = Object.values(sessions.value);
    if (all.length === 0) return null;
    return all.reduce<QuizSession>((latest, s) => (s.updatedAt > latest.updatedAt ? s : latest), all[0]!);
});
</script>

<template>
    <header class="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-2" @click="closeMenu">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-accent">
                    <AppIcon name="lucide:check-check" class="h-6 w-6 text-white" :stroke-width="3.5" />
                </span>
                <span class="font-display text-xl tracking-tight">
                    Just<span class="gradient-text">Quiz</span>
                </span>
            </NuxtLink>

            <!-- Desktop Nav -->
            <nav class="hidden items-center gap-1 md:flex">
                <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
                    class="rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
                    :class="route.path === link.to
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'">
                    {{ link.label }}
                </NuxtLink>
                <!-- Install / Launch CTA (visible at tablet/desktop widths) -->
                <LaunchAppButton label="Install JustQuiz" class="ml-2" />
            </nav>

            <!-- Right side: theme toggle + mobile menu button -->
            <div class="flex items-center gap-1">
                <!-- Theme toggle -->
                <button class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    :aria-label="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                    :title="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                    @click="toggleMode">
                    <AppIcon v-if="mode === 'dark'" name="lucide:sun" class="h-5 w-5" />
                    <AppIcon v-else name="lucide:moon" class="h-5 w-5" />
                </button>

                <!-- Mobile Menu Toggle -->
                <button class="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" @click="isMenuOpen = !isMenuOpen"
                    aria-label="Toggle navigation">
                    <AppIcon v-if="!isMenuOpen" name="lucide:menu" class="h-6 w-6" />
                    <AppIcon v-else name="lucide:x" class="h-6 w-6" />
                </button>
            </div>
        </div>

        <!-- Resume Quiz Banner -->
        <div v-if="activeSession"
            class="cursor-pointer border-t border-accent/20 bg-accent/5 transition-colors duration-200 hover:bg-accent/10">
            <NuxtLink :to="activeSession.quizUrl" @click="closeMenu"
                class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
                <span class="flex items-center gap-2 text-xs font-medium text-foreground sm:text-sm">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-white">
                        <AppIcon name="lucide:play" class="h-3 w-3" :stroke-width="2.5" />
                    </span>
                    <span class="min-w-0">
                        <span class="font-semibold text-accent">Resume quiz:</span>
                        <span class="ml-1.5 truncate">{{ activeSession.quizTitle }}</span>
                    </span>
                </span>
                <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>Question {{ activeSession.currentIndex + 1 }} of {{ activeSession.totalQuestions }}</span>
                    <AppIcon name="lucide:arrow-right" class="h-3.5 w-3.5" :stroke-width="2.5" />
                </span>
            </NuxtLink>
        </div>

        <!-- Mobile Menu -->
        <Transition enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2">
            <nav v-if="isMenuOpen" class="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
                <div class="flex flex-col gap-1">
                    <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to"
                        class="rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200"
                        :class="route.path === link.to
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'">
                        {{ link.label }}
                    </NuxtLink>
                    <LaunchAppButton label="Install JustQuiz" class="mt-2 w-full" />
                </div>
            </nav>
        </Transition>
    </header>
</template>