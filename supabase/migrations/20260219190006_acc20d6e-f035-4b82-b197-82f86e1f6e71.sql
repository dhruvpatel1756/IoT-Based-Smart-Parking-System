
-- 1. Fix profiles table: Remove public SELECT, restrict to own profile + related users
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Owners read booker profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.parking_locations pl ON pl.id = b.parking_id
    WHERE b.user_id = profiles.id
    AND pl.owner_id = auth.uid()
  )
);

CREATE POLICY "Admin reads all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
