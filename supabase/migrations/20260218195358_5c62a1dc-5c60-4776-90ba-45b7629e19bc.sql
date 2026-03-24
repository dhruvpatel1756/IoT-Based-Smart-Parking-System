
-- Drop the existing check constraint and add one that includes checked_in status
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_status_check 
  CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'checked_in'));
