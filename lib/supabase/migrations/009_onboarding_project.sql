-- Automatically create a "Get Started" onboarding project with example tasks
-- when a new user signs up. The project behaves like any normal project —
-- users can check tasks, modify them, or delete the whole project.

create or replace function public.handle_new_user_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_task_id uuid;
  v_titles text[] := array[
    'Check this task to mark it as done',
    'Set a due date on this task',
    'Click on this task to see its details',
    'Try creating a new task below',
    'Invite a teammate from the share button',
    'Right-click a task for more options'
  ];
  v_title text;
  v_pos int := 0;
begin
  -- Create the onboarding project owned by the new user
  insert into projects (title, description, user_id)
  values (
    'Get Started',
    'Welcome! Complete these tasks to learn how Glowna works.',
    NEW.id
  )
  returning id into v_project_id;

  -- Create tasks and assign each to the new user so they appear in "My tasks"
  foreach v_title in array v_titles loop
    v_pos := v_pos + 1;

    insert into tasks (title, project_id, user_id, completed, position)
    values (v_title, v_project_id, NEW.id, false, v_pos)
    returning id into v_task_id;

    insert into task_assignees (task_id, profile_id)
    values (v_task_id, NEW.id);
  end loop;

  return NEW;
end;
$$;

-- Fire after a new profile row is inserted (triggered by Supabase Auth on signup)
create trigger on_profile_created_onboarding
  after insert on profiles
  for each row
  execute function handle_new_user_onboarding();
