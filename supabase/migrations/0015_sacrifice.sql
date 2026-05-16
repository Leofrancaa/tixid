-- One-shot card swap per player per game. Player can discard 1 card from
-- their hand and draw a fresh one from the unused deck queue. The sacrificed
-- card is NOT returned to the queue (otherwise it could come back the same
-- game).
alter table "game_players"
  add column if not exists "sacrifice_used" boolean not null default false;

-- Append to public view. `create or replace view` only allows appending
-- columns at the end — never reorder.
create or replace view "game_players_public" as
  select id, game_id, nickname, seat_order, score,
         connected, last_seen_at, joined_at, current_streak, sacrifice_used
  from "game_players";

grant select on "game_players_public" to anon, authenticated;
