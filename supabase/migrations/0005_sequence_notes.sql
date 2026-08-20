-- Pizarra Deportiva - per-sequence comments (notes) for coaches and players.
-- Coaches add notes while creating sequences; players (and coaches) can also
-- add their own comments on each sequence when viewing a play step by step.

create table public.play_sequence_notes (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.play_sequences (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

create index play_sequence_notes_sequence_id_idx
  on public.play_sequence_notes (sequence_id);

alter table public.play_sequence_notes enable row level security;

-- Anyone who can view the parent play can read its sequence notes.
create policy "view notes of visible plays"
  on public.play_sequence_notes for select to authenticated using (
    exists (
      select 1
      from public.play_sequences s
      join public.plays p on p.id = s.play_id
      where s.id = sequence_id and public.can_view_play(p.id)
    )
  );

-- Coaches and players who can view the play can add their own notes.
create policy "members add notes on visible plays"
  on public.play_sequence_notes for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.play_sequences s
      join public.plays p on p.id = s.play_id
      where s.id = sequence_id and public.can_view_play(p.id)
    )
  );

-- Authors can delete their own notes; the play owner can delete any note.
create policy "authors or owners delete notes"
  on public.play_sequence_notes for delete to authenticated using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.play_sequences s
      join public.plays p on p.id = s.play_id
      where s.id = sequence_id and p.owner_coach_id = auth.uid()
    )
  );
