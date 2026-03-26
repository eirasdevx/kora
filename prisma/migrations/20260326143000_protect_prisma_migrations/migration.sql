-- Protect Prisma's own migration history table when the public schema is
-- exposed through Supabase/PostgREST. Prisma still works through the
-- server-side database connection, while anon/authenticated lose direct access.
ALTER TABLE IF EXISTS public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;
    END IF;
  END IF;
END
$$;
