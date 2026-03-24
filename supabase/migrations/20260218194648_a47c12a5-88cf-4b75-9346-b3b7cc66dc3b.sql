
-- Add check-in/check-out timestamp columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN checked_in_at timestamp with time zone DEFAULT NULL,
ADD COLUMN checked_out_at timestamp with time zone DEFAULT NULL;
