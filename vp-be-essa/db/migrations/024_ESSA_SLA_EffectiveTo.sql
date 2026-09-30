-- Migration 024: Optional EffectiveTo on SLA policies (open-ended when NULL).

ALTER TABLE "ESSA_SLA_POLICY" ADD COLUMN IF NOT EXISTS "EffectiveTo" DATE NULL;
