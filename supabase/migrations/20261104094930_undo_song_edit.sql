-- Puts a song back to its latest revision. Callable with the anon key, which
-- can already overwrite any song directly; revisions themselves stay unreadable
-- to it. The update fires the revision trigger, so undoing twice re-applies.
create function public.undo_song_edit(p_song_id bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.song_revisions%rowtype;
begin
  select * into revision
  from public.song_revisions
  where song_id = p_song_id
  order by created_at desc, id desc
  limit 1;

  if not found then
    raise exception 'No earlier version of song %', p_song_id;
  end if;

  update public.songs
  set title = revision.title,
      strophes = revision.strophes,
      language = revision.language
  where id = p_song_id;

  return json_build_object(
    'title', revision.title,
    'version_from', revision.created_at
  );
end;
$$;

revoke execute on function public.undo_song_edit(bigint) from public;
grant execute on function public.undo_song_edit(bigint) to anon, authenticated, service_role;
