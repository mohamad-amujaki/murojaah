ALTER TABLE practice_sessions ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS practice_session_client_id ON practice_sessions(client_id);
