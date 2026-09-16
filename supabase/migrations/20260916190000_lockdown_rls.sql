-- Drop permissive anon policies (if they were created earlier)
drop policy if exists "Allow inserts for sessions" on public.study_sessions;
drop policy if exists "Allow inserts for records" on public.study_records;
drop policy if exists "Allow select for sessions" on public.study_sessions;
drop policy if exists "Allow select for records" on public.study_records;

-- Revoke any grants given to anon/authenticated
revoke all on public.study_sessions from anon, authenticated;
revoke all on public.study_records from anon, authenticated;

-- RLS stays enabled — with no policies and no grants, the anon key cannot
-- read or write anything. All access goes through the service_role key
-- (used server-side in the Next.js API route), which bypasses RLS entirely.
