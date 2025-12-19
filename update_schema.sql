-- USER ASSESSMENTS TABLE
create table if not exists public.user_assessments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  form_data jsonb not null,
  risk_prediction text,
  risk_confidence float,
  top_features jsonb,
  llm_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast retrieval by user
create index if not exists idx_assessments_user_id on public.user_assessments(user_id);
