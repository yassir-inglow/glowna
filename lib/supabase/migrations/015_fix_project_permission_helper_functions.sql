-- Fix permission helper functions to bypass RLS safely.
-- Without SECURITY DEFINER, project_members policies can recurse through
-- is_project_member() and time out after 014_project_member_roles.sql.

begin;

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

commit;
