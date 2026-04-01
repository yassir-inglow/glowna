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

  select id, project_id, email, status, expires_at
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

  insert into project_members (project_id, profile_id)
  values (v_invitation.project_id, v_user_id)
  on conflict do nothing;

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

create or replace function public.get_invitation_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
begin
  select
    pi.project_id,
    pi.email as invited_email,
    pi.status,
    pi.expires_at,
    (pi.expires_at < now()) as is_expired,
    exists(
      select 1
      from profiles profile_lookup
      where lower(profile_lookup.email) = lower(pi.email)
    ) as has_account,
    coalesce(p.title, 'Untitled project') as project_name,
    coalesce(pr.full_name, pr.email, 'Someone') as inviter_name
  into v_invitation
  from project_invitations pi
  left join projects p on p.id = pi.project_id
  left join profiles pr on pr.id = pi.invited_by
  where pi.token = p_token::uuid;

  if v_invitation is null then
    return jsonb_build_object('error', 'Invitation not found');
  end if;

  return jsonb_build_object(
    'project_id', v_invitation.project_id,
    'invited_email', v_invitation.invited_email,
    'status', v_invitation.status,
    'expires_at', v_invitation.expires_at,
    'is_expired', v_invitation.is_expired,
    'has_account', v_invitation.has_account,
    'project_name', v_invitation.project_name,
    'inviter_name', v_invitation.inviter_name
  );
exception
  when invalid_text_representation then
    return jsonb_build_object('error', 'Invitation not found');
end;
$$;
