-- Add flexible answer pool columns to custom_cards
ALTER TABLE custom_cards
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS display_count INTEGER NOT NULL DEFAULT 4;

-- Migrate existing quiz_options + quiz_correct → new answers pool format
-- Each option becomes { text: string, correct: boolean }
UPDATE custom_cards
SET answers = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'text', elem,
      'correct', elem = quiz_correct
    )
  )
  FROM jsonb_array_elements_text(quiz_options) AS elem
)
WHERE quiz_options IS NOT NULL
  AND quiz_correct IS NOT NULL
  AND answers IS NULL;
