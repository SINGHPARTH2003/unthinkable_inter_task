-- Create symptom_checks table to store user symptom queries and results
CREATE TABLE public.symptom_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symptoms TEXT NOT NULL,
  probable_conditions JSONB,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.symptom_checks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert symptom checks (public app)
CREATE POLICY "Anyone can insert symptom checks"
ON public.symptom_checks
FOR INSERT
WITH CHECK (true);

-- Create policy to allow anyone to view symptom checks (for demo/educational purposes)
CREATE POLICY "Anyone can view symptom checks"
ON public.symptom_checks
FOR SELECT
USING (true);

-- Add index for faster queries by date
CREATE INDEX idx_symptom_checks_created_at ON public.symptom_checks(created_at DESC);