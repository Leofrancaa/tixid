alter table "games" add column if not exists "card_queue" jsonb not null default '[]'::jsonb;
