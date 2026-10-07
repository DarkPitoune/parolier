-- anon keeps read and insert on sheet-music; overwriting and deleting a score
-- now needs the service role.
drop policy if exists "all can update 1s0rjnb_1" on storage.objects;
drop policy if exists "all can update 1s0rjnb_2" on storage.objects;
