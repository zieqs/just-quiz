// https://nuxt.com/docs/api/configuration/nuxt-config

// GitHub Pages serves the site from a sub-path like /just-quiz/
// Set via env in CI (e.g. NUXT_APP_BASE_URL=${{ steps.pages.outputs.base_path }})
// NOTE: configure-pages outputs a path WITHOUT a trailing slash (e.g. /just-quiz).
// We normalize it here so string concatenation below (`${baseURL}manifest.webmanifest`)
// produces valid URLs like /just-quiz/manifest.webmanifest instead of /just-quizmanifest.webmanifest.
const rawBaseURL = process.env.NUXT_APP_BASE_URL || '/';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // SPA mode — the UI stays a Vue single-page app; Nitro serves the local API.
  // All data lives in the local SQLite database served by Nitro.
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt', '@nuxt/icon'],
  nitro: {
    // Force the "static" preset so `nuxt generate` emits a real index.html
    // (otherwise Nuxt 4 produces a node-server bundle with no prerendered HTML).
    preset: 'static',
    prerender: {
      routes: ['/'],
    },
  },
  icon: {
    serverBundle: {
      // Bundle icons at build time so the PWA works offline
      collections: ['lucide'],
    },
    clientBundle: {
      // Use dynamic imports for icons only when needed
      scan: true,
    },
    mode: 'svg',
  },
  css: ['~/assets/css/main.css'],
  app: {
    baseURL,
    head: {
      title: 'JustQuiz',
      // Apply saved/system theme class to <html> before hydration to avoid flash of wrong theme
      script: [
        {
          innerHTML: `
            (function () {
              try {
                var stored = localStorage.getItem('justquiz-theme');
                var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
              } catch (e) {}
            })();
          `,
        },
      ],
      // iOS PWA install meta tags — lets iPhone/iPad users Add to Home Screen
      meta: [
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes',
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        {
          name: 'mobile-web-app-capable',
          content: 'yes',
        },
      ],
      link: [
        {
          rel: 'manifest',
          href: `${baseURL}manifest.webmanifest`,
        },
        {
          rel: 'icon',
          href: `${baseURL}favicon.ico?v=5`,
          sizes: 'any',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        },
        {
          rel: 'apple-touch-icon',
          href: `${baseURL}pwa-192.png`,
        },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'JustQuiz',
      short_name: 'JustQuiz',
      description: 'Offline-first quiz practice. No account needed.',
      theme_color: '#0F172A',
      background_color: '#FAFAFA',
      display: 'standalone',
      // baseURL is '/' in dev and '/just-quiz/' on GitHub Pages — start_url
      // must point into the deployed sub-path so the PWA launches correctly.
      start_url: baseURL,
      icons: [
        {
          src: `${baseURL}pwa-192.png`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: `${baseURL}pwa-512.png`,
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: `${baseURL}pwa-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    },
  },
  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },
})