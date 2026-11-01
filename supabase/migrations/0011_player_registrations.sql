-- Pizarra Deportiva - player self-registration with coach approval
-- Players sign up publicly (/register-player), pick a team, and stay 'pending'
-- until a team coach or club admin approves them into team_players. Once approved,
-- existing RLS (can_view_play / team_catalogs) grants them access to the team's plays.

create type registration_status as enum ('pending', 'approved', 'rejected');

create table public.player_registrations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status registration_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A player can only have one active (pending) request per team.
create unique index player_registrations_pending_unique
  on public.player_registrations (team_id, profile_id)
  where status = 'pending';

alter table public.player_registrations enable row level security;

-- The requesting player reads their own row; team coaches and club admins review requests.
drop policy if exists "read own or reviewable registrations" on public.player_registrations;
create policy "read own or reviewable registrations"
  on public.player_registrations for select to authenticated using (
    profile_id = auth.uid()
    or public.is_team_coach(team_id)
    or public.is_club_admin((select club_id from public.teams where id = team_id))
  );

-- Only team coaches and club admins approve/reject (players cannot self-approve).
drop policy if exists "team coaches and club admins update registrations" on public.player_registrations;
create policy "team coaches and club admins update registrations"
  on public.player_registrations for update to authenticated using (
    public.is_team_coach(team_id)
    or public.is_club_admin((select club_id from public.teams where id = team_id))
  ) with check (
    public.is_team_coach(team_id)
    or public.is_club_admin((select club_id from public.teams where id = team_id))
  );

-- Logged-in users may only insert their own request, always as 'pending'.
-- The public signup flow (/register-player) inserts via the service-role client
-- because there is no session yet when email confirmation is enabled.
drop policy if exists "insert own pending registration" on public.player_registrations;
create policy "insert own pending registration"
  on public.player_registrations for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
