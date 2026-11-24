ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS question_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_by_weight boolean NOT NULL DEFAULT true;