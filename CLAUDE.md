# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **frontend** of the thesis monorepo. The parent `../CLAUDE.md` is authoritative for cross-cutting concerns (monorepo shape, thesis rules, the `tesis-marlene` skill requirement, salon timezone/hours, backend `/api` contract, auth/Cloudinary flow, click-to-chat WhatsApp design). Read that first; this file only covers what is specific to `hari_salon_front/`.

## Stack

Vue 3 + Quasar 2 (Vite) with the **SSG** extension (`quasar-app-extension-ssg`). State via Pinia (with `pinia-plugin-persistedstate`); server state via **TanStack Vue Query**; forms via vee-validate + yup; head/meta via `@vueuse/head`; HTTP via Axios; Cloudinary via `@cloudinary/url-gen` + `@cloudinary/vue`. Package manager is **yarn** (a `yarn.lock` is committed).

## Commands

```bash
yarn dev                   # quasar dev — opens browser on :9000
yarn build                 # generate-sitemap.mjs + quasar build (SPA)
yarn build:ssg             # generate-sitemap.mjs + quasar ssg generate (output: dist/ssg)
yarn serve:ssg             # quasar ssg serve dist/ssg
yarn generate:sitemap      # run sitemap script only

yarn lint                  # eslint .js/.ts/.vue (--ext, no --fix flag)
yarn format                # prettier write

yarn test                  # jest unit (tests/unit/**/*.spec.ts|js)
yarn test:watch
yarn test:coverage
npx jest tests/unit/<file>.spec.ts     # single unit test
npx jest -t "name fragment"            # single test by name

yarn test:compat           # Playwright browser-compat (tests/browser-compat)
yarn test:compat:report    # open last Playwright HTML report
npx playwright test --project=firefox-78   # one project (also chromium-chrome87, webkit-safari13)
```

Playwright config auto-spawns `npx quasar dev` on `PW_PORT` (default `9000`) and **reuses an existing server** — `yarn dev` in another terminal is fine. Workers=1, retries=0, traces retained on failure. Jest explicitly **excludes** `tests/browser-compat/` so the two suites don't collide.

There is **no `typecheck` script**; type checking runs via `vite-plugin-checker` (vue-tsc with `tsconfig.vue-tsc.json`) during `quasar dev`/`build`.

## Architecture notes specific to this app

### Boot order matters

`quasar.config.js` boots files in this order: `i18n` → `main` → `svg-icons` → `auth-expiry` → `head`. `main.ts` only installs `VueQueryPlugin`; `auth-expiry.ts` guards `typeof window === 'undefined'` because it must no-op under SSG. Anything new that touches `window`, `localStorage`, or `document` must do the same — SSG runs boot code in Node during `quasar ssg generate`.

### SSG vs SPA routing

`ssg.routes` in `quasar.config.js` prerenders only public marketing pages: `/`, `/services`, `/testimonios`, `/preguntas-frecuentes`, `/politica-tratamiento-datos`. Authenticated/worker routes are **excluded** (`/mi-cuenta`, `/mis-empleados`, `/login`, `/register`) and served as SPA — `404.html` is the fallback. When adding a public route, add it to both `src/router/routes.ts` and `ssg.routes`; when adding a private route, add it to `ssg.exclude` (regex). Routes use Spanish slugs (`testimonios`, `preguntas-frecuentes`, `politica-tratamiento-datos`, `mi-cuenta`, `mis-empleados`) — keep that convention.

### HTTP and state layering

- `src/api/*.ts` are thin Axios wrappers, one per backend resource. Types live in `src/api/apiTypes.d.ts`. All HTTP goes through these — never `axios.get` from a component.
- Components and pages call **composables** (`src/composables/<domain>/`), which wrap the api modules in Vue Query (`useQuery`/`useMutation`). New feature logic belongs in a composable, not in the component.
- Pinia stores in `src/stores/` are for cross-page client state (auth, booking form, filters, options). Several are persisted via `pinia-plugin-persistedstate`. Don't put server data in Pinia — that's Vue Query's job.

### Auth expiry sweeping

`auth-expiry` boot file polls `useAuthStore().sweepIfExpired()` every 60s and on `focus`/`visibilitychange`. JWT comes from the backend; persistence is handled by the Pinia plugin. Role-gated UI must check `auth-store` before calling endpoints decorated with `@Auth(...)` on the backend.

### SEO and SSG-rendered metadata

`src/composables/seo/` (`useSeo.ts`, `structuredData.ts`) feeds `@vueuse/head` and emits Schema.org JSON-LD. These files have **known stale values** ("Peluquería Pecas", AR locale/ARS currency) flagged by the thesis. Confirm intent with the user before editing. Canonical/OG URLs are built from `VITE_SITE_URL`.

### Single-source-of-truth files (do not duplicate)

- `src/helpers/businessHours.ts` — opening hours; must match backend `salon-schedule.ts` / `salon-time.ts`.
- `src/constants/salon-location.ts` — address and location constants used by SEO + structured data.
- `src/helpers/whatsappBooking.ts` — builds `wa.me` click-to-chat URLs. The project does **not** use the WhatsApp Business API; do not refactor toward one.

### SVG icons

`vite-plugin-svg-icons` scans `src/assets/icons/` and emits ids as `icon-<name>` (see `quasar.config.js`). Drop SVGs in that folder and reference by symbol id.

## Environment variables

Copy `.env.example`:

- `VITE_API_URL` — full backend URL **including `/api`** (e.g. `http://localhost:3000/api`). The backend sets a global `/api` prefix.
- `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` — Cloudinary read-side (uploads still proxy through the backend).
- `VITE_SITE_URL` — absolute site URL, **no trailing slash**. Used by canonical/OG tags and `scripts/generate-sitemap.mjs`.

## Deploy targets

`netlify.toml` and `vercel.json` are both committed; SSG output (`dist/ssg`) is what gets deployed. Build command on hosting is `yarn build:ssg`.
