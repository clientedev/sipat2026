-- Tabelas que existiam no schema.prisma mas nunca entraram numa migration
-- (Laboratory, LaboratoryClassGroup, MissionTargetClass, Certificate e Mission.laboratoryId).
-- Escrita de forma idempotente para funcionar tanto em bancos criados por
-- "migrate deploy" quanto por "db push".

CREATE TABLE IF NOT EXISTS "Laboratory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "blockLocation" TEXT NOT NULL DEFAULT 'Bloco Principal',
    "courseArea" TEXT NOT NULL DEFAULT 'Geral',
    "nrsApplicable" TEXT,
    "requiredEpis" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 32,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Laboratory_code_key" ON "Laboratory"("code");
CREATE INDEX IF NOT EXISTS "Laboratory_isActive_courseArea_idx" ON "Laboratory"("isActive", "courseArea");

CREATE TABLE IF NOT EXISTS "LaboratoryClassGroup" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    CONSTRAINT "LaboratoryClassGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LaboratoryClassGroup_laboratoryId_classGroupId_key" ON "LaboratoryClassGroup"("laboratoryId", "classGroupId");
CREATE INDEX IF NOT EXISTS "LaboratoryClassGroup_laboratoryId_idx" ON "LaboratoryClassGroup"("laboratoryId");
CREATE INDEX IF NOT EXISTS "LaboratoryClassGroup_classGroupId_idx" ON "LaboratoryClassGroup"("classGroupId");

CREATE TABLE IF NOT EXISTS "MissionTargetClass" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    CONSTRAINT "MissionTargetClass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MissionTargetClass_missionId_classGroupId_key" ON "MissionTargetClass"("missionId", "classGroupId");
CREATE INDEX IF NOT EXISTS "MissionTargetClass_missionId_idx" ON "MissionTargetClass"("missionId");
CREATE INDEX IF NOT EXISTS "MissionTargetClass_classGroupId_idx" ON "MissionTargetClass"("classGroupId");

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workloadHours" INTEGER NOT NULL DEFAULT 20,
    "totalPointsSnapshot" INTEGER NOT NULL DEFAULT 0,
    "missionsSnapshot" INTEGER NOT NULL DEFAULT 0,
    "quizzesSnapshot" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verificationCode_key" ON "Certificate"("verificationCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_userId_key" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_verificationCode_idx" ON "Certificate"("verificationCode");
CREATE INDEX IF NOT EXISTS "Certificate_status_idx" ON "Certificate"("status");

ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "laboratoryId" TEXT;
CREATE INDEX IF NOT EXISTS "Mission_laboratoryId_idx" ON "Mission"("laboratoryId");

DO $$ BEGIN
  ALTER TABLE "Mission" ADD CONSTRAINT "Mission_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LaboratoryClassGroup" ADD CONSTRAINT "LaboratoryClassGroup_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LaboratoryClassGroup" ADD CONSTRAINT "LaboratoryClassGroup_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MissionTargetClass" ADD CONSTRAINT "MissionTargetClass_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MissionTargetClass" ADD CONSTRAINT "MissionTargetClass_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
