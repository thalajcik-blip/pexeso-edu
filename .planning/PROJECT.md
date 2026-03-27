# pexedu

## What This Is

pexedu je vzdelávacia webová aplikácia postavená na mechanike pexesa — žiaci a učitelia hrú kartičkové kvízy (pexeso, bleskový kvíz, multiplayer), pričom obsah tvoria sami učitelia cez vlastný editor. Cieľová skupina sú základné školy (SK/CZ), autoškoly a individuálni hráči. Produkt je SPA na Verceli + Supabase backend (DB, Auth, Storage, Edge Functions).

## Core Value

Učiteľ vytvorí sadu za 5 minút a žiaci ju hrajú ihneď — bez inštalácie, bez konta pre dieťa, cez zdieľaný link.

## Requirements

### Validated

- ✓ Registračný flow — player hrá okamžite, teacher čaká na schválenie — existing
- ✓ Context switching — admin ↔ hra bez re-logovania — existing
- ✓ Verejný profil `/profile/:username` — avatar, level, štatistiky — existing
- ✓ Pending teacher banner — UI indikátor kým čaká na schválenie — existing
- ✓ Challenge banner — "Kamarát ťa vyzval, prekonaš ho?" — existing
- ✓ Multiplayer režim — Supabase Realtime broadcast — existing
- ✓ Bleskový kvíz (Lightning Game) — existing
- ✓ Vlastný deck editor — upload obrázkov, AI generovanie kvízov — existing
- ✓ Audio deck support — upload mp3/wav, trim, compress, playback — existing
- ✓ XP a level systém — existing
- ✓ Gamifikácia — výsledky, skóre, animácie — existing

### Active

**Apríl — Jadro produktu**
- [ ] User role systém — migrácia `role` → `roles[]`, intent screen
- [ ] Settings modal — prezývka, avatar, jazyk, privacy toggles
- [ ] Teacher request admin — superadmin schvaľuje/zamieta žiadosti
- [ ] Triedy — teacher vytvára triedu, pozýva žiakov cez kód alebo email
- [ ] Žiaci v triede — teacher vidí zoznam žiakov a ich výsledky
- [ ] GDPR — consent checkbox, vekové potvrdenie, zmazanie účtu

**Apríl — Homepage redesign**
- [ ] Nová homepage — discovery portál (Browse sady, search, filter, kategórie)
- [ ] Featured sady — editorský výber
- [ ] Share výsledku — Web Share API + dynamické texty CS/SK/EN

**Máj — Obsah a virálny rast**
- [ ] ZŠ sady 1. vlna — prírodoveda, geografia, jazyky (cieľ: 12 sád)
- [ ] Autoškola sady 1. vlna — dopravné značky (cieľ: 3 sady)
- [ ] Audio sady — zvuky zvierat, hudobné nástroje
- [ ] Deep links — `pexedu.cz/?set=vlajky&mode=bleskovy_kviz`
- [ ] OG image — dynamický náhľad pri zdieľaní (Vercel Edge)
- [ ] Daily challenge — každý deň iná sada, globálny leaderboard
- [ ] Leaderboard — top 10 pre každú sadu

**Jún — Pilotné školy + monetizácia**
- [ ] Štatistiky triedy — teacher vidí výsledky celej triedy, export
- [ ] Učiteľský dashboard — prehľad tried, sád, aktivity
- [ ] Zdieľanie sád — teacher zdieľa sadu s kolegami
- [ ] Onboarding pre školy — návod, demo sady
- [ ] Freemium limity — free tier bez AI, Pro tier s AI generovaním
- [ ] Pro tier — Stripe platobná brána, správa predplatného
- [ ] Školská licencia — fakturácia, správa školy v admin paneli

### Out of Scope (Q2)

- Mobilná aplikácia (Capacitor/Expo) — Q3 2026
- Adaptívny mód (AI sleduje slabé miesta) — Q3 2026
- Tímový mód s team chatom — Q3 2026
- Tournament mód pre triedy — Q3 2026
- Achievementy a survival mód — Q3 2026

## Context

- **Brownfield SPA** — React 19 + TypeScript, Vite 7, Tailwind CSS v4, Zustand 5, shadcn/ui
- **Backend** — Supabase (PostgreSQL + RLS, Auth, Storage `card-images`, Realtime, Edge Functions v Deno)
- **Deploy** — Vercel statický SPA, catch-all rewrite
- **Tri render kontexty** — player app (`/`), admin dashboard (`/admin*`), verejný profil (`/profile/:id`)
- **Stav DB** — `profiles.roles[]` čiastočne implementované, legacy `user_roles` tabuľka stále aktívna v admin auth
- **Milestone** — 15. apríla: prvý pilotný učiteľ; 30. apríla: jadro + homepage live; 31. mája: 32 sád + share; 30. júna: platené školské licencie

## Constraints

- **Timeline**: Q2 2026 (apríl–jún) — tvrdé milestone dátumy s pilotmi
- **Stack**: Supabase BaaS only — žiadny custom API server, Edge Functions len pre AI/admin ops
- **GDPR**: Produkt je pre deti pod 16 rokov — consent a vekové potvrdenie sú blocker pre školy
- **Monetizácia**: Stripe integrácia až jún — nesmie blokovať apríl/máj features
- **Obsah**: 32 sád do konca júna — paralelne s vývojom, cez AI editor

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase BaaS (žiadny custom server) | Rýchlosť vývoja, škálovateľnosť, bez DevOps | ✓ Good |
| Zustand namiesto Context/Redux | Jednoduchosť, priame Supabase volania | ✓ Good |
| SPA s troma render kontextami | Jednoduchý deploy, oddelené UX pre hráča/učiteľa/profil | ✓ Good |
| `roles[]` array namiesto single `role` | Umožňuje multi-role (player + teacher) | — Pending (migrácia nedokončená) |
| Freemium model (free bez AI, Pro s AI) | Nízka bariéra vstupu, monetizácia cez hodnotu AI funkcie | — Pending |

## Evolution

Tento dokument sa vyvíja pri fázových prechodoch a míľnikoch.

**Po každom fázovom prechode** (cez `/gsd:transition`):
1. Požiadavky invalidované? → Presun do Out of Scope s dôvodom
2. Požiadavky validované? → Presun do Validated s referenciou na fázu
3. Nové požiadavky? → Pridaj do Active
4. Rozhodnutia na zaznamenanie? → Pridaj do Key Decisions
5. "What This Is" stále aktuálne? → Aktualizuj ak sa zmenil smer

**Po každom míľniku** (cez `/gsd:complete-milestone`):
1. Celkový review všetkých sekcií
2. Core Value check — stále správna priorita?
3. Audit Out of Scope — dôvody stále platné?
4. Aktualizuj Context s aktuálnym stavom

---
*Last updated: 2026-03-27 after initialization*
