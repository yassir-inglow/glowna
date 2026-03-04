-- Enable Supabase Realtime for project_invitations so clients
-- receive live Postgres Changes events (INSERT / UPDATE).
ALTER PUBLICATION supabase_realtime ADD TABLE project_invitations;
