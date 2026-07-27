create extension if not exists "pgcrypto";

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(trim(question)) >= 3),
  answers jsonb not null check (
    jsonb_typeof(answers) = 'array'
    and jsonb_array_length(answers) = 4
  ),
  correct_answer integer not null check (correct_answer between 0 and 3),
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

drop policy if exists "Questions are publicly readable" on public.questions;
create policy "Questions are publicly readable"
on public.questions for select
to anon
using (true);

drop policy if exists "Anyone can add questions" on public.questions;
create policy "Anyone can add questions"
on public.questions for insert
to anon
with check (true);

drop policy if exists "Anyone can update questions" on public.questions;
create policy "Anyone can update questions"
on public.questions for update
to anon
using (true)
with check (true);

drop policy if exists "Anyone can delete questions" on public.questions;
create policy "Anyone can delete questions"
on public.questions for delete
to anon
using (true);

create index if not exists questions_created_at_idx
on public.questions (created_at desc);

-- Gợi ý cho ứng dụng công khai thật:
-- thay các policy INSERT/UPDATE/DELETE ở trên bằng policy yêu cầu authenticated
-- hoặc tài khoản admin.
