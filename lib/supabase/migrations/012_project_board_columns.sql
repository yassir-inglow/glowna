-- Project board columns (Kanban columns) persisted per project.
-- Stores column order + UI config so all collaborators see the same board.

begin;

create extension if not exists "pgcrypto";

create table if not exists public.project_board_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null,
  label text not null,
  position int not null,
  header_bg text not null default 'bg-gray-cool-25',
  body_bg text not null default 'bg-gray-cool-25',
  progress int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_board_columns_project_status_key
  on public.project_board_columns(project_id, status);

create index if not exists project_board_columns_project_position_idx
  on public.project_board_columns(project_id, position);

-- Keep updated_at current.
create or replace function public.project_board_columns_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.project_board_columns;
create trigger set_updated_at
before update on public.project_board_columns
for each row execute function public.project_board_columns_set_updated_at();

-- RLS
alter table public.project_board_columns enable row level security;

drop policy if exists "Members can view board columns" on public.project_board_columns;
create policy "Members can view board columns"
  on public.project_board_columns
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_board_columns.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_board_columns.project_id
        and pm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members can insert board columns" on public.project_board_columns;
create policy "Members can insert board columns"
  on public.project_board_columns
  for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_board_columns.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_board_columns.project_id
        and pm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members can update board columns" on public.project_board_columns;
create policy "Members can update board columns"
  on public.project_board_columns
  for update
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_board_columns.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_board_columns.project_id
        and pm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_board_columns.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_board_columns.project_id
        and pm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members can delete board columns" on public.project_board_columns;
create policy "Members can delete board columns"
  on public.project_board_columns
  for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_board_columns.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_board_columns.project_id
        and pm.profile_id = auth.uid()
    )
  );

-- Seed default columns for every new project.
create or replace function public.handle_new_project_board_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_board_columns (
    project_id, status, label, position, header_bg, body_bg, progress
  ) values
    (new.id, 'todo', 'To do', 0, 'bg-gray-cool-25', 'bg-gray-cool-25', 0),
    (new.id, 'in_progress', 'In progress', 1, 'bg-purple-25', 'bg-purple-25', 50),
    (new.id, 'done', 'Done', 2, 'bg-success-25', 'bg-success-25', 100)
  on conflict (project_id, status) do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created_board_columns on public.projects;
create trigger on_project_created_board_columns
  after insert on public.projects
  for each row execute function public.handle_new_project_board_columns();

-- Enable realtime (safe idempotent add).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_board_columns'
  ) then
    alter publication supabase_realtime add table public.project_board_columns;
  end if;
end $$;

commit;
