# Codebase Structure
_Last updated: 2026-03-27_

## Summary

Pexedu is a single-package Vite + React + TypeScript SPA with no monorepo setup. All source code lives under `src/`. The Supabase backend configuration (migrations and Edge Functions) lives under `supabase/`. There is no `pages/` or `routes/` directory — the game UI is phase-driven with no router; only the admin sub-app at `/admin` uses React Router.

---

## Top-Level Directory Layout

```
pexeso-edu/
├── src/                  # All application source code
├── supabase/             # Supabase backend (migrations + Edge Functions)
├── public/               # Static assets served as-is (icons, images)
├── dist/                 # Build output (generated, not committed)
├── node_modules/         # Dependencies (not committed)
├── .planning/            # GSD planning documents
├── .claude/              # Claude agent configuration
├── index.html            # Single HTML entry point
├── vite.config.ts        # Vite build config (React plugin, Tailwind, @ alias)
├── tsconfig.json         # TypeScript root config
├── tsconfig.app.json     # App-specific TS config
├── tsconfig.node.json    # Node/Vite config TS config
├── package.json          # Dependencies and scripts
├── eslint.config.js      # ESLint flat config
├── components.json       # shadcn/ui component config
├── vercel.json           # Vercel deployment: SPA catch-all rewrite
└── .nvmrc                # Node version pin
```

---

## Source Directory: `src/`

```
src/
├── main.tsx              # Entry point — mounts App, AdminApp, or ProfilePage
├── App.tsx               # Root game component — phase-driven UI routing
├── index.css             # Global styles + Tailwind base
├── vite-env.d.ts         # Vite env type declarations
├── utils.ts              # Root-level utility (likely cn() helper)
│
├── store/                # Zustand global state
├── services/             # External service clients and utilities
├── components/           # All React UI components
├── data/                 # Static game data (decks, translations, themes)
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
├── utils/                # Utility functions
├── lib/                  # shadcn/ui utils
├── admin/                # Admin sub-app (teacher/superadmin CMS)
└── assets/               # Imported static assets (images bundled by Vite)
```

---

## Directory Purposes

**`src/store/`**
- Purpose: Zustand stores — global application state
- Key files:
  - `gameStore.ts` — all game state, phase transitions, multiplayer logic, board/card management. Persisted to localStorage via `zustand/middleware:persist`.
  - `authStore.ts` — Supabase auth session, user profile, XP/levels, modal open/close flags.

**`src/services/`**
- Purpose: External integrations and service-layer utilities
- Key files:
  - `supabase.ts` — Supabase client singleton; `fetchCustomDeckFull()` fetcher
  - `multiplayerService.ts` — Supabase Realtime channel management, room DB operations, `GameAction` types, presence helpers
  - `gameService.ts` — `saveGameResult()`, XP calculation, `game_history` writes
  - `audioService.ts` — Web Audio API sound effects (synth tones, not audio files)
  - `shareService.ts` — Deep link builders, social share text, `shareResult()` function

**`src/components/`**
Organized by feature domain:
- `game/` — `GameBoard.tsx`, `GameCard.tsx`, `ScoreBoard.tsx`
- `setup/` — `SetupScreen.tsx` (deck/mode/player selection)
- `lobby/` — `LobbyScreen.tsx`, `SettingsModal.tsx` (multiplayer room waiting)
- `lightning/` — `LightningGame.tsx` (lightning quiz mode)
- `modals/` — `QuizModal.tsx`, `WinModal.tsx`, `RulesModal.tsx`, `TermsModal.tsx`, `PrivacyModal.tsx`
- `auth/` — `AuthModal.tsx`, `OnboardingModal.tsx`, `ContextSelectModal.tsx`, `TeacherPendingModal.tsx`, `PendingTeacherBanner.tsx`, `DashboardModal.tsx`, `SettingsModal.tsx`, `IntentScreen.tsx`, `Avatar.tsx`, `AvatarPicker.tsx`, `XPToast.tsx`
- `profile/` — `ProfilePage.tsx` (public profile, standalone render context)
- `ui/` — shadcn/ui primitive components (`button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `sidebar.tsx`, `badge.tsx`, etc.)

**`src/data/`**
- Purpose: Static game content — never fetched, bundled at build time
- Key files:
  - `decks.ts` — Four built-in decks (`animals`, `flags`, `fruits`, `jobs`) with full card pools
  - `enQuiz.ts` — English quiz question/answer data for built-in decks
  - `translations.ts` — UI strings for `cs`, `sk`, `en` locales; `Language` type
  - `themes.ts` — Color token objects for `dark` and `light` themes; `Theme` type

**`src/types/`**
- Purpose: Shared TypeScript type definitions
- Key file: `game.ts` — all game types: `GamePhase`, `CardData`, `Player`, `Deck`, `CustomDeckData`, `CustomDeckCard`, `AnswerOption`, `LightningQuestion`, `BoardSize`, `DeckId`, constants like `SIZE_CONFIG`, `PLAYER_COLORS`

**`src/hooks/`**
- `use-mobile.ts` — viewport breakpoint hook (likely from shadcn/ui)
- `utils.ts` — (confirmed present, exact contents not read)

**`src/utils/`**
- `shuffle.ts` — Fisher-Yates shuffle
- `quizValidation.ts` — `selectAnswers()` — picks correct + distractor options from flexible answer pool
- `avatar.ts` — DiceBear avatar generation; `AVATAR_COUNT` constant
- `audioEncoder.ts` — Audio encoding utility (for audio deck upload/compression)
- `roles.ts` — Role utility helpers

**`src/lib/`**
- `utils.ts` — shadcn/ui `cn()` className merge helper (clsx + tailwind-merge)

**`src/admin/`**
- Purpose: Fully self-contained teacher/superadmin CMS. Uses React Router (`BrowserRouter` wraps it from `main.tsx`).
- Key files:
  - `AdminApp.tsx` — Root admin component; sidebar layout, routing, role guard
  - `useAuth.ts` — Local auth hook reading from `user_roles` table (not shared with player authStore)
  - `DeckList.tsx` — Browse/manage custom decks
  - `DeckEditor.tsx` — Create/edit a custom deck and its cards
  - `CardModal.tsx` — Individual card edit modal
  - `BulkUploadModal.tsx` — Batch image upload for deck cards
  - `AudioTrimModal.tsx` — Audio clip trimming for audio decks
  - `CropModal.tsx` — Image crop with `react-easy-crop`
  - `TeacherRequestsManager.tsx` — Superadmin approves/rejects teacher requests
  - `UsersManager.tsx` — Superadmin user management
  - `AdminSettings.tsx` — AI provider configuration (Claude/Gemini/OpenAI)
  - `LoginScreen.tsx` — Admin login form

---

## Supabase Directory: `supabase/`

```
supabase/
├── migrations/           # SQL migration files (applied to Supabase project)
│   ├── 20260311103937_add_storage_policy.sql
│   ├── 20260313_add_flexible_answers.sql
│   ├── 20260313_add_results_config.sql
│   └── 20260322_user_roles_phase1.sql
└── functions/            # Deno Edge Functions
    ├── generate-quiz/index.ts    # AI quiz generation (Claude/Gemini/OpenAI)
    ├── translate-quiz/index.ts   # Quiz content translation
    ├── send-notification/index.ts
    ├── delete-account/index.ts   # User self-deletion
    └── delete-user/index.ts      # Admin user deletion
```

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `vite.config.ts` | Vite config: React plugin, Tailwind v4 via `@tailwindcss/vite`, `@` alias → `src/`, `__APP_VERSION__` define |
| `tsconfig.app.json` | App TypeScript config with path alias `@/*` → `./src/*` |
| `components.json` | shadcn/ui config — component registry, style, path aliases |
| `vercel.json` | SPA rewrite: all routes → `index.html` |
| `eslint.config.js` | ESLint flat config with `react-hooks` and `react-refresh` plugins |
| `.nvmrc` | Node version (pinned for consistent dev/CI) |
| `.env.local` | Supabase URL + anon key for development (not committed) |
| `.env.production.local` | Supabase URL + anon key for production (not committed) |

---

## Naming Conventions

**Files:**
- React components: PascalCase — `GameBoard.tsx`, `AuthModal.tsx`
- Stores: camelCase with `Store` suffix — `gameStore.ts`, `authStore.ts`
- Services: camelCase with `Service` suffix — `multiplayerService.ts`, `audioService.ts`
- Hooks: camelCase with `use` prefix — `use-mobile.ts`, `useAuth.ts`
- Data files: camelCase — `decks.ts`, `translations.ts`, `themes.ts`
- UI primitives: kebab-case — `badge.tsx`, `dropdown-menu.tsx`

**Directories:**
- Feature domains: lowercase — `game/`, `auth/`, `lobby/`, `lightning/`

---

## Where to Add New Code

**New game UI screen or modal:**
- Component: `src/components/{feature}/YourModal.tsx`
- Register in `src/App.tsx` with phase condition or modal open flag from store

**New game state or action:**
- Extend `GameStore` interface in `src/store/gameStore.ts`
- Add new `GameAction` union type in `src/services/multiplayerService.ts` if broadcast to other players

**New Supabase table:**
- Add SQL migration file to `supabase/migrations/` with a timestamped name
- Add types to `src/types/game.ts` or create a new type file in `src/types/`

**New Edge Function:**
- Create `supabase/functions/{name}/index.ts` (Deno)
- Call from frontend via `fetch()` with anon key header (see `authStore.ts:deleteAccount()` for pattern)

**New admin CMS page:**
- Component: `src/admin/YourPage.tsx`
- Add route in `src/admin/AdminApp.tsx` (`<Route path="/admin/your-path" element={<YourPage />} />`)
- Add nav item to `NAV_ITEMS` array in `AdminApp.tsx` with `superadminOnly` flag

**New built-in deck:**
- Add deck data to `src/data/decks.ts`
- Add `DeckId` union to `src/types/game.ts`
- Add quiz data to `src/data/enQuiz.ts` if English supported
- Add translations to `src/data/translations.ts`

**New utility:**
- Pure helpers: `src/utils/yourUtil.ts`
- shadcn/ui style helpers: `src/lib/utils.ts`

**New UI primitive:**
- Use shadcn CLI or add to `src/components/ui/` following kebab-case naming

---

## Special Directories

**`dist/`**
- Purpose: Vite build output
- Generated: Yes
- Committed: No

**`public/`**
- Purpose: Static files served at root — favicons, manifest, unprocessed images
- Generated: No
- Committed: Yes

**`.planning/codebase/`**
- Purpose: GSD architecture and planning documents
- Generated: By analysis agents
- Committed: Yes (planning artifacts)

---

## Gaps / Unknowns

- `src/hooks/utils.ts` contents were not read — likely a secondary hook utility.
- `src/assets/` contents were not inventoried — likely contains images or fonts imported by components.
- `public/` contents were not fully inventoried.
- The `components.json` shadcn/ui config specifies exact path mappings but was not read in detail.
