-- Allow realtime SELECT events on games table (required for DELETE events to reach clients)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'read_games') then
    execute 'create policy "read_games" on games for select using (true)';
  end if;
end $$;

-- REPLICA IDENTITY FULL ensures DELETE events include all columns (needed for filtered subscriptions)
alter table games replica identity full;
alter table round_votes replica identity full;
