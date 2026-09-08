-- inter4u: initial schema, replacing the Base44 entities (Project, Transcript,
-- TranscriptVersion, AIChange, Document) with Postgres tables.
--
-- This is a single-user, no-login app: every request runs as the Postgres
-- `anon` role (the frontend only ever uses the publishable/anon key, no
-- Supabase Auth session). RLS stays enabled on every table per Supabase's own
-- security guidance for exposed schemas, but the policies are intentionally
-- open (`using (true)`) since there is no per-user ownership to scope by.
--
-- Run this once in the Supabase SQL editor (or `supabase db push` if you link
-- the CLI to this project). Column names (created_date/updated_date) match
-- what the existing frontend already reads (see src/pages/Dashboard.jsx,
-- src/components/workspace/VersionHistory.jsx) to avoid churn there.

-- ─── shared: bump updated_date on any row update ───────────────────────
create function public.set_updated_date()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- ─── projects ────────────────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_file_uri text,
  audio_file_name text,
  audio_file_type text,
  audio_file_size numeric,
  duration numeric,
  language text not null default 'en',
  status text not null default 'UPLOADING'
    check (status in ('UPLOADING','TRANSCRIBING','TRANSCRIBED','CLEANING','CLEANED','EDITING','READY','EXPORTED','ERROR')),
  processing_stage text,
  speakers jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  cleanup_options jsonb,
  changes_count integer not null default 0,
  last_edited timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger projects_set_updated_date
before update on public.projects
for each row execute function public.set_updated_date();

create policy "projects_open_access" on public.projects for all
to anon, authenticated using (true) with check (true);

-- ─── transcripts ─────────────────────────────────────────────────────────
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  raw_text text,
  clean_text text,
  current_text text,
  segments jsonb not null default '[]'::jsonb,
  deepgram_response jsonb,
  cleanup_options jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index transcripts_project_id_idx on public.transcripts (project_id);

alter table public.transcripts enable row level security;

create trigger transcripts_set_updated_date
before update on public.transcripts
for each row execute function public.set_updated_date();

create policy "transcripts_open_access" on public.transcripts for all
to anon, authenticated using (true) with check (true);

-- ─── transcript_versions ─────────────────────────────────────────────────
create table public.transcript_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_type text not null check (version_type in ('RAW','CLEAN','CURRENT','MANUAL')),
  content text,
  label text,
  created_date timestamptz not null default now()
);

create index transcript_versions_project_id_idx on public.transcript_versions (project_id);

alter table public.transcript_versions enable row level security;

create policy "transcript_versions_open_access" on public.transcript_versions for all
to anon, authenticated using (true) with check (true);

-- ─── ai_changes ──────────────────────────────────────────────────────────
create table public.ai_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  transcript_id uuid,
  segment_id text,
  original_text text,
  new_text text,
  change_type text,
  reason text,
  accepted boolean,
  created_date timestamptz not null default now()
);

create index ai_changes_project_id_idx on public.ai_changes (project_id);

alter table public.ai_changes enable row level security;

create policy "ai_changes_open_access" on public.ai_changes for all
to anon, authenticated using (true) with check (true);

-- ─── documents ───────────────────────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_url text,
  format text check (format in ('docx','pdf','txt','markdown')),
  created_date timestamptz not null default now()
);

create index documents_project_id_idx on public.documents (project_id);

alter table public.documents enable row level security;

create policy "documents_open_access" on public.documents for all
to anon, authenticated using (true) with check (true);

-- ─── storage: audio-files bucket ────────────────────────────────────────
-- Private bucket (not publicly listable), but open to anyone holding the
-- anon key — matches the rest of this single-user, no-login app.
insert into storage.buckets (id, name, public)
values ('audio-files', 'audio-files', false)
on conflict (id) do nothing;

create policy "audio_files_open_access"
on storage.objects for all
to anon, authenticated
using (bucket_id = 'audio-files')
with check (bucket_id = 'audio-files');
