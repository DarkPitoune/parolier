-- Broadcasts UPDATE events on `songs` (lyrics, performance notes, title, ...)
-- so every open tab/device patches its TanStack Query cache immediately
-- instead of waiting on staleTime/gcTime. See useSongsRealtimeSync.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'songs'
  ) then
    alter publication supabase_realtime add table public.songs;
  end if;
end $$;
