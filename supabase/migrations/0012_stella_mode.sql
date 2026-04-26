-- Add Stella mode: storyteller picks theme first; everyone (storyteller too)
-- submits + votes. Scoring is consensus-based (see lib/game/scoring.ts).
do $$ begin
  alter type "game_mode" add value if not exists 'stella';
exception when duplicate_object then null; end $$;
