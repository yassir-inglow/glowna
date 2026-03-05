-- Collaboration schema optimization and bug fixes
-- 1) Fix invitation status constraint to support 'declined'
-- 2) Let project members (not only owners) access task assignees
-- 3) Remove owner dual-source-of-truth from project_members.role
-- 4) Update ownership helpers/policies to use projects.user_id
-- 5) Remove unused RPC

begin;

-- Fix status constraint: app uses 'declined' in declineInvitation().
alter table public.project_invitations
  drop constraint if exists project_invitations_status_check;

alter table public.project_invitations
  add constraint project_invitations_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'accepted'::text,
        'declined'::text,
        'expired'::text
      ]
    )
  );

-- Task assignees should be visible/manageable to all project members.
drop policy if exists "Users can view assignees for tasks in their projects"
  on public.task_assignees;
create policy "Users can view assignees for tasks in their projects"
  on public.task_assignees
  for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_project_member(t.project_id, auth.uid())
    )
  );

drop policy if exists "Users can manage assignees for tasks in their projects"
  on public.task_assignees;
create policy "Users can manage assignees for tasks in their projects"
  on public.task_assignees
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_project_member(t.project_id, auth.uid())
    )
  );

drop policy if exists "Users can remove assignees from tasks in their projects"
  on public.task_assignees;
create policy "Users can remove assignees from tasks in their projects"
  on public.task_assignees
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_project_member(t.project_id, auth.uid())
    )
  );

-- Owners are derived from projects.user_id (single source of truth).
drop policy if exists "Owners can insert members" on public.project_members;
create policy "Owners can insert members"
  on public.project_members
  for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete members" on public.project_members;
create policy "Owners can delete members"
  on public.project_members
  for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

-- Owner helper now checks projects.user_id directly.
create or replace function public.is_project_owner(p_project_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and user_id = p_profile_id
  );
$$;

-- Keep owner membership row on project creation, without role column.
create or replace function public.handle_new_project()
returns trigger
language plpgsql
as $$
begin
  insert into public.project_members (project_id, profile_id)
  values (new.id, new.user_id)
  on conflict (project_id, profile_id) do nothing;
  return new;
end;
$$;

-- Invitation accept RPC now inserts into project_members without role.
create or replace function public.accept_project_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select email into v_user_email
  from profiles
  where id = v_user_id;

  if v_user_email is null then
    return jsonb_build_object('error', 'Could not verify your email address');
  end if;

  select id, project_id, email, status, expires_at
  into v_invitation
  from project_invitations
  where token = p_token::uuid;

  if v_invitation is null then
    return jsonb_build_object('error', 'Invitation not found');
  end if;

  if v_invitation.status = 'accepted' then
    return jsonb_build_object('project_id', v_invitation.project_id);
  end if;

  if v_invitation.expires_at < now() then
    return jsonb_build_object('error', 'This invitation has expired');
  end if;

  if v_invitation.email <> lower(v_user_email) then
    return jsonb_build_object('error', 'This invitation was sent to a different email address');
  end if;

  insert into project_members (project_id, profile_id)
  values (v_invitation.project_id, v_user_id)
  on conflict do nothing;

  update project_invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return jsonb_build_object('project_id', v_invitation.project_id);
end;
$$;

-- Remove unused legacy RPC.
drop function if exists public.get_project_members(uuid[]);

-- Remove redundant role column and constraint.
alter table public.project_members
  drop constraint if exists project_members_role_check;

alter table public.project_members
  drop column if exists role;

commit;
