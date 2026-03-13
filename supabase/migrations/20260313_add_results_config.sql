-- Add per-deck results screen customization (icon, title, messages per tier)
ALTER TABLE custom_decks
  ADD COLUMN IF NOT EXISTS results_config JSONB;
