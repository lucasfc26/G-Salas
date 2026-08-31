-- Cancellation policy fields, configurable per contract (roadmap Fase 10 /
-- section 10: "As regras devem ser configuráveis por contrato").
ALTER TABLE "contracts"
  ADD COLUMN "cancellationsUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24;
