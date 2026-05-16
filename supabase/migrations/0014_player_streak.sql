-- Track scoring streak per player (consecutive rounds with score > 0).
-- Used by the UI to render a fire badge around players on a 3+ streak.
alter table "game_players"
  add column if not exists "current_streak" integer not null default 0;

-- Recreate the public view so realtime clients receive the new field.
-- NOTE: `create or replace view` only allows appending columns at the end —
-- it cannot rename or reorder existing ones. Keep current_streak last.
create or replace view "game_players_public" as
  select id, game_id, nickname, seat_order, score,
         connected, last_seen_at, joined_at, current_streak
  from "game_players";

grant select on "game_players_public" to anon, authenticated;
