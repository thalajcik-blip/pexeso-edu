# Features Research
_pexedu Q2 2026_

> Confidence: MEDIUM overall. WebSearch unavailable; findings drawn from training knowledge (cutoff Aug 2025)
> of edtech SaaS patterns (Kahoot, Quizlet, Wordwall, Google Classroom) cross-referenced against the
> actual pexedu codebase. Flag any LOW-confidence claim before building.

---

## Classroom Management Patterns

### What the market does well

**Kahoot** — join code is the hero. A 6-digit pin shown full-screen on the teacher's projector is the entire classroom-join UX. No email required from students. No account required. Tradeoff: zero persistence for student identity across sessions unless they create an account.

**Quizlet** — class invite link is the primary pattern. Teacher creates a class, gets a shareable URL. Students who click it are prompted to create an account. The class persists, so the teacher can assign sets and see per-student progress over time. **This is the model pexedu should follow** — pexedu already requires auth for meaningful features.

**Wordwall** — teacher-facing simplicity: create activity, share link, done. No classroom concept at all. Good for one-shot play, bad for longitudinal teacher use. Not the right model for pilot schools.

**Google Classroom** — the gold standard but overkill. Key pattern to borrow: assignment → student completion → teacher review in one flow.

### Recommended pattern for pexedu

Hybrid of Quizlet (persistent classes, named students) and Kahoot (low-friction join).

**Class creation flow:**
1. Teacher creates a class with a name and optional grade/subject tags.
2. System generates two join paths:
   - **Invite code** — 6-character alphanumeric (e.g. `PX-A4T2`), displayed large in teacher UI. Student enters it on homepage or `/join` page. Requires student to be logged in (or creates a guest-to-player conversion moment).
   - **Invite link** — `pexedu.cz/join/PX-A4T2` — same code, pre-filled. Shareable in school WhatsApp/Teams.
   - **Email invite** — lower priority. Teachers in Slovak schools typically use class group chats; a shareable link is more useful.

**Student-side UX:**
- After joining, student sees their class in their dashboard: assigned decks, their scores.
- Student does NOT see other students' names/scores unless teacher explicitly enables the class leaderboard toggle.

**Teacher-side UX:**
- Class roster: list of students (username + avatar), date joined, last active.
- Assign a deck to the class (pushes it to the top of each student's view).
- Per-student scores for an assigned deck.

**Invite code generation:** Use `crypto.getRandomValues()` not `Math.random()` (already flagged in CONCERNS.md for `DeckEditor.generateCode()` — apply the same fix here). Format `PX-XXXX`, avoiding ambiguous characters (0/O, 1/I/l).

**RLS pattern:**
- Teachers can only see and manage classes they own (`teacher_id = auth.uid()`).
- Students can only see classes they are members of.
- A student can look up a class by `invite_code` to join — use a security-definer RPC function `join_class_by_code(code text)` rather than exposing a raw SELECT on the classes table.

**Invite code expiry:** Do NOT add expiry in April. Teachers share codes in class group chats that stay active for months. Add expiry only if abuse is observed.

---

## Daily Challenge Architecture

### Mechanic definition

One deck per day, same for all users globally, resets at midnight UTC. Users play it once; their best score that day counts. A global leaderboard shows top N scores for that day.

### Supabase implementation

**Table: `daily_challenges`**
```sql
CREATE TABLE daily_challenges (
  challenge_date date PRIMARY KEY,
  deck_id uuid REFERENCES custom_decks(id),
  set_slug text,   -- for built-in decks; null if custom
  selected_by uuid REFERENCES profiles(id),  -- null = auto-selected
  created_at timestamptz DEFAULT now()
);
```

**Table: `daily_challenge_entries`**
```sql
CREATE TABLE daily_challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date date REFERENCES daily_challenges(challenge_date),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score integer NOT NULL,
  duration_sec integer,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (challenge_date, user_id)
);
CREATE INDEX ON daily_challenge_entries (challenge_date, score DESC);
```

**How today's challenge is determined:**
Pre-schedule challenges. Superadmin sets the next 7-14 days in the admin panel. This avoids race conditions and allows planning themed weeks. Fallback: Edge Function cron at 23:50 UTC picks the most-played built-in deck from the past 30 days not featured in the past 14 days.

**Client-side flow:**
1. Fetch today's challenge: `supabase.from('daily_challenges').select('*').eq('challenge_date', today).single()`
2. Check if user already played: `select score from daily_challenge_entries where challenge_date = today and user_id = uid`
3. After game: `INSERT ... ON CONFLICT (challenge_date, user_id) DO UPDATE SET score = GREATEST(excluded.score, daily_challenge_entries.score)`

**Leaderboard query (as RPC):**
```sql
SELECT p.username, p.avatar_id, p.level, dce.score, dce.duration_sec,
       RANK() OVER (ORDER BY dce.score DESC, dce.duration_sec ASC) AS rank
FROM daily_challenge_entries dce
JOIN profiles p ON p.id = dce.user_id
WHERE dce.challenge_date = CURRENT_DATE
ORDER BY rank LIMIT 10;
```

Cache client-side for 60 seconds. **Do NOT use Supabase Realtime for leaderboard** — polling is sufficient and avoids connection overhead.

**Timezone:** UTC for all date logic. Show countdown to next challenge in local time via `Intl.DateTimeFormat`.

**Virality hook:** After completing the daily challenge, show a shareable result card. Feeds the existing challenge banner mechanic and the May Web Share API scope.

---

## Teacher Dashboard — Minimum Viable

### What metrics matter for pilot schools

Pilot teachers have 45 minutes between classes. The MVP dashboard answers exactly three questions:

1. **Who played?** — which students in my class played the assigned deck this week
2. **How did they do?** — class average score for a deck
3. **Who is struggling?** — students with score below a threshold (e.g. < 50%)

Everything else (time-on-task, answer-level heatmaps, longitudinal trends) is Q3.

### Minimum viable structure

**Screen: My Classes** (landing)
Card per class: name, student count, assigned deck count, last activity date.

**Screen: Class Detail**
Student roster: username, avatar, last active date, decks completed this week. Which assigned decks each student has played (green check) or not (grey dash).

**Screen: Deck Results (per assignment)**
Class average score (large, prominent). Per-student row: score, duration, date played. Color: green ≥ 70%, yellow 40–69%, red < 40%. Export to CSV (generate client-side from query result — no server needed).

### Implementation

All data is in `game_history`. Key query (as RPC):
```sql
SELECT p.username, p.avatar_id, gh.score, gh.duration_sec, gh.played_at
FROM game_history gh
JOIN profiles p ON p.id = gh.user_id
JOIN class_members cm ON cm.student_id = gh.user_id
WHERE cm.class_id = $class_id
  AND (gh.custom_deck_id = $deck_id OR gh.set_slug = $set_slug)
  AND gh.played_at > (now() - interval '30 days')
ORDER BY gh.played_at DESC;
```

**Do NOT build for June pilot:** Streak tracking, per-card answer analytics, parent view, push notifications, automated weekly email summaries — these are Q3.

---

## Freemium Gate Placement

### Positioning principle

Free tier must be genuinely useful — a teacher can run a whole class on free tier. Pro must feel obviously worth it once you hit the limit, not like a punishment.

### Gate structure

| Feature | Free | Pro |
|---------|------|-----|
| Play any built-in deck | Unlimited | Unlimited |
| Create custom decks | Up to 3 | Unlimited |
| Cards per deck | Up to 20 | Unlimited |
| AI quiz generation | Blocked | Unlimited |
| Image + audio upload | Yes | Yes |
| Classes | 1 class | Unlimited |
| Students per class | 30 | Unlimited |
| Deck sharing with colleagues | No | Yes |
| Class analytics + CSV export | Scores only | Full |
| Daily challenge + multiplayer | Yes | Yes |

**Rationale:**
- 3 free decks / 20 cards: covers full product evaluation without limiting day-one utility.
- AI generation as Pro hook: saves ~30 min per deck; obvious value after first use. Block with an inline "Pro feature" state in the editor, not a modal interrupt.
- 1 class / 30 students: covers one Slovak primary school class (typically 25–28 students).
- Never gate: daily challenge, multiplayer, viewing shared decks — these are viral/engagement features.

**Server-side enforcement:** Client checks are UX only. Use a Postgres trigger for deck count limits (RLS cannot enforce count-based limits). Edge Functions must verify plan before calling LLM API.

**Note:** `custom_decks` currently has no `owner_id` column — this is a prerequisite for per-teacher deck limits. Schema migration needed before June.

**Upgrade CTA placement:** Inline in editor ("X/3 decks used" progress bar in teacher nav) rather than blocking modal. Teachers are institutional buyers who need to justify spend to a principal — the upgrade decision is rarely made alone in the moment.

---

## Homepage Discovery UX

### Recommended structure

**Above the fold:**
- Today's daily challenge card (deck name, teaser image, player count, "Play now" CTA).
- If logged in with unplayed assignments: "Your teacher assigned: [deck]" above the hero.

**Browse section:**
- Category chips (horizontal scroll on mobile): Geography, Nature, Languages, Traffic Signs, Music, Animals. One active at a time for MVP.
- Search bar: debounced 300ms, `ilike` on deck title. Client-side filtering if < 200 decks, otherwise Supabase query.
- Featured decks: 3–6 editorially selected via `is_featured` flag + `featured_order` integer on `custom_decks`. Managed by superadmin.
- Deck grid: thumbnail, title, card count, "Play" button.

**Filter UX:** Use filter chips (horizontal scrollable), not a sidebar. Sidebar is desktop-first; chips work on mobile where most students will be.

**Deck card:** Thumbnail (first card image, or category icon fallback), title, card count, Play button. Do NOT show ratings or average scores — library is too small, empty fields look abandoned.

**Deep links:** `/?set=vlajky&mode=bleskovy_kviz` already in scope for May. Homepage must handle shared links gracefully — show OG image preview before auto-starting the game.

**Search at scale:** `ilike` suffices for 32–200 decks. For Q3+ at 500+ decks, add a `tsvector` column and GIN index on `custom_decks` for full-text search.

---

## Key Gotchas

**1. Class codes vs. room codes — naming collision**
The app already uses 6-char room codes for multiplayer (`rooms.id`). Class invite codes must be visually distinct. Use `PX-XXXX` prefix for class codes. Pick one convention before building — teachers will share both types of codes with students.

**2. Daily challenge — replay semantics must be decided upfront**
"One play only" is simpler but frustrating when a student makes a mistake. "Best score counts" encourages grinding but makes leaderboard less meaningful. Recommended: allow replays, count only first play for leaderboard rank, show personal best separately.

**3. `game_history` has no class context**
`game_history` records `user_id` and `custom_deck_id` but no `class_id`. "Class results for a deck" is derived by JOINing `game_history` to `class_members`. For MVP this is close enough; for precise attribution add a nullable `class_id` column to `game_history`.

**4. Freemium count limits need server enforcement, not just RLS**
RLS can block row access but cannot count existing rows and enforce a maximum. Use a BEFORE INSERT trigger on `custom_decks`.

**5. Thumbnails for audio decks and empty decks**
Audio decks may have no images. Build a CSS fallback: category color + deck name text.

**6. `addXP` race condition is more impactful for daily challenge**
Daily challenge awards a large XP bonus. The existing non-atomic `addXP` (flagged in CONCERNS.md) must be fixed to an atomic RPC before daily challenge ships. Loss of a large XP grant is more noticeable than a normal game increment.

**7. Realtime should not be used for leaderboard updates**
Multiplayer already uses Supabase Realtime channels. Adding a leaderboard subscription compounds connection overhead. Poll the leaderboard RPC every 60 seconds instead.

**8. Invite codes should be permanent, not one-use**
Class codes are for joining a persistent class, not a one-time token. Make this distinction explicit in UX copy: "Class join code" vs. "Game room code".

**9. Upgrade prompts must be educational, not punitive**
Show "X/3 decks used" progress in the teacher nav before the limit is hit. The blocked state CTA must explain what Pro adds, not just say "upgrade to continue". Teachers are institutional buyers.

**10. GDPR and child data in classroom context**
Build consent checkbox for April pilot. Flag DPA with the school as a requirement for June school licensing — it is a blocker for official procurement.

---
_Researched: 2026-03-27 · gsd-project-researcher_
