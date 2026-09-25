-- AlterTable
ALTER TABLE "passkey" ADD COLUMN     "aaguid" TEXT,
ADD COLUMN     "backed_up" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "counter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "device_type" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "user_session" ADD COLUMN     "impersonated_by" TEXT;

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "passkey_credential_id_idx" ON "passkey"("credential_id");
