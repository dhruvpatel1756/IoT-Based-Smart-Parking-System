-- Clean up existing tables to ensure a fresh start (avoids "already exists" errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.notify_owner_on_booking();

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.parking_slots CASCADE;
DROP TABLE IF EXISTS public.parking_locations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.app_role;

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
  -- Peak hour columns
  peak_hour_start integer DEFAULT NULL,
  peak_hour_end integer DEFAULT NULL,
  peak_price_per_hour numeric DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.parking_locations.peak_hour_start IS 'Peak hour start (0-23)';
COMMENT ON COLUMN public.parking_locations.peak_hour_end IS 'Peak hour end (0-23)';
COMMENT ON COLUMN public.parking_locations.peak_price_per_hour IS 'Price per hour during peak hours';

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
  booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'pending', 'checked_in')),
  qr_code TEXT,
  checked_in_at timestamp with time zone DEFAULT NULL,
  checked_out_at timestamp with time zone DEFAULT NULL,
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

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'booking',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;


-- Enable realtime
-- We use a DO block to avoid errors if they are already added
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parking_slots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_slots;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;


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

-- Trigger function: create notification for parking owner when booking is created
CREATE OR REPLACE FUNCTION public.notify_owner_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _location_name TEXT;
  _user_name TEXT;
  _slot_number TEXT;
BEGIN
  -- Get parking location owner and name
  SELECT owner_id, name INTO _owner_id, _location_name
  FROM public.parking_locations
  WHERE id = NEW.parking_id;

  -- Get booking user's name
  SELECT full_name INTO _user_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get slot number
  SELECT slot_number INTO _slot_number
  FROM public.parking_slots
  WHERE id = NEW.slot_id;

  -- Insert notification for the owner
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    _owner_id,
    'New Booking Received',
    _user_name || ' booked slot ' || _slot_number || ' at ' || _location_name || ' for ₹' || NEW.total_price,
    'booking',
    jsonb_build_object(
      'booking_id', NEW.id,
      'parking_id', NEW.parking_id,
      'user_name', _user_name,
      'slot_number', _slot_number,
      'total_price', NEW.total_price
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_on_booking();

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

-- Profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Parking locations
CREATE POLICY "Read approved locations" ON public.parking_locations FOR SELECT 
USING (is_approved = true OR owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner creates locations" ON public.parking_locations FOR INSERT 
WITH CHECK (owner_id = auth.uid() AND has_role(auth.uid(), 'parking_owner'::app_role));

CREATE POLICY "Owner updates own locations" ON public.parking_locations FOR UPDATE 
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner deletes own locations" ON public.parking_locations FOR DELETE 
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Parking slots
CREATE POLICY "Read slots" ON public.parking_slots FOR SELECT USING (true);

CREATE POLICY "Owner manages slots" ON public.parking_slots FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Merged update policy (includes owner updates + booking status updates by users)
CREATE POLICY "Update slots" ON public.parking_slots FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Owner deletes slots" ON public.parking_slots FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = parking_slots.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Bookings
CREATE POLICY "User creates booking" ON public.bookings FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "User reads own bookings" ON public.bookings FOR SELECT 
USING (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = bookings.parking_id AND parking_locations.owner_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Merged update policy (User cancels, Owner checks in/out)
CREATE POLICY "User updates own booking" ON public.bookings FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM parking_locations WHERE parking_locations.id = bookings.parking_id AND parking_locations.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "User deletes own booking" ON public.bookings FOR DELETE 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Payments
CREATE POLICY "User creates payment" ON public.payments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));

CREATE POLICY "User reads own payments" ON public.payments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin manages payments" ON public.payments FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
