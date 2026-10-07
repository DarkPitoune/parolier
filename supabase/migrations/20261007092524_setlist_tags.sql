alter table public.setlists
  add column tags text[] not null default '{}';
