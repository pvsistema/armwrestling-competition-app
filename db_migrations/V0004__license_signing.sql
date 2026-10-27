CREATE TABLE IF NOT EXISTS license_signing (
  id INTEGER PRIMARY KEY,
  private_pem TEXT NOT NULL,
  public_spki TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);