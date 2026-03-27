# Coding Conventions
_Last updated: 2026-03-27_

## Summary

The codebase is a React 19 + TypeScript 5.9 SPA using Vite, Tailwind CSS v4, and Zustand for state management. Code style leans toward conciseness: single-file feature modules, local `TEXTS`/`TRANSLATIONS` constants for i18n, and inline styles for dynamic theme-driven colors alongside Tailwind utility classes for layout. There is no Prettier config — formatting is author-applied. ESLint enforces TypeScript strict mode plus react-hooks and react-refresh rules. No barrel index files are used; all imports are direct file paths.

---

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `GameBoard.tsx`, `AuthModal.tsx`, `XPToast.tsx`)
- Hooks: `use-kebab-case.ts` for shadcn/ui hooks (`use-mobile.ts`); `useAuthStore` / `useGameStore` exported directly from store files (no separate `use` file prefix convention for stores)
- Services: `camelCase.ts` (e.g., `audioService.ts`, `gameService.ts`, `multiplayerService.ts`)
- Utilities: `camelCase.ts` (e.g., `quizValidation.ts`, `shuffle.ts`, `audioEncoder.ts`)
- Data constants: `camelCase.ts` (e.g., `decks.ts`, `themes.ts`, `translations.ts`)
- Types: `camelCase.ts` (e.g., `game.ts` inside `src/types/`)

**Components:**
- Always named exports for shadcn/ui primitives in `src/components/ui/`
- Default exports for all feature components (`export default function GameBoard()`)
- Memo used selectively for performance-sensitive leaf components (`GameCard = memo(...)`)

**Functions:**
- camelCase throughout: `calculateXP`, `buildLightningQuestions`, `fetchCustomDeckFull`
- Event handlers prefixed with `handle`: `handleSubmit`, `handleTabChange`, `handlePlayerIntent`
- Boolean utilities named with `is`/`has` prefix: `isMuted`, `isPlayer`, `isTeacher`, `hasRole`
- Store actions named as verbs: `signInWithGoogle`, `loadProfile`, `addXP`, `openAuthModal`

**Variables:**
- camelCase for runtime values: `xpEarned`, `levelBefore`, `isFlipped`
- SCREAMING_SNAKE_CASE for module-level constants: `EMOJI_OPTS`, `PLAYER_COLORS`, `MOBILE_BREAKPOINT`, `SESSION_ROOM_KEY`, `MUTE_KEY`
- Short single-letter aliases for frequently used objects: `tr` (translations), `tc` (theme colors), `a` (AudioContext instance)

**Types and Interfaces:**
- `interface` for object shapes that may be extended (`Profile`, `GameResult`, `CardData`)
- `type` for unions, aliases, and discriminated unions (`GamePhase`, `BoardSize`, `GameAction`, `Tab`, `Method`)
- Props interfaces named `Props` (local, not exported) inside component files
- Exported types kept in `src/types/game.ts` or co-located with their module

---

## Code Style

**Formatting:**
- No Prettier config. Author-managed formatting.
- Single quotes for string literals in `.ts`/`.tsx` files (ESLint/TypeScript files); double quotes appear in shadcn/ui generated files (`src/components/ui/`).
- Trailing commas present in multiline objects/arrays.
- No semicolons in most application code; semicolons present in shadcn/ui generated files.
- 2-space indentation throughout.

**Linting (`eslint.config.js`):**
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react-hooks` recommended (enforces Rules of Hooks)
- `eslint-plugin-react-refresh` vite preset
- TypeScript compiler (`tsconfig.app.json`) enforces: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`

---

## Component Patterns

**Feature Components (`src/components/{feature}/`):**
- Default export, function declaration style: `export default function ComponentName()`
- Props via local `interface Props { ... }` at top of file
- Store state accessed with granular selectors: `useGameStore(s => s.cards)` — one selector per value, not destructuring the whole store
- Theme colors always resolved at component top: `const tc = THEMES[theme]`
- Translations always resolved at component top: `const tr = TRANSLATIONS[language]`
- Dynamic styles passed via inline `style={{ ... }}` for theme-driven colors; Tailwind classes for structural layout
- Class arrays built manually when conditional: `[cls1, condition && cls2].filter(Boolean).join(' ')`
- `cn()` helper from `src/lib/utils.ts` used in shadcn/ui primitives; rarely used in feature components

**shadcn/ui Primitives (`src/components/ui/`):**
- Named exports, function declaration style (not arrow functions)
- `cva` (class-variance-authority) for variant-driven styling
- `data-slot`, `data-variant`, `data-size` attributes added to root elements
- Radix UI `Slot.Root` used for `asChild` polymorphism
- Double quotes, semicolons (shadcn codegen style)

**Admin Components (`src/admin/`):**
- Same default-export pattern as feature components
- Auth managed by local `useAuth` hook (`src/admin/useAuth.ts`) — separate from the main app's `useAuthStore`

---

## Import / Export Patterns

**Import order (author convention, not enforced by linter):**
1. React and external library imports
2. Store imports (`../../store/...`)
3. Data imports (`../../data/...`)
4. Type imports (`../../types/...`)
5. Service imports (`../../services/...`)
6. Component imports (relative)

**Type-only imports:** `import type { ... }` used consistently for types and interfaces that do not carry runtime values (enforced by `verbatimModuleSyntax` in tsconfig).

**Path alias:** `@/*` maps to `src/*`. Used in shadcn/ui generated files (`import { cn } from "@/lib/utils"`). Feature components use relative paths (`../../store/gameStore`), not the `@/` alias.

**No barrel files:** No `index.ts` re-exports. All imports reference the concrete file.

**Lazy imports:** Dynamic `import()` used sparingly within store actions to break circular dependencies (e.g., `authStore.ts` lazily imports `gameStore.ts`).

---

## TypeScript Usage

**Strict mode:** Full strict TypeScript — `strict: true`, `noUnusedLocals`, `noUnusedParameters`.

**Type declarations:** Types for domain entities centralized in `src/types/game.ts`. Store-local types co-located with their store file (e.g., `Profile` in `authStore.ts`).

**Discriminated unions:** Used for `GameAction` in `multiplayerService.ts` (union of `{ type: '...' }` shapes) and `GamePhase`, `CardData.state`.

**`as` casts:** Used when Supabase returns `any`-typed data and the shape is known (e.g., `data as Profile`, `(data?.role as AdminRole)`).

**`import.meta.env`:** Typed via `vite/client` in tsconfig. Env vars accessed directly without abstraction layer.

**Generics:** Used in utility functions (`shuffle<T>`, `create<AuthStore>`, `create<GameStore>`).

---

## Error Handling Patterns

- **Return-error pattern:** Async actions in Zustand stores return `string | null` — `null` on success, an error message string on failure. Callers check `if (err) setError(err)`.
- **No thrown errors in UI code:** `try/catch` not used in component handlers. Error strings surfaced via state.
- **Supabase errors:** Destructured from response: `const { error } = await supabase.from(...).insert(...)`. Checked with `if (error) return error.message`.
- **Toast notifications:** `sonner` toast library used for non-blocking feedback (XP gain, level-up). Custom `toast.custom()` calls used for styled components.
- **Null guards:** Early returns with guard clauses: `if (!user) return`, `if (!user) return 'Nie si prihlásený'`.

---

## Async Patterns

- `async/await` throughout. No raw `.then()` chains except inside Zustand store actions where chaining is concise.
- `Promise.all([...])` used in `fetchCustomDeckFull` for parallel Supabase queries.
- `setTimeout` used for UI timing (XP toast delay of 800 ms, emoji cooldown of 2000 ms) — not wrapped in utilities.
- Supabase Realtime subscriptions managed in `multiplayerService.ts` with manual `channel` module-level variable.
- `useEffect` cleanup always returns unsubscribe/removeEventListener functions.

---

## State Management Patterns

- **Zustand** for all app-wide state. Two stores:
  - `src/store/authStore.ts` — user auth, profile, modal open/close flags, registration flow
  - `src/store/gameStore.ts` — game phase, cards, players, settings, multiplayer state
- Store accessed with granular selectors (`useGameStore(s => s.field)`) to minimize re-renders.
- `useAuthStore.getState()` used in service files (outside React) to read state synchronously.
- `useAuthStore.setState()` called directly from component event handlers when bypassing store actions is simpler.
- `persist` middleware used in `gameStore` (not `authStore`) for settings persistence.
- No React Context, no Redux, no React Query.

---

## Folder-Level Conventions

| Path | Convention |
|------|------------|
| `src/components/ui/` | shadcn/ui primitives only; named exports; double-quote, semicolon style |
| `src/components/{feature}/` | Feature components; default exports; relative imports |
| `src/admin/` | Admin panel components and `useAuth` hook; isolated from main app auth |
| `src/store/` | Zustand stores; one file per store; types co-located |
| `src/services/` | Side-effect modules (Supabase, audio, multiplayer, share); no React hooks except in `supabase.ts` helper |
| `src/data/` | Static data and i18n constants; no side effects |
| `src/types/` | Shared domain types only; no logic |
| `src/utils/` | Pure functions; no React, no Supabase |
| `src/hooks/` | React hooks not tied to a specific store or service |
| `src/lib/` | Tiny shared utility (`cn`) used primarily by shadcn/ui |

---

## Gaps / Unknowns

- No Prettier config is present; formatting consistency depends entirely on author discipline.
- No import-order linting rule — the observed import order is convention, not enforced.
- The `@/` path alias is used in shadcn/ui files but not in feature code; no rule enforces which should be preferred.
- No explicit `displayName` set on memoized components beyond the function name.
- No documented convention for when to use `interface` vs `type` beyond the patterns observed.
