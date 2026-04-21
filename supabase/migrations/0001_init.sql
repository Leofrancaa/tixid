-- Tixid initial schema
create extension if not exists "pgcrypto";

do $$ begin
  create type "game_status" as enum ('lobby','playing','finished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "round_phase" as enum ('clue','submitting','voting','reveal','finished');
exception when duplicate_object then null; end $$;

create table if not exists "cards" (
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text not null,
  "created_at" timestamptz not null default now(),
  "added_by" uuid
);

create table if not exists "games" (
  "id" uuid primary key default gen_random_uuid(),
  "code" text not null unique,
  "status" "game_status" not null default 'lobby',
  "max_players" integer not null default 6,
  "target_score" integer not null default 30,
  "host_player_id" uuid,
  "current_round_id" uuid,
  "created_at" timestamptz not null default now()
);

create table if not exists "game_players" (
  "id" uuid primary key default gen_random_uuid(),
  "game_id" uuid not null references "games"("id") on delete cascade,
  "nickname" text not null,
  "player_token" text not null,
  "seat_order" integer not null,
  "score" integer not null default 0,
  "hand" jsonb not null default '[]'::jsonb,
  "connected" boolean not null default true,
  "last_seen_at" timestamptz not null default now(),
  "joined_at" timestamptz not null default now(),
  unique ("game_id","seat_order"),
  unique ("game_id","nickname")
);

create table if not exists "rounds" (
  "id" uuid primary key default gen_random_uuid(),
  "game_id" uuid not null references "games"("id") on delete cascade,
  "round_number" integer not null,
  "storyteller_id" uuid not null references "game_players"("id"),
  "clue" text,
  "storyteller_card_id" uuid references "cards"("id"),
  "phase" "round_phase" not null default 'clue',
  "started_at" timestamptz not null default now(),
  "ended_at" timestamptz,
  unique ("game_id","round_number")
);

create table if not exists "round_submissions" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "player_id" uuid not null references "game_players"("id"),
  "card_id" uuid not null references "cards"("id"),
  "display_order" integer,
  unique ("round_id","player_id")
);

create table if not exists "round_votes" (
  "id" uuid primary key default gen_random_uuid(),
  "round_id" uuid not null references "rounds"("id") on delete cascade,
  "voter_id" uuid not null references "game_players"("id"),
  "submission_id" uuid not null references "round_submissions"("id") on delete cascade,
  unique ("round_id","voter_id")
);

-- Public view exposed to realtime — no hand / no player_token
create or replace view "game_players_public" as
  select id, game_id, nickname, seat_order, score, connected, last_seen_at, joined_at
  from "game_players";

-- Enable realtime on relevant tables
alter publication supabase_realtime add table "games";
alter publication supabase_realtime add table "game_players";
alter publication supabase_realtime add table "rounds";
alter publication supabase_realtime add table "round_submissions";
alter publication supabase_realtime add table "round_votes";

-- Row Level Security: block anon writes; API routes use service role
alter table "cards" enable row level security;
alter table "games" enable row level security;
alter table "game_players" enable row level security;
alter table "rounds" enable row level security;
alter table "round_submissions" enable row level security;
alter table "round_votes" enable row level security;

-- Read-only policies for realtime subscriptions. NOTE: game_players is readable
-- but the client should consume game_players_public; direct reads of hand/token
-- are not exposed to anon by the public view. To avoid leaking hand/token via
-- realtime, we DO NOT grant select on game_players to anon.
create policy "read_cards" on "cards" for select using (true);
create policy "read_games" on "games" for select using (true);
create policy "read_rounds" on "rounds" for select using (true);
create policy "read_submissions" on "round_submissions" for select using (true);
create policy "read_votes" on "round_votes" for select using (true);

grant select on "game_players_public" to anon, authenticated;
