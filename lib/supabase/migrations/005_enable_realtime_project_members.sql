-- Enable Supabase Realtime for project_members so clients receive live
-- Postgres Changes events when members join or leave a project.
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
