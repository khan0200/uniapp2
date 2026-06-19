-- Add the payments table for the Payments module.
-- Run this once in the Supabase SQL Editor.
--
-- Balance convention: students.balance is negative when the student owes
-- money. A payment's `amount` is positive and is ADDED to balance (moves it
-- toward/past zero). A withdrawal is stored as a payment with a NEGATIVE
-- amount.

CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  amount               NUMERIC     NOT NULL,
  method               TEXT        NOT NULL,
  received_by          TEXT        NOT NULL,
  notes                TEXT,
  is_discount          BOOLEAN     NOT NULL DEFAULT FALSE,
  is_withdrawal        BOOLEAN     NOT NULL DEFAULT FALSE,
  student_id           TEXT        REFERENCES public.students(id) ON DELETE SET NULL,
  student_name         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments: authenticated full access" ON public.payments;
CREATE POLICY "payments: authenticated full access"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_received_by ON public.payments(received_by);
