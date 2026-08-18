-- Pizarra Deportiva - re-assert RLS policies on plays-related tables.
-- Run this if you see "new row violates row-level security policy for table plays" (or
-- play_sequences/play_shares): it usually means 0001_init.sql was interrupted partway through
-- (each `create policy` fails with "already exists" on re-run, which aborts the whole script in
-- the Supabase SQL editor since it runs as one transaction) and some policies further down never
-- got created. This file is idempotent and safe to run any number of times.

drop policy if exists "coaches create plays" on public.plays;
create policy "coaches create plays"
  on public.plays for insert to authenticated with check (owner_coach_id = auth.uid());

drop policy if exists "view plays owned, shared or in own club" on public.plays;
create policy "view plays owned, shared or in own club"
  on public.plays for select to authenticated using (public.can_view_play(id));

drop policy if exists "owner manages their plays" on public.plays;
create policy "owner manages their plays"
  on public.plays for update to authenticated using (owner_coach_id = auth.uid());

drop policy if exists "owner deletes their plays" on public.plays;
create policy "owner deletes their plays"
  on public.plays for delete to authenticated using (owner_coach_id = auth.uid());

drop policy if exists "view sequences of visible plays" on public.play_sequences;
create policy "view sequences of visible plays"
  on public.play_sequences for select to authenticated using (public.can_view_play(play_id));

drop policy if exists "owner manages sequences" on public.play_sequences;
create policy "owner manages sequences"
  on public.play_sequences for all to authenticated using (
    exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  );

drop policy if exists "read own share entries" on public.play_shares;
create policy "read own share entries"
  on public.play_shares for select to authenticated using (
    shared_by = auth.uid()
    or shared_with_profile_id = auth.uid()
    or (shared_with_team_id is not null and (
      public.is_team_coach(shared_with_team_id) or public.is_team_player(shared_with_team_id)
    ))
  );

drop policy if exists "owner shares their plays" on public.play_shares;
create policy "owner shares their plays"
  on public.play_shares for insert to authenticated with check (
    shared_by = auth.uid()
    and exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  );

drop policy if exists "owner revokes shares" on public.play_shares;
create policy "owner revokes shares"
  on public.play_shares for delete to authenticated using (
    exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  );
