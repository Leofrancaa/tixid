-- Add question mode: a separate "deck" of question cards (text instead of image)
-- and a games.mode enum to switch between classic (image cards) and questions.

create table if not exists "questions" (
  "id" uuid primary key default gen_random_uuid(),
  "text" text not null,
  "created_at" timestamptz not null default now()
);

do $$ begin
  create type "game_mode" as enum ('classic','questions');
exception when duplicate_object then null; end $$;

alter table games add column if not exists "mode" game_mode not null default 'classic';

-- The hand / submission / storyteller_card_id columns previously FK'd to cards.id.
-- We now store either a card id or a question id (resolved by games.mode), so the
-- FK has to come off. The column stays uuid; engine handles which table to read.
do $$ begin
  alter table rounds drop constraint if exists rounds_storyteller_card_id_fkey;
  alter table rounds drop constraint if exists rounds_storyteller_card_id_cards_id_fk;
  alter table round_submissions drop constraint if exists round_submissions_card_id_fkey;
  alter table round_submissions drop constraint if exists round_submissions_card_id_cards_id_fk;
exception when others then null;
end $$;

-- Allow public read of questions for the realtime/me lookups
do $$ begin
  if not exists (select 1 from pg_policies where tablename='questions' and policyname='read_questions') then
    execute 'create policy "read_questions" on questions for select using (true)';
  end if;
exception when others then null;
end $$;
