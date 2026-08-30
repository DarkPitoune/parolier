-- Deterministic fixtures for local development and the e2e suite, applied by
-- `supabase db reset`. Ids are fixed so tests can name the rows they assert on;
-- add a row here rather than creating one from a test.

-- ---------------------------------------------------------------- tags
insert into public.tags (id, name, color, svg) values
  (901, 'Louange',   '#e8590c', null),
  (902, 'Communion', '#1971c2', null),
  (903, 'Marial',    '#2f9e44', null);

-- ---------------------------------------------------------------- texts
insert into public.texts (id, title, content) values
  (801, 'Prière de saint François', 'Seigneur, fais de moi un instrument de ta paix.'),
  (802, 'Acte de contrition',       'Mon Dieu, j''ai un extrême regret de vous avoir offensé.');

-- ---------------------------------------------------------------- ordinaire
insert into public.ordinaires (id, name, sheet_music_url) values
  (701, 'Messe de Saint-Jean', null);

-- ---------------------------------------------------------------- songs
insert into public.songs (id, title, type, ordinaire_id, ordinaire_role, sheet_music_url, strophes) values
  (601, 'Tu es là', 'song', null, null, null, array[
    '{"type":"verse","repetition":false,"content":[{"text":"Tu es là présent livré pour nous","chords":"Em"},{"text":"Toi le tout petit le serviteur","chords":"C"}]}',
    '{"type":"chorus","repetition":true,"content":[{"text":"Gloire à toi Seigneur","chords":"G"},{"text":"Gloire à toi","chords":"D"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Tu es là présent donné pour nous","chords":"Em"},{"text":"Toi le seul Seigneur le tout puissant","chords":"C"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Tu es là présent caché dans le pain","chords":"Am"},{"text":"Toi qui nous rassembles en un seul corps","chords":"G"}]}'
  ]::jsonb[]),

  (602, 'Je vous salue Marie', 'song', null, null, null, array[
    '{"type":"verse","repetition":false,"note":{"who":["🥁"],"how":["doux"],"text":"batterie seule sur le premier couplet"},"content":[{"text":"Je vous salue Marie comblée de grâce","chords":""}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Sainte Marie mère de Dieu","chords":""}]}'
  ]::jsonb[]),

  (603, 'Alléluia, magnificat', 'refrain', null, null, null, array[
    '{"type":"chorus","repetition":true,"content":[{"text":"Alléluia, magnificat","chords":"A"}]}'
  ]::jsonb[]),

  (604, 'Kyrie de Saint-Jean', 'ordinaire', 701, 'kyrie', null, array[
    '{"type":"verse","repetition":false,"content":[{"text":"Kyrie eleison","chords":""}]}'
  ]::jsonb[]),

  (605, 'Peuple de lumière', 'song', null, null, null, array[
    '{"type":"section","content":"Refrain"}',
    '{"type":"chorus","repetition":true,"content":[{"text":"Peuple de lumière baptisé pour témoigner","chords":"F"}]}'
  ]::jsonb[]),

  (606, 'Souffle imprévisible', 'song', null, null, null, array[
    '{"type":"verse","repetition":false,"content":[{"text":"Souffle imprévisible Esprit de Dieu","chords":"Am"}]}'
  ]::jsonb[]),

  -- Taller than the viewport.
  (607, 'Litanie des saints', 'song', null, null, null, array[
    '{"type":"verse","repetition":false,"content":[{"text":"Seigneur, prends pitié de nous","chords":"D"},{"text":"Ô Christ, prends pitié de nous","chords":"A"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Sainte Marie, Mère de Dieu","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Michel, saint Gabriel","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Jean-Baptiste, saint Joseph","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Pierre et saint Paul","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint André, saint Jean","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Sainte Marie-Madeleine, saint Étienne","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Ignace d''Antioche, saint Laurent","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Sainte Perpétue, sainte Félicité","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Sainte Agnès, saint Grégoire","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Augustin, saint Athanase","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Basile, saint Martin","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Benoît, saint François","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Saint Dominique, saint Thomas d''Aquin","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}',
    '{"type":"verse","repetition":false,"content":[{"text":"Tous les saints et saintes de Dieu","chords":"D"},{"text":"Priez pour nous","chords":"G"}]}'
  ]::jsonb[]),

  -- Written to by the editor spec; nothing else may assert its contents.
  (608, 'Brouillon', 'song', null, null, null, array[
    '{"type":"verse","repetition":false,"content":[{"text":"Ligne de brouillon","chords":"C"}]}'
  ]::jsonb[]);

insert into public.song_tag (song_id, tag_id) values
  (601, 901), (601, 902), (602, 903), (605, 901);

-- ---------------------------------------------------------------- setlists
insert into public.setlists (id, name) values
  (501, 'Messe du dimanche'),
  (502, 'Répétition');

insert into public.setlist_items (id, setlist_id, position, song_id, text_id, text) values
  (401, 501, 0, 601,  null, null),
  (402, 501, 1, 605,  null, null),
  (403, 501, 2, null, 801,  null),
  (404, 501, 3, 603,  null, null),
  (405, 502, 0, 602,  null, null),
  (406, 502, 1, 606,  null, null);

-- ---------------------------------------------------------------- sequences
-- Explicit ids bypass the identity sequences; move them clear of the fixtures.
select setval(pg_get_serial_sequence('public.tags',          'id'), 1000, false);
select setval(pg_get_serial_sequence('public.texts',         'id'), 1000, false);
select setval(pg_get_serial_sequence('public.ordinaires',    'id'), 1000, false);
select setval(pg_get_serial_sequence('public.songs',         'id'), 1000, false);
select setval(pg_get_serial_sequence('public.setlists',      'id'), 1000, false);
select setval(pg_get_serial_sequence('public.setlist_items', 'id'), 1000, false);
