# Image to Lyrics Feature Setup Guide

This guide will help you deploy and configure the image-to-lyrics feature for your Parolier app.

## Prerequisites

- Supabase project with CLI installed
- Anthropic Claude API account and API key
- Your project deployed with the new SongEditor code

## Step 1: Create Storage Bucket

1. **Go to your Supabase dashboard** → Storage
2. **Create a new bucket** named `song-images`
3. **Make it public** (check the "Public bucket" option)
4. **Or run this SQL** in the SQL Editor:

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

## Step 2: Configure Environment Variables

1. **Go to Supabase Dashboard** → Settings → Environment Variables
2. **Add the following variable**:
   - Key: `CLAUDE_API_KEY`
   - Value: Your Anthropic API key (get it from https://console.anthropic.com/)

## Step 3: Deploy the Edge Function

1. **Login to Supabase CLI** (if not already):
   ```bash
   supabase login
   ```

2. **Link your project** (if not already):
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

3. **Deploy the edge function**:
   ```bash
   supabase functions deploy process-image-to-lyrics
   ```

4. **Verify deployment**:
   ```bash
   supabase functions list
   ```

## Step 4: Test the Feature

1. **Go to any song in your app**
2. **Click "Modifier" (Edit)**
3. **You should see the new "Générer à partir d'une image" section**
4. **Upload an image with lyrics** (handwritten notes, sheet music, etc.)
5. **Wait for processing** (30-60 seconds)
6. **Review and apply suggested lyrics**

## Step 5: Customize the Prompt (Optional)

The AI prompt is in `supabase/functions/process-image-to-lyrics/index.ts`. You can modify it to:
- Change the extraction style
- Add specific instructions for your use case
- Support different languages
- Handle special chord notations

Example customization:
```typescript
text: \`Analyze this French worship song image and extract lyrics and chords.
Focus on:
- Clean chord notation (C, G, Am, F7, etc.)
- Proper verse/chorus identification
- Handle handwritten French text carefully

Return JSON with this structure: ...\`
```

## Troubleshooting

### Edge Function Not Working
- Check Supabase logs: Dashboard → Edge Functions → process-image-to-lyrics → Logs
- Verify environment variables are set
- Ensure Claude API key has sufficient credits

### Storage Issues
- Verify bucket exists and is public
- Check RLS policies are applied
- Test file upload permissions

### Frontend Issues
- Check browser console for errors
- Verify the song editor loads correctly
- Test with different image formats (JPG, PNG, WebP)

## Cost Considerations

- **Claude API**: ~$0.01-0.05 per image depending on size and complexity
- **Supabase Storage**: Minimal cost for temporary image storage
- **Edge Functions**: Free tier usually sufficient for moderate usage

## Security Notes

- Images are automatically deleted after processing
- Only authenticated users can upload images
- API keys are securely stored as environment variables
- Consider adding rate limiting for production use

## Need Help?

- Check the edge function README: `supabase/functions/process-image-to-lyrics/README.md`
- Review Supabase docs: https://supabase.com/docs/guides/functions
- Anthropic API docs: https://docs.anthropic.com/claude/reference