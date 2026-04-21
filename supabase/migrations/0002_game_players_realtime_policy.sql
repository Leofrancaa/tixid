-- Allow anon to receive realtime postgres_changes on game_players.
-- The callback ignores the payload and re-fetches from game_players_public,
-- so hand/player_token are never exposed to the client via the UI.
create policy "read_game_players" on "game_players" for select using (true);
