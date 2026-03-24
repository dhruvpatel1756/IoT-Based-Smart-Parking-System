
-- Add peak hour pricing columns to parking_locations
ALTER TABLE public.parking_locations
ADD COLUMN peak_hour_start integer DEFAULT NULL,
ADD COLUMN peak_hour_end integer DEFAULT NULL,
ADD COLUMN peak_price_per_hour numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.parking_locations.peak_hour_start IS 'Peak hour start (0-23)';
COMMENT ON COLUMN public.parking_locations.peak_hour_end IS 'Peak hour end (0-23)';
COMMENT ON COLUMN public.parking_locations.peak_price_per_hour IS 'Price per hour during peak hours';
