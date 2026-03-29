# Roadmap: pexedu Q2 2026

**Milestone:** Q2 2026 (April–June)
**Goal:** Prvé platené školské licencie, classroom platforma kompletná
**Created:** 2026-03-27

---

## Phases

- [x] **Phase 1: Základy a role systém** — Migrácia rolí, GDPR, technické opravy; bez toho nič iné nepobeží (completed 2026-03-27)
- [x] **Phase 2: Triedy a učiteľský flow** — Classroom management, teacher dashboard pre pilota, settings (completed 2026-03-28)
- [ ] **Phase 3: Homepage a discovery** — Nová homepage živá do 30. apríla, browsing, search, featured sady; presun /teacher→/admin
- [ ] **Phase 3.5: Web stránky a i18n routing** — Lokalizované URL (CS/SK/EN), /kvizy, kategórie, detail sady, leaderboard, pre-skoly
- [ ] **Phase 4: Share, deep links a virálny rast** — OG images, share výsledku, deep linky, daily challenge, leaderboardy
- [ ] **Phase 5: Obsah — 32 sád live** — ZŠ, autoškola, audio sady; content pipeline a admin review queue
- [ ] **Phase 6: Monetizácia a školské licencie** — Freemium limity, Stripe Pro tier, manuálna školská licencia

---

## Phase Details

### Phase 1: Základy a role systém
**Goal:** Dual auth context je zjednotený, GDPR consent flows existujú, kritické bezpečnostné a výkonnostné bugy sú opravené — bez týchto zmien sa nesmie nič iné nasadiť
**Target:** April 7 (1. týždeň apríla — tvrdý prerekvizit pre všetko ostatné)
**Requirements:** ROLE-01, ROLE-02, ROLE-03, ROLE-04, GDPR-01, GDPR-02, GDPR-03, GDPR-05, GDPR-06, TECH-01, TECH-02, TECH-03, TECH-04

### Plans
1. **Role migration** — Backfill `profiles.roles[]` z `user_roles`, prepísať `useAuth.ts` aby čítal z `profiles`, overiť na stagingu, dropnúť `user_roles`
2. **GDPR consent flows** — Age declaration checkbox, parental consent screen pre under-16, privacy-by-default (profil skrytý, bez leaderboardu), `delete-account` Edge Function pokrývajúca všetky PII
3. **Critical tech fixes** — Atomický `add_xp()` RPC namiesto client-side read-modify-write; `game_start` broadcast posiela iba card IDs; `rooms` RLS restrict na host + participantov; invite kód cez `crypto.getRandomValues()`

### Success Criteria
- [ ] Učiteľ a superadmin sa vedia prihlásiť do `/admin` a správne vidieť roly bez toho, aby `user_roles` tabuľka existovala
- [ ] Nový používateľ registráciou musí potvrdiť vek; under-16 vidí parental consent screen; súhlas je uložený v DB s timestampom
- [ ] Hráč pod 16 rokov nemá verejný profil a nefiguruje v leaderboardoch
- [ ] `delete-account` Edge Function zmaže všetky PII vrátane Storage objektov a game_history riadkov
- [ ] 30 žiakov dokončí hru naraz — XP je konzistentné (bez lost updates), overené s paralelným testom
- [ ] `game_start` broadcast payload je pod 10 KB aj pri najväčšej custom sade

### Dependencies
- Žiadne — toto je štartovacia fáza

---

### Phase 2: Triedy a učiteľský flow
**Goal:** Pilotný učiteľ vie vytvoriť triedu, zdieľať kód, žiaci sa pripoja a on vidí ich výsledky — všetko live do 15. apríla
**Target:** April 15 (tvrdý milestone: prvý pilotný učiteľ)
**Requirements:** CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06, CLASS-07, CLASS-08, GDPR-04, TADMIN-01, TADMIN-02, TADMIN-03, TADMIN-04, SET-01, SET-02, SET-03, SET-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-07
**Plans:** 5/5 plans complete

Plans:
- [x] 02-01-PLAN.md — Classroom schema + RLS (tables, SECURITY DEFINER helpers, policies, TypeScript types)
- [x] 02-02-PLAN.md — Classroom UI teacher side (classroomStore, /teacher route, create class, invite code, assign deck, roster)
- [x] 02-03-PLAN.md — Classroom UI student side (/join/PX-XXXX route, assigned decks banner)
- [x] 02-04-PLAN.md — Teacher dashboard analytics (class results with color coding, CSV export, onboarding checklist)
- [x] 02-05-PLAN.md — Teacher request admin gaps + settings (rejection email, language selector)

### Success Criteria
- [ ] Učiteľ vytvára triedu — vidí confirmation s invite kódom `PX-XXXX` a kopírovateľným linkom
- [ ] Žiak klikne na `/join/PX-XXXX`, prihlási sa, trieda je v jeho dashboarde bez ďalšej akcie
- [ ] Teacher vidí real-time zoznam žiakov (username, avatar, last active) v class detail pohľade
- [ ] Teacher priradí custom sadu triede; žiak vidí "Tvoj učiteľ priradil: [sada]" banner
- [ ] Teacher dashboard zobrazuje score per žiak s farebným kódovaním (zelená/žltá/červená), exportovateľné do CSV
- [ ] Superadmin schváli teacher request jedným klikom; učiteľ dostane notifikáciu; `profiles.roles[]` obsahuje `teacher`
- [ ] Onboarding checklist zobrazí 3 kroky; každý krok sa zaškrtne po dokončení

### Dependencies
- Phase 1 musí byť kompletná (role systém, GDPR, tech fixes)

**UI hint**: yes

---

### Phase 3: Homepage a discovery
**Goal:** Nová homepage nahradí súčasné game-only UI a stane sa discovery portálom — live do 30. apríla
**Target:** April 30 (tvrdý milestone: homepage live)
**Requirements:** HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08

### Plans
1. **Homepage layout a navigation** — Discovery portál nahrádzajúci aktuálny setup screen; deck card komponenta (thumbnail, title, počet kariet, Play button); CSS fallback thumbnail pre audio decks (category color + title); shadcn komponenty, custom paleta (gold `#F5C400` + navy `#0F1726`), Tailwind dark/light mode
2. **Browse a search** — Category chips (horizontálny scroll: Geography, Nature, Languages, Traffic Signs, Music, Animals); debounced 300ms search bar s `ilike` filter; featured sady spravované superadminom (`is_featured`, `featured_order`)
3. **Contextual banners** — Daily challenge card (deck name, player count, "Play now" CTA); assigned decks banner pre prihlásených žiakov
4. **Presun /teacher do /admin** — Classroom management presunúť pod `/admin/classes` a `/admin/classes/:id`; zjednotiť auth (vyhodiť `useAuthStore` z teacher komponentov, použiť `useAuth.ts`); migrovať teacher UI z THEMES inline styles na Tailwind/shadcn; pridať "Triedy" do admin sidebaru (viditeľné pre `teacher` + `superadmin`)

### Success Criteria
- [ ] Neprihlásený návštevník vidí browse sekciu so sadami, category chips a search boxom
- [ ] Search vracia výsledky po 300ms; filtrovanie podľa kategórie funguje bez page reload
- [ ] Superadmin môže označiť sadu ako featured a nastaviť poradie; featured sady sa zobrazujú navrchu
- [ ] Prihlásený žiak vidí banner s priradeniami od učiteľa
- [ ] Audio sady zobrazujú farebnú fallback thumbnailovú kartu namiesto broken image
- [ ] `/teacher` route neexistuje; učiteľ spravuje triedy na `/admin/classes`; `/join/PX-XXXX` stále funguje
- [ ] Admin sidebar zobrazuje "Triedy" pre roly `teacher` aj `superadmin`

### Design notes
- Dizajn z Google Stitch (brief v `~/Downloads/pexedu_stitch_brief.md`) — implementovať až po schválení dizajnu
- shadcn komponenty, Tailwind dark/light mode (`@custom-variant dark` už nakonfigurovaný)
- Accessibility: semantic HTML, aria labels, keyboard navigácia

### Architektonické rozhodnutia (z impl. briefu v `~/Downloads/pexedu_homepage_impl.md`)

**Routing:**
- `/` → `HomePage` (nová)
- `/play` → `GamePage` (súčasný `App.tsx` obsah presunutý 1:1)
- Deep links `?room=` / `?set=` / `?challenge=` na `/` → redirect na `/play`
- Použiť `createBrowserRouter` (React Router) — `RouterProvider` v `main.tsx`

**Theme store:**
- Nový `src/stores/themeStore.ts` s `isDark`, `toggleTheme()`, `initTheme()`
- `initTheme()` volať raz pri monte v `main.tsx` (zabraňuje flash of wrong theme)
- Toggle prepína `document.documentElement.classList` + ukladá do `localStorage('pexedu-theme')`
- Default: dark mode

**Custom paleta — dark mode (potvrdené):**
- `--background: #0F1726` / `--foreground: #FFFFFF`
- `--card: #1A2035` / `--primary: #F5C400` (gold, nahrádza indigo-600)
- `--accent: #F5C400` / `--ring: #F5C400` / `--muted-foreground: #A0AEC0`
- `--border: rgba(255,255,255,0.08)`
- Light mode CSS vars: TBD po schválení Figma/Stitch dizajnu (pred commitom nahradiť TBD!)

**Čo sa NEMENÍ:** game logika, Supabase auth, existujúce Zustand stores, shadcn source files

### Dependencies
- Phase 1 musí byť kompletná
- Phase 2 môže bežať paralelne (triedy nie sú prerekvizit pre homepage)
- Dizajn z Google Stitch musí byť schválený pred implementáciou Plánu 1

**UI hint**: yes

---

### Phase 3.5: Web stránky a i18n routing
**Goal:** Lokalizované URL pre všetky verejné stránky + nové discovery stránky (/kvizy, kategórie, detail sady, leaderboard, pre-skoly)
**Target:** Po Phase 3 — scheduling TBD
**Brief:** `~/Downloads/pexedu_web_pages.md`

### Plans
1. **i18n routing + DB** — `slug_cs/sk/en`, `available_locales[]` na `card_sets`; `createBrowserRouter` s CS/SK/EN routes; `getSetUrl()` + `getSetSlug()` helpers; `TranslationNotFound` komponent; `HreflangTags` komponent
2. **Discovery stránky** — `/kvizy` (grid kategórií), `/kvizy/:category` (SLP), `/kvizy/:category/:slug` (detail sady s play panelom)
3. **Leaderboard + Pre školy** — `/leaderboard` (top 50, filter týždeň/mesiac/celkovo, per-sada), `/pro-skoly` (hero, benefity, kontaktný formulár, cenník)

### Key decisions (z briefu)
- **Varianta A2** — CS default bez prefixu, SK `/sk/...`, EN `/en/...`
- Slugy sú lokalizované (napr. `vlajky-evropy` / `vlajky-europy` / `flags-europe`)
- Chýbajúci preklad → elegantná 404 s linkom na CS verziu
- `pexedu.com` → redirect na `pexedu.cz/en` (rozhodnúť neskôr)
- `react-helmet-async` alebo `@unhead/react` pre meta/hreflang tagy

### Success Criteria
- [ ] `pexedu.cz/en/quizzes/flags-europe` vracia detail sady; chýbajúci EN preklad → 404 s CTA
- [ ] Všetky verejné stránky majú hreflang tagy pre dostupné jazyky
- [ ] `/kvizy/:category` je SEO indexovateľná stránka s h1, meta description, grid sád
- [ ] `/leaderboard` zobrazuje top 50 s filtrom; aktualizuje sa každú hodinu
- [ ] `/pro-skoly` má funkčný kontaktný formulár → `iam@teamplayer.cz`

### Dependencies
- Phase 3 (homepage) musí byť kompletná — router refactor je prerekvizit
- Phase 5 (obsah) môže bežať paralelne — slug_cs musí byť vyplnený pre existujúce sady

---

### Phase 03.5.1: Leaderboard — game history & data table (INSERTED)

**Goal:** Hráč vidí globálny leaderboard aj vlastnú históriu hier — filtrovateľnú, zoraditeľnú tabuľku výsledkov (shadcn Data Table, TanStack Table) s presnosťou kvízu, avatarmi a stránkovaním; hra ukladá výsledky do `game_history` Supabase tabuľky po každom konci hry.
**Requirements**: LB-01, LB-02, LB-03, LB-04, LB-05, LB-06, LB-07, LB-08, LB-09
**Depends on:** Phase 3 (homepage + routing), Phase 1 (GDPR under-16 exclusion)
**Brief:** `~/Downloads/pexedu_leaderboard_table.md`
**Plans:** 2/2 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 03.5.1 to break down) (completed 2026-03-29)

### Phase 03.5.2: Global Leaderboard (INSERTED)

**Goal:** Funkcny globalny leaderboard v Rebricek tabe — top 50 hracov podla celkoveho skore, s per-sada a time filtrom, poziciou prihlaseneho hraca a GDPR under-16 exclusion
**Requirements**: GLB-01, GLB-02, GLB-03, GLB-04, GLB-05, GLB-06, GLB-07, GDPR-05
**Depends on:** Phase 03.5.1
**Plans:** 1 plan

Plans:
- [ ] 03.5.2-01-PLAN.md — Global leaderboard (service + type + GlobalLeaderboard component + LeaderboardPage wiring)

### Phase 4: Share, deep links a virálny rast
**Goal:** Každý výsledok a každá sada je zdieľateľná s OG preview — share + daily challenge live do 31. mája
**Target:** May 31 (tvrdý milestone: share funkcionalita live)
**Requirements:** SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, SHARE-07, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05

### Plans
1. **Share výsledku** — Web Share API s povinným clipboard fallback chain (try `navigator.share()` → `navigator.clipboard.writeText()` → manual "Copy link" button); share events tabuľka pre `ref` param tracking bez GA
2. **Deep links a URL params** — Rozšíriť `shareService.ts` o `daily=1`, `class=PX-XXXX`, `ref=<source>` params; whitelist + validácia všetkých URL params (opraviť `as any` casty)
3. **OG image a share shim** — Vercel Function `api/og.tsx` generujúca 1200x630 PNG cez `@vercel/og`; `/api/share/:deckId` vracia HTML s `og:image` meta tagmi pre crawlery; `/join/PX-XXXX` s OG preview
4. **Daily challenge a leaderboardy** — `daily_challenges` a `daily_challenge_entries` tabuľky; superadmin scheduling + fallback cron; top-10 leaderboard (poll každú hodinu, nie Realtime); XP bonus za prvý play; atomic `add_xp` RPC (GAME-05 = TECH-02, hotové v Phase 1)

### Success Criteria
- [ ] Hráč zdieľa výsledok na Android 8 zariadení — clipboard fallback sa aktivuje a link je v schránke
- [ ] `/api/share/vlajky` vracia HTML s `og:image`, `og:title`, `og:description` meta tagmi čitateľnými pre WhatsApp crawler
- [ ] `pexedu.cz/?set=vlajky&mode=bleskovy_kviz` načíta správnu sadu a spustí bleskový kvíz; nevalidný mode param je ignorovaný
- [ ] Daily challenge je aktívna každý deň; leaderboard top-10 sa aktualizuje každú hodinu; replay je povolený ale leaderboard počíta prvý play
- [ ] `/join/PX-XXXX` link zobrazí OG preview kartu s názvom triedy pri zdieľaní cez messaging
- [ ] Share events sú logované do Supabase bez GA alebo third-party trackerov

### Dependencies
- Phase 3 musí byť kompletná (homepage s obsahom = je čo zdieľať)
- Phase 1 musí byť kompletná (atomický XP pre daily challenge)

---

### Phase 5: Obsah — 32 sád live
**Goal:** 32 sád je live a verejne prístupných do konca júna — content pipeline s admin review queue
**Target:** June 30 (tvrdý milestone: 32 sád live)
**Requirements:** CONTENT-01, CONTENT-02, CONTENT-03, CONTENT-04, CONTENT-05, CONTENT-06, CONTENT-07

### Plans
1. **Dual answer schema migrácia** — Migrovať `custom_cards` plne na `answers` JSONB; odstrániť `quiz_options` a `quiz_correct` legacy stĺpce; audítnuť editor + quiz renderer; pridať DB constraint
2. **AI pipeline fixes** — Presunutie translation calls do `translate-quiz` Edge Function (fire-and-forget, nie browser-blocking); non-blocking AI quiz generation pre content creation workflow
3. **Admin review queue** — Superadmin review queue: jeden AI-generovaný question per riadok, approve/edit/reject pred zverejnením; batch status update
4. **Tvorba sád (ongoing, paralelne s vývojom)** — ZŠ 1. vlna: min. 12 sád (prírodoveda, geografia, jazyky); autoškola: min. 3 sady; audio sady: min. 3 sady (zvuky zvierat, hudobné nástroje); cieľ: 32 celkovo

### Success Criteria
- [ ] Editor ukladá všetky nové karty výlučne do `answers` JSONB; starý kód nečíta `quiz_options` na žiadnom mieste
- [ ] AI quiz generation z editora nefreezeuje browser tab; superadmin dostane notifikáciu keď je batch hotový
- [ ] Superadmin review queue zobrazuje pending AI questions; schválenie/zamietnutie funguje jedným klikom
- [ ] Celkovo 32 sád je viditeľných na homepage v stave `published`; každá má aspoň 10 kariet a quiz questions
- [ ] Aspoň 3 audio sady prehrajú zvuk správne pri flipnutí karty

### Dependencies
- Phase 3 musí byť kompletná (homepage kde sady žijú)
- Phase 4 môže bežať paralelne — tvorba sád prebieha počas celého mája a júna

---

### Phase 6: Monetizácia a školské licencie
**Goal:** Učiteľ si može kúpiť Pro tier cez Stripe; pilotné školy majú manuálne aktivovanú licenciu — live do 30. júna
**Target:** June 30 (tvrdý milestone: platené školské licencie)
**Requirements:** MON-01, MON-02, MON-03, MON-04, MON-05, MON-06, MON-07, MON-08, DASH-06

### Plans
1. **Subscription schema + freemium limity** — Pridať `subscription_tier`, `stripe_customer_id`, `subscription_expires_at` na `profiles`; `custom_decks.owner_id` stĺpec; BEFORE INSERT trigger pre max 3 decks (free) / max 1 trieda; blokovať AI generation pre free tier v Edge Function
2. **Stripe Pro tier** — Checkout session Edge Function (redirect flow, `subscription` mode); webhook receiver Edge Function (`checkout.session.completed`, `customer.subscription.deleted`); Customer Portal link; idempotency cez Stripe event ID
3. **Freemium UX** — Inline "X/3 decks used" progress bar v teacher nav; upgrade CTA bez interrupting modálu; Realtime subscription na `profiles` pre post-checkout state sync
4. **Školská licencia + deck sharing** — Manuálna aktivácia školskej licencie superadminom v admin paneli; teacher zdieľa custom sadu s kolegami (link s read-only access); onboarding guide + demo sady pre nové školy

### Success Criteria
- [ ] Free učiteľ vytvorí 3 decks — pri pokuse o 4. vidí inline upgrade CTA (nie modal), nie error
- [ ] AI generation je blokovaná pre free tier v Edge Function (nie len v UI); server vráti 403 s jasnou správou
- [ ] Učiteľ klikne "Upgrade to Pro" → Stripe Checkout → platba → je presmerovaný späť a `subscription_tier = 'pro'` je viditeľné bez page refresh
- [ ] Stripe webhook spracuje `customer.subscription.deleted` a downgraduje tier na `free` bez manuálneho zásahu
- [ ] Superadmin aktivuje školskú licenciu v admin paneli jedným klikom; učiteľ vidí `school` tier okamžite
- [ ] Učiteľ zdieľa sadu cez link; kolega s linkom vidí sadu read-only bez toho, aby mal editor prístup

### Dependencies
- Phase 2 musí byť kompletná (classroom layer, ktorý školy hodnotia pred platbou)
- Phase 5 musí byť aspoň čiastočne kompletná (`custom_decks.owner_id` prerekvizit, obsah pre demo)
- Overenie `npm:stripe` Deno kompatibility s aktuálnym Edge Function runtime pred buildovním

**UI hint**: yes

---

## Milestone Map

| Dátum | Míľnik | Fázy kompletné |
|-------|--------|----------------|
| April 7 | Základy a opravy hotové — môže začať build tried | Phase 1 |
| April 15 | Prvý pilotný učiteľ — role systém + triedy živé | Phase 1, Phase 2 |
| April 30 | Jadro produktu + nová homepage live | Phase 1, Phase 2, Phase 3 |
| May 31 | 32 sád live + share funkcionalita | Phase 4, Phase 5 (in progress) |
| June 30 | Prvé platené školské licencie | Phase 5, Phase 6 |

---

## Requirements Coverage

| Fáza | Requirements | Počet |
|------|-------------|-------|
| Phase 1: Základy a role systém | ROLE-01, ROLE-02, ROLE-03, ROLE-04, GDPR-01, GDPR-02, GDPR-03, GDPR-05, GDPR-06, TECH-01, TECH-02, TECH-03, TECH-04 | 13 |
| Phase 2: Triedy a učiteľský flow | CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06, CLASS-07, CLASS-08, GDPR-04, TADMIN-01, TADMIN-02, TADMIN-03, TADMIN-04, SET-01, SET-02, SET-03, SET-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-07 | 23 |
| Phase 3: Homepage a discovery | HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08 | 8 |
| Phase 4: Share, deep links a virálny rast | SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, SHARE-07, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05 | 12 |
| Phase 5: Obsah — 32 sád live | CONTENT-01, CONTENT-02, CONTENT-03, CONTENT-04, CONTENT-05, CONTENT-06, CONTENT-07 | 7 |
| Phase 6: Monetizácia a školské licencie | MON-01, MON-02, MON-03, MON-04, MON-05, MON-06, MON-07, MON-08, DASH-06 | 9 |

**Total: 72/65 mapped** — pozn.: GAME-05 = TECH-02 (atomický XP RPC je ten istý requirement, zaznamenaný v oboch skupinách REQUIREMENTS.md; reálnych unikátnych requirements je 65, bez duplikátu)

---

## Open Questions (vyriešiť pred buildom príslušnej fázy)

**Pred Phase 2 (do April 7):**
- ✓ Anonymous play ako default student path — **ÁNO**. Žiaci hrajú cez class join link bez konta; konto je voliteľné.
- ✓ Class code prefix format — **`PX-XXXX`** potvrdený.
- ✓ Anonymous class join — **NIE pre MVP**. Prihlásenie vyžadované pre join triedy (class_members FK vyžaduje profiles.id). Anonymné hranie v triedach je kandidát na Phase 3+.

**Pred Phase 4 (do May 1):**
- Daily challenge replay semantics: odporúčané — replay povolený, leaderboard počíta prvý play, personal best zobrazený zvlášť. Vyžaduje explicitné product rozhodnutie.

**Pred Phase 6 (do June 1):**
- Pro tier cena: mesačne a/alebo ročne? Individuálny učiteľ vs. školská licencia cenové tiery?
- `npm:stripe` Deno kompatibilita: overiť voči aktuálnej verzii Supabase Edge Function runtime v produkcii.
- DPA template: iniciovať konzultáciu so SK/CZ privacy právnikom v apríli — mať výsledok do júna.

---

## Risk Register

| Riziko | Závažnosť | Fáza kde je kritické | Mitigation |
|--------|-----------|---------------------|------------|
| GDPR bez parental consent | Blocker | Phase 1 | Age declaration + teacher DPA checkbox v Phase 1 |
| `game_start` payload ~32KB | Blocker | Phase 1 | Posielať iba card IDs v broadcast |
| Student login friction na pilote | Blocker | Phase 2 | Anonymous play ako default path; onboarding checklist |
| `addXP` race condition | High | Phase 1 | Atomický `add_xp()` RPC |
| Dual answer schema — silent bugs | High | Phase 5 | Migrovať na `answers` JSONB pred content pipeline |
| Web Share API — Android 8/9 | High | Phase 4 | Povinný clipboard fallback chain |
| `applyDeepLink` type safety | High | Phase 4 | Whitelist + validácia URL params |
| Translation blokuje browser | High | Phase 5 | Presunúť do Edge Function |
| Stripe B2B školy | High | Phase 6 | Manuálna aktivácia Q2; automated invoicing Q3 |
| DPA template pre školy | Blocker pre platby | Phase 6 | Právnik v apríli, výsledok do júna |
| Realtime connection limity | Medium | Phase 6 | Polling pre analytics; Realtime len pre multiplayer |

---

*Roadmap created: 2026-03-27*
*Next: `/gsd:execute-phase 2` — Phase 2: Triedy a učiteľský flow*
