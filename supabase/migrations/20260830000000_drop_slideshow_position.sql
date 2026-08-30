-- Slide position has never been carried by a table: same-device sync goes
-- through localStorage and cross-device through the broadcast transport.
-- Nothing in the app has ever read or written this one, and it holds no rows.
-- Dropping it also removes it from the supabase_realtime publication.
drop table if exists public.slideshow_position;
