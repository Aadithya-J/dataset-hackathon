-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Public profile info, linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MOOD LOGS TABLE (For long-term tracking)
create table if not exists public.mood_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  emotion text not null, -- e.g., 'joy', 'sadness', 'anxiety'
  intensity float, -- 0.0 to 1.0 (optional)
  note text, -- User's message content
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CHAT HISTORY TABLE (Optional: To restore sessions)
create table if not exists public.chat_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  session_id uuid not null, -- Added for session grouping
  role text not null, -- 'user' or 'bot'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRIGGER: Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication error on creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BACKFILL: Ensure all existing users have a profile
insert into public.profiles (id, email, full_name)
select id, email, raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;
