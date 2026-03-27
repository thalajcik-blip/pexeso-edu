# Testing
_Last updated: 2026-03-27_

## Summary

There is no test suite in this codebase. No testing framework (Jest, Vitest, Playwright, Cypress) is installed. No test files exist under `src/`. No test scripts appear in `package.json`. The `devDependencies` contain only TypeScript, ESLint, Vite, and shadcn tooling. The only automated quality gate is the TypeScript compiler (`tsc -b`) run as part of the build step (`"build": "tsc -b && vite build"`), combined with ESLint via `"lint": "eslint ."`.

---

## Testing Frameworks

**Runner:** None installed.

**Assertion library:** None.

**E2E framework:** None.

**Type checking (build-time only):**
- TypeScript 5.9 with `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- Config: `tsconfig.app.json`, `tsconfig.node.json`
- Run: `tsc -b` (part of `npm run build`)

---

## Test Scripts

From `package.json`:
```json
{
  "scripts": {
    "dev":     "vite",
    "build":   "tsc -b && vite build",
    "lint":    "eslint .",
    "preview": "vite preview"
  }
}
```

There is no `test`, `test:watch`, or `test:coverage` script.

---

## Test File Locations

No test files exist. A search for `*.test.*`, `*.spec.*`, and `__tests__` directories under `src/` returns no results.

---

## Types of Tests Present

| Type | Status |
|------|--------|
| Unit tests | None |
| Integration tests | None |
| E2E tests | None |
| Snapshot tests | None |
| Type-level tests | None (but TypeScript strict mode acts as a compile-time check) |

---

## What Is Tested (Indirectly)

- **TypeScript compilation:** `tsc -b` catches type errors, unused variables, unused parameters, and fallthrough switch cases before every production build.
- **ESLint:** `eslint .` enforces react-hooks rules (e.g., missing deps in `useEffect`) and react-refresh constraints. Must be run manually — not part of the build step.
- **No runtime or behavioral testing** exists for any of the following modules:
  - `src/utils/shuffle.ts` — Fisher-Yates shuffle (pure function, trivially testable)
  - `src/utils/quizValidation.ts` — `validateAnswers` / `selectAnswers` (pure logic, no deps)
  - `src/utils/roles.ts` — role predicate helpers
  - `src/utils/avatar.ts` — avatar seed mapping
  - `src/utils/audioEncoder.ts` — audio trim/compress pipeline
  - `src/services/gameService.ts` — XP calculation (`calculateXP`)
  - `src/store/authStore.ts` — auth and profile flow
  - `src/store/gameStore.ts` — game state machine

---

## CI/CD Integration

No CI configuration files found (no `.github/workflows/`, no `Makefile`, no `Procfile`, no pipeline config). Deployment appears to target Vercel (inferred from `@vercel/analytics` dependency), but no build/test pipeline is defined in the repository.

---

## Test Utilities and Helpers

None. No fixtures, factories, mocks, or shared test setup exist.

---

## Gaps / Unknowns

- It is unknown whether any manual testing protocol or QA checklist exists outside the repository.
- Vercel may run `npm run build` on deploy (which includes `tsc -b`), providing a minimal type-safety gate on the main branch — but this cannot be confirmed from repository contents alone.
- No coverage requirements or targets have been defined.
- The most impactful areas to add tests first would be pure utility functions (`src/utils/`) and the XP calculation in `src/services/gameService.ts`, as they have no external dependencies and contain non-trivial logic.
