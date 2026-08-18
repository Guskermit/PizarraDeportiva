-- Pizarra Deportiva - initial schema
-- Run in the Supabase SQL editor or via `supabase db push` after linking the project.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
create type club_admin_role as enum ('owner', 'admin');
create type play_type as enum (
  'corner',
  'falta',
  'fuera_de_banda',
  'libre_indirecto',
  'portero_jugador',
  'defensa',
  'ataque_posicional'
);
create type team_formation as enum (
  'portero_4_jugadores',   -- 1 portero + 4 jugadores de campo
  '5_jugadores',           -- 5 jugadores de campo, uno actúa de portero-jugador
  'portero_3_jugadores'    -- 1 portero + 3 jugadores (inferioridad / expulsión)
);
create type play_status as enum ('draft', 'ready');

-- ============================================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever a new auth user is created.
create function public.handle_new_user()
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- CLUBS
-- ============================================================================
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#1d4ed8',
  secondary_color text not null default '#f97316',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.club_admins (
  club_id uuid not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role club_admin_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);

-- Registers the creating user as the club's owner admin.
create function public.handle_new_club()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.club_admins (club_id, profile_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_club_created
  after insert on public.clubs
  for each row execute procedure public.handle_new_club();

-- ============================================================================
-- TEAMS
-- ============================================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create table public.team_coaches (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create table public.team_players (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  jersey_number int,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

-- ============================================================================
-- PLAYS (jugadas) - catalog owned by a coach
-- ============================================================================
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  owner_coach_id uuid not null references public.profiles (id) on delete cascade,
  assigned_team_id uuid references public.teams (id) on delete set null,
  original_play_id uuid references public.plays (id) on delete set null,
  title text not null,
  play_type play_type not null,
  home_formation team_formation not null,
  away_formation team_formation not null,
  home_color text not null default '#1d4ed8',
  away_color text not null default '#dc2626',
  -- { home: [{id, x, y}], away: [{id, x, y}], ball: {x, y} }
  initial_positions jsonb not null default '{"home": [], "away": [], "ball": {"x": 0, "y": 0}}'::jsonb,
  status play_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.play_sequences (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.plays (id) on delete cascade,
  order_index int not null,
  -- resulting positions after applying this sequence's moves
  positions jsonb not null default '{"home": [], "away": [], "ball": {"x": 0, "y": 0}}'::jsonb,
  -- [{type:'player'|'ball', team:'home'|'away', playerId, from:{x,y}, to:{x,y}, curve:{x,y}|null, hasBall:boolean}]
  moves jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (play_id, order_index)
);

create table public.play_shares (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.plays (id) on delete cascade,
  shared_by uuid not null references public.profiles (id),
  shared_with_profile_id uuid references public.profiles (id) on delete cascade,
  shared_with_team_id uuid references public.teams (id) on delete cascade,
  can_copy boolean not null default false,
  created_at timestamptz not null default now(),
  constraint play_shares_target check (
    (shared_with_profile_id is not null) or (shared_with_team_id is not null)
  )
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_plays_updated_at
  before update on public.plays
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS (security definer, used inside RLS policies)
-- ============================================================================
create function public.is_club_admin(target_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_admins
    where club_id = target_club_id and profile_id = auth.uid()
  );
$$;

create function public.is_team_coach(target_team_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.team_coaches
    where team_id = target_team_id and profile_id = auth.uid()
  );
$$;

create function public.is_team_player(target_team_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.team_players
    where team_id = target_team_id and profile_id = auth.uid()
  );
$$;

create function public.can_view_play(target_play_id uuid)
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
-- ROW LEVEL SECURITY
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

-- profiles: everyone authenticated can look up basic profile info; only the owner can edit it.
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users manage their own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- clubs: any authenticated user may create a club; members (admins) can read/update it.
create policy "authenticated users can create a club"
  on public.clubs for insert to authenticated with check (created_by = auth.uid());
create policy "club admins can read their club"
  on public.clubs for select to authenticated using (public.is_club_admin(id));
create policy "club admins can update their club"
  on public.clubs for update to authenticated using (public.is_club_admin(id));

-- club_admins: readable by fellow admins; only existing admins can add new admins.
create policy "club admins can read admin list"
  on public.club_admins for select to authenticated using (public.is_club_admin(club_id));
create policy "club admins can add admins"
  on public.club_admins for insert to authenticated with check (public.is_club_admin(club_id));
create policy "club admins can remove admins"
  on public.club_admins for delete to authenticated using (public.is_club_admin(club_id));

-- teams: managed by club admins; coaches/players can read teams they belong to.
create policy "club members can read teams"
  on public.teams for select to authenticated using (
    public.is_club_admin(club_id) or public.is_team_coach(id) or public.is_team_player(id)
  );
create policy "club admins manage teams"
  on public.teams for all to authenticated using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

-- team_coaches / team_players: club admins manage; members can read their own team's roster.
create policy "read team coaches"
  on public.team_coaches for select to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
    or profile_id = auth.uid()
    or public.is_team_player(team_id)
  );
create policy "club admins manage team coaches"
  on public.team_coaches for all to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  ) with check (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  );

create policy "read team players"
  on public.team_players for select to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
    or profile_id = auth.uid()
    or public.is_team_coach(team_id)
  );
create policy "club admins manage team players"
  on public.team_players for all to authenticated using (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  ) with check (
    public.is_club_admin((select club_id from public.teams where id = team_id))
  );

-- plays: owner coaches have full control; club admins and shared users can view.
create policy "coaches create plays"
  on public.plays for insert to authenticated with check (owner_coach_id = auth.uid());
create policy "view plays owned, shared or in own club"
  on public.plays for select to authenticated using (public.can_view_play(id));
create policy "owner manages their plays"
  on public.plays for update to authenticated using (owner_coach_id = auth.uid());
create policy "owner deletes their plays"
  on public.plays for delete to authenticated using (owner_coach_id = auth.uid());

-- play_sequences: same visibility as the parent play; only the owner writes.
create policy "view sequences of visible plays"
  on public.play_sequences for select to authenticated using (public.can_view_play(play_id));
create policy "owner manages sequences"
  on public.play_sequences for all to authenticated using (
    exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  ) with check (
    exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  );

-- play_shares: play owner shares; recipients can see their own share entries.
create policy "read own share entries"
  on public.play_shares for select to authenticated using (
    shared_by = auth.uid()
    or shared_with_profile_id = auth.uid()
    or (shared_with_team_id is not null and (
      public.is_team_coach(shared_with_team_id) or public.is_team_player(shared_with_team_id)
    ))
  );
create policy "owner shares their plays"
  on public.play_shares for insert to authenticated with check (
    shared_by = auth.uid()
    and exists (select 1 from public.plays where id = play_id and owner_coach_id = auth.uid())
  );
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

create policy "public read of club logos"
  on storage.objects for select using (bucket_id = 'club-logos');
create policy "authenticated users upload club logos"
  on storage.objects for insert to authenticated with check (bucket_id = 'club-logos');
