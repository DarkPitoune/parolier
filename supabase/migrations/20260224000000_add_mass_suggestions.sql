CREATE TABLE mass_suggestions (
  date DATE PRIMARY KEY,
  suggestions JSONB NOT NULL,
  liturgical_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mass_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mass_suggestions are readable by anon"
  ON mass_suggestions FOR SELECT TO anon USING (true);
CREATE POLICY "mass_suggestions are insertable by anon"
  ON mass_suggestions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "mass_suggestions are updatable by anon"
  ON mass_suggestions FOR UPDATE TO anon USING (true);
