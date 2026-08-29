CREATE TABLE ordinaires (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sheet_music_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE songs ADD COLUMN ordinaire_id INTEGER REFERENCES ordinaires(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN ordinaire_role TEXT;
-- ordinaire_role values: 'kyrie', 'gloria', 'alleluia', 'sanctus', 'anamnese', 'agnus'

ALTER TABLE ordinaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordinaires are readable by anon"
  ON ordinaires FOR SELECT TO anon USING (true);
CREATE POLICY "ordinaires are insertable by anon"
  ON ordinaires FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ordinaires are updatable by anon"
  ON ordinaires FOR UPDATE TO anon USING (true);
CREATE POLICY "ordinaires are deletable by anon"
  ON ordinaires FOR DELETE TO anon USING (true);
