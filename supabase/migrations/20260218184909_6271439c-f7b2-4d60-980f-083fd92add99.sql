
-- Create notifications table
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- System inserts (via trigger with SECURITY DEFINER)
CREATE POLICY "System inserts notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

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

-- Attach trigger to bookings table
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_on_booking();
