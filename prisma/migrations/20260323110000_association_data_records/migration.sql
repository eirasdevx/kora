-- CreateTable
CREATE TABLE "AssociationDataRecord" (
    "id" TEXT NOT NULL,
    "associationId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociationDataRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssociationDataRecord_associationId_module_recordId_key"
ON "AssociationDataRecord"("associationId", "module", "recordId");

-- CreateIndex
CREATE INDEX "AssociationDataRecord_associationId_module_updatedAt_idx"
ON "AssociationDataRecord"("associationId", "module", "updatedAt");

-- AddForeignKey
ALTER TABLE "AssociationDataRecord"
ADD CONSTRAINT "AssociationDataRecord_associationId_fkey"
FOREIGN KEY ("associationId") REFERENCES "Association"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the table protected under the same RLS/revoke strategy as the rest
-- of the application schema, since Prisma uses a server-side connection.
ALTER TABLE public."AssociationDataRecord" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."AssociationDataRecord" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."AssociationDataRecord" FROM authenticated;
  END IF;
END
$$;
