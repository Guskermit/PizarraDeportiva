-- Pizarra Deportiva - role system v2
-- Reorganizes roles into a hierarchy:
--   Super_admin (platform)  -> new table platform_admins
--   owner (club)            -> club_admins.role = 'owner'
--   gestor (club)           -> club_admins.role = 'gestor'  (permissions TBD)
--   entrenador (club)       -> club_admins.role = 'entrenador'  (was 'admin')
--   jugador (team)          -> team_players (unchanged)
-- team_coaches stays for assigning coaches to specific teams.

-- 1. Reorganize club_admin_role: rename 'admin' -> 'entrenador', add 'gestor'.
alter type public.club_admin_role rename value 'admin' to 'entrenador';
alter type public.club_admin_role add value 'gestor' before 'entrenador';

-- Keep the column default pointing at the renamed value.
alter table public.club_admins alter column role set default 'entrenador';

-- 2. Super_admin storage: dedicated platform-level table.
create table public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- 3. Helpers.
--    is_super_admin: is the current user a platform Super_admin?
create or replace function public.is_super_admin()
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where profile_id = auth.uid()
  );
$$;

--    is_club_owner: is the current user the owner of the club?
create or replace function public.is_club_owner(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_admins
    where club_id = target_club_id and profile_id = auth.uid()
      and role = 'owner' and is_blocked = false
  );
$$;

-- 4. RLS: only Super_admins can read/manage the platform_admins list.
--    Bootstrap: insert the first Super_admin from the SQL editor (bypasses RLS).
create policy "super admins can read platform admins"
  on public.platform_admins for select to authenticated using (public.is_super_admin());
create policy "super admins can manage platform admins"
  on public.platform_admins for all to authenticated using (public.is_super_admin())
  with check (public.is_super_admin());

-- 5. Club admin management is owner-only (was any club admin).
drop policy if exists "club admins can add admins" on public.club_admins;
create policy "club owners can add admins"
  on public.club_admins for insert to authenticated with check (public.is_club_owner(club_id));

drop policy if exists "club admins can remove admins" on public.club_admins;
create policy "club owners can remove admins"
  on public.club_admins for delete to authenticated using (public.is_club_owner(club_id));

drop policy if exists "club admins can update admins" on public.club_admins;
create policy "club owners can update admins"
  on public.club_admins for update to authenticated using (public.is_club_owner(club_id))
  with check (public.is_club_owner(club_id));