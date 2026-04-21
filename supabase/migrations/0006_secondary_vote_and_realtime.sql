-- 1. Add is_secondary column to round_votes
alter table round_votes add column if not exists is_secondary boolean not null default false;

-- 2. Drop old unique constraint (one vote per voter) and add new one (one per type per voter)
alter table round_votes drop constraint if exists round_votes_round_id_voter_id_unique;
alter table round_votes add constraint round_votes_round_id_voter_id_is_secondary_unique
  unique (round_id, voter_id, is_secondary);

-- 3. Enable Realtime for rounds, round_submissions, round_votes (safe — skip if already added)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rounds'
  ) then
    alter publication supabase_realtime add table rounds;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'round_submissions'
  ) then
    alter publication supabase_realtime add table round_submissions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'round_votes'
  ) then
    alter publication supabase_realtime add table round_votes;
  end if;
end $$;

-- 4. RLS select policies so realtime events are delivered (safe — skip if already exists)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rounds' and policyname = 'read_rounds') then
    execute 'create policy "read_rounds" on rounds for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'round_submissions' and policyname = 'read_round_submissions') then
    execute 'create policy "read_round_submissions" on round_submissions for select using (true)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'round_votes' and policyname = 'read_round_votes') then
    execute 'create policy "read_round_votes" on round_votes for select using (true)';
  end if;
end $$;
