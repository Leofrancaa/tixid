-- Increase default max_players from 6 to 12
alter table games alter column max_players set default 12;

-- Update any existing lobby games that still have the old default
update games set max_players = 12 where max_players = 6 and status = 'lobby';
