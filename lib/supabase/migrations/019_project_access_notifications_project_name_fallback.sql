-- Let access-notification replacement also clear stale rows that only have a
-- matching project_name. This helps clean up older bad notifications that were
-- written before project_id-based replacement was in place.

begin;

create or replace function public.clear_project_access_notifications(
  p_project_id uuid,
  p_project_name text default null,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_user_id and not public.is_project_owner(p_project_id, auth.uid()) then
    raise exception 'Access denied';
  end if;

  delete from public.notifications
  where user_id = p_user_id
    and type = any (array['removed_from_project'::text, 'project_role_changed'::text])
    and (
      coalesce(data ->> 'project_id', '') = p_project_id::text
      or (
        p_project_name is not null
        and lower(coalesce(data ->> 'project_name', '')) = lower(p_project_name)
      )
    );
end;
$$;

create or replace function public.replace_project_access_notification(
  p_user_id uuid,
  p_project_id uuid,
  p_type text,
  p_project_name text,
  p_actor_name text,
  p_role text default null,
  p_previous_role text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_project_owner(p_project_id, auth.uid()) then
    raise exception 'Access denied';
  end if;

  if p_type <> all (array['removed_from_project'::text, 'project_role_changed'::text]) then
    raise exception 'Invalid notification type';
  end if;

  perform public.clear_project_access_notifications(p_project_id, p_project_name, p_user_id);

  insert into public.notifications (user_id, type, data)
  values (
    p_user_id,
    p_type,
    jsonb_strip_nulls(
      jsonb_build_object(
        'project_id', p_project_id,
        'project_name', p_project_name,
        'actor_name', p_actor_name,
        'role', p_role,
        'previous_role', p_previous_role
      )
    )
  );
end;
$$;

commit;
