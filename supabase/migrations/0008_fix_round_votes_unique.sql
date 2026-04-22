-- Migration 0006 tried to drop `round_votes_round_id_voter_id_unique`, but the
-- actual auto-generated name from the inline `unique(round_id, voter_id)` in
-- migration 0001 is `round_votes_round_id_voter_id_key`. Drop both possible
-- legacy names and ensure the new (round_id, voter_id, is_secondary) unique
-- constraint is the only one in place. Without this, secondary votes fail with
-- a unique-violation and never reach the DB.
do $$ begin
  -- Drop any variant of the old 2-column unique constraint
  execute (
    select string_agg('alter table round_votes drop constraint ' || quote_ident(conname) || ';', ' ')
    from pg_constraint
    where conrelid = 'public.round_votes'::regclass
      and contype = 'u'
      and conname in (
        'round_votes_round_id_voter_id_key',
        'round_votes_round_id_voter_id_unique'
      )
  );
exception when others then
  -- If nothing to drop, ignore
  null;
end $$;

-- Ensure the 3-column unique constraint exists (safe if already applied)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.round_votes'::regclass
      and conname = 'round_votes_round_id_voter_id_is_secondary_unique'
  ) then
    alter table round_votes
      add constraint round_votes_round_id_voter_id_is_secondary_unique
      unique (round_id, voter_id, is_secondary);
  end if;
end $$;
