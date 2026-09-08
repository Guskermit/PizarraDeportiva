-- Play Library: catalogs, difficulty levels, team catalog assignment.

-- ============================================================================
-- 1. Add difficulty to plays
-- ============================================================================
alter table public.plays
  add column difficulty smallint not null default 1
  check (difficulty between 1 and 5);

-- ============================================================================
-- 2. Play catalogs (named groups of plays per club)
-- ============================================================================
create table public.play_catalogs (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  name       text not null,
  description text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.play_catalogs enable row level security;

-- Owner / gestor can manage catalogs; all club members can read.
create policy "club members read catalogs"
  on public.play_catalogs for select to authenticated
  using (public.is_club_admin(club_id));

create policy "club owner gestor manage catalogs"
  on public.play_catalogs for all to authenticated
  using (
    public.is_club_admin(club_id)
    and exists (
      select 1 from public.club_admins ca
      where ca.club_id = play_catalogs.club_id
        and ca.profile_id = auth.uid()
        and ca.role in ('owner', 'gestor')
    )
  )
  with check (
    public.is_club_admin(club_id)
    and exists (
      select 1 from public.club_admins ca
      where ca.club_id = play_catalogs.club_id
        and ca.profile_id = auth.uid()
        and ca.role in ('owner', 'gestor')
    )
  );

-- ============================================================================
-- 3. Catalog ↔ Play (N:M)
-- ============================================================================
create table public.play_catalog_plays (
  catalog_id uuid not null references public.play_catalogs (id) on delete cascade,
  play_id    uuid not null references public.plays (id) on delete cascade,
  primary key (catalog_id, play_id)
);

alter table public.play_catalog_plays enable row level security;

create policy "club members read catalog plays"
  on public.play_catalog_plays for select to authenticated
  using (
    exists (
      select 1 from public.play_catalogs c
      where c.id = catalog_id and public.is_club_admin(c.club_id)
    )
  );

create policy "owner gestor manage catalog plays"
  on public.play_catalog_plays for all to authenticated
  using (
    exists (
      select 1 from public.play_catalogs c
      where c.id = catalog_id
        and public.is_club_admin(c.club_id)
        and exists (
          select 1 from public.club_admins ca
          where ca.club_id = c.club_id
            and ca.profile_id = auth.uid()
            and ca.role in ('owner', 'gestor')
        )
    )
  )
  with check (
    exists (
      select 1 from public.play_catalogs c
      where c.id = catalog_id
        and public.is_club_admin(c.club_id)
        and exists (
          select 1 from public.club_admins ca
          where ca.club_id = c.club_id
            and ca.profile_id = auth.uid()
            and ca.role in ('owner', 'gestor')
        )
    )
  );

-- ============================================================================
-- 4. Team ↔ Catalog assignment
-- ============================================================================
create table public.team_catalogs (
  team_id     uuid not null references public.teams (id) on delete cascade,
  catalog_id  uuid not null references public.play_catalogs (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id),
  assigned_at timestamptz not null default now(),
  primary key (team_id, catalog_id)
);

alter table public.team_catalogs enable row level security;

create policy "team members read assigned catalogs"
  on public.team_catalogs for select to authenticated
  using (
    public.is_team_coach(team_id)
    or public.is_team_player(team_id)
    or exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_club_admin(t.club_id)
    )
  );

create policy "club owner gestor manage team catalogs"
  on public.team_catalogs for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and public.is_club_admin(t.club_id)
        and exists (
          select 1 from public.club_admins ca
          where ca.club_id = t.club_id
            and ca.profile_id = auth.uid()
            and ca.role in ('owner', 'gestor')
        )
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and public.is_club_admin(t.club_id)
        and exists (
          select 1 from public.club_admins ca
          where ca.club_id = t.club_id
            and ca.profile_id = auth.uid()
            and ca.role in ('owner', 'gestor')
        )
    )
  );
