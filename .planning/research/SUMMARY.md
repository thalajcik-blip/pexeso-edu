# Research Summary
_pexedu Q2 2026_

**Project:** pexedu — vzdelávacia platforma pre ZŠ (SK/CZ)
**Domain:** EdTech SaaS — gamified flashcard / quiz platform for K-12 classrooms
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

pexedu is a brownfield SPA with strong gameplay foundations (multiplayer, audio decks, XP system) that now needs to grow from a solo-player tool into a classroom platform. Q2 2026 adds three new capability layers in sequence: classroom management (April), content and viral growth (May), and monetization with school licensing (June). Each layer depends on the one before — classes require a clean role system, virality requires content, monetization requires a working class + analytics layer that schools can evaluate.

The recommended approach follows an established EU EdTech pattern: persistent named classes (Quizlet model) combined with low-friction join (Kahoot code model), a freemium gate that lets a teacher run one class for free before hitting limits, and Stripe Checkout for the individual Pro tier with manual school license activation for Q2 pilots. The architecture is sound for the scale; the primary technical work is schema additions (classes, subscriptions, daily challenge tables) and consolidating two auth contexts into one.

The most likely pilot-killing risk is not technical: it is student login friction on first classroom use and GDPR non-compliance blocking school procurement. Both must be addressed in April alongside the classroom features, not deferred to June. Every other risk is manageable through the mitigations documented in PITFALLS.md.

---

## Key Findings

### Architecture Changes Required (before features can be built)

These are hard prerequisites — later phases cannot be built safely without them.

**P1 — Role system consolidation (April, Week 1)**
`src/admin/useAuth.ts` still reads from the legacy `user_roles` table while `authStore.ts` reads from `profiles.roles[]`. Two independent auth contexts cause diverging session state when a teacher has both `/` and `/admin` tabs open. Fix before any teacher-facing feature ships:
1. Backfill `profiles.roles[]` from `user_roles` via migration.
2. Rewrite `useAuth.ts` to read from `profiles`.
3. Drop `user_roles` after staging verification.

**P1 — Classroom schema (April)**
Three new tables required: `classes`, `class_members`, `class_assignments`. Add FK indexes at creation time — RLS policy subqueries will table-scan without them. Use `SECURITY DEFINER` helper functions (`is_class_teacher`, `is_class_member`) for RLS; do not use `auth.jwt()` for role checks (Supabase does not auto-populate custom claims).

**P1 — `addXP` race condition fix (before daily challenge / class scale)**
Current `addXP` in `authStore.ts` reads → adds client-side → writes back. At 30 students finishing simultaneously, last-write-wins causes XP loss. Replace with atomic RPC: `UPDATE profiles SET xp = xp + $delta WHERE id = $uid`.

**P2 — Subscription columns on profiles (June, before Stripe)**
Add `subscription_tier text DEFAULT 'free'`, `stripe_customer_id text UNIQUE`, `subscription_expires_at timestamptz` to `profiles`. Required before the Stripe webhook Edge Function can sync payment state.

**P2 — Dual answer schema cleanup (before content pipeline at scale)**
`custom_cards` has both legacy `quiz_options / quiz_correct` columns and new `answers JSONB`. Both are read by different code paths, causing silent wrong-answer bugs. Migrate fully to `answers JSONB` before the 32-deck content push in May.

**P2 — `custom_decks.owner_id` column (before freemium limits)**
`custom_decks` has no `owner_id` column. Per-teacher deck count limits (3 free / unlimited Pro) cannot be enforced without it. Add column + BEFORE INSERT trigger (RLS cannot enforce count-based limits).

---

### Critical Risks (must address in planning)

**1. GDPR — blocker for school pilots (April)**
The current `PrivacyModal.tsx` has no Art. 8 (children under 16) language, no age declaration, no parental consent mechanism, and no DPA template for schools. This is not a feature — it is a legal prerequisite. School IT managers and procurement officers will ask for a DPA before approving pexedu for classroom use.

Required in April (with classes feature):
- Age declaration at registration ("I am under 16")
- Parental consent screen for under-16 direct registrations
- Teacher declaration checkbox at class creation: "I confirm our school has parental consent from guardians"
- Privacy-by-default for child accounts (no public profile, no leaderboard appearance)
- Updated privacy policy with Art. 8 language

Required before June school licensing:
- DPA template reviewed by a SK/CZ privacy lawyer (~2-4h consultation)

Slovakia applies the stricter Art. 8 threshold of 16 (Czech Republic is 15 but cannot be reliably separated in a bilingual app). Apply 16 uniformly.

**2. Student login friction — #1 pilot-killing risk (April)**
The most common reason edtech tools fail in school pilots: 30% of students cannot log in in the first 5 minutes of first classroom use. The teacher gives up and never returns.

Mitigation (in priority order):
1. Allow anonymous play for assigned decks via class join link (no account required for first session). Account creation becomes optional, not required.
2. "Bulk create student accounts" flow for teachers (username + temp password).
3. A 3-step "first week" checklist in the teacher dashboard.

**3. `game_start` broadcast near Realtime 32 KB limit (before multiplayer + custom decks at scale)**
Full shuffled card array in `game_start` broadcast reaches ~27-29 KB with Supabase Storage CDN URLs. Silent delivery failure above 32 KB — host sees game start, joiners receive nothing. Fix: send only card IDs in broadcast; each client fetches the full deck independently.

**4. Realtime connection limits at school scale (monitor from June)**
Supabase free/Pro: 200–500 concurrent Realtime connections. 10 simultaneous classes of 30 students = 300 connections. Keep Realtime only for multiplayer game sessions. Use polling (60s) for all dashboard analytics and leaderboards.

**5. School Stripe is B2B, not consumer (June)**
Slovak schools require invoices (faktúra), annual billing, VAT ID support, and often a purchase order / director signature. Do NOT attempt automated school license purchasing in Q2. Plan: Stripe Checkout for individual Pro tier in June; superadmin manually activates school licenses for Q2 pilots. Automated school invoicing is Q3.

---

### Technology Recommendations

**Stripe Checkout (not Elements)** for Pro tier — Stripe Checkout offloads the entire payment flow to Stripe's servers. No PCI surface, no custom 3DS handling, EU VAT collected automatically. Integration: Supabase Edge Function creates checkout session → redirect → webhook fires → `subscription_tier` updated in `profiles`. Supabase Realtime subscription on `profiles` handles the race between redirect and webhook. Verify `npm:stripe` Deno compatibility in current Edge Function runtime before implementation.

**Vercel Function + `@vercel/og`** for OG image generation — project is already on Vercel. A single `api/og.tsx` function generates 1200x630 PNG via Satori + Resvg, CDN-cached by URL params. Required companion: a thin `/api/share` Vercel Function that returns `text/html` with correct `og:image` meta tags for social crawlers (WhatsApp, Telegram, iMessage cannot execute JS in an SPA). OG images and deep links must ship together — a share link without an OG preview card has significantly lower click-through.

**Extend `shareService.ts`, no third-party SDK** — the existing deep link pattern is correct. Add params: `daily=1`, `class=PX-A4T2`, `ref=<source>`. Do not use Firebase Dynamic Links (shut down August 2025), Branch.io, or UTM/GA params (incompatible with child-user GDPR posture). Log `ref` param to a `share_events` Supabase table for viral attribution without third-party trackers.

**No Google Analytics or Meta Pixel** — incompatible with the child-user GDPR posture.

---

### Feature Patterns

**Classroom model: Quizlet persistence + Kahoot join simplicity.** Persistent named classes with invite codes (`PX-XXXX` format, using `crypto.getRandomValues()`) and invite links. Codes should be permanent — teachers share them in class group chats that stay active for months. A security-definer RPC `join_class_by_code(code text)` handles joins without exposing raw SELECT on `classes`.

**Teacher dashboard is 3 questions, not an analytics suite.** For June pilot: (1) Who played? (2) How did they do? (3) Who is struggling? Everything else (time-on-task, per-card heatmaps, longitudinal trends, parent view) is Q3. Export to CSV can be generated client-side from the query result.

**Freemium gate: generous free tier, obvious Pro value.** Free: 3 custom decks / 20 cards / 1 class / 30 students. Pro: unlimited + AI generation + deck sharing with colleagues + full analytics export. Never gate: daily challenge, multiplayer, viewing shared decks (these drive viral growth). Block Pro features inline in the editor (progress bar "2/3 decks used") — not with an interrupting modal. Teachers are institutional buyers who need to justify spend to a principal.

**Daily challenge: global, pre-scheduled, once per day.** Superadmin pre-schedules 7-14 days ahead. Fallback cron at 23:50 UTC auto-selects from most-played built-in decks. Allow replays; count only first play for leaderboard rank, show personal best separately. Do NOT use Supabase Realtime for the leaderboard — poll every 60 seconds.

**Invite code naming convention must be decided before April build.** `rooms.id` already uses 6-char codes for multiplayer. Class codes must use a distinct prefix (`PX-XXXX`) to avoid teacher/student confusion when both types of codes are in use simultaneously.

---

## Recommended Phase Order

The phase order follows dependency chains, not arbitrary grouping.

**Why April must come first:** Role system consolidation unblocks all teacher-facing features. Classes + GDPR consent must ship together — classroom features without GDPR are a legal blocker for school pilots. The April 15 milestone (first pilot teacher) is the hardest constraint in Q2.

**Why May follows April:** Viral sharing (OG images + deep links) requires a working homepage with content to share. Daily challenge requires the atomic `addXP` RPC fix (implemented in April). Content pipeline (32 decks) runs in parallel throughout May but is gated on the `answers` JSONB migration.

**Why June follows May:** Monetization requires a functional classroom + analytics layer that a school can evaluate before paying. The freemium gate requires the `custom_decks.owner_id` column. Stripe integration is strictly June — it must not block April/May features.

### Suggested Phases

**Phase 1 — Foundation (April 1–30)**
Rationale: Unblocks all teacher-facing Q2 work. Hard deadline: April 15 pilot teacher.
- Role system migration (`user_roles` → `profiles.roles[]`)
- Settings modal (avatar, language, privacy toggles)
- Teacher request admin flow
- Classes: create, invite code, student join (anonymous play as default student path)
- GDPR: age declaration, parental consent, teacher DPA checkbox, right to erasure
- Homepage redesign: browse, search, category chips, featured decks
- Share result: Web Share API + clipboard fallback chain
- Fix: atomic `addXP` RPC
- Fix: `game_start` broadcast payload (card IDs only)
- Fix: `rooms` RLS policy scope

**Phase 2 — Content and Virality (May 1–31)**
Rationale: Content drives growth; virality mechanisms are only effective with content to share. Hard deadline: 31 May — 32 decks + share live.
- Content pipeline: 12 ZŠ decks, 3 autoškola decks, audio decks (parallel with dev)
- Dual answer schema migration (`answers` JSONB only)
- Deep links: extended param vocabulary
- OG image: Vercel Function + `/api/share` meta-redirect
- Daily challenge: tables, scheduling, leaderboard RPC, XP bonus
- Leaderboard: top 10 per deck (poll-based, no Realtime)

**Phase 3 — Pilot Schools + Monetization (June 1–30)**
Rationale: Monetization is last because it requires the classroom layer to be evaluable by schools. Hard deadline: 30 June — paid school licenses.
- Class analytics: teacher dashboard (3 questions), CSV export
- Deck sharing: teacher shares deck with colleagues
- School onboarding: guide, demo decks
- `custom_decks.owner_id` column + freemium BEFORE INSERT trigger
- Stripe Pro tier: Checkout session Edge Function, webhook receiver, Customer Portal link
- Manual school license activation (superadmin flow)
- DPA template (legal review, requires external consultation)

### Research Flags

Needs deeper research during planning:
- **Phase 3 (Stripe):** Verify `npm:stripe` Deno compatibility with the current Supabase Edge Function runtime version before implementation sprint.
- **Phase 1 (GDPR):** DPA template content requires a SK/CZ privacy lawyer consultation — initiate in April, do not wait until June.
- **Phase 2 (content pipeline):** AI-generated quiz quality at 320-640 questions needs a human review queue in the admin panel before decks go public.

Standard patterns (skip research-phase):
- **Phase 1 (classes schema):** Fully specified in ARCHITECTURE.md — RLS patterns, indexes, helper functions all documented.
- **Phase 2 (OG images):** Fully specified in STACK.md — Vercel Function with `@vercel/og` is confirmed working, CDN caching behavior documented.
- **Phase 3 (teacher dashboard):** Query patterns fully specified in FEATURES.md — RPC, joins, CSV export approach all documented.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Stripe Checkout vs Elements tradeoff is architecturally stable. Vercel OG confirmed from official docs. Deep link extension builds on existing working code. One flag: verify Deno `npm:stripe` compatibility before build. |
| Features | MEDIUM | Based on training knowledge of Kahoot/Quizlet/Wordwall patterns cross-referenced against the actual codebase. Core patterns are well-established. Daily challenge replay semantics need a product decision. |
| Architecture | HIGH | Based on direct codebase analysis. Schema designs, RLS patterns, and indexes are fully specified. Dual auth context risk is confirmed from code inspection. |
| Pitfalls | HIGH | Game_start payload size and addXP race condition are confirmed from CONCERNS.md and codebase review. GDPR thresholds are established law. Stripe B2B complexity is well-documented. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Daily challenge replay semantics:** "One play only" vs. "best score counts" vs. "first play for leaderboard rank, personal best shown separately." Recommend the third option (documented in FEATURES.md) but requires an explicit product decision before Phase 2 build.
- **Anonymous play scope:** How much of the student experience is available without an account? Recommend: play any assigned deck via class join link, progress is session-only. Requires product sign-off before Phase 1 build.
- **Class code prefix format:** `PX-XXXX` is recommended to avoid collision with multiplayer room codes. Confirm before any UI copy is written.
- **Stripe pricing:** Pro tier price point (monthly / annual) not defined. Required before Phase 3 build.
- **`npm:stripe` Deno compatibility:** Must be verified against the actual Supabase Edge Function runtime version in production before Phase 3 begins.

---

## Open Questions

1. **Anonymous play as default student path?** This is the recommended approach for reducing login friction, but it means students have no persistent identity on first classroom use. Product decision needed before April build starts.

2. **Pro tier price point?** Monthly and/or annual? Individual teacher vs. school license pricing tiers? Required for Stripe configuration in June.

3. **DPA consultation timing?** SK/CZ privacy lawyer consultation takes time to schedule. Must be initiated in April to have a reviewed DPA template ready for June school licensing. Who initiates this?

4. **Content review queue priority?** 32 decks by June requires an admin review flow for AI-generated questions. Is this a Phase 2 admin feature or is manual review acceptable for the pilot scale?

5. **Pilot teacher support plan?** PITFALLS.md recommends being on-call for the April 15 pilot teacher's first live classroom session. Who owns this?

---

*Research completed: 2026-03-27*
*Ready for roadmap: yes*
