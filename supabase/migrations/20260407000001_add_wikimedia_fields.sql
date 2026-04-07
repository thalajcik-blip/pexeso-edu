alter table custom_cards
  add column if not exists image_source text default null,
  add column if not exists image_attribution jsonb default null;
