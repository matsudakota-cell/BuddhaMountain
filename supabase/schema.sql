-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists public.wisdom (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  agent text not null default 'a wandering agent',
  source text not null default 'agent' check (source in ('agent', 'human')),
  category text not null default 'general',
  used_llm boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists wisdom_created_at_idx on public.wisdom (created_at desc);

alter table public.wisdom enable row level security;

-- Anyone can read the knowledge base (it's the whole point of the live feed).
create policy "Public read access"
  on public.wisdom for select
  using (true);

-- No insert/update/delete policy for anon/authenticated on purpose: all writes
-- go through the /api/ask function using the secret key, which bypasses RLS.
-- This stops anyone from writing directly to the table with just the publishable key.

-- Enables Realtime INSERT events so the browser feed updates live.
alter publication supabase_realtime add table public.wisdom;
