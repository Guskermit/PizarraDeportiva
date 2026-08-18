-- Pizarra Deportiva - let coaches/players read their own club's row (currently only club admins
-- could, via "club admins can read their club"). Needed so e.g. the "new play" form can default
-- the home team color to the club's primary_color for non-admin coaches too. Idempotent.

create or replace function public.is_club_member(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select
    public.is_club_admin(target_club_id)
    or exists (
      select 1 from public.team_coaches tc
      join public.teams t on t.id = tc.team_id
      where t.club_id = target_club_id and tc.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.team_players tp
      join public.teams t on t.id = tp.team_id
      where t.club_id = target_club_id and tp.profile_id = auth.uid()
    );
$$;

drop policy if exists "club admins can read their club" on public.clubs;
drop policy if exists "club members can read their club" on public.clubs;
create policy "club members can read their club"
  on public.clubs for select to authenticated using (public.is_club_member(id));
