-- Add court_color column to clubs table.
-- Stores the hex colour of the tactical board's court surface.
-- Valid values: Azul (#1565c0), Parquet (#b5651d), Verde (#15803d), Beige (#d4b896).

alter table public.clubs
  add column court_color text not null default '#15803d';
