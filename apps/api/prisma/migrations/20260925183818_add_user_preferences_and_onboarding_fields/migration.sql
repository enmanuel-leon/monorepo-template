-- AlterTable
ALTER TABLE "user" ADD COLUMN     "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_seen_tour" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locale" VARCHAR(5) DEFAULT 'es',
ADD COLUMN     "theme" VARCHAR(10) DEFAULT 'dark';
