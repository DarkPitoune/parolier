-- An upsert (INSERT ... ON CONFLICT DO UPDATE) must be able to SELECT the
-- existing row, so a time-based SELECT policy blocks reusing a leader name
-- whose row has gone stale. Staleness is filtered by the client query instead.
DROP POLICY IF EXISTS "read recent entries" ON "public"."leader_position";

CREATE POLICY "all can read" ON "public"."leader_position" FOR SELECT USING (true);
