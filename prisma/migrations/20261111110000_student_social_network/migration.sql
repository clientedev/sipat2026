-- Rede social dos alunos: curtidas, comentários, controle de compartilhamento e bio do perfil

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOCIAL_LIKE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SOCIAL_COMMENT';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;

ALTER TABLE "MissionSubmission" ADD COLUMN IF NOT EXISTS "shareToFeed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MissionSubmission" ADD COLUMN IF NOT EXISTS "hiddenFromFeed" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "MissionSubmission_feed_idx"
  ON "MissionSubmission"("status", "shareToFeed", "hiddenFromFeed", "evaluatedAt" DESC);

CREATE TABLE IF NOT EXISTS "PostLike" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_submissionId_userId_key" ON "PostLike"("submissionId", "userId");
CREATE INDEX IF NOT EXISTS "PostLike_submissionId_idx" ON "PostLike"("submissionId");
CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");

CREATE TABLE IF NOT EXISTS "PostComment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PostComment_submissionId_createdAt_idx" ON "PostComment"("submissionId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");

DO $$ BEGIN
  ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MissionSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MissionSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
