
-- Role enum
CREATE TYPE public.app_role AS ENUM ('user', 'parking_owner', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Parking locations
CREATE TABLE public.parking_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  total_slots INTEGER NOT NULL DEFAULT 0,
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;

-- Parking slots
CREATE TABLE public.parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id UUID NOT NULL REFERENCES public.parking_locations(id) ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_id UUID NOT NULL REFERENCES public.parking_locations(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.parking_slots(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'pending')),
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Enable realtime on bookings and parking_slots
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Helper function: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_parking_locations_updated_at BEFORE UPDATE ON public.parking_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: anyone authenticated can read, users update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: only admin can manage, users can read own
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Parking locations: authenticated can read approved, owner manages own
CREATE POLICY "Read approved locations" ON public.parking_locations FOR SELECT TO authenticated USING (is_approved = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner creates locations" ON public.parking_locations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'parking_owner'));
CREATE POLICY "Owner updates own locations" ON public.parking_locations FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes own locations" ON public.parking_locations FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Parking slots: authenticated read, owner manages
CREATE POLICY "Read slots" ON public.parking_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages slots" ON public.parking_slots FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.parking_locations WHERE id = parking_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner updates slots" ON public.parking_slots FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.parking_locations WHERE id = parking_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes slots" ON public.parking_slots FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.parking_locations WHERE id = parking_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Bookings: user manages own, owner reads for their locations
CREATE POLICY "User reads own bookings" ON public.bookings FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.parking_locations WHERE id = parking_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User creates booking" ON public.bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own booking" ON public.bookings FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User deletes own booking" ON public.bookings FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Payments: user reads own, admin full
CREATE POLICY "User reads own payments" ON public.payments FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User creates payment" ON public.payments FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid()));
CREATE POLICY "Admin manages payments" ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
