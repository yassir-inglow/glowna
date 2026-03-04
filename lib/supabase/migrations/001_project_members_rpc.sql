-- Supabase RPC: returns distinct member profiles for a given set of projects.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- Once created, getProjects() in lib/data.ts can call this RPC instead of
-- joining through all tasks on every request.

CREATE OR REPLACE FUNCTION get_project_members(project_ids uuid[])
RETURNS TABLE (
  project_id uuid,
  id uuid,
  email text,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
AS $$
  -- Project owners
  SELECT p.id AS project_id, pr.id, pr.email, pr.full_name, pr.avatar_url
  FROM projects p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.id = ANY(project_ids)

  UNION

  -- Task assignees
  SELECT t.project_id, pr.id, pr.email, pr.full_name, pr.avatar_url
  FROM tasks t
  JOIN task_assignees ta ON ta.task_id = t.id
  JOIN profiles pr ON pr.id = ta.profile_id
  WHERE t.project_id = ANY(project_ids)
$$;
