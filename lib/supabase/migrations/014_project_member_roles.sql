begin;

alter table public.project_members
  add column if not exists role text;

update public.project_members
set role = 'editor'
where role is null;

alter table public.project_members
  alter column role set default 'editor';

alter table public.project_members
  alter column role set not null;

alter table public.project_members
  drop constraint if exists project_members_role_check;

alter table public.project_members
  add constraint project_members_role_check
  check (role = any (array['editor'::text, 'viewer'::text]));

alter table public.project_invitations
  add column if not exists role text;

update public.project_invitations
set role = 'editor'
where role is null;

alter table public.project_invitations
  alter column role set default 'editor';

alter table public.project_invitations
  alter column role set not null;

alter table public.project_invitations
  drop constraint if exists project_invitations_role_check;

alter table public.project_invitations
  add constraint project_invitations_role_check
  check (role = any (array['editor'::text, 'viewer'::text]));

create or replace function public.is_project_owner(p_project_id uuid, p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.projects
    where id = p_project_id
      and user_id = p_profile_id
  );
end;
$$;

create or replace function public.is_project_member(p_project_id uuid, p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.user_id = p_profile_id
  ) or exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = p_profile_id
  );
end;
$$;

create or replace function public.has_project_write_access(p_project_id uuid, p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.user_id = p_profile_id
  ) or exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.profile_id = p_profile_id
      and pm.role = 'editor'
  );
end;
$$;

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

  v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_user_email = '' then
    select lower(email) into v_user_email
    from profiles
    where id = v_user_id;
  end if;

  if v_user_email is null or v_user_email = '' then
    return jsonb_build_object('error', 'Could not verify your email address');
  end if;

  select id, project_id, email, status, expires_at, role
  into v_invitation
  from project_invitations
  where token = p_token::uuid;

  if v_invitation is null then
    return jsonb_build_object('error', 'Invitation not found');
  end if;

  if v_invitation.expires_at < now() and v_invitation.status <> 'accepted' then
    return jsonb_build_object('error', 'This invitation has expired');
  end if;

  if v_invitation.email <> v_user_email then
    return jsonb_build_object('error', 'This invitation was sent to a different email address');
  end if;

  insert into project_members (project_id, profile_id, role)
  values (v_invitation.project_id, v_user_id, coalesce(v_invitation.role, 'editor'))
  on conflict (project_id, profile_id) do update
  set role = excluded.role
  where not exists (
    select 1
    from public.projects p
    where p.id = excluded.project_id
      and p.user_id = excluded.profile_id
  );

  if v_invitation.status <> 'accepted' then
    update project_invitations
    set status = 'accepted'
    where id = v_invitation.id;
  end if;

  return jsonb_build_object('project_id', v_invitation.project_id);
exception
  when invalid_text_representation then
    return jsonb_build_object('error', 'Invitation not found');
end;
$$;

create or replace function public.decline_project_invitation(p_invitation_id uuid)
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

  v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_user_email = '' then
    select lower(email) into v_user_email
    from profiles
    where id = v_user_id;
  end if;

  if v_user_email is null or v_user_email = '' then
    return jsonb_build_object('error', 'Could not verify your email address');
  end if;

  select id, email, status
  into v_invitation
  from project_invitations
  where id = p_invitation_id;

  if v_invitation is null then
    return jsonb_build_object('error', 'Invitation not found');
  end if;

  if lower(v_invitation.email) <> v_user_email then
    return jsonb_build_object('error', 'This invitation belongs to a different user');
  end if;

  if v_invitation.status <> 'pending' then
    return jsonb_build_object('error', 'This invitation is no longer pending');
  end if;

  update project_invitations
  set status = 'declined'
  where id = v_invitation.id;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.get_pending_invitations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return '[]'::jsonb;
  end if;

  select lower(email) into v_user_email
  from profiles
  where id = v_user_id;

  if v_user_email is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_result
  from (
    select
      pi.id,
      pi.token,
      pi.role,
      coalesce(p.title, 'Untitled project') as project_name,
      coalesce(pr.full_name, pr.email, 'Someone') as inviter_name
    from project_invitations pi
    left join projects p on p.id = pi.project_id
    left join profiles pr on pr.id = pi.invited_by
    where pi.email = v_user_email
      and pi.status = 'pending'
      and pi.expires_at > now()
    order by pi.created_at desc
  ) t;

  return v_result;
end;
$$;

do $$
declare
  target_table text;
  policy_row record;
begin
  foreach target_table in array array['tasks', 'task_assignees', 'project_board_columns', 'project_members', 'project_invitations']
  loop
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_row.policyname, target_table);
    end loop;
  end loop;
end
$$;

create policy "Members can view project members"
  on public.project_members
  for select
  using (
    public.is_project_member(project_members.project_id, auth.uid())
  );

create policy "Owners can insert members"
  on public.project_members
  for insert
  with check (
    public.is_project_owner(project_members.project_id, auth.uid())
  );

create policy "Owners can update members"
  on public.project_members
  for update
  using (
    public.is_project_owner(project_members.project_id, auth.uid())
  )
  with check (
    public.is_project_owner(project_members.project_id, auth.uid())
  );

create policy "Owners can delete members"
  on public.project_members
  for delete
  using (
    public.is_project_owner(project_members.project_id, auth.uid())
  );

create policy "Owners and invitees can view invitations"
  on public.project_invitations
  for select
  using (
    public.is_project_owner(project_invitations.project_id, auth.uid())
    or lower(project_invitations.email) = lower(
      coalesce(
        auth.jwt() ->> 'email',
        (
          select pr.email
          from public.profiles pr
          where pr.id = auth.uid()
        ),
        ''
      )
    )
  );

create policy "Owners can insert invitations"
  on public.project_invitations
  for insert
  with check (
    public.is_project_owner(project_invitations.project_id, auth.uid())
  );

create policy "Owners can update invitations"
  on public.project_invitations
  for update
  using (
    public.is_project_owner(project_invitations.project_id, auth.uid())
  )
  with check (
    public.is_project_owner(project_invitations.project_id, auth.uid())
  );

create policy "Members can view tasks"
  on public.tasks
  for select
  using (
    public.is_project_member(tasks.project_id, auth.uid())
  );

create policy "Editors can insert tasks"
  on public.tasks
  for insert
  with check (
    public.has_project_write_access(tasks.project_id, auth.uid())
    and tasks.user_id = auth.uid()
  );

create policy "Editors can update tasks"
  on public.tasks
  for update
  using (
    public.has_project_write_access(tasks.project_id, auth.uid())
  )
  with check (
    public.has_project_write_access(tasks.project_id, auth.uid())
  );

create policy "Editors can delete tasks"
  on public.tasks
  for delete
  using (
    public.has_project_write_access(tasks.project_id, auth.uid())
  );

create policy "Members can view assignees for tasks in their projects"
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

create policy "Editors can manage assignees for tasks in their projects"
  on public.task_assignees
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.has_project_write_access(t.project_id, auth.uid())
    )
  );

create policy "Editors can remove assignees from tasks in their projects"
  on public.task_assignees
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_assignees.task_id
        and public.has_project_write_access(t.project_id, auth.uid())
    )
  );

create policy "Members can view board columns"
  on public.project_board_columns
  for select
  using (
    public.is_project_member(project_board_columns.project_id, auth.uid())
  );

create policy "Editors can insert board columns"
  on public.project_board_columns
  for insert
  with check (
    public.has_project_write_access(project_board_columns.project_id, auth.uid())
  );

create policy "Editors can update board columns"
  on public.project_board_columns
  for update
  using (
    public.has_project_write_access(project_board_columns.project_id, auth.uid())
  )
  with check (
    public.has_project_write_access(project_board_columns.project_id, auth.uid())
  );

create policy "Editors can delete board columns"
  on public.project_board_columns
  for delete
  using (
    public.has_project_write_access(project_board_columns.project_id, auth.uid())
  );

commit;
