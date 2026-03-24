
-- Add platform fee and owner revenue columns to payments
ALTER TABLE public.payments ADD COLUMN platform_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN owner_revenue numeric NOT NULL DEFAULT 0;
