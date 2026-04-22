-- Add ON DELETE CASCADE to FKs pointing at game_players so deleting a player
-- (or, transitively, a game) automatically removes dependent rows. Without
-- this, the delete-game route needed explicit FK-safe orchestration.

do $$ begin
  -- rounds.storyteller_id → game_players.id
  execute (
    select string_agg('alter table rounds drop constraint ' || quote_ident(conname) || ';', ' ')
    from pg_constraint
    where conrelid = 'public.rounds'::regclass
      and contype = 'f'
      and conname like 'rounds_storyteller_id%'
  );
exception when others then null;
end $$;

alter table rounds
  add constraint rounds_storyteller_id_fkey
  foreign key (storyteller_id) references game_players(id) on delete cascade;

do $$ begin
  -- round_submissions.player_id → game_players.id
  execute (
    select string_agg('alter table round_submissions drop constraint ' || quote_ident(conname) || ';', ' ')
    from pg_constraint
    where conrelid = 'public.round_submissions'::regclass
      and contype = 'f'
      and conname like 'round_submissions_player_id%'
  );
exception when others then null;
end $$;

alter table round_submissions
  add constraint round_submissions_player_id_fkey
  foreign key (player_id) references game_players(id) on delete cascade;

do $$ begin
  -- round_votes.voter_id → game_players.id
  execute (
    select string_agg('alter table round_votes drop constraint ' || quote_ident(conname) || ';', ' ')
    from pg_constraint
    where conrelid = 'public.round_votes'::regclass
      and contype = 'f'
      and conname like 'round_votes_voter_id%'
  );
exception when others then null;
end $$;

alter table round_votes
  add constraint round_votes_voter_id_fkey
  foreign key (voter_id) references game_players(id) on delete cascade;
