-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'MONTHLY', 'YEARLY');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SIGNUP';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "billingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "billingPaidAt" TIMESTAMP(3),
ADD COLUMN     "billingPlan" "BillingPlan",
ADD COLUMN     "spaceName" TEXT;
