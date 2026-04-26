-- Official-ish Stella mode support.
-- Secret selections stay server-only; public clients can read the shared grid,
-- per-player public round state, and revealed cards.

do $$ begin
  create type "stella_reveal_outcome" as enum ('fall','spark','super');
exception when duplicate_object then null; end $$;

create table if not exists "stella_round_cards" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "card_id" uuid not null references "cards"("id") on delete cascade,
  "position" integer not null,
  unique ("round_id", "position"),
  unique ("round_id", "card_id")
);

create table if not exists "stella_selections" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "player_id" uuid not null references "game_players"("id") on delete cascade,
  "card_id" uuid not null references "cards"("id") on delete cascade,
  "created_at" timestamptz not null default now(),
  unique ("round_id", "player_id", "card_id")
);

create table if not exists "stella_player_rounds" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "player_id" uuid not null references "game_players"("id") on delete cascade,
  "submitted_at" timestamptz,
  "selection_count" integer,
  "in_dark" boolean not null default false,
  "fallen" boolean not null default false,
  "is_current_scout" boolean not null default false,
  "score_delta" integer not null default 0,
  unique ("round_id", "player_id")
);

create table if not exists "stella_reveals" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "scout_id" uuid not null references "game_players"("id") on delete cascade,
  "card_id" uuid not null references "cards"("id") on delete cascade,
  "reveal_order" integer not null,
  "outcome" stella_reveal_outcome not null,
  "matched_player_ids" jsonb not null default '[]'::jsonb,
  "scored_player_ids" jsonb not null default '[]'::jsonb,
  "created_at" timestamptz not null default now(),
  unique ("round_id", "reveal_order"),
  unique ("round_id", "card_id")
);

alter table "stella_round_cards" enable row level security;
alter table "stella_selections" enable row level security;
alter table "stella_player_rounds" enable row level security;
alter table "stella_reveals" enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'stella_round_cards' and policyname = 'read_stella_round_cards') then
    execute 'create policy "read_stella_round_cards" on stella_round_cards for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'stella_player_rounds' and policyname = 'read_stella_player_rounds') then
    execute 'create policy "read_stella_player_rounds" on stella_player_rounds for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'stella_reveals' and policyname = 'read_stella_reveals') then
    execute 'create policy "read_stella_reveals" on stella_reveals for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stella_round_cards'
  ) then
    alter publication supabase_realtime add table stella_round_cards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stella_player_rounds'
  ) then
    alter publication supabase_realtime add table stella_player_rounds;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stella_reveals'
  ) then
    alter publication supabase_realtime add table stella_reveals;
  end if;
end $$;

alter table stella_round_cards replica identity full;
alter table stella_player_rounds replica identity full;
alter table stella_reveals replica identity full;
