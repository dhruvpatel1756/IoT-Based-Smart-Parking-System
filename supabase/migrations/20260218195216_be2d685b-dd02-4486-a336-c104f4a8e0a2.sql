
-- Update the booking update policy to also allow parking owners to update bookings at their locations (for check-in/out)
DROP POLICY "User updates own booking" ON public.bookings;

CREATE POLICY "User updates own booking" 
ON public.bookings 
FOR UPDATE 
USING (
  (user_id = auth.uid()) 
  OR (EXISTS (
    SELECT 1 FROM parking_locations 
    WHERE parking_locations.id = bookings.parking_id 
    AND parking_locations.owner_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
