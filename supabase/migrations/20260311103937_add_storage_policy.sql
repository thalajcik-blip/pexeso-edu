-- Create card-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload card images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'card-images');

-- Policy: authenticated users can update
CREATE POLICY "Authenticated users can update card images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'card-images');

-- Policy: authenticated users can delete
CREATE POLICY "Authenticated users can delete card images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'card-images');

-- Policy: public read
CREATE POLICY "Public read card images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'card-images');
