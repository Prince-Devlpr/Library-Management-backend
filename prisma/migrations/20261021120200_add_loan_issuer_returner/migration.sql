-- AlterTable
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "issuedById" TEXT;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "returnedById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Loan_issuedById_idx" ON "Loan"("issuedById");
CREATE INDEX IF NOT EXISTS "Loan_returnedById_idx" ON "Loan"("returnedById");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Loan_issuedById_fkey'
    ) THEN
        ALTER TABLE "Loan" ADD CONSTRAINT "Loan_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Loan_returnedById_fkey'
    ) THEN
        ALTER TABLE "Loan" ADD CONSTRAINT "Loan_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
