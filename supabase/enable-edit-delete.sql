-- Chạy file này trong Supabase SQL Editor nếu project hiện chỉ có
-- hai policy SELECT và INSERT.

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
