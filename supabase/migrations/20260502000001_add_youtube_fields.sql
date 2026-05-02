ALTER TABLE custom_cards
  ADD COLUMN IF NOT EXISTS youtube_url        text,
  ADD COLUMN IF NOT EXISTS youtube_start_sec  integer,
  ADD COLUMN IF NOT EXISTS youtube_end_sec    integer,
  ADD COLUMN IF NOT EXISTS youtube_autoadvance boolean DEFAULT true;
