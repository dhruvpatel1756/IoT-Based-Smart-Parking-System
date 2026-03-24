
-- Allow authenticated users to update slot status when booking
DROP POLICY IF EXISTS "Owner updates slots" ON public.parking_slots;

CREATE POLICY "Update slots" 
ON public.parking_slots FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NOT NULL
);
