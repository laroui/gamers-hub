-- Migration 0007: Admin system
-- Add role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_admin_id_idx ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- News articles (CMS)
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  cover_image_url text,
  tag text NOT NULL DEFAULT 'news',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  n8n_workflow_id text,
  social_posted jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS articles_status_idx ON articles(status);
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON articles(created_at);

-- Social accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  name text NOT NULL,
  credentials jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Social publications
CREATE TABLE IF NOT EXISTS social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE SET NULL,
  platform text NOT NULL,
  external_id text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_pubs_article_id_idx ON social_publications(article_id);
