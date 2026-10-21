-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('RAZORPAY', 'CASH_COUNTER');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FINE_PAYMENT_SUCCESS';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cardQrToken" TEXT;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "coverPublicId" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "qrToken" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "pickupCode" TEXT;

-- AlterTable
ALTER TABLE "Fine" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fineId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_cardQrToken_key" ON "User"("cardQrToken");
CREATE INDEX IF NOT EXISTS "User_cardQrToken_idx" ON "User"("cardQrToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_qrToken_key" ON "Reservation"("qrToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_pickupCode_key" ON "Reservation"("pickupCode");
CREATE INDEX IF NOT EXISTS "Reservation_qrToken_idx" ON "Reservation"("qrToken");
CREATE INDEX IF NOT EXISTS "Reservation_pickupCode_idx" ON "Reservation"("pickupCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_fineId_idx" ON "Payment"("fineId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Payment_receiptNumber_idx" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_userId_fkey'
    ) THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_fineId_fkey'
    ) THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fineId_fkey" FOREIGN KEY ("fineId") REFERENCES "Fine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
