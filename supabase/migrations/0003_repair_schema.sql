-- Pizarra Deportiva - full, idempotent repair of functions/triggers/RLS policies.
-- Run this whole file if you keep seeing "new row violates row-level security policy" errors
-- after 0001_init.sql and/or 0002_fix_plays_policies.sql. Likely cause: the original 0001 run (or
-- the 0002 patch, which references is_team_coach/can_view_play) was executed as a single
-- transaction in the SQL editor, and if ANY statement in it failed, the WHOLE batch (including
-- statements that appeared earlier and would otherwise have succeeded) was rolled back — so some
-- functions/triggers/policies may be silently missing even though tables/enums already exist.
-- This script only touches functions, triggers, RLS flags and policies (never tables/enums), and
-- every statement is safe to run any number of times.

-- ============================================================================
-- FUNCTIONS (create or replace = always safe to re-run)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.club_admins (club_id, profile_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (club_id, profile_id) do nothing;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_club_admin(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_admins
    where club_id = target_club_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_team_coach(target_team_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.team_coaches
    where team_id = target_team_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_team_player(target_team_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.team_players
    where team_id = target_team_id and profile_id = auth.uid()
  );
$$;

create or replace function public.can_view_play(target_play_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.plays p
    where p.id = target_play_id
      and (
        p.owner_coach_id = auth.uid()
        or public.is_club_admin(p.club_id)
        or exists (
          select 1 from public.play_shares s
          where s.play_id = p.id
            and (
              s.shared_with_profile_id = auth.uid()
              or (s.shared_with_team_id is not null and (
                public.is_team_coach(s.shared_with_team_id) or public.is_team_player(s.shared_with_team_id)
              ))
            )
        )
      )
  );
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_club_created on public.clubs;
create trigger on_club_created
  after insert on public.clubs
  for each row execute procedure public.handle_new_club();

drop trigger if exists set_plays_updated_at on public.plays;
create trigger set_plays_updated_at
  before update on public.plays
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (safe to re-run)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_admins enable row level security;
alter table public.teams enable row level security;
alter table public.team_coaches enable row level security;
alter table public.team_players enable row level security;
alter table public.plays enable row level security;
alter table public.play_sequences enable row level security;
alter table public.play_shares enable row level security;

-- profiles
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);
drop policy if exists "users manage their own profile" on public.profiles;
create policy "users manage their own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- clubs
drop policy if exists "authenticated users can create a club" on public.clubs;
create policy "authenticated users can create a club"
  on public.clubs for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "club admins can read their club" on public.clubs;
create policy "club admins can read their club"
  on public.clubs for select to authenticated using (public.is_club_admin(id));
drop policy if exists "club admins can update their club" on public.clubs;
create policy "club admins can update their club"
  on public.clubs for update to authenticated using (public.is_club_admin(id));

-- club_admins
drop policy if exists "club admins can read admin list" on public.club_admins;
create policy "club admins can read admin list"
  on public.club_admins for select to authenticated using (public.is_club_admin(club_id));
drop policy if exists "club admins can add admins" on public.club_admins;
create policy "club admins can add admins"
  on public.club_admins for insert to authenticated with check (public.is_club_admin(club_id));
drop policy if exists "club admins can remove admins" on public.club_admins;
create policy "club admins can remove admins"
  on public.club_admins for delete to authenticated using (public.is_club_admin(club_id));

-- teams
drop policy if exists "club members can read teams" on public.teams;
create policy "club members can read teams"
  on public.teams for select to authenticated using (
    public.is_club_admin(club_id) or public.is_team_coach(id) or public.is_team_player(id)
  );
drop policy if exists "club admins manage teams" on public.teams;
create policy "club admins manage teams"
  on public.teams for all to authenticated using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

-- team_coaches / team_players
drop policy if exists "read team coaches" on public.team_coaches;
create policy "read team coaches"
  on public.team_coaches for select to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
    or profile_id = auth.uid()
    or public.is_team_player(team_id)
  );
drop policy if exists "club admins manage team coaches" on public.team_coaches;
create policy "club admins manage team coaches"
  on public.team_coaches for all to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  ) with check (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  );

drop policy if exists "read team players" on public.team_players;
create policy "read team players"
  on public.team_players for select to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
    or profile_id = auth.uid()
    or public.is_team_coach(team_id)
  );
drop policy if exists "club admins manage team players" on public.team_players;
create policy "club admins manage team players"
  on public.team_players for all to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  ) with check (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  );

-- plays
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

-- play_sequences
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

-- play_shares
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

-- ============================================================================
-- STORAGE (club logos)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do nothing;

drop policy if exists "public read of club logos" on storage.objects;
create policy "public read of club logos"
  on storage.objects for select using (bucket_id = 'club-logos');
drop policy if exists "authenticated users upload club logos" on storage.objects;
create policy "authenticated users upload club logos"
  on storage.objects for insert to authenticated with check (bucket_id = 'club-logos');
