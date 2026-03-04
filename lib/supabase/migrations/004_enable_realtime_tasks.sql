-- Enable Supabase Realtime for tasks so clients receive live
-- Postgres Changes events (INSERT / UPDATE / DELETE).
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
