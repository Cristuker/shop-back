DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shop_user') THEN
    CREATE ROLE shop_user WITH LOGIN PASSWORD 'shop_password';
  ELSE
    ALTER ROLE shop_user WITH PASSWORD 'shop_password';
  END IF;
END
$$;

ALTER DATABASE shop_db OWNER TO postgres;
GRANT CONNECT ON DATABASE shop_db TO shop_user;
GRANT USAGE ON SCHEMA public TO shop_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shop_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shop_user;

CREATE TABLE IF NOT EXISTS "User" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(10) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(14),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "User" (name, email, type, password, phone)
VALUES
  ('Lojista Demo', 'seller@example.com', 'SELLER', 'senha123', '+5511999999999'),
  ('Comprador Demo', 'buyer@example.com', 'BUYER', 'senha123', '+5511888888888')
ON CONFLICT (email) DO NOTHING;
