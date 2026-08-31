-- Database-level guarantee that no two occupying reservations for the same
-- room can ever overlap in time, even under full concurrency (roadmap
-- Fase 9: "Nunca permitir duas reservas para a mesma sala e horário").
-- This is enforced by Postgres itself via an EXCLUDE constraint — no amount
-- of application-level races can violate it.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservations"
  ADD COLUMN "timeRange" tsrange
  GENERATED ALWAYS AS (tsrange("startAt", "endAt", '[)')) STORED;

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    "timeRange" WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'));
