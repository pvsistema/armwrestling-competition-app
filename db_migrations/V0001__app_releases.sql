CREATE TABLE IF NOT EXISTS app_releases (
  id SERIAL PRIMARY KEY,
  version VARCHAR(32) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS app_releases_published_idx ON app_releases (published, published_at DESC);