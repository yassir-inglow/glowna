-- Fix: make handle_new_project() a security definer function so the
-- auto-insert into project_members bypasses RLS (same pattern as
-- handle_new_user_onboarding). Without this, the trigger fails with
-- error 42501 (insufficient privilege) because the RLS policy on
-- project_members checks project ownership via a subquery that can
-- race with the not-yet-committed project row.

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, profile_id)
  values (new.id, new.user_id)
  on conflict (project_id, profile_id) do nothing;
  return new;
end;
$$;
