-- ─────────────────────────────────────────
-- PexesoEdu – databázová schéma v1.0
-- ─────────────────────────────────────────

-- Rozšírenia
create extension if not exists "pgcrypto";

-- ─── Učitelia ───────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  school      text,
  created_at  timestamptz default now()
);

-- ─── Sady kariet ────────────────────────
create table public.card_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references public.users(id) on delete cascade,
  name        text not null,
  subject     text,
  grade       text,
  visibility  text not null default 'private' check (visibility in ('private', 'school', 'public')),
  created_at  timestamptz default now()
);

-- ─── Karty ──────────────────────────────
create table public.cards (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references public.card_sets(id) on delete cascade,
  image_url       text,
  pair_name       text not null,
  question        text,
  answers         jsonb,        -- ["A", "B", "C", "D"]
  correct_answer  text,
  fun_fact        text,
  created_at      timestamptz default now()
);

-- ─── Herné session ───────────────────────
create table public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  code        char(6) not null unique,
  set_id      uuid references public.card_sets(id),
  teacher_id  uuid references public.users(id),
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  created_at  timestamptz default now()
);

-- ─── Hráči v session ─────────────────────
create table public.game_players (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_sessions(id) on delete cascade,
  nickname    text not null,
  score       int not null default 0,
  quiz_score  int not null default 0,
  joined_at   timestamptz default now()
);

-- ─── Ťahy ───────────────────────────────
create table public.game_moves (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.game_sessions(id) on delete cascade,
  player_id             uuid not null references public.game_players(id) on delete cascade,
  card_ids              jsonb not null,   -- [uuid, uuid]
  matched               boolean not null default false,
  quiz_answer_correct   boolean,
  created_at            timestamptz default now()
);

-- ─── Row Level Security ──────────────────
alter table public.users          enable row level security;
alter table public.card_sets      enable row level security;
alter table public.cards          enable row level security;
alter table public.game_sessions  enable row level security;
alter table public.game_players   enable row level security;
alter table public.game_moves     enable row level security;

-- users: každý vidí len seba
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- card_sets: owner má plný prístup, verejné sú čitateľné pre všetkých
create policy "card_sets: owner full access" on public.card_sets
  for all using (auth.uid() = teacher_id);
create policy "card_sets: public readable" on public.card_sets
  for select using (visibility = 'public');

-- cards: prístup cez vlastníka sady
create policy "cards: owner full access" on public.cards
  for all using (
    exists (
      select 1 from public.card_sets cs
      where cs.id = cards.set_id and cs.teacher_id = auth.uid()
    )
  );
create policy "cards: public set readable" on public.cards
  for select using (
    exists (
      select 1 from public.card_sets cs
      where cs.id = cards.set_id and cs.visibility = 'public'
    )
  );

-- game_sessions: čitateľné pre všetkých (žiaci sa pripájajú bez loginu)
create policy "game_sessions: public read" on public.game_sessions
  for select using (true);
create policy "game_sessions: teacher create" on public.game_sessions
  for insert with check (auth.uid() = teacher_id);
create policy "game_sessions: teacher update" on public.game_sessions
  for update using (auth.uid() = teacher_id);

-- game_players: čitateľné pre všetkých, ktokoľvek môže pribudnúť
create policy "game_players: public read" on public.game_players
  for select using (true);
create policy "game_players: anyone join" on public.game_players
  for insert with check (true);
create policy "game_players: update own" on public.game_players
  for update using (true);

-- game_moves: čitateľné a zapisovateľné pre všetkých v session
create policy "game_moves: public read" on public.game_moves
  for select using (true);
create policy "game_moves: anyone insert" on public.game_moves
  for insert with check (true);

-- ─── Realtime ────────────────────────────
alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_moves;
