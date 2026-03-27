# Requirements: pexedu Q2 2026

**Defined:** 2026-03-27
**Core Value:** Učiteľ vytvorí sadu za 5 minút a žiaci ju hrajú ihneď — bez inštalácie, bez konta pre dieťa, cez zdieľaný link.

---

## Q2 Requirements (Apríl–Jún 2026)

### Role System

- [x] **ROLE-01**: User role system migrovaný z `user_roles` tabuľky na `profiles.roles[]`
- [x] **ROLE-02**: Intent screen — nový používateľ si vyberie rolu (player / teacher) pri registrácii
- [x] **ROLE-03**: Teacher request flow funguje cez `profiles.roles[]` (nie legacy `user_roles`)
- [x] **ROLE-04**: Admin app (`useAuth.ts`) číta roly z `profiles.roles[]`

### GDPR & Compliance

- [x] **GDPR-01**: Age declaration checkbox pri registrácii ("Mám menej ako 16 rokov")
- [x] **GDPR-02**: Parental consent screen pre under-16 registrácie (zjednodušená privacy notice + consent checkbox)
- [x] **GDPR-03**: Consent record uložený do DB (`child_user_id`, `timestamp`, `consent_version`)
- [ ] **GDPR-04**: Teacher declaration checkbox pri vytváraní triedy ("Škola má súhlas rodičov")
- [x] **GDPR-05**: Privacy-by-default pre under-16 účty (profil nie je verejný, žiadny leaderboard)
- [x] **GDPR-06**: `delete-account` Edge Function maže všetky PII (game results, XP, avatary zo Storage)

### Classroom Management

- [ ] **CLASS-01**: Teacher vytvára triedu s názvom a vygenerovaným invite kódom (`PX-XXXX`)
- [ ] **CLASS-02**: Žiak sa pripojí do triedy cez invite kód alebo invite link
- [ ] **CLASS-03**: Teacher vidí zoznam žiakov v triede (username, avatar, last active)
- [ ] **CLASS-04**: Teacher priradzuje sadu (built-in alebo custom deck) triede
- [ ] **CLASS-05**: Žiak vidí priradené sady v svojom dashboarde
- [ ] **CLASS-06**: Join by invite link — `pexedu.cz/join/PX-XXXX` automaticky pridá žiaka do triedy po prihlásení
- [ ] **CLASS-07**: RLS politiky pre triedy — teacher vidí len svoje triedy, žiak len svoje členstvá
- [ ] **CLASS-08**: Invite kód je permanentný (bez expiry pre MVP)

### Teacher Request Admin

- [ ] **TADMIN-01**: Superadmin vidí zoznam pending teacher requestov s emailom a školou
- [ ] **TADMIN-02**: Superadmin schvaľuje / zamieta teacher request (1 klik)
- [ ] **TADMIN-03**: Po schválení — `profiles.roles[]` aktualizovaný na `['player', 'teacher']`
- [ ] **TADMIN-04**: Notifikácia učiteľovi po schválení/zamietnutí

### Settings

- [ ] **SET-01**: User môže zmeniť prezývku (username) cez Settings modal
- [ ] **SET-02**: User môže zmeniť avatara
- [ ] **SET-03**: User môže zmeniť jazyk (SK/CS/EN)
- [ ] **SET-04**: Privacy toggles — `show_stats`, `show_favorites`, `show_activity`

### Homepage & Discovery

- [ ] **HOME-01**: Nová homepage — discovery portál s browse sekciou namiesto current game-only UI
- [ ] **HOME-02**: Category chips (horizontálny scroll) — Geography, Nature, Languages, Traffic Signs, Music, Animals
- [ ] **HOME-03**: Search bar — debounced 300ms, `ilike` filter na deck title
- [ ] **HOME-04**: Featured sady — editorský výber spravovaný superadminom (`is_featured`, `featured_order`)
- [ ] **HOME-05**: Deck card — thumbnail, title, počet kariet, Play button
- [ ] **HOME-06**: Audio decks majú CSS fallback thumbnail (category color + title)
- [ ] **HOME-07**: Daily challenge card na homepage (deck name, player count, "Play now" CTA)
- [ ] **HOME-08**: Assigned decks banner pre prihlásených žiakov ("Tvoj učiteľ priradil: [deck]")

### Share & Virality

- [ ] **SHARE-01**: Share výsledku — Web Share API s povinným clipboard fallback
- [ ] **SHARE-02**: Deep links — `pexedu.cz/?set=vlajky&mode=bleskovy_kviz` načíta správnu sadu a mód
- [ ] **SHARE-03**: Deep link params whitelist + validácia (žiadne `as any` casty)
- [ ] **SHARE-04**: OG image — Vercel Function `api/og.tsx` generuje 1200x630 PNG pre každý deck
- [ ] **SHARE-05**: Social share shim — `/api/share/:deckId` vracia HTML s `og:image` meta tagmi pre crawlery
- [ ] **SHARE-06**: Share events tabuľka — `ref` param logovaný do Supabase (interná viral attribution bez GA)
- [ ] **SHARE-07**: Class invite link — `pexedu.cz/join/PX-XXXX` s OG preview

### Content Pipeline

- [ ] **CONTENT-01**: ZŠ sady 1. vlna — prírodoveda, geografia, jazyky (min. 12 sád)
- [ ] **CONTENT-02**: Autoškola sady 1. vlna — dopravné značky (min. 3 sady)
- [ ] **CONTENT-03**: Audio sady — zvuky zvierat, hudobné nástroje (min. 3 sady)
- [ ] **CONTENT-04**: Celkový cieľ: 32 sád live do konca júna
- [ ] **CONTENT-05**: AI quiz generation pipeline je non-blocking (Edge Function, nie browser-blocking call)
- [ ] **CONTENT-06**: Dual answer schema migrovaný — iba `answers` JSONB, legacy `quiz_options` odstránený
- [ ] **CONTENT-07**: Admin review queue — superadmin schvaľuje AI-generovaný obsah pred zverejnením

### Gamification

- [ ] **GAME-01**: Daily challenge — jedna sada denne, rovnaká pre všetkých, reset o polnoci UTC
- [ ] **GAME-02**: Daily challenge leaderboard — top 10 na daný deň (polled, nie Realtime)
- [ ] **GAME-03**: Daily challenge entries — best score uložený, replay povolený, leaderboard počíta prvý play
- [ ] **GAME-04**: Leaderboard — top 10 pre každú verejnú sadu
- [ ] **GAME-05**: `addXP` je atomický RPC (`add_xp(user_id, delta)`) — nie client-side read-modify-write

### Teacher Dashboard

- [ ] **DASH-01**: Teacher vidí zoznam svojich tried s počtom žiakov a last activity
- [ ] **DASH-02**: Class detail — roster žiakov s prirádenými sadami (zelená check / šedá dash)
- [ ] **DASH-03**: Deck results — class average score, per-student riadok (score, duration, played_at)
- [ ] **DASH-04**: Color coding — zelená ≥70%, žltá 40–69%, červená <40%
- [ ] **DASH-05**: Export do CSV — generovaný client-side z query rezultu
- [ ] **DASH-06**: Zdieľanie sady — teacher zdieľa custom sadu s kolegami (link s read-only access)
- [ ] **DASH-07**: Onboarding checklist pre nových učiteľov — 3 kroky: vytvoriť triedu, priradiť sadu, zdieľať link

### Monetization

- [ ] **MON-01**: `subscription_tier` kolumna na `profiles` (`free` | `pro` | `school`)
- [ ] **MON-02**: Freemium limity enforcované server-side — max 3 custom decks (Postgres trigger), max 1 trieda pre free
- [ ] **MON-03**: AI quiz generation blokovaný pre free tier v Edge Function
- [ ] **MON-04**: Stripe Checkout — Pro tier platobný flow (hosted page, `subscription` mode)
- [ ] **MON-05**: Stripe webhook Edge Function — aktualizuje `subscription_tier` na `profiles`
- [ ] **MON-06**: Stripe Customer Portal link — self-service cancel/manage
- [ ] **MON-07**: Upgrade CTA — inline progress bar "X/3 decks used" v teacher nav
- [ ] **MON-08**: Školská licencia — manuálna aktivácia superadminom pre Q2 piloty

### Technical Fixes (required)

- [x] **TECH-01**: `game_start` broadcast — poslať iba card IDs, nie full card objects (fix pre 32KB Realtime limit)
- [x] **TECH-02**: `addXP` atomický RPC (viď GAME-05)
- [x] **TECH-03**: `rooms` RLS — restrict SELECT na host a participantov
- [x] **TECH-04**: Invite kód generovaný cez `crypto.getRandomValues()` (nie `Math.random()`)

---

## v2 Requirements (Q3 2026+)

### Mobile

- Natívna mobilná aplikácia (Capacitor / Expo) — Q3

### Advanced Gamification

- Achievement systém — Q3
- Survival mód — Q3
- Tournament mód pre triedy — Q3
- Tímový mód s team chatom — Q3

### AI & Adaptivity

- Adaptívny mód — AI sleduje slabé miesta hráča — Q3
- Auto-generovanie sád z PDF/fotky — Q3

### Advanced Analytics

- Per-card answer heatmaps — Q3
- Longitudinal student progress trends — Q3
- Parent view — Q3
- Automated weekly email summaries for teachers — Q3

### School Administration

- Automated school license purchasing (Stripe Invoicing + annual billing + VAT ID) — Q3
- Self-serve school admin portal — Q3

---

## Out of Scope (Q2)

| Feature | Reason |
|---------|--------|
| Firebase Dynamic Links | Shut down August 2025 — do not use |
| Google Analytics / Meta Pixel | Incompatible with child-user GDPR posture |
| Stripe Elements (embedded) | Overkill for MVP, requires more backend; use Checkout |
| Technical age verification (ID/credit card) | Disproportionate, not required by SK/CZ law |
| Real-time leaderboard updates via Supabase Realtime | Polling suffices; Realtime reserved for multiplayer |
| Email invites for class join | School WhatsApp/Teams groups more practical; share link covers this |
| Per-card answer analytics | Q3 |
| Push notifications to students | Q3 |
| Stripe self-serve school license purchasing | Manual activation sufficient for Q2 pilots |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROLE-01–04 | Phase 1 | Pending |
| GDPR-01–06 | Phase 1 | Pending |
| CLASS-01–08 | Phase 1 | Pending |
| TADMIN-01–04 | Phase 1 | Pending |
| SET-01–04 | Phase 1 | Pending |
| HOME-01–08 | Phase 2 | Pending |
| TECH-01–04 | Phase 1 | Pending |
| SHARE-01–07 | Phase 3 | Pending |
| CONTENT-01–07 | Phase 3 | Pending |
| GAME-01–05 | Phase 4 | Pending |
| DASH-01–07 | Phase 5 | Pending |
| MON-01–08 | Phase 6 | Pending |

**Coverage:**
- Q2 requirements: 65 total
- Mapped to phases: 65
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initialization*
