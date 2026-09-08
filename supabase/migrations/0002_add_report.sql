-- Adds storage for the AI-generated academic report (DeepSeek), separate
-- from the raw/clean transcript text.
alter table public.transcripts add column if not exists report_text text;
