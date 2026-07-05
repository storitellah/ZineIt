-- ZineIt Phase-2 sync API — PostgreSQL schema
-- The client's project JSON (identical to a .bak) is stored verbatim in projects.doc.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text   NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Untitled project',
  format     text NOT NULL,                    -- e.g. 'mini-zine', 'book-8x10'
  doc        jsonb NOT NULL,                   -- full client state (validated)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_idx ON projects(user_id, updated_at DESC);

-- Append-only history: every PUT snapshots here = server-side daily backups.
CREATE TABLE project_versions (
  id         bigserial PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  doc        jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX versions_project_idx ON project_versions(project_id, created_at DESC);

-- Photo metadata; bytes live in S3-compatible object storage under s3_key.
CREATE TABLE assets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_key     text NOT NULL,
  filename   text NOT NULL,
  width      integer NOT NULL,
  height     integer NOT NULL,
  bytes      bigint  NOT NULL,
  sha256     text    NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sha256)                     -- dedupe identical uploads
);

-- Lightweight audit / product analytics (no third-party trackers).
CREATE TABLE events (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  type       text NOT NULL,                    -- 'backup.saved', 'export.pdf', ...
  meta       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
