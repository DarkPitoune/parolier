-- Create function to get popular songs with proper aggregation
CREATE OR REPLACE FUNCTION get_popular_songs(
    start_date text DEFAULT NULL,
    end_date text DEFAULT NULL
)
RETURNS TABLE (
    title text,
    count bigint
)
LANGUAGE sql
AS $$
    SELECT
        s.title,
        COUNT(a.id) as count
    FROM analytics a
    INNER JOIN songs s ON a.songId = s.id
    WHERE
        (start_date IS NULL OR a.created_at >= start_date::date)
        AND (end_date IS NULL OR a.created_at <= end_date::date)
    GROUP BY s.id, s.title
    ORDER BY count DESC;
$$;