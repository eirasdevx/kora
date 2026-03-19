-- Enable RLS on all application tables created in the public schema.
ALTER TABLE public."Association" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssociationRepresentative" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssociationUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Since this app uses Prisma over a server-side database connection, block
-- Supabase Data API roles from accessing these tables directly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."Association" FROM anon;
    REVOKE ALL ON TABLE public."AssociationRepresentative" FROM anon;
    REVOKE ALL ON TABLE public."AssociationUser" FROM anon;
    REVOKE ALL ON TABLE public."SecurityEvent" FROM anon;
    REVOKE ALL ON TABLE public."Session" FROM anon;
    REVOKE ALL ON TABLE public."User" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."Association" FROM authenticated;
    REVOKE ALL ON TABLE public."AssociationRepresentative" FROM authenticated;
    REVOKE ALL ON TABLE public."AssociationUser" FROM authenticated;
    REVOKE ALL ON TABLE public."SecurityEvent" FROM authenticated;
    REVOKE ALL ON TABLE public."Session" FROM authenticated;
    REVOKE ALL ON TABLE public."User" FROM authenticated;
  END IF;
END
$$;
