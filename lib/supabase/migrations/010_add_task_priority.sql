-- Add priority column to tasks (none, low, medium, high, urgent).
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'none';
