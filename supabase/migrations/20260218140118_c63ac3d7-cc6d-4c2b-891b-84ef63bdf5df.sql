
-- Drop existing restrictive policies on bookings
DROP POLICY IF EXISTS "User creates booking" ON public.bookings;
DROP POLICY IF EXISTS "User reads own bookings" ON public.bookings;
DROP POLICY IF EXISTS "User updates own booking" ON public.bookings;
DROP POLICY IF EXISTS "User deletes own booking" ON public.bookings;

-- Recreate as PERMISSIVE policies
CREATE POLICY "User creates booking" 
ON public.bookings FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "User reads own bookings" 
ON public.bookings FOR SELECT 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM parking_locations 
    WHERE parking_locations.id = bookings.parking_id 
    AND parking_locations.owner_id = auth.uid()
  ) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "User updates own booking" 
ON public.bookings FOR UPDATE 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "User deletes own booking" 
ON public.bookings FOR DELETE 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix parking_locations policies too
DROP POLICY IF EXISTS "Read approved locations" ON public.parking_locations;
DROP POLICY IF EXISTS "Owner creates locations" ON public.parking_locations;
DROP POLICY IF EXISTS "Owner updates own locations" ON public.parking_locations;
DROP POLICY IF EXISTS "Owner deletes own locations" ON public.parking_locations;

CREATE POLICY "Read approved locations" 
ON public.parking_locations FOR SELECT 
USING (is_approved = true OR owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner creates locations" 
ON public.parking_locations FOR INSERT 
WITH CHECK (owner_id = auth.uid() AND has_role(auth.uid(), 'parking_owner'::app_role));

CREATE POLICY "Owner updates own locations" 
ON public.parking_locations FOR UPDATE 
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner deletes own locations" 
ON public.parking_locations FOR DELETE 
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix parking_slots policies
DROP POLICY IF EXISTS "Read slots" ON public.parking_slots;
DROP POLICY IF EXISTS "Owner manages slots" ON public.parking_slots;
DROP POLICY IF EXISTS "Owner updates slots" ON public.parking_slots;
DROP POLICY IF EXISTS "Owner deletes slots" ON public.parking_slots;

CREATE POLICY "Read slots" 
ON public.parking_slots FOR SELECT 
USING (true);

CREATE POLICY "Owner manages slots" 
ON public.parking_slots FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owner updates slots" 
ON public.parking_slots FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owner deletes slots" 
ON public.parking_slots FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix payments policies
DROP POLICY IF EXISTS "User creates payment" ON public.payments;
DROP POLICY IF EXISTS "User reads own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin manages payments" ON public.payments;

CREATE POLICY "User creates payment" 
ON public.payments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));

CREATE POLICY "User reads own payments" 
ON public.payments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin manages payments" 
ON public.payments FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users update own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;

CREATE POLICY "Users read own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin manages roles" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
