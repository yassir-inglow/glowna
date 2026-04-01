-- Include invitation roles in the in-app invitation feed so invitees can see
-- whether they were invited with edit or view-only access.

begin;

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

commit;
