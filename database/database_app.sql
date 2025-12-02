
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive text type (for email)


CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  full_name TEXT,
  avatar_url TEXT,

  is_verified BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TRIGGER users_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  refresh_token_hash TEXT NOT NULL,
  access_token_jti TEXT,
  user_agent TEXT,
  ip_address INET,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);


CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  code VARCHAR(128) NOT NULL, -- can be short code or long token
  code_hash TEXT,             -- optional: store hash if you prefer not to store raw code
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used BOOLEAN NOT NULL DEFAULT FALSE
);


CREATE INDEX IF NOT EXISTS idx_email_ver_user_used ON email_verifications(user_id, used);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  reset_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_used ON password_resets(user_id, used);

CREATE OR REPLACE FUNCTION revoke_all_sessions(p_user_id UUID)
RETURNS VOID AS $$
BEGIN

  DELETE FROM sessions WHERE user_id = p_user_id;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN

  DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_email_verifications()
RETURNS INTEGER AS $$
DECLARE

  deleted_count INTEGER := 0;

BEGIN

  DELETE FROM email_verifications WHERE (used = TRUE) OR (expires_at < now());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_password_resets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM password_resets WHERE (used = TRUE) OR (expires_at < now());
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;


$$ LANGUAGE plpgsql;
