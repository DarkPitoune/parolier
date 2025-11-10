# Process Image to Lyrics Edge Function

This Supabase Edge Function processes uploaded images containing song lyrics and chords using Claude Vision API.

## Setup

1. **Create the song-images storage bucket** in your Supabase project:
   ```sql
   -- Create the bucket
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('song-images', 'song-images', true);

   -- Set up RLS policies
   CREATE POLICY "Authenticated users can upload images" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'song-images');

   CREATE POLICY "Images are publicly viewable" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'song-images');

   CREATE POLICY "Users can delete their own images" ON storage.objects
   FOR DELETE TO authenticated
   USING (bucket_id = 'song-images');
   ```

2. **Set environment variables** in your Supabase project:
   - `CLAUDE_API_KEY`: Your Anthropic Claude API key

   You can set these in the Supabase dashboard under Settings > Environment Variables.

3. **Deploy the function**:
   ```bash
   supabase functions deploy process-image-to-lyrics
   ```

## Usage

The function accepts a POST request with the following body:
```json
{
  "imageUrl": "https://your-bucket-url/image.jpg"
}
```

And returns:
```json
{
  "success": true,
  "title": "Song Title (optional)",
  "strophes": [
    {
      "type": "verse|chorus|bridge|section",
      "content": [
        {"text": "line of lyrics", "chords": "chord progression"}
      ],
      "repetition": false
    }
  ]
}
```

## Error Handling

The function includes comprehensive error handling for:
- Invalid image URLs
- Claude API failures
- JSON parsing errors
- Missing environment variables

## Frontend Integration

The SongEditor component automatically:
1. Uploads images to the `song-images` bucket
2. Calls this edge function with the image URL
3. Processes the returned lyrics and displays them for user review
4. Allows users to apply the suggested lyrics to replace current content

## Security

- Images are automatically cleaned up after processing
- CORS headers are properly configured
- The function uses the service role key for admin operations
- Input validation prevents malicious requests