<!-- app/pages/about.vue -->
<script setup lang="ts">
const { markVisited } = useFirstVisit();

onMounted(() => {
  // Mark the visit immediately — returning users should go straight to the dashboard.
  markVisited();
});

const features = [
    {
        title: 'Paste → Play',
        description: 'Ask any AI chatbot to turn your notes into a quiz, then paste the result straight into JustQuiz. It takes less than a minute.',
        icon: 'import',
    },
    {
        title: 'Stored on your machine',
        description: 'Your quizzes are saved in a local SQLite database on the computer running JustQuiz, so your study data stays with you.',
        icon: 'offline',
    },
    {
        title: 'Private by design',
        description: 'No account and no cloud service. Your quizzes never leave your machine; the app only talks to its own local database.',
        icon: 'private',
    },
];

const steps = [
    {
        number: '01',
        title: 'Get your notes ready',
        description: 'Copy any study material, like lecture notes, a chapter, or your revision guide, into an AI chatbot. Grab the ready-made prompt on the Format page.',
    },
    {
        number: '02',
        title: 'Generate a quiz',
        description: 'Ask the AI to turn your notes into a quiz. It returns one block of quiz data. Just copy it all.',
    },
    {
        number: '03',
        title: 'Import & practice',
        description: 'Paste it into JustQuiz and play. You get instant feedback, explanations, and a score review that shows what to revise.',
    },
];
</script>

<template>
    <div>
        <!-- Hero Section -->
        <section class="relative overflow-hidden">
            <div class="pointer-events-none absolute inset-0 glow-accent" />

            <div class="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
                <!-- Hero Text -->
                <div class="space-y-8">
                    <div class="section-label fade-up">
                        <span class="section-label-dot" />
                        <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">Study Tool · PWA · Local Database</span>
                    </div>

                    <h1 class="font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl fade-up-delay-1">
                        Turn your notes into
                        <span class="relative inline-block">
                            <span class="gradient-text">quizzes you'll want to study</span>
                            <span class="absolute -bottom-1 left-0 h-2 w-full rounded-sm bg-gradient-to-r from-accent/20 to-accent-secondary/10 sm:h-3" />
                        </span>
                    </h1>

                    <p class="max-w-lg text-lg leading-relaxed text-muted-foreground fade-up-delay-2">
                        JustQuiz turns your lecture notes, textbook chapters, or study guides into interactive quizzes right in your browser. No account, no setup, no cloud service. Your quizzes are stored in a local database on this machine.
                    </p>

                    <div class="flex flex-col gap-4 sm:flex-row fade-up-delay-3">
                        <NuxtLink to="/" class="btn-primary group h-12 px-8 text-base">
                            Start studying
                            <AppIcon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" :stroke-width="2.5" />
                        </NuxtLink>
                        <a href="#how-it-works" class="btn-outline h-12 px-8 text-base">
                            How it works
                        </a>
                    </div>
                </div>

                <!-- Animated Hero Graphic -->
                <div class="relative hidden h-[420px] items-center justify-center lg:flex">
                    <!-- Rotating ring -->
                    <div class="absolute h-72 w-72 animate-spin-slow rounded-full border-2 border-dashed border-accent/30" />

                    <!-- Outer ring -->
                    <div class="absolute h-96 w-96 rounded-full border border-border" />

                    <!-- Center gradient orb -->
                    <div class="relative flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-accent-diagonal shadow-accent-lg">
                        <AppIcon name="lucide:check-check" class="h-16 w-16 text-white" />
                    </div>

                    <!-- Floating card: question -->
                    <div class="absolute left-6 top-10 animate-float-slow rounded-xl border border-border bg-card p-4 shadow-lg">
                        <div class="flex items-center gap-2">
                            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                                <span class="h-2.5 w-2.5 rounded-full bg-accent animate-pulse-dot" />
                            </span>
                            <p class="text-sm font-semibold">Question 3 of 10</p>
                        </div>
                        <p class="mt-2 max-w-[180px] text-xs text-muted-foreground">What is the capital of France?</p>
                        <div class="mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div class="h-full w-[30%] rounded-full bg-gradient-accent" />
                        </div>
                    </div>

                    <!-- Floating card: score -->
                    <div class="absolute bottom-8 right-4 animate-float-slower rounded-xl border border-border bg-card p-4 shadow-lg">
                        <div class="flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent text-sm font-bold text-white">
                                90
                            </span>
                            <div>
                                <p class="text-sm font-semibold">Great job!</p>
                                <p class="text-xs text-muted-foreground">9 of 10 correct</p>
                            </div>
                        </div>
                    </div>

                    <!-- Corner accent block -->
                    <div class="absolute bottom-16 left-2 h-12 w-12 rounded-xl bg-accent shadow-accent" />

                    <!-- Decorative dots grid -->
                    <div class="absolute right-8 top-6 grid grid-cols-3 gap-2">
                        <span v-for="i in 9" :key="i" class="h-1.5 w-1.5 rounded-full bg-accent/30" />
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="relative border-t border-border/60 py-24 lg:py-32">
            <div class="mx-auto max-w-6xl px-4 sm:px-6">
                <div class="mb-14 text-center">
                    <div class="section-label mb-5">
                        <span class="section-label-dot" />
                        <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">Why JustQuiz</span>
                    </div>
                    <h2 class="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                        Nothing extra.
                        <span class="gradient-text">Just the features that matter.</span>
                    </h2>
                </div>

                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div v-for="feature in features" :key="feature.title"
                        class="card-surface group p-8">
                        <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-accent transition-transform duration-300 group-hover:scale-110">
                            <!-- Import icon -->
                            <AppIcon v-if="feature.icon === 'import'" name="lucide:download" class="h-7 w-7 text-white" />
                            <!-- Offline icon -->
                            <AppIcon v-else-if="feature.icon === 'offline'" name="lucide:wifi-off" class="h-7 w-7 text-white" />
                            <!-- Privacy icon -->
                            <AppIcon v-else name="lucide:shield" class="h-7 w-7 text-white" />
                        </div>
                        <h3 class="text-xl font-semibold tracking-tight text-foreground">{{ feature.title }}</h3>
                        <p class="mt-2 leading-relaxed text-muted-foreground">{{ feature.description }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Inverted Section: How It Works -->
        <section id="how-it-works" class="relative overflow-hidden bg-inverted-bg py-24 text-inverted-fg lg:py-32">
            <div class="dot-pattern absolute inset-0" />
            <div class="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
            <div class="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-accent-secondary/10 blur-[100px]" />

            <div class="relative mx-auto max-w-6xl px-4 sm:px-6">
                <div class="mb-14 text-center">
                    <div class="section-label mb-5 !border-accent/40 !bg-accent/10">
                        <span class="section-label-dot" />
                        <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent-secondary dark:text-accent">Getting Started</span>
                    </div>
                    <h2 class="font-display text-3xl leading-tight sm:text-4xl">
                        Three steps to <span class="gradient-text dark:!to-accent">your first quiz</span>
                    </h2>
                </div>

                <div class="grid gap-8 md:grid-cols-3">
                    <div v-for="(step, idx) in steps" :key="step.number"
                        class="relative rounded-xl border border-inverted-fg/10 bg-inverted-fg/5 p-8 backdrop-blur-sm">
                        <div class="mb-6 flex items-center justify-between">
                            <span class="font-display text-5xl text-inverted-fg/10">{{ step.number }}</span>
                            <span v-if="idx < steps.length - 1"
                                class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent text-white shadow-accent">
                                <AppIcon name="lucide:arrow-right" class="h-4 w-4" :stroke-width="2.5" />
                            </span>
                        </div>
                        <h3 class="text-xl font-semibold text-inverted-fg">{{ step.title }}</h3>
                        <p class="mt-2 leading-relaxed text-inverted-fg/70">{{ step.description }}</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Final CTA -->
        <section class="relative overflow-hidden py-24 lg:py-32">
            <div class="pointer-events-none absolute inset-0 glow-accent" />

            <div class="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
                <div class="section-label mb-5">
                    <span class="section-label-dot" />
                    <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">Get Started</span>
                </div>
                <h2 class="font-display text-3xl leading-tight text-foreground sm:text-5xl">
                    Get a quiz from your notes <span class="gradient-text">in under a minute</span>
                </h2>
                <p class="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                    Copy a prompt, paste your notes, and start practicing in under a minute. No sign-up, no downloads.
                </p>
                <div class="mt-8">
                    <NuxtLink to="/" class="btn-primary group h-14 px-10 text-base">
                        Start studying
                        <AppIcon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" :stroke-width="2.5" />
                    </NuxtLink>
                </div>
            </div>
        </section>

    </div>
</template>
