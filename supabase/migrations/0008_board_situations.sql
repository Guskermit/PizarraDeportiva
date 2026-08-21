-- Persistent starting positions for the free tactical board.
create table public.board_situations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  positions jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.board_situations enable row level security;

create policy "users can read their board situations"
  on public.board_situations for select to authenticated
  using (owner_id = auth.uid());

create policy "users can create their board situations"
  on public.board_situations for insert to authenticated
  with check (owner_id = auth.uid());

create policy "users can update their board situations"
  on public.board_situations for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "users can delete their board situations"
  on public.board_situations for delete to authenticated
  using (owner_id = auth.uid());
