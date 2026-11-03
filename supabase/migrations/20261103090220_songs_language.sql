alter table public.songs
  add column language text not null default 'fr'
    constraint songs_language_check check (language in ('fr', 'en')),
  add column translation_group uuid;

-- One song per language in a group: with two languages, a song has at most one
-- translation.
create unique index songs_translation_group_language_key
  on public.songs (translation_group, language)
  where translation_group is not null;

create function public.link_translations(a bigint, b bigint)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  song_a public.songs%rowtype;
  song_b public.songs%rowtype;
  target uuid := gen_random_uuid();
begin
  select * into song_a from public.songs where id = a for update;
  if not found then
    raise exception 'song % not found', a;
  end if;

  select * into song_b from public.songs where id = b for update;
  if not found then
    raise exception 'song % not found', b;
  end if;

  if song_a.language = song_b.language then
    raise exception 'songs % and % are in the same language', a, b;
  end if;

  if song_a.translation_group is not null or song_b.translation_group is not null then
    raise exception 'song % or % already has a translation', a, b;
  end if;

  update public.songs set translation_group = target where id in (a, b);

  return target;
end;
$$;

-- Clears both sides, so the remaining song does not keep a group of one.
create function public.unlink_translation(song bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_group uuid;
begin
  select translation_group into old_group from public.songs where id = song for update;
  if old_group is null then
    return;
  end if;

  update public.songs set translation_group = null where translation_group = old_group;
end;
$$;

grant execute on function public.link_translations(bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.unlink_translation(bigint) to anon, authenticated, service_role;
