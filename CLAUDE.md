# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **frontend** of the thesis monorepo. The parent `../CLAUDE.md` is authoritative for cross-cutting concerns (monorepo shape, thesis rules, the `tesis-marlene` skill requirement, salon timezone/hours, backend `/api` contract, auth/Cloudinary flow, the dual WhatsApp design: click-to-chat on the front, Cloud API on the back). Read that first; this file only covers what is specific to `hari_salon_front/`.

## Stack

Vue 3 + Quasar 2 (Vite) with the **SSG** extension (`quasar-app-extension-ssg`). State via Pinia (with `pinia-plugin-persistedstate`); server state via **TanStack Vue Query**; forms via vee-validate + yup; head/meta via `@vueuse/head`; HTTP via Axios; Cloudinary with **no SDK** — signed uploads and delivery URLs are hand-rolled in `src/helpers/cloudinaryHelpers.ts`. Package manager is **yarn** (a `yarn.lock` is committed).

## Commands

**Node 20 is required** — `package.json` declares `engines.node: ^20 || ^18 || ^16` and yarn 1 enforces it, so a newer Node (21+) fails every script with *"The engine node is incompatible"*. A `.nvmrc` pins the version: run `nvm use` before anything else.

```bash
nvm use                    # reads .nvmrc → Node 20
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

`src/composables/seo/` (`useSeo.ts`, `structuredData.ts`) feeds `@vueuse/head` and emits Schema.org JSON-LD. The old stale values ("Peluquería Pecas", AR locale, ARS currency) are **gone**; `tests/unit/salon-branding.spec.ts` is a regression net that fails if anyone reintroduces them, and it also pins the opening hours against `businessHours.ts`. Business data comes from `src/constants/salon-location.ts`. Canonical/OG URLs are built from `VITE_SITE_URL`.

### Visual remodel: the landing page is done, the rest is not

The remodel designed on 2026-09-30 (direction "B · Bandas alternas": alternating bone/ink bands, Marcellus + Jost, gold hairlines, the existing pink demoted to a single accent) is **applied to the landing page and to the shell's header**. Everything else still wears the old look, on purpose — each view gets its own plan under `docs/remodelacion/<vista>/`.

- `src/components/index/` — the five bands the landing page is made of: `HeroBand`, `CatalogBand` (the **only** dark band), `ReviewAssistantBand`, `SiteFooterBand`, `MobileActionBar`. Flat markup, no Quasar components: they need styling, not behaviour. Each has its spec in `tests/unit/`.
- `src/pages/IndexPage.vue` composes them in **one tree**; responsiveness is CSS at a single **700 px** breakpoint (`@media (max-width: 699px)`). The old `matchMedia`-in-JS with two parallel trees and two `style-fn` is gone — `tests/unit/IndexPage.spec.ts` fails if it comes back.
- `src/css/tokens.scss` — the palette and rhythm as `--m-*` custom properties, each with its measured contrast. **Use `var(--m-*)`, never a loose hex.** Three traps documented there: light gold (`--m-oro`) is 2.8:1 on bone and is *not* a text color (use `--m-oro-profundo`), text on the WhatsApp green must be dark (9.3:1), never white (2.0:1), and `--m-filete-rosa` only underlines, it is not a text color either.
- **Reviews are client-side only.** The `/` route is prerendered and Vue Query does not resolve during `quasar ssg generate`, so **whatever the band paints while loading is the published, indexed HTML**. It paints a neutral skeleton — never a claim like "no reviews yet", which would be a lie in the file that ships. Same reason the band reserves a `min-height` at both widths.
- **The assistant chips come from `INTENT_CHIPS`** (`src/composables/assistant/intentChips.ts`), never hand-written labels: `intentChips.spec.ts` checks every chip against a tool the assistant really has. They open the panel through `abrirCon(prompt)`, and `AssistantPanel` sends that prompt on mount.
- **One floating button per screen.** The assistant's launcher is it. `MobileActionBar` marks `body.m-con-barra-movil` while mounted so `AssistantLauncher` lifts above the fixed bar; the shell's green review FAB is hidden on `/`, where "Deja la tuya" lives inside the review band instead. While the panel is **open** the launcher's FAB is unmounted (`v-if="!open"`): on mobile the panel *is* the screen, and on desktop a bubble over the scrim competes with the panel's own close button.
- **Shared panel state**: `src/composables/assistant/useAssistantPanel.ts` and `src/composables/reviews/useReviewDialog.ts` hold module-level state, because the landing bands and the shell open the same two panels from opposite ends of the tree.
- `src/constants/index-sections.ts` — the four catalogue sections, with the filter UUIDs pinned by a test. The mock-ups' "desde $X" is **not implemented**: that figure needs the whole catalogue or a new endpoint. Open product decision.
- `src/css/quasar.variables.scss` — the target `$primary/$secondary/$accent/$dark` values are still **commented out**. The landing page does not depend on them; uncommenting repaints the whole portal at once.
- Known mismatch, by design: `/services`, `/testimonios` and the rest show the **new header over old bodies** until each gets its plan.

### The assistant panel (remodelled 2026-10-01)

Plan and findings: `docs/remodelacion/asistente/`. Spec: `docs/superpowers/specs/2026-10-01-modernizacion-asistente-design.md`.

`AssistantChat.vue` is **gone**. The panel is four pieces of flat markup styled with `--m-*`, all in `src/components/assistant/`:

- `AssistantPanel.vue` — the shell: scrim, header, the legal-notice band, and the modal behaviour. It owns the chip decision and is the only piece that talks to `useAssistant()`.
- `AssistantThread.vue` — bubbles, cards, "typing", error, the empty-state greeting, and the auto-scroll.
- `AssistantComposer.vue` — **one** chip row (start chips and follow-up chips both) above a real `<input>` + `<label>`.
- `ServiceListCard.vue` / `PackageProposalCard.vue` — repainted, and they **add to the bag; they do not reserve**.

Four things to know before touching it:

- **The cards fill `book-store`, they don't book.** `useAddToBag` (`src/composables/booking/`) fetches the real `Service` by id with `getService` — *not* `useService()`, which opens a Quasar dialog as a side effect — and calls `addBooking`. A package is all-or-nothing, and its **date does not travel**: the bag holds no dates and the portal's flow asks again, which is the only check that counts (the assistant *queries* capacity, it never holds it). The backend's `crearReserva` / `reservarPaquete` tools **stay published** — the MCP server pins them and the thesis documents them — so someone who *writes* "resérvamelo" still gets it booked. Only the buttons went away.
- **The thread lives in module scope.** `useAssistant()` keeps `messages`/`loading`/`error`/`aviso` outside the function, so closing the panel no longer throws away a conversation the server still remembers via `sessionStorage`. It dies on reload and is never written to the browser: on a shared computer no trace stays. `conversationId` is read lazily (`?? readConversationId()`) because the module-level read would otherwise run once at import — in Node, during `quasar ssg generate`, where there is no `sessionStorage`.
- **The legal notice is the server's words.** `aviso` comes from the backend and `DEFAULT_NOTICE` is the fallback; it is NF12. The design board governs how that band *looks*, never what it *says*.
- **A unit test that mounts any assistant piece must `jest.mock('src/composables/booking/useAddToBag')`.** The real chain reaches `services-api`, which reads `import.meta.env` — syntax ts-jest cannot compile to CommonJS. `stubs` do not help: the import is hoisted before anything mounts. The four assistant suites all do this; `panels.spec.ts` mocks the whole `AssistantPanel.vue` module instead, since there the subject is the launcher.

Geometry is in `tests/browser-compat/assistant-layout.spec.ts`: full screen with nothing on top at 390, scrim and fit at 1280, and no horizontal drag from a 400-character message with no spaces. The panel uses **`100dvh`, never `100vh`** — with `100vh` the mobile keyboard covers the input and you cannot type.

**Playwright artifacts poison the TypeScript program.** A failed compat run writes `playwright-report/trace/sw.bundle.js`, whose minified code declares a class named `it`; with that folder inside the program it shadows Jest's global `it` and `yarn build:ssg` dies with hundreds of `Value of type 'typeof it' is not callable`. Both `playwright-report` and `test-results` are excluded in `tsconfig.json` and `.eslintignore` — keep them there.

**Who may leave a review is the shell's rule, not the band's.** `MainLayout` registers `onReviewClick` through `useReviewDialog().registrarSolicitud()`; anything outside the shell calls `solicitar()`. Calling `abrir()` directly bypasses the login check and leaves an anonymous visitor filling a form whose submit silently does nothing.

Geometry is checked in `tests/browser-compat/index-layout.spec.ts`, not in jsdom: horizontal overflow at 390 px with reviews served by `page.route`, the three-line clamp, and the fixed bar clearing the footer. Jest cannot see any of it. A green `npx jest` means neither that the project compiles (that is `vue-tsc`, which only runs under `quasar dev`/`build`) nor that the layout holds.

Before touching anything visual, invoke the **`remodelacion-marlene`** skill (palette, typography, band structure, product rules already decided) and read `docs/superpowers/specs/2026-09-30-remodelacion-visual-index-design.md` plus the executed plan in `docs/remodelacion/inicio/`. Still outstanding from the spec's prerequisites: ~10 MB of unoptimized `public/people/` photos (the real risk to NF02), the Spanish strings living in the `en-US` i18n catalogue, and `roboto-font` in `extras`, which stays until the whole portal uses Jost.

### Single-source-of-truth files (do not duplicate)

- `src/helpers/businessHours.ts` — opening hours; must match backend `salon-schedule.ts` / `salon-time.ts`.
- `src/constants/salon-location.ts` — address and location constants used by SEO + structured data.
- `src/helpers/whatsappBooking.ts` — builds `wa.me` click-to-chat URLs for the visitor's hand-off to the salon's phone. The backend separately integrates the **official WhatsApp Cloud API** (notices + inbound webhook, dedicated line); the frontend has no WhatsApp API code and should not gain any — keep this helper as is.

### SVG icons

`vite-plugin-svg-icons` scans `src/assets/icons/` and emits ids as `icon-<name>` (see `quasar.config.js`). Drop SVGs in that folder and reference by symbol id.

## Environment variables

Copy `.env.example`:

- `VITE_API_URL` — full backend URL **including `/api`** (e.g. `http://localhost:3000/api`). The backend sets a global `/api` prefix.
- **No Cloudinary env vars.** The cloud name arrives from the backend in the `/api/cloudinary/sign` response, so the frontend never needs its own copy — not locally, not on Netlify. `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` were declared but read nowhere; removed 2026-09-01 from `.env.example` and `src/env.d.ts`. Do not reintroduce them.
- `VITE_SITE_URL` — absolute site URL, **no trailing slash**. Used by canonical/OG tags and `scripts/generate-sitemap.mjs`.

## Deploy targets

`netlify.toml` and `vercel.json` are both committed; SSG output (`dist/ssg`) is what gets deployed. Build command on hosting is `yarn build:ssg`.
