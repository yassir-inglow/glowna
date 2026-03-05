-- Enable Supabase Realtime for task_assignees so clients receive live
-- Postgres Changes events when assignees are added or removed.
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;
