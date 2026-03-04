-- Function to accept an invitation (bypasses RLS so the invited user can
-- insert themselves into project_members before they are a member).
CREATE OR REPLACE FUNCTION accept_project_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
BEGIN
  -- Get the calling user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get the user's email from their profile
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('error', 'Could not verify your email address');
  END IF;

  -- Look up the invitation by token
  SELECT id, project_id, email, status, expires_at
  INTO v_invitation
  FROM project_invitations
  WHERE token = p_token::uuid;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('error', 'Invitation not found');
  END IF;

  -- Already accepted — just return the project id
  IF v_invitation.status = 'accepted' THEN
    RETURN jsonb_build_object('project_id', v_invitation.project_id);
  END IF;

  -- Check expiration
  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This invitation has expired');
  END IF;

  -- Check email matches
  IF v_invitation.email <> lower(v_user_email) THEN
    RETURN jsonb_build_object('error', 'This invitation was sent to a different email address');
  END IF;

  -- Insert into project_members (ignore if already a member)
  INSERT INTO project_members (project_id, profile_id, role)
  VALUES (v_invitation.project_id, v_user_id, 'member')
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE project_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('project_id', v_invitation.project_id);
END;
$$;


-- Function to fetch pending invitations for the calling user (bypasses RLS
-- so we can join project titles the user can't yet see).
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      pi.id,
      pi.token,
      coalesce(p.title, 'Untitled project') AS project_name,
      coalesce(pr.full_name, pr.email, 'Someone') AS inviter_name
    FROM project_invitations pi
    LEFT JOIN projects p ON p.id = pi.project_id
    LEFT JOIN profiles pr ON pr.id = pi.invited_by
    WHERE pi.email = lower(v_user_email)
      AND pi.status = 'pending'
      AND pi.expires_at > now()
    ORDER BY pi.created_at DESC
  ) t;

  RETURN v_result;
END;
$$;
