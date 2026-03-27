# Pitfalls Research
_pexedu Q2 2026_

> Analysis based on full codebase review (CONCERNS.md, migrations, multiplayerService, gameStore, PrivacyModal).
> Risk ratings: 🔴 blocker / 🟡 high / 🟢 medium

---

## GDPR / Legal Blockers

🔴 **Highest-probability pilot blocker**

**Current state of PrivacyModal.tsx (March 2026):**
- General privacy policy only
- No Article 8 (children under 16) language
- No parental consent mechanism
- No age declaration
- No DPA template for schools

**What triggers the full consent chain:**
The April "Triedy + žiaci accounts" feature means a teacher is processing children's data (username, activity, scores) on behalf of a school. This creates a teacher ↔ school ↔ pexedu data processing chain under GDPR.

**What you need before first pilot school:**
1. Age declaration checkbox at registration ("I am under 16")
2. Parental consent screen for under-16 direct registrations
3. Teacher declaration checkbox at class creation: "I confirm our school has parental consent from guardians of students I add to this class"
4. DPA (Data Processing Agreement) template for schools — schools are data controllers, pexedu is a data processor under GDPR Art. 28
5. Updated privacy policy with Art. 8 language, child-friendly simplified version

**Timeline risk:** GDPR compliance is not a feature — it's a legal prerequisite. A school IT manager or procurement officer will ask for a DPA before approving pexedu for classroom use. Build the consent flows in April alongside the class features.

**Mitigation:** Consult a local privacy lawyer (SK/CZ) for DPA template review before June school licensing. ~2-4h legal consultation, not a blocker if started early.

---

## Stripe SK/CZ Requirements

🟡 **Achievable in 6 weeks but more complex than consumer Stripe**

**No Stripe integration exists yet.** Starting from zero.

**B2B school sales specifics:**
- Schools in SK/CZ require a proper **invoice (faktúra)** for accounting — consumer Checkout flow does not generate one automatically
- Schools pay **annually** (annual budget cycle), not monthly — must support annual billing
- Schools may require **VAT** handling for cross-border purchases (EU VAT OSS rules apply)
- School procurement often goes through a **purchase order** process — self-service Pro tier won't work for institutional licenses

**Recommended phased approach:**
1. **June MVP:** Stripe Checkout for individual Pro tier (teachers paying personally) — straightforward consumer flow
2. **Q3:** School licensing with Stripe Invoicing + annual billing + VAT ID support + manual contract flow (superadmin creates school subscription)

**Do NOT try to build automated school license purchasing in Q2** — the procurement process for Slovak schools involves a school director signature and often a formal contract. Manual superadmin activation is fine for Q2 pilots.

**Technical requirements for June Pro launch:**
- Stripe Checkout in `subscription` mode with `price_id`
- Supabase Edge Function as webhook receiver
- `subscription_tier`, `stripe_customer_id`, `subscription_expires_at` columns on `profiles`
- Customer Portal link for self-service cancellation

---

## Supabase Production Risks

🔴 **game_start payload near Realtime size limit**

**Finding from codebase:** The `game_start` broadcast in `multiplayerService.ts` includes the full shuffled card array. An 8x8 custom deck with image URLs (~100 chars each) generates a payload of ~27–29 KB. Supabase Realtime Broadcast has a **32 KB per-message limit**.

**Risk:** A deck with longer image URLs (Supabase Storage CDN URLs are 80–120 chars) or more cards will silently fail to deliver. The game will appear to start for the host but joiners receive no state.

**Mitigation:** Send only card IDs in `game_start`, then have each client fetch the full deck independently. Or truncate the broadcast payload and rely on a `state_snapshot` mechanism already in the code.

---

🟡 **`addXP` race condition at class scale**

**Finding from CONCERNS.md + codebase:** `addXP` in `authStore.ts` is not atomic — it reads the current XP, adds to it client-side, then writes back. At 30 students finishing a game within seconds of each other, the last-write-wins behavior will cause XP loss.

**Mitigation (required before daily challenge ships):**
```sql
CREATE OR REPLACE FUNCTION add_xp(user_id uuid, xp_delta integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET xp = xp + xp_delta WHERE id = user_id;
$$;
```
Replace client-side `addXP` with a call to this RPC.

---

🟡 **open `rooms` RLS policy**

**Finding from CONCERNS.md:** The `rooms` table has permissive RLS that allows any authenticated user to read any room. A room contains the full game state including player list and host identity. Not a critical security issue but a data leak. Fix: restrict `rooms` SELECT to participants (`host_id = auth.uid() OR player_id IN (SELECT ...)`).

---

🟢 **Realtime connection limits at school scale**

Supabase free/Pro tier: 200–500 concurrent Realtime connections. A class of 30 students on the same multiplayer game = 30 connections. At 10 simultaneous classes = 300 connections. Monitor in Supabase dashboard during pilot weeks. **Mitigation:** Keep Realtime only for multiplayer game sessions. Use polling for dashboard analytics and leaderboards.

---

🟢 **RLS performance without indexes on new tables**

Every RLS check runs a subquery. Without indexes on FK columns of `classes`, `class_members`, `daily_challenge_entries`, query times will degrade at 100+ students. Add indexes on all FK columns when creating new tables.

---

## Content Pipeline Risks

🟡 **Dual answer schema — silent data corruption risk**

**Finding from codebase:** `custom_cards` has BOTH:
- Legacy columns: `quiz_options` (text[]), `quiz_correct` (text)
- New column: `answers` (JSONB array of `{text, correct}`)

Both are used in different parts of the code simultaneously. An AI-generated card may populate `answers` correctly while old editor code still reads from `quiz_options`. This creates silent wrong-answer bugs that are hard to debug.

**Mitigation:** Migrate fully to `answers` JSONB in one phase. Add a DB constraint: `CHECK (answers IS NOT NULL OR quiz_options IS NOT NULL)`. Audit the editor and quiz renderer code for which schema each reads.

---

🟡 **Translation pipeline is browser-blocking**

**Finding from CONCERNS.md:** Translation operations take ~6.5 seconds and block the browser thread. For 32 decks being translated to CS/SK/EN, this creates an unusable admin experience.

**Mitigation:** Move translation calls to a Supabase Edge Function (existing `translate-quiz` function). Fire-and-forget from the editor, poll for completion, or use Supabase Realtime to notify when translations are ready.

---

🟢 **AI-generated content quality at 32 decks**

32 decks × 10–20 cards each = 320–640 AI-generated quiz questions by June. Each card needs Slovak and Czech translations. Quality will vary. Budget time for manual review of AI output, especially for subject-matter-sensitive content (geography, biology).

**Mitigation:** Build a simple "review queue" admin view — one AI-generated question per row, superadmin approves/edits before deck goes public.

---

## Share / Viral Browser Support

🟡 **Web Share API browser support matrix**

| Platform | Support |
|----------|---------|
| iOS Safari 14+ | Full |
| Chrome Android 61+ | Full |
| Android 8/9 (Chrome < 61) | None |
| Desktop Chrome | Partial (files not supported) |
| Firefox | Partial |
| Samsung Internet | Full |

**Android 8/9 school tablets are common in Slovak primary schools.** Web Share API will silently fail on these devices.

**Mitigation:** Always implement clipboard fallback. The share button should:
1. Try `navigator.share()`
2. Fall back to `navigator.clipboard.writeText(url)`
3. Fall back to a "Copy link" button with manual copy

The existing `shareService.ts` should be audited for this fallback chain.

---

🟡 **`applyDeepLink` type safety — security concern**

**Finding from CONCERNS.md:** The `applyDeepLink` function in `shareService.ts` uses `as any` type casts when applying URL params to game settings. This means a crafted URL could inject unexpected game settings.

**Mitigation:** Whitelist and validate every URL param explicitly:
```ts
const ALLOWED_MODES = ['bleskovy_kviz', 'pexequiz', 'pexeso'] as const
const mode = searchParams.get('mode')
if (mode && ALLOWED_MODES.includes(mode as any)) { ... }
```

---

## Teacher Adoption Risk

🔴 **The #1 risk is student login friction, not product features**

**Industry pattern:** The most common reason edtech tools die in school pilots is not lack of features — it's that the teacher attempts to run the first class activity and 30% of students cannot log in (forgot password, school email blocked, parents didn't create account, etc.) in the first 5 minutes. The teacher gives up and never returns.

**pexedu-specific risk:** The current flow requires students to have a pexedu account to join a class. First use in a classroom setting = 28 students trying to register/login simultaneously on school WiFi.

**Mitigation strategies (in priority order):**
1. **Anonymous play as default student path** — students can play any assigned deck via the class join link WITHOUT creating an account. Progress is local-only (session). They can optionally create an account to save progress. This removes the entire login friction from the first classroom experience. Accounts become optional, not required.
2. **"Bulk create student accounts" flow** — teacher creates accounts for their students (username + temp password). Students customize later. Google Classroom and Seesaw both offer this for under-13 users.
3. **Clear teacher onboarding** — a 3-step "first week" checklist in the teacher dashboard: (1) create class, (2) assign a deck, (3) share join link. Do not show more than 3 steps.
4. **Pilot support** — for the April 15 pilot teacher, be on call for the first live classroom session. The feedback from watching a real teacher use it for the first time is worth more than any analytics.

---

## Mitigations Summary

| Risk | Severity | Mitigation | When |
|------|----------|------------|------|
| GDPR / no parental consent | 🔴 Blocker | Age declaration + teacher DPA checkbox | April (with classes feature) |
| game_start payload ~32KB limit | 🔴 Blocker | Send card IDs only in broadcast | Before multiplayer + custom decks is used at scale |
| `addXP` race condition | 🟡 High | Atomic RPC `add_xp()` | Before daily challenge ships |
| Student login friction | 🔴 Blocker | Anonymous play as default path | April pilot |
| Dual answer schema | 🟡 High | Migrate to `answers` JSONB only | Before content pipeline at scale |
| Web Share API fallback | 🟡 High | Clipboard fallback chain | May (share feature) |
| `applyDeepLink` type safety | 🟡 High | Whitelist + validate URL params | May (deep links) |
| Translation blocking browser | 🟡 High | Move to Edge Function | May (content pipeline) |
| Realtime connection limits | 🟢 Medium | Monitor during pilot; poll for analytics | June |
| RLS performance on new tables | 🟢 Medium | Add FK indexes at table creation time | April (classes feature) |
| School Stripe (B2B invoicing) | 🟡 High | Manual activation for Q2; automate Q3 | June |
| DPA template for schools | 🔴 Blocker for paid | Legal review, then generate from template | Before June licensing |

---
_Researched: 2026-03-27 · gsd-project-researcher_
