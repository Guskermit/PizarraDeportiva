-- Pizarra Deportiva - club coach management
-- Adds the ability to block club coaches and manage their roles/teams.

-- 1. Add is_blocked column to club_admins
alter table public.club_admins
  add column if not exists is_blocked boolean not null default false;

-- 2. Blocked admins lose all club access (is_club_admin returns false for them)
create or replace function public.is_club_admin(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_admins
    where club_id = target_club_id and profile_id = auth.uid() and is_blocked = false
  );
$$;

-- 3. Allow club admins (owner) to update admin rows (role, is_blocked)
create policy "club admins can update admins"
  on public.club_admins for update to authenticated using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));