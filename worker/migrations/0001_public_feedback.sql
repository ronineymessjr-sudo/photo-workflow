CREATE TABLE IF NOT EXISTS public_feedback (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  task TEXT NOT NULL,
  area TEXT NOT NULL,
  friction TEXT NOT NULL,
  rating INTEGER NOT NULL,
  page TEXT NOT NULL,
  build TEXT NOT NULL,
  locale TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread'
);

CREATE INDEX IF NOT EXISTS idx_public_feedback_received_at ON public_feedback(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_feedback_status ON public_feedback(status, received_at DESC);

CREATE TABLE IF NOT EXISTS public_events (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  page TEXT NOT NULL,
  locale TEXT NOT NULL,
  session_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_events_received_at ON public_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_events_name ON public_events(name, received_at DESC);
